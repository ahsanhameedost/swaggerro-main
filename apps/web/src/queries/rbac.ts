import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRole,
  deleteRole,
  listPermissions,
  listRoles,
  replaceRolePermissions,
  updateRole
} from "@/modules/rbac/api";

export function useAllPermissions() {
  return useQuery({
    queryKey: ["rbac", "permissions"],
    queryFn: () => listPermissions()
  });
}

export function useRolesWithPermissions() {
  return useQuery({
    queryKey: ["rbac", "roles"],
    queryFn: () => listRoles()
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { name: string; description?: string | null }) => createRole(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["rbac", "roles"] }),
        queryClient.invalidateQueries({ queryKey: ["users", "employee-roles"] })
      ]);
    }
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, input }: { roleId: string; input: { name: string; description?: string | null } }) =>
      updateRole(roleId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["rbac", "roles"] }),
        queryClient.invalidateQueries({ queryKey: ["users", "employee-roles"] })
      ]);
    }
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roleId: string) => deleteRole(roleId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["rbac", "roles"] }),
        queryClient.invalidateQueries({ queryKey: ["users", "employee-roles"] })
      ]);
    }
  });
}

export function useReplaceRolePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, permissionKeys }: { roleId: string; permissionKeys: string[] }) =>
      replaceRolePermissions(roleId, permissionKeys),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rbac", "roles"] });
    }
  });
}
