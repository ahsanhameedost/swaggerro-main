import type { AuthUser } from "../guards/auth.guard";

export function hasPermission(user: Pick<AuthUser, "permissions"> | null | undefined, permission: string) {
  return Boolean(user?.permissions?.includes(permission));
}

export function hasAnyPermission(
  user: Pick<AuthUser, "permissions"> | null | undefined,
  permissions: string[]
) {
  return permissions.some((permission) => hasPermission(user, permission));
}
