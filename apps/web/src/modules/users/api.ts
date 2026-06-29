import { apiFetch } from "@/lib/api";
import { buildQuery } from "@/modules/catalog/shared";
import type {
  AppUserListItem,
  AppUserRole,
  AssignableRole,
  CreateEmployeeInput,
  UpdateEmployeeInput
} from "./types";

export async function listUsers(params: { search?: string; role?: AppUserRole } = {}) {
  return apiFetch<{ users: AppUserListItem[] }>(`/users${buildQuery(params as any)}`, {
    method: "GET"
  });
}

export async function listEmployeeRoles() {
  return apiFetch<{ roles: AssignableRole[] }>(`/users/employee-roles`, {
    method: "GET"
  });
}

export async function listEmployees(search?: string) {
  return apiFetch<{ users: AppUserListItem[] }>(`/users/employees${buildQuery({ search })}`, {
    method: "GET"
  });
}

export async function createEmployee(input: CreateEmployeeInput) {
  return apiFetch<{ user: AppUserListItem }>(`/users/employees`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function updateEmployee(id: string, input: UpdateEmployeeInput) {
  return apiFetch<{ user: AppUserListItem }>(`/users/employees/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function deleteEmployee(id: string) {
  return apiFetch<{ ok: true }>(`/users/employees/${id}`, {
    method: "DELETE"
  });
}

export async function resetUserPassword(id: string, newPassword: string) {
  return apiFetch<{ ok: true }>(`/users/${id}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ newPassword })
  });
}
