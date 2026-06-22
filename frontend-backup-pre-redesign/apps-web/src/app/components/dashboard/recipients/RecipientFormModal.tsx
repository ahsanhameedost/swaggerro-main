"use client";

import { useEffect, useMemo } from "react";
import {
  Button,
  Checkbox,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Textarea
} from "@heroui/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Recipient } from "@/modules/recipients/types";

const schema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(120),
  lastName: z.string().trim().min(1, "Last name is required").max(120),
  companyName: z.string().trim().max(160).optional(),
  email: z.string().trim().email("Valid email is required").max(160).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional(),
  addressLine1: z.string().trim().min(1, "Address line 1 is required").max(160),
  addressLine2: z.string().trim().max(160).optional(),
  city: z.string().trim().min(1, "City is required").max(120),
  state: z.string().trim().max(120).optional(),
  postalCode: z.string().trim().min(1, "Postal code is required").max(40),
  countryCode: z.string().trim().length(2, "2-letter country code required").transform((value) => value.toUpperCase()),
  countryName: z.string().trim().min(1, "Country name is required").max(120),
  notes: z.string().trim().max(2000).optional(),
  isDefault: z.boolean().default(false)
});

type RecipientFormValues = z.input<typeof schema>;

type RecipientFormModalProps = {
  isOpen: boolean;
  recipient: Recipient | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (values: {
    firstName: string;
    lastName: string;
    companyName?: string | null;
    email?: string | null;
    phone?: string | null;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state?: string | null;
    postalCode: string;
    countryCode: string;
    countryName: string;
    notes?: string | null;
    isDefault: boolean;
  }) => Promise<void>;
};

export function RecipientFormModal({
  isOpen,
  recipient,
  isSubmitting,
  onClose,
  onSave
}: RecipientFormModalProps) {
  const isEdit = !!recipient;

  const defaultValues = useMemo(
    () => ({
      firstName: recipient?.firstName ?? "",
      lastName: recipient?.lastName ?? "",
      companyName: recipient?.companyName ?? "",
      email: recipient?.email ?? "",
      phone: recipient?.phone ?? "",
      addressLine1: recipient?.addressLine1 ?? "",
      addressLine2: recipient?.addressLine2 ?? "",
      city: recipient?.city ?? "",
      state: recipient?.state ?? "",
      postalCode: recipient?.postalCode ?? "",
      countryCode: recipient?.countryCode ?? "US",
      countryName: recipient?.countryName ?? "United States",
      notes: recipient?.notes ?? "",
      isDefault: recipient?.isDefault ?? false
    }),
    [recipient]
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<RecipientFormValues>({
    resolver: zodResolver(schema),
    defaultValues
  });

  useEffect(() => {
    if (isOpen) {
      reset(defaultValues);
    }
  }, [defaultValues, isOpen, reset]);

  const isDefault = watch("isDefault");

  const submit = handleSubmit(async (values) => {
    await onSave({
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      companyName: values.companyName?.trim() || null,
      email: values.email?.trim() || null,
      phone: values.phone?.trim() || null,
      addressLine1: values.addressLine1.trim(),
      addressLine2: values.addressLine2?.trim() || null,
      city: values.city.trim(),
      state: values.state?.trim() || null,
      postalCode: values.postalCode.trim(),
      countryCode: values.countryCode.trim().toUpperCase(),
      countryName: values.countryName.trim(),
      notes: values.notes?.trim() || null,
      isDefault: Boolean(values.isDefault)
    });
  });

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)} size="3xl">
      <ModalContent>
        {() => (
          <>
            <ModalHeader>{isEdit ? "Update recipient" : "Create recipient"}</ModalHeader>
            <ModalBody>
              <form id="recipient-form" className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
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
                  label="Company"
                  isInvalid={!!errors.companyName}
                  errorMessage={errors.companyName?.message}
                  {...register("companyName")}
                />
                <Input
                  label="Email"
                  type="email"
                  isInvalid={!!errors.email}
                  errorMessage={errors.email?.message}
                  {...register("email")}
                />
                <Input
                  label="Phone"
                  isInvalid={!!errors.phone}
                  errorMessage={errors.phone?.message}
                  {...register("phone")}
                />
                <div />
                <Input
                  label="Address line 1"
                  className="md:col-span-2"
                  isRequired
                  isInvalid={!!errors.addressLine1}
                  errorMessage={errors.addressLine1?.message}
                  {...register("addressLine1")}
                />
                <Input
                  label="Address line 2"
                  className="md:col-span-2"
                  isInvalid={!!errors.addressLine2}
                  errorMessage={errors.addressLine2?.message}
                  {...register("addressLine2")}
                />
                <Input
                  label="City"
                  isRequired
                  isInvalid={!!errors.city}
                  errorMessage={errors.city?.message}
                  {...register("city")}
                />
                <Input
                  label="State / Region"
                  isInvalid={!!errors.state}
                  errorMessage={errors.state?.message}
                  {...register("state")}
                />
                <Input
                  label="Postal code"
                  isRequired
                  isInvalid={!!errors.postalCode}
                  errorMessage={errors.postalCode?.message}
                  {...register("postalCode")}
                />
                <Input
                  label="Country code"
                  isRequired
                  isInvalid={!!errors.countryCode}
                  errorMessage={errors.countryCode?.message}
                  {...register("countryCode")}
                />
                <Input
                  label="Country name"
                  className="md:col-span-2"
                  isRequired
                  isInvalid={!!errors.countryName}
                  errorMessage={errors.countryName?.message}
                  {...register("countryName")}
                />
                <Textarea
                  label="Notes"
                  className="md:col-span-2"
                  isInvalid={!!errors.notes}
                  errorMessage={errors.notes?.message}
                  {...register("notes")}
                />
                <div className="md:col-span-2">
                  <Checkbox isSelected={isDefault} onValueChange={(checked) => setValue("isDefault", checked)}>
                    Set as default recipient
                  </Checkbox>
                </div>
              </form>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onClose}>
                Cancel
              </Button>
              <Button
                color="primary"
                form="recipient-form"
                type="submit"
                isLoading={isSubmitting}
                style={{ backgroundImage: "var(--primary-gradient)" }}
              >
                {isEdit ? "Save changes" : "Create recipient"}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
