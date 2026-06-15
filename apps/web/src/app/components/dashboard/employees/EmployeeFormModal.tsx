"use client";

import { useEffect, useMemo } from "react";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem
} from "@heroui/react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { AppUserListItem, AssignableRole } from "@/modules/users/types";

const formSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  email: z.string().trim().email("Valid email is required").max(160),
  phone: z.string().trim().max(40).optional(),
  password: z.string().trim().max(100).optional(),
  roleId: z.string().trim().min(1, "Role is required")
});

export type EmployeeFormValues = z.infer<typeof formSchema>;

type EmployeeFormModalProps = {
  isOpen: boolean;
  employee: AppUserListItem | null;
  roles: AssignableRole[];
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (values: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    password?: string | null;
    roleId: string;
  }) => Promise<void>;
};

function formatRoleName(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function EmployeeFormModal({
  isOpen,
  employee,
  roles,
  isSubmitting,
  onClose,
  onSave
}: EmployeeFormModalProps) {
  const isEdit = !!employee;

  const defaultValues: EmployeeFormValues = useMemo(
    () => ({
      firstName: employee?.firstName ?? "",
      lastName: employee?.lastName ?? "",
      email: employee?.email ?? "",
      phone: employee?.phone ?? "",
      password: "",
      roleId: employee?.role.id ?? roles[0]?.id ?? ""
    }),
    [employee, roles]
  );

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors }
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  useEffect(() => {
    if (!isOpen) return;
    reset(defaultValues);
  }, [defaultValues, isOpen, reset]);

  const submit = handleSubmit(async (values) => {
    const trimmedPassword = values.password?.trim() ?? "";

    if (!isEdit && trimmedPassword.length < 8) {
      setError("password", {
        type: "manual",
        message: "Password must be at least 8 characters"
      });
      return;
    }

    await onSave({
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
      phone: values.phone?.trim() || null,
      password: trimmedPassword || null,
      roleId: values.roleId
    });
  });

  const hasRoles = roles.length > 0;

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)} size="2xl">
      <ModalContent>
        {() => (
          <>
            <ModalHeader>{isEdit ? "Update employee" : "Create employee"}</ModalHeader>
            <ModalBody>
              <form id="employee-form" className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
                <Input
                  label="First name"
                  isRequired
                  isInvalid={!!errors.firstName}
                  errorMessage={errors.firstName?.message}
                  {...register("firstName")}
                />
                <Input
                  label="Last name"
                  isRequired
                  isInvalid={!!errors.lastName}
                  errorMessage={errors.lastName?.message}
                  {...register("lastName")}
                />
                <Input
                  label="Business email"
                  type="email"
                  className="md:col-span-2"
                  isRequired
                  isInvalid={!!errors.email}
                  errorMessage={errors.email?.message}
                  {...register("email")}
                />
                <Controller
                  control={control}
                  name="roleId"
                  render={({ field }) => (
                    <Select
                      label="Role"
                      className="md:col-span-2"
                      isRequired
                      selectedKeys={field.value ? [field.value] : []}
                      onSelectionChange={(keys) => {
                        const value = Array.from(keys as Set<string>)[0];
                        field.onChange(String(value ?? ""));
                      }}
                      isInvalid={!!errors.roleId}
                      errorMessage={errors.roleId?.message}
                      placeholder={hasRoles ? "Select a role" : "Create a role first"}
                      isDisabled={!hasRoles}
                      description={
                        hasRoles
                          ? "Choose the internal role this employee should use."
                          : "No internal roles exist yet. Create one in Roles & permissions first."
                      }
                    >
                      {roles.map((role) => (
                        <SelectItem key={role.id} textValue={formatRoleName(role.name)}>
                          {formatRoleName(role.name)}
                        </SelectItem>
                      ))}
                    </Select>
                  )}
                />
                <Input
                  label="Phone"
                  className="md:col-span-2"
                  isInvalid={!!errors.phone}
                  errorMessage={errors.phone?.message}
                  {...register("phone")}
                />
                <Input
                  label={isEdit ? "Reset password" : "Password"}
                  type="password"
                  className="md:col-span-2"
                  placeholder={isEdit ? "Leave blank to keep current password" : undefined}
                  isRequired={!isEdit}
                  isInvalid={!!errors.password}
                  errorMessage={errors.password?.message}
                  {...register("password")}
                />
              </form>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onClose}>
                Cancel
              </Button>
              <Button
                color="primary"
                form="employee-form"
                type="submit"
                isLoading={isSubmitting}
                isDisabled={!hasRoles}
                style={{ backgroundImage: "var(--primary-gradient)" }}
              >
                {isEdit ? "Save changes" : "Create employee"}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
