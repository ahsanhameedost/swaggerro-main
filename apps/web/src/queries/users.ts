import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEmployee,
  deleteEmployee,
  listEmployeeRoles,
  listEmployees,
  listUsers,
  updateEmployee
} from "@/modules/users/api";
import type {
  AppUserRole,
  CreateEmployeeInput,
  UpdateEmployeeInput
} from "@/modules/users/types";

export function useUsers(params: { search?: string; role?: AppUserRole } = {}, enabled = true) {
  return useQuery({
    queryKey: ["users", params.search ?? "", params.role ?? ""],
    queryFn: async () => (await listUsers(params)).users,
    enabled
  });
}

export function useEmployeeRoles(enabled = true) {
  return useQuery({
    queryKey: ["users", "employee-roles"],
    queryFn: async () => (await listEmployeeRoles()).roles,
    enabled
  });
}

export function useEmployees(search?: string, enabled = true) {
  return useQuery({
    queryKey: ["users", "employees", search ?? ""],
    queryFn: async () => (await listEmployees(search)).users,
    enabled
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateEmployeeInput) => createEmployee(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["users"] }),
        queryClient.invalidateQueries({ queryKey: ["users", "employees"] })
      ]);
    }
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateEmployeeInput }) =>
      updateEmployee(id, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["users"] }),
        queryClient.invalidateQueries({ queryKey: ["users", "employees"] })
      ]);
    }
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteEmployee(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["users"] }),
        queryClient.invalidateQueries({ queryKey: ["users", "employees"] })
      ]);
    }
  });
}
