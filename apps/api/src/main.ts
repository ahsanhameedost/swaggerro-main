import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { AppModule } from "./app.module";
import { env } from "./env";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { logger: ["error", "warn", "log", "debug"] },
  );

  await app.register(helmet, { global: true });
  await app.register(cookie, { secret: env.COOKIE_SECRET });

  // Accept raw image bodies (used by the local storage driver's PUT endpoint).
  // Fastify only parses JSON/text by default, so register buffer parsers for
  // the image types we allow, with a generous body limit for photos.
  const fastify = app.getHttpAdapter().getInstance();
  for (const mime of ["image/jpeg", "image/png", "image/webp"]) {
    fastify.addContentTypeParser(
      mime,
      { parseAs: "buffer", bodyLimit: 25 * 1024 * 1024 },
      (_req, body, done) => done(null, body)
    );
  }

  const origins = env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean);

  await app.register(cors, {
    origin: origins,
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  });

  app.setGlobalPrefix("api");
  await app.listen({ host: env.API_HOST, port: env.API_PORT });
}

void bootstrap();