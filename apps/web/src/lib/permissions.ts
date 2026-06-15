import type { User } from "@/modules/auth/types";

export function hasPermission(user: User | null | undefined, permission: string) {
  return !!user?.permissions?.includes(permission);
}

export function hasAnyPermission(user: User | null | undefined, permissions: string[]) {
  return permissions.some((permission) => hasPermission(user, permission));
}
