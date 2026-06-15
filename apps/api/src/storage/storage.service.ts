import { randomUUID } from "crypto";
import { mkdir, writeFile, unlink } from "fs/promises";
import { dirname, normalize, resolve, sep } from "path";
import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException
} from "@nestjs/common";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../env";
import { slugify } from "../common/utils/slug";

type AwsCredsOverride =
  | {
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
    }
  | undefined;

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  private readonly allowedContentTypes = new Map<string, string>([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"]
  ]);

  private s3Client?: S3Client;
  private credsValidated = false;

  async createImageUploadUrl(input: { filename: string; contentType: string; prefix: string }) {
    const extension = this.allowedContentTypes.get(input.contentType);
    if (!extension) throw new BadRequestException("Unsupported image type");

    const basename = slugify(input.filename.replace(/\.[^.]+$/, "")) || "file";
    const safePrefix = this.normalizePrefix(input.prefix);
    const now = new Date();
    const yearMonth = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const key = `${safePrefix}/${yearMonth}/${basename}-${randomUUID()}.${extension}`;

    if (env.STORAGE_DRIVER === "local") {
      const base = env.API_PUBLIC_URL.replace(/\/+$/, "");
      const localUrl = `${base}/storage/local/${key}`;
      // For local dev the upload and public URLs are the same endpoint
      // (PUT to store, GET to retrieve).
      return { uploadUrl: localUrl, key, publicUrl: localUrl, expiresIn: 300 };
    }

    const s3 = this.getClient();

    const command = new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET!,
      Key: key,
      ContentType: input.contentType,
      CacheControl: "public, max-age=31536000, immutable"
    });

    await this.ensureCredentialsAvailable(s3);

    try {
      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
      return { uploadUrl, key, publicUrl: this.getPublicUrl(key), expiresIn: 300 };
    } catch (e: any) {
      this.logger.error(
        `Failed to presign PUT: ${e?.name ?? "Error"}: ${e?.message ?? e}`,
        e?.stack
      );
      throw new ServiceUnavailableException(
        `S3 presign failed: ${e?.message ?? "unknown error"}`
      );
    }
  }

  async deleteObjectQuietly(key: string) {
    try {
      if (env.STORAGE_DRIVER === "local") {
        await unlink(this.resolveLocalPath(key));
        return;
      }

      const s3 = this.getClient();
      await this.ensureCredentialsAvailable(s3);

      await s3.send(
        new DeleteObjectCommand({
          Bucket: env.AWS_S3_BUCKET!,
          Key: key
        })
      );
    } catch (error) {
      this.logger.warn(
        `Failed to delete object ${key}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // --- Local filesystem driver -------------------------------------------

  /** Absolute path to the local upload directory root. */
  private get localRoot() {
    return resolve(process.cwd(), env.STORAGE_LOCAL_DIR);
  }

  /**
   * Resolve a storage key to an absolute path inside the local root,
   * guarding against path traversal (e.g. keys containing "..").
   */
  private resolveLocalPath(key: string) {
    const safeKey = normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
    const fullPath = resolve(this.localRoot, safeKey);
    if (fullPath !== this.localRoot && !fullPath.startsWith(this.localRoot + sep)) {
      throw new BadRequestException("Invalid storage key");
    }
    return fullPath;
  }

  /** Write an uploaded buffer to disk under the given key. */
  async writeLocalObject(key: string, body: Buffer) {
    const fullPath = this.resolveLocalPath(key);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, body);
  }

  /** Absolute path used to stream a stored object back to the client. */
  resolveLocalReadPath(key: string) {
    const fullPath = this.resolveLocalPath(key);
    return fullPath;
  }

  private getClient(): S3Client {
    if (this.s3Client) return this.s3Client;

    if (!env.AWS_REGION || !env.AWS_S3_BUCKET) {
      throw new ServiceUnavailableException(
        "AWS S3 is not configured. Set AWS_REGION and AWS_S3_BUCKET."
      );
    }

    const config: S3ClientConfig = { region: env.AWS_REGION };

    const credsOverride = this.getCredsOverrideFromEnv();
    if (credsOverride) config.credentials = credsOverride;

    this.s3Client = new S3Client(config);
    return this.s3Client;
  }

  private normalizePrefix(prefix: string) {
    const safe = (prefix ?? "").trim().replace(/^\/+|\/+$/g, "");
    if (!safe) throw new BadRequestException("Invalid prefix");
    return safe;
  }

  private getCredsOverrideFromEnv(): AwsCredsOverride {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();

    const hasA = !!accessKeyId;
    const hasS = !!secretAccessKey;

    if (hasA !== hasS) {
      throw new ServiceUnavailableException(
        "AWS credentials are partially set. Provide BOTH AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY, " +
          "or remove them and use AWS_PROFILE / ECS Task Role."
      );
    }

    if (!hasA) return undefined;

    return {
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
    };
  }

  private async ensureCredentialsAvailable(s3: S3Client) {
    if (this.credsValidated) return;

    try {
      const provider = s3.config.credentials;
      if (typeof provider !== "function") throw new Error("No credentials provider configured");
      await provider();
      this.credsValidated = true;
    } catch (e: any) {
      const msg =
        "Could not load AWS credentials. For local dev, set AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY " +
        "(and AWS_SESSION_TOKEN if temporary), OR configure AWS CLI credentials and set AWS_PROFILE. " +
        "On ECS, attach an IAM Task Role and do NOT set static keys.";
      this.logger.error(`${msg} Root: ${e?.message ?? e}`);
      throw new ServiceUnavailableException(msg);
    }
  }

  private getPublicUrl(key: string) {
    const baseUrl = env.AWS_S3_PUBLIC_BASE_URL?.trim().replace(/\/+$/, "");
    if (baseUrl) return `${baseUrl}/${key}`;

    return `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
  }
}