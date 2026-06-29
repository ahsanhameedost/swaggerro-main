import { BadRequestException, Controller, Get, Query, Res } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { env } from "../env";

const MAX_BYTES = 12 * 1024 * 1024; // 12MB cap

// Hosts we are willing to fetch images from (prevents the proxy from being an
// open SSRF relay). Derived from configured public bases + known image hosts.
function allowedHosts(): Set<string> {
  const hosts = new Set<string>(["swaggeroo.osdevlabs.com", "localhost", "127.0.0.1"]);
  for (const value of [env.API_PUBLIC_URL, env.AWS_S3_PUBLIC_BASE_URL, env.CORS_ORIGIN]) {
    if (!value) continue;
    for (const part of String(value).split(",")) {
      try {
        hosts.add(new URL(part.trim()).hostname);
      } catch {
        // ignore malformed entries
      }
    }
  }
  return hosts;
}

/**
 * Same-origin image proxy. The dashboard composites product + logo images onto
 * a <canvas> to export branded previews; remote CDN images without CORS headers
 * taint the canvas and break toBlob(). Loading them through this proxy (which
 * returns Access-Control-Allow-Origin) keeps the canvas clean.
 */
@Controller("storage")
export class StorageProxyController {
  @Get("proxy")
  async proxy(@Query("url") url: unknown, @Res() reply: FastifyReply) {
    if (typeof url !== "string" || !url) {
      throw new BadRequestException("Missing url");
    }

    let target: URL;
    try {
      target = new URL(url);
    } catch {
      throw new BadRequestException("Invalid url");
    }
    if (target.protocol !== "http:" && target.protocol !== "https:") {
      throw new BadRequestException("Unsupported protocol");
    }
    if (!allowedHosts().has(target.hostname)) {
      throw new BadRequestException("Host not allowed");
    }

    const upstream = await fetch(target.toString());
    if (!upstream.ok) {
      throw new BadRequestException(`Upstream returned ${upstream.status}`);
    }
    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
    if (!contentType.startsWith("image/")) {
      throw new BadRequestException("Not an image");
    }

    const arrayBuffer = await upstream.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_BYTES) {
      throw new BadRequestException("Image too large");
    }

    return reply
      .header("Content-Type", contentType)
      .header("Cache-Control", "public, max-age=86400")
      .header("Access-Control-Allow-Origin", "*")
      .header("Cross-Origin-Resource-Policy", "cross-origin")
      .send(Buffer.from(arrayBuffer));
  }
}
