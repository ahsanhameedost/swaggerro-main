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
  Textarea
} from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { RoleWithPermissions } from "@/modules/rbac/types";

const formSchema = z.object({
  name: z.string().trim().min(1, "Role name is required").max(80),
  description: z.string().trim().max(200).optional()
});

type RoleFormValues = z.infer<typeof formSchema>;

type RoleFormModalProps = {
  isOpen: boolean;
  role: RoleWithPermissions | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (values: { name: string; description?: string | null }) => Promise<void>;
};

export function RoleFormModal({
  isOpen,
  role,
  isSubmitting,
  onClose,
  onSave
}: RoleFormModalProps) {
  const isEdit = !!role;

  const defaultValues: RoleFormValues = useMemo(
    () => ({
      name: role?.name ?? "",
      description: role?.description ?? ""
    }),
    [role]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<RoleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  useEffect(() => {
    if (!isOpen) return;
    reset(defaultValues);
  }, [defaultValues, isOpen, reset]);

  const submit = handleSubmit(async (values) => {
    await onSave({
      name: values.name.trim(),
      description: values.description?.trim() || null
    });
  });

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)} size="lg">
      <ModalContent>
        {() => (
          <>
            <ModalHeader>{isEdit ? "Update role" : "Create role"}</ModalHeader>
            <ModalBody>
              <form id="role-form" className="grid gap-4" onSubmit={submit}>
                <Input
                  label="Role name"
                  description="Use a readable name. It will be saved in uppercase underscore format."
                  isRequired
                  isInvalid={!!errors.name}
                  errorMessage={errors.name?.message}
                  {...register("name")}
                />
                <Textarea
                  label="Description"
                  minRows={3}
                  isInvalid={!!errors.description}
                  errorMessage={errors.description?.message}
                  {...register("description")}
                />
              </form>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onClose}>
                Cancel
              </Button>
              <Button
                color="primary"
                form="role-form"
                type="submit"
                isLoading={isSubmitting}
                style={{ backgroundImage: "var(--primary-gradient)" }}
              >
                {isEdit ? "Save changes" : "Create role"}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
