import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { FastifyRequest } from "fastify";
import { env } from "../../env";
import type { AuthUser } from "./auth.guard";

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<FastifyRequest & { user?: AuthUser }>();
    const token = (req.cookies as Record<string, string> | undefined)?.[env.COOKIE_NAME];

    if (!token) {
      return true;
    }

    try {
      const payload = await this.jwt.verifyAsync<AuthUser>(token, { secret: env.JWT_SECRET });
      req.user = payload;
    } catch {}

    return true;
  }
}
