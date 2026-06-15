import { apiFetch } from "@/lib/api";
import type { Permission, RoleWithPermissions } from "./types";

export async function listPermissions() {
  return apiFetch<{ permissions: Permission[] }>(`/rbac/permissions`, { method: "GET" });
}

export async function listRoles() {
  return apiFetch<{ roles: RoleWithPermissions[] }>(`/rbac/roles`, { method: "GET" });
}

export async function createRole(input: { name: string; description?: string | null }) {
  return apiFetch<{ role: RoleWithPermissions }>(`/rbac/roles`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function updateRole(roleId: string, input: { name: string; description?: string | null }) {
  return apiFetch<{ role: RoleWithPermissions }>(`/rbac/roles/${roleId}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function deleteRole(roleId: string) {
  return apiFetch<{ ok: true }>(`/rbac/roles/${roleId}`, {
    method: "DELETE"
  });
}

export async function replaceRolePermissions(roleId: string, permissionKeys: string[]) {
  return apiFetch<{ ok: true }>(`/rbac/roles/${roleId}/permissions`, {
    method: "PUT",
    body: JSON.stringify({ permissionKeys })
  });
}
