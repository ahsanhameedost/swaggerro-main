import { createReadStream } from "fs";
import { stat } from "fs/promises";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Put,
  Res
} from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { env } from "../env";
import { StorageService } from "./storage.service";

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp"
};

/**
 * Local-filesystem stand-in for S3, active only when STORAGE_DRIVER=local.
 * PUT stores an uploaded image to disk; GET streams it back. The presigned
 * "uploadUrl"/"publicUrl" issued by StorageService point at these routes.
 */
@Controller("storage/local")
export class StorageLocalController {
  constructor(private readonly storage: StorageService) {}

  private ensureLocalDriver() {
    if (env.STORAGE_DRIVER !== "local") {
      throw new NotFoundException("Local storage is disabled");
    }
  }

  @Put("*")
  async upload(@Param("*") key: string, @Body() body: Buffer) {
    this.ensureLocalDriver();
    if (!key) throw new BadRequestException("Missing storage key");
    if (!Buffer.isBuffer(body) || body.length === 0) {
      throw new BadRequestException("Empty upload body");
    }

    await this.storage.writeLocalObject(key, body);
    return { ok: true, key };
  }

  @Get("*")
  async download(@Param("*") key: string, @Res() reply: FastifyReply) {
    this.ensureLocalDriver();
    if (!key) throw new BadRequestException("Missing storage key");

    const path = this.storage.resolveLocalReadPath(key);

    try {
      await stat(path);
    } catch {
      throw new NotFoundException("File not found");
    }

    const ext = key.split(".").pop()?.toLowerCase() ?? "";
    const contentType = CONTENT_TYPE_BY_EXT[ext] ?? "application/octet-stream";

    return reply
      .header("Content-Type", contentType)
      .header("Cache-Control", "public, max-age=31536000, immutable")
      // Allow the image to load cross-origin (web app on :3000, API on :3001).
      .header("Cross-Origin-Resource-Policy", "cross-origin")
      .send(createReadStream(path));
  }
}
