"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionItem,
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  Chip
} from "@heroui/react";
import { addToast } from "@heroui/toast";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMe } from "@/queries/auth";
import {
  useAllPermissions,
  useCreateRole,
  useDeleteRole,
  useReplaceRolePermissions,
  useRolesWithPermissions,
  useUpdateRole
} from "@/queries/rbac";
import type { RoleWithPermissions } from "@/modules/rbac/types";
import { DeleteConfirmDialog } from "@/app/components/dashboard/shared/DeleteConfirmDialog";
import { RoleFormModal } from "@/app/components/dashboard/permissions/RoleFormModal";

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function PermissionsPage() {
  const { data: user } = useMe();
  const canManage = !!user?.permissions?.includes("rbac.manage");

  const { data: permsRes, isLoading: permsLoading } = useAllPermissions();
  const { data: rolesRes, isLoading: rolesLoading } = useRolesWithPermissions();
  const saveMut = useReplaceRolePermissions();
  const createRoleMut = useCreateRole();
  const updateRoleMut = useUpdateRole();
  const deleteRoleMut = useDeleteRole();

  const allPermissions = useMemo(() => permsRes?.permissions ?? [], [permsRes]);
  const roles = useMemo(() => rolesRes?.roles ?? [], [rolesRes]);

  const [local, setLocal] = useState<Record<string, Set<string>>>({});
  const [roleFormOpen, setRoleFormOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleWithPermissions | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleWithPermissions | null>(null);

  useEffect(() => {
    const next: Record<string, Set<string>> = {};
    for (const role of roles) next[role.id] = new Set(role.permissionKeys);
    setLocal(next);
  }, [rolesRes?.roles]);

  if (!canManage) {
    return (
      <Card>
        <CardHeader className="flex flex-col items-start gap-1">
          <div className="text-xl font-semibold">Manage permissions</div>
        </CardHeader>
        <CardBody>Access denied.</CardBody>
      </Card>
    );
  }

  const isLoading = permsLoading || rolesLoading;

  const toggle = (roleId: string, key: string) => {
    setLocal((prev) => {
      const set = new Set(prev[roleId] ?? []);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return { ...prev, [roleId]: set };
    });
  };

  const handleRoleSave = async (values: { name: string; description?: string | null }) => {
    try {
      if (selectedRole) {
        await updateRoleMut.mutateAsync({ roleId: selectedRole.id, input: values });
        addToast({
          title: "Role updated",
          description: "Role details were saved.",
          color: "success"
        });
      } else {
        await createRoleMut.mutateAsync(values);
        addToast({
          title: "Role created",
          description: "You can now assign permissions and use it for employees.",
          color: "success"
        });
      }

      setRoleFormOpen(false);
      setSelectedRole(null);
    } catch (error: any) {
      addToast({
        title: "Save failed",
        description: error?.message ?? "Could not save role.",
        color: "danger"
      });
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      await deleteRoleMut.mutateAsync(deleteTarget.id);
      addToast({
        title: "Role deleted",
        description: `${titleCase(deleteTarget.name)} was removed.`,
        color: "success"
      });
      setDeleteTarget(null);
    } catch (error: any) {
      addToast({
        title: "Delete failed",
        description: error?.message ?? "Could not delete role.",
        color: "danger"
      });
    }
  };

  const onSavePermissions = async (roleId: string) => {
    try {
      const keys = Array.from(local[roleId] ?? []).sort();
      await saveMut.mutateAsync({ roleId, permissionKeys: keys });
      addToast({ title: "Saved", description: "Role permissions updated", color: "success" });
    } catch (error: any) {
      addToast({
        title: "Save failed",
        description: error?.message ?? "Could not update permissions",
        color: "danger"
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="border border-divider shadow-sm">
        <CardBody className="flex flex-col gap-4 p-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Roles & permissions</h1>
            <p className="text-sm text-foreground/60">
              Create internal roles, edit their details, and control which permissions each role gets.
            </p>
          </div>

          <Button
            color="primary"
            startContent={<Plus className="size-4" />}
            onPress={() => {
              setSelectedRole(null);
              setRoleFormOpen(true);
            }}
            style={{ backgroundImage: "var(--primary-gradient)" }}
          >
            Create role
          </Button>
        </CardBody>
      </Card>

      <Card className="border border-divider shadow-sm">
        <CardHeader className="flex flex-col items-start gap-1 px-6 pt-6">
          <div className="text-xl font-semibold">Manage role permissions</div>
          <div className="text-sm text-foreground/60">
            Super admin stays protected. User permissions can be edited, but system roles cannot be renamed or deleted.
          </div>
        </CardHeader>
        <CardBody className="flex flex-col gap-4 p-6">
          <Accordion selectionMode="multiple" variant="splitted">
            {roles.map((role) => (
              <AccordionItem
                key={role.id}
                aria-label={role.name}
                title={
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{titleCase(role.name)}</span>
                    {role.isSystem ? (
                      <Chip size="sm" variant="flat" color="default">
                        System
                      </Chip>
                    ) : null}
                    <Chip size="sm" variant="flat" color="primary">
                      {role.userCount} user{role.userCount === 1 ? "" : "s"}
                    </Chip>
                  </div>
                }
                subtitle={role.description ?? "No description provided."}
              >
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {allPermissions.map((permission) => {
                      if (permission.key === "rbac.manage") return null;

                      const checked = !!local[role.id]?.has(permission.key);
                      return (
                        <Checkbox
                          key={permission.key}
                          isSelected={checked}
                          onValueChange={() => toggle(role.id, permission.key)}
                        >
                          <div className="flex flex-col">
                            <div className="text-sm font-medium">{permission.key}</div>
                            <div className="text-xs text-foreground/60">{permission.description ?? ""}</div>
                          </div>
                        </Checkbox>
                      );
                    })}
                  </div>

                  <div className="flex flex-col gap-3 border-t border-divider pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-2">
                      <Button
                        variant="flat"
                        startContent={<Pencil className="size-4" />}
                        isDisabled={role.isSystem}
                        onPress={() => {
                          setSelectedRole(role);
                          setRoleFormOpen(true);
                        }}
                      >
                        Edit role
                      </Button>
                      <Button
                        variant="flat"
                        color="danger"
                        startContent={<Trash2 className="size-4" />}
                        isDisabled={role.isSystem || role.userCount > 0}
                        onPress={() => setDeleteTarget(role)}
                      >
                        Delete role
                      </Button>
                    </div>

                    <Button
                      color="primary"
                      onPress={() => onSavePermissions(role.id)}
                      isLoading={saveMut.isPending || isLoading}
                      style={{ backgroundImage: "var(--primary-gradient)" }}
                    >
                      Save permissions
                    </Button>
                  </div>
                </div>
              </AccordionItem>
            ))}
          </Accordion>
        </CardBody>
      </Card>

      <RoleFormModal
        isOpen={roleFormOpen}
        role={selectedRole}
        isSubmitting={createRoleMut.isPending || updateRoleMut.isPending}
        onClose={() => {
          setRoleFormOpen(false);
          setSelectedRole(null);
        }}
        onSave={handleRoleSave}
      />

      <DeleteConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete role"
        message={
          deleteTarget ? (
            <>
              Are you sure you want to delete <strong>{titleCase(deleteTarget.name)}</strong>?
            </>
          ) : null
        }
        isLoading={deleteRoleMut.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteRole}
      />
    </div>
  );
}
