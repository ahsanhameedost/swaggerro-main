
"use client";

import { useDeferredValue, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow
} from "@heroui/react";
import { KeyRound, Plus, Search } from "lucide-react";
import { addToast } from "@heroui/toast";
import { useMe } from "@/queries/auth";
import { useUsers } from "@/lib/queries.catalog";
import { useCreateEmployee, useEmployeeRoles } from "@/queries/users";
import { resetUserPassword } from "@/modules/users/api";
import type { AppUserListItem } from "@/modules/users/types";
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
  const isSuperAdmin = me?.role === "SUPER_ADMIN";
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const { data: users = [], isLoading, isError, error, refetch } = useUsers({ search: deferredSearch });

  const [formOpen, setFormOpen] = useState(false);
  const { data: roles = [] } = useEmployeeRoles(canWrite);
  const createMutation = useCreateEmployee();

  // Reset-password modal state.
  const [resetTarget, setResetTarget] = useState<AppUserListItem | null>(null);
  const [newPw, setNewPw] = useState("");
  const [resetting, setResetting] = useState(false);

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

  const submitReset = async () => {
    if (!resetTarget) return;
    if (newPw.length < 8) {
      addToast({ title: "Password too short", description: "Use at least 8 characters.", color: "warning" });
      return;
    }
    setResetting(true);
    try {
      await resetUserPassword(resetTarget.id, newPw);
      addToast({ title: "Password reset", description: `New password set for ${resetTarget.email}.`, color: "success" });
      setResetTarget(null);
      setNewPw("");
      await refetch();
    } catch (err: any) {
      addToast({ title: "Reset failed", description: err?.message ?? "Try again.", color: "danger" });
    } finally {
      setResetting(false);
    }
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
              {[
                <TableColumn key="user">User</TableColumn>,
                <TableColumn key="role">Role</TableColumn>,
                <TableColumn key="phone">Phone</TableColumn>,
                <TableColumn key="joined">Joined</TableColumn>,
                ...(isSuperAdmin
                  ? [<TableColumn key="pw">Password (encrypted)</TableColumn>]
                  : []),
                ...(canWrite ? [<TableColumn key="act">Actions</TableColumn>] : []),
              ]}
            </TableHeader>
            <TableBody
              isLoading={isLoading}
              loadingContent={<Spinner label="Loading users..." />}
              emptyContent="No users found."
            >
              {users.map((user) => (
                <TableRow key={user.id}>
                  {[
                    <TableCell key="user">
                      <div className="space-y-1">
                        <div className="font-medium">
                          {[user.firstName, user.lastName].filter(Boolean).join(" ") || "Unnamed user"}
                        </div>
                        <div className="text-xs text-foreground/50">{user.email}</div>
                        {isSuperAdmin && user.username ? (
                          <div className="text-xs text-foreground/40">@{user.username}</div>
                        ) : null}
                      </div>
                    </TableCell>,
                    <TableCell key="role">
                      <Chip size="sm" variant="flat">
                        {formatRoleName(user.role.name)}
                      </Chip>
                    </TableCell>,
                    <TableCell key="phone">{user.phone || "-"}</TableCell>,
                    <TableCell key="joined">{new Date(user.createdAt).toLocaleDateString()}</TableCell>,
                    ...(isSuperAdmin
                      ? [
                          <TableCell key="pw">
                            <div className="flex items-center gap-2">
                              <code
                                title={user.passwordHash ?? ""}
                                className="max-w-[200px] truncate rounded bg-default-100 px-2 py-1 font-mono text-xs text-foreground/60"
                              >
                                {user.passwordHash ?? "—"}
                              </code>
                              {user.passwordHash ? (
                                <Button
                                  size="sm"
                                  variant="light"
                                  isIconOnly
                                  aria-label="Copy hash"
                                  onPress={() => {
                                    void navigator.clipboard?.writeText(user.passwordHash ?? "");
                                    addToast({ title: "Copied", color: "success" });
                                  }}
                                >
                                  ⧉
                                </Button>
                              ) : null}
                            </div>
                            {user.mustSetPassword ? (
                              <span className="text-[11px] text-warning">awaiting account setup</span>
                            ) : null}
                          </TableCell>,
                        ]
                      : []),
                    ...(canWrite
                      ? [
                          <TableCell key="act">
                            <Button
                              size="sm"
                              variant="flat"
                              startContent={<KeyRound className="size-3.5" />}
                              onPress={() => {
                                setResetTarget(user);
                                setNewPw("");
                              }}
                            >
                              Reset password
                            </Button>
                          </TableCell>,
                        ]
                      : []),
                  ]}
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

      <Modal isOpen={!!resetTarget} onClose={() => setResetTarget(null)}>
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            Reset password
            <span className="text-sm font-normal text-foreground/60">{resetTarget?.email}</span>
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-foreground/60">
              Set a new password for this user. They can sign in with it immediately and change it later.
            </p>
            <Input
              type="password"
              label="New password"
              placeholder="At least 8 characters"
              value={newPw}
              onValueChange={setNewPw}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setResetTarget(null)}>
              Cancel
            </Button>
            <Button color="primary" isLoading={resetting} onPress={submitReset}>
              Set password
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
