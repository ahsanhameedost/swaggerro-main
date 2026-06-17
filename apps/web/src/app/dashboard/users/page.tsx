
"use client";

import { useDeferredValue, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Chip,
  Input,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow
} from "@heroui/react";
import { Plus, Search } from "lucide-react";
import { addToast } from "@heroui/toast";
import { useMe } from "@/queries/auth";
import { useUsers } from "@/lib/queries.catalog";
import { useCreateEmployee, useEmployeeRoles } from "@/queries/users";
import { EmployeeFormModal } from "@/app/components/dashboard/employees/EmployeeFormModal";

function formatRoleName(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function UsersPage() {
  const { data: me } = useMe();
  const canRead = !!me?.permissions?.includes("admin.users.read");
  const canWrite = !!me?.permissions?.includes("admin.users.write");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const { data: users = [], isLoading, isError, error, refetch } = useUsers({ search: deferredSearch });

  const [formOpen, setFormOpen] = useState(false);
  const { data: roles = [] } = useEmployeeRoles(canWrite);
  const createMutation = useCreateEmployee();

  const handleSave = async (values: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    password?: string | null;
    roleId: string;
  }) => {
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

    addToast({ title: "User created", description: "The account was created.", color: "success" });
    setFormOpen(false);
    await refetch();
  };

  if (!canRead) {
    return (
      <Card>
        <CardBody>You do not have permission to view users.</CardBody>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="border border-divider shadow-sm">
        <CardBody className="flex flex-row items-center justify-between gap-4 p-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
            <p className="text-sm text-foreground/60">
              View signed up customers and team members. Use “Add user” to create a team member or
              admin (assign the SUPER_ADMIN role to create another super admin).
            </p>
          </div>
          {canWrite ? (
            <Button
              color="primary"
              startContent={<Plus className="size-4" />}
              onPress={() => setFormOpen(true)}
            >
              Add user
            </Button>
          ) : null}
        </CardBody>
      </Card>

      <Card className="border border-divider shadow-sm">
        <CardBody className="border-b border-divider px-6 py-5">
          <Input
            value={search}
            onValueChange={setSearch}
            placeholder="Search users"
            startContent={<Search className="size-4 text-foreground/40" />}
            className="w-full md:max-w-sm"
          />
        </CardBody>

        <CardBody className="p-0">
          <Table removeWrapper aria-label="Users table">
            <TableHeader>
              <TableColumn>User</TableColumn>
              <TableColumn>Role</TableColumn>
              <TableColumn>Phone</TableColumn>
              <TableColumn>Joined</TableColumn>
            </TableHeader>
            <TableBody
              isLoading={isLoading}
              loadingContent={<Spinner label="Loading users..." />}
              emptyContent="No users found."
            >
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {[user.firstName, user.lastName].filter(Boolean).join(" ") || "Unnamed user"}
                      </div>
                      <div className="text-xs text-foreground/50">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Chip size="sm" variant="flat">
                      {formatRoleName(user.role.name)}
                    </Chip>
                  </TableCell>
                  <TableCell>{user.phone || "-"}</TableCell>
                  <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {isError ? (
            <div className="border-t border-divider px-6 py-4 text-sm text-danger">
              {error instanceof Error ? error.message : "Failed to load users."}
            </div>
          ) : null}
        </CardBody>
      </Card>

      <EmployeeFormModal
        isOpen={formOpen}
        employee={null}
        roles={roles}
        isSubmitting={createMutation.isPending}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
