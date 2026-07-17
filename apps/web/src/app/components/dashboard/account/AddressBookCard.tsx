"use client";

import { useState } from "react";
import { Button, Card, CardBody, CardHeader, Chip, Spinner } from "@heroui/react";
import { addToast } from "@heroui/toast";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import {
  useCreateRecipient,
  useDeleteRecipient,
  useRecipients,
  useUpdateRecipient
} from "@/queries/recipients";
import type { CreateRecipientInput, Recipient } from "@/modules/recipients/types";
import { RecipientFormModal } from "@/app/components/dashboard/recipients/RecipientFormModal";
import { DeleteConfirmDialog } from "@/app/components/dashboard/shared/DeleteConfirmDialog";

function formatName(r: Recipient) {
  return [r.firstName, r.lastName].filter(Boolean).join(" ").trim() || "Recipient";
}

// Single-line, human-readable address for the card preview.
function formatAddress(r: Recipient) {
  return [
    r.addressLine1,
    r.addressLine2,
    [r.city, r.state].filter(Boolean).join(", "),
    [r.postalCode, r.countryName].filter(Boolean).join(" ")
  ]
    .filter(Boolean)
    .join(", ");
}

export function AddressBookCard({ canManage }: { canManage: boolean }) {
  const { data: recipients, isLoading } = useRecipients();
  const createRecipient = useCreateRecipient();
  const updateRecipient = useUpdateRecipient();
  const deleteRecipient = useDeleteRecipient();

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Recipient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Recipient | null>(null);

  const openCreate = () => {
    setEditTarget(null);
    setFormOpen(true);
  };

  const openEdit = (recipient: Recipient) => {
    setEditTarget(recipient);
    setFormOpen(true);
  };

  const handleSave = async (values: CreateRecipientInput) => {
    try {
      if (editTarget) {
        await updateRecipient.mutateAsync({ id: editTarget.id, input: values });
        addToast({ title: "Address updated", color: "success" });
      } else {
        await createRecipient.mutateAsync(values);
        addToast({ title: "Address saved", color: "success" });
      }
      setFormOpen(false);
      setEditTarget(null);
    } catch (err) {
      addToast({
        title: "Could not save address",
        description: err instanceof Error ? err.message : "Please try again.",
        color: "danger"
      });
    }
  };

  const handleMakeDefault = async (recipient: Recipient) => {
    try {
      await updateRecipient.mutateAsync({ id: recipient.id, input: { isDefault: true } });
      addToast({ title: "Default address updated", color: "success" });
    } catch (err) {
      addToast({
        title: "Could not update default",
        description: err instanceof Error ? err.message : "Please try again.",
        color: "danger"
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRecipient.mutateAsync(deleteTarget.id);
      addToast({ title: "Address removed", color: "success" });
      setDeleteTarget(null);
    } catch (err) {
      addToast({
        title: "Could not remove address",
        description: err instanceof Error ? err.message : "Please try again.",
        color: "danger"
      });
    }
  };

  const list = recipients ?? [];

  return (
    <Card className="border border-divider shadow-sm">
      <CardHeader className="flex items-center justify-between p-6 pb-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-foreground/70" />
          <div>
            <div className="text-lg font-semibold">Saved addresses</div>
            <div className="text-sm text-foreground/60">
              Save your shipping addresses to reuse them at checkout.
            </div>
          </div>
        </div>
        {canManage ? (
          <Button
            color="primary"
            size="sm"
            startContent={<Plus className="h-4 w-4" />}
            onPress={openCreate}
            className="rounded-2xl text-white"
            style={{ backgroundImage: "var(--primary-gradient)" }}
          >
            Add address
          </Button>
        ) : null}
      </CardHeader>
      <CardBody className="p-6 pt-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner label="Loading addresses..." />
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-divider p-8 text-center">
            <MapPin className="mx-auto h-8 w-8 text-foreground/30" />
            <p className="mt-3 text-sm text-foreground/60">
              You haven&apos;t saved any addresses yet.
            </p>
            {canManage ? (
              <Button
                variant="flat"
                size="sm"
                startContent={<Plus className="h-4 w-4" />}
                onPress={openCreate}
                className="mt-4 rounded-2xl"
              >
                Add your first address
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {list.map((recipient) => (
              <div
                key={recipient.id}
                className="flex flex-col gap-3 rounded-2xl border border-divider p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold">{formatName(recipient)}</span>
                      {recipient.isDefault ? (
                        <Chip size="sm" color="primary" variant="flat" startContent={<Star className="h-3 w-3" />}>
                          Default
                        </Chip>
                      ) : null}
                    </div>
                    {recipient.companyName ? (
                      <div className="truncate text-sm text-foreground/60">{recipient.companyName}</div>
                    ) : null}
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-foreground/70">{formatAddress(recipient)}</p>
                {recipient.phone ? (
                  <p className="text-xs text-foreground/50">{recipient.phone}</p>
                ) : null}
                {canManage ? (
                  <div className="mt-auto flex items-center gap-1 pt-1">
                    {!recipient.isDefault ? (
                      <Button
                        size="sm"
                        variant="light"
                        startContent={<Star className="h-3.5 w-3.5" />}
                        onPress={() => handleMakeDefault(recipient)}
                        className="rounded-xl text-xs"
                      >
                        Set default
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="light"
                      isIconOnly
                      aria-label="Edit address"
                      onPress={() => openEdit(recipient)}
                      className="ml-auto rounded-xl"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="light"
                      isIconOnly
                      color="danger"
                      aria-label="Delete address"
                      onPress={() => setDeleteTarget(recipient)}
                      className="rounded-xl"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardBody>

      <RecipientFormModal
        isOpen={formOpen}
        recipient={editTarget}
        isSubmitting={createRecipient.isPending || updateRecipient.isPending}
        onClose={() => {
          setFormOpen(false);
          setEditTarget(null);
        }}
        onSave={handleSave}
      />

      <DeleteConfirmDialog
        isOpen={!!deleteTarget}
        title="Remove address"
        message={
          deleteTarget ? (
            <span>
              Remove <strong>{formatName(deleteTarget)}</strong> from your saved addresses?
            </span>
          ) : (
            "Remove this address?"
          )
        }
        isLoading={deleteRecipient.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </Card>
  );
}
