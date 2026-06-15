import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { FastifyRequest } from "fastify";
import {
  ANY_PERMISSIONS_KEY,
  PERMISSIONS_KEY
} from "../decorators/permissions.decorator";
import type { AuthUser } from "./auth.guard";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext) {
    const requiredAll = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    const requiredAny = this.reflector.getAllAndOverride<string[]>(ANY_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!requiredAll?.length && !requiredAny?.length) {
      return true;
    }

    const req = context.switchToHttp().getRequest<FastifyRequest & { user?: AuthUser }>();
    const user = req.user;
    if (!user) {
      throw new ForbiddenException("Missing user");
    }

    const keys = new Set(user.permissions ?? []);

    for (const permission of requiredAll ?? []) {
      if (!keys.has(permission)) {
        throw new ForbiddenException("Missing permission: " + permission);
      }
    }

    if (requiredAny?.length && !requiredAny.some((permission) => keys.has(permission))) {
      throw new ForbiddenException("Missing any required permission");
    }

    return true;
  }
}
