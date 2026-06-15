import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { FastifyRequest } from "fastify";
import { ROLES_KEY, type AppRole } from "../decorators/roles.decorator";
import type { AuthUser } from "./auth.guard";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const requiredRoles = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!requiredRoles?.length) return true;

    const req = context.switchToHttp().getRequest<FastifyRequest & { user?: AuthUser }>();
    const user = req.user;

    if (!user) throw new ForbiddenException("Missing user");
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException("Insufficient role");
    }

    return true;
  }
}