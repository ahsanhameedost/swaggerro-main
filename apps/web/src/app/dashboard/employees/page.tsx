"use client";

import { useDeferredValue, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Input,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow
} from "@heroui/react";
import { addToast } from "@heroui/toast";
import { Plus, Search, UserCog } from "lucide-react";
import { useMe } from "@/queries/auth";
import {
  useCreateEmployee,
  useDeleteEmployee,
  useEmployeeRoles,
  useEmployees,
  useUpdateEmployee
} from "@/queries/users";
import type { AppUserListItem } from "@/modules/users/types";
import { EmployeeFormModal } from "@/app/components/dashboard/employees/EmployeeFormModal";
import { DeleteConfirmDialog } from "@/app/components/dashboard/shared/DeleteConfirmDialog";
import { RowActionsDropdown } from "@/app/components/dashboard/shared/RowActionsDropdown";

function formatName(employee: AppUserListItem) {
  const fullName = [employee.firstName, employee.lastName].filter(Boolean).join(" ").trim();
  return fullName || employee.email;
}

function formatRoleName(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function EmployeesPage() {
  const { data: user } = useMe();
  const canRead = !!user?.permissions?.includes("admin.users.read");
  const canWrite = !!user?.permissions?.includes("admin.users.write");

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<AppUserListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppUserListItem | null>(null);

  const deferredSearch = useDeferredValue(search);
  const { data: employees = [], isLoading, isFetching, isError, error } = useEmployees(deferredSearch, canRead);
  const { data: roles = [] } = useEmployeeRoles(canRead);

  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const deleteMutation = useDeleteEmployee();

  const closeForm = () => {
    setFormOpen(false);
    setSelectedEmployee(null);
  };

  const handleSave = async (values: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    password?: string | null;
    roleId: string;
  }) => {
    try {
      if (selectedEmployee) {
        await updateMutation.mutateAsync({
          id: selectedEmployee.id,
          input: values
        });
        addToast({
          title: "Employee updated",
          description: "Employee details were saved.",
          color: "success"
        });
      } else {
        if (!values.password) {
          throw new Error("Password is required");
        }

        await createMutation.mutateAsync({
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone ?? null,
          password: values.password,
          roleId: values.roleId
        });
        addToast({
          title: "Employee created",
          description: "The employee can now sign in.",
          color: "success"
        });
      }

      closeForm();
    } catch (e: any) {
      addToast({
        title: "Save failed",
        description: e?.message ?? "Unable to save employee.",
        color: "danger"
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      addToast({
        title: "Employee deleted",
        description: `${formatName(deleteTarget)} was removed.`,
        color: "success"
      });
      setDeleteTarget(null);
    } catch (e: any) {
      addToast({
        title: "Delete failed",
        description: e?.message ?? "Unable to delete employee.",
        color: "danger"
      });
    }
  };

  if (!canRead) {
    return (
      <Card>
        <CardBody>You do not have permission to view employees.</CardBody>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="border border-divider shadow-sm">
        <CardBody className="flex flex-col gap-4 p-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
            <p className="text-sm text-foreground/60">
              Create and manage internal team accounts, then assign each employee to a custom role.
            </p>
          </div>

          {canWrite ? (
            <Button
              color="primary"
              startContent={<Plus className="size-4" />}
              onPress={() => {
                setSelectedEmployee(null);
                setFormOpen(true);
              }}
              style={{ backgroundImage: "var(--primary-gradient)" }}
            >
              Add employee
            </Button>
          ) : null}
        </CardBody>
      </Card>

      <Card className="border border-divider shadow-sm">
        <CardBody className="border-b border-divider px-6 py-5">
          <Input
            value={search}
            onValueChange={setSearch}
            placeholder="Search employees"
            startContent={<Search className="size-4 text-foreground/40" />}
            className="w-full md:max-w-sm"
          />
        </CardBody>

        <CardBody className="p-0">
          <Table removeWrapper aria-label="Employees table">
            <TableHeader>
              <TableColumn>Employee</TableColumn>
              <TableColumn>Role</TableColumn>
              <TableColumn>Created</TableColumn>
              <TableColumn className="text-center">Actions</TableColumn>
            </TableHeader>
            <TableBody
              isLoading={isLoading || isFetching}
              loadingContent={<Spinner label="Loading employees..." />}
              emptyContent={
                <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
                  <div
                    className="inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white"
                    style={{ backgroundImage: "var(--primary-gradient)" }}
                  >
                    <UserCog className="size-6" />
                  </div>
                  <div>
                    <div className="font-semibold">No employees found</div>
                    <div className="text-sm text-foreground/60">
                      Create a role first, then add internal employees to assign work.
                    </div>
                  </div>
                </div>
              }
            >
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{formatName(employee)}</div>
                      <div className="text-xs text-foreground/55">{employee.email}</div>
                      <div className="text-xs text-foreground/55">{employee.phone || "-"}</div>
                    </div>
                  </TableCell>
                  <TableCell>{formatRoleName(employee.role.name)}</TableCell>
                  <TableCell>{new Date(employee.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <RowActionsDropdown
                        onEdit={
                          canWrite
                            ? () => {
                                setSelectedEmployee(employee);
                                setFormOpen(true);
                              }
                            : undefined
                        }
                        onDelete={canWrite ? () => setDeleteTarget(employee) : undefined}
                        isReadOnly={!canWrite}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {isError ? (
            <div className="border-t border-divider px-6 py-4 text-sm text-danger">
              {error instanceof Error ? error.message : "Unable to load employees."}
            </div>
          ) : null}
        </CardBody>
      </Card>

      <EmployeeFormModal
        isOpen={formOpen}
        employee={selectedEmployee}
        roles={roles}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onClose={closeForm}
        onSave={handleSave}
      />

      <DeleteConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete employee"
        message={
          deleteTarget ? (
            <>
              Are you sure you want to delete <strong>{formatName(deleteTarget)}</strong>?
            </>
          ) : null
        }
        isLoading={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
