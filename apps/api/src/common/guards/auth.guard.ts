import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { FastifyRequest } from "fastify";
import { PrismaService } from "../../prisma/prisma.service";
import { env } from "../../env";

export type AuthUser = {
  sub: string;
  email: string;
  role: string;
  permissions: string[];
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<FastifyRequest & { user?: AuthUser }>();
    const token = (req.cookies as Record<string, string> | undefined)?.[env.COOKIE_NAME];
    if (!token) throw new UnauthorizedException("Not authenticated");

    try {
      const payload = await this.jwt.verifyAsync<Pick<AuthUser, "sub" | "email" | "role"> & { permissions?: string[] }>(
        token,
        { secret: env.JWT_SECRET }
      );

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          role: {
            select: {
              name: true,
              permissions: { select: { permission: { select: { key: true } } } }
            }
          }
        }
      });

      if (!user) {
        throw new UnauthorizedException("Invalid session");
      }

      req.user = {
        sub: user.id,
        email: user.email,
        role: user.role.name,
        permissions: user.role.permissions.map((entry) => entry.permission.key).sort()
      };

      return true;
    } catch {
      throw new UnauthorizedException("Invalid session");
    }
  }
}
