import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "roles";

export const SYSTEM_ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  USER: "USER"
} as const;

export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];
export type AppRole = string;

export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);