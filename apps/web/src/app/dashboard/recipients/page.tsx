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
import { addToast } from "@heroui/toast";
import { ContactRound, Plus, Search } from "lucide-react";
import { useMe } from "@/queries/auth";
import {
  useCreateRecipient,
  useDeleteRecipient,
  useRecipients,
  useUpdateRecipient
} from "@/queries/recipients";
import type { Recipient } from "@/modules/recipients/types";
import { RecipientFormModal } from "@/app/components/dashboard/recipients/RecipientFormModal";
import { DeleteConfirmDialog } from "@/app/components/dashboard/shared/DeleteConfirmDialog";
import { RowActionsDropdown } from "@/app/components/dashboard/shared/RowActionsDropdown";

function formatRecipientName(recipient: Recipient) {
  return [recipient.firstName, recipient.lastName].filter(Boolean).join(" ").trim();
}

export default function RecipientsPage() {
  const { data: user } = useMe();
  const canRead = !!user?.permissions?.some((permission) => ["recipients.read", "recipients.self.read"].includes(permission));
  const canWrite = !!user?.permissions?.some((permission) => ["recipients.write", "recipients.self.write"].includes(permission));

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Recipient | null>(null);

  const deferredSearch = useDeferredValue(search);
  const {
    data: recipients = [],
    isLoading,
    isFetching,
    isError,
    error
  } = useRecipients({ search: deferredSearch }, canRead);

  const createMutation = useCreateRecipient();
  const updateMutation = useUpdateRecipient();
  const deleteMutation = useDeleteRecipient();

  const closeForm = () => {
    setFormOpen(false);
    setSelectedRecipient(null);
  };

  const handleSave = async (values: {
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
  }) => {
    try {
      if (selectedRecipient) {
        await updateMutation.mutateAsync({
          id: selectedRecipient.id,
          input: values
        });
        addToast({
          title: "Recipient updated",
          description: "Recipient details were saved.",
          color: "success"
        });
      } else {
        await createMutation.mutateAsync(values);
        addToast({
          title: "Recipient created",
          description: "This shipping recipient is now saved to your dashboard.",
          color: "success"
        });
      }

      closeForm();
    } catch (e: any) {
      addToast({
        title: "Save failed",
        description: e?.message ?? "Unable to save recipient.",
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
        title: "Recipient deleted",
        description: `${formatRecipientName(deleteTarget)} was removed.`,
        color: "success"
      });
      setDeleteTarget(null);
    } catch (e: any) {
      addToast({
        title: "Delete failed",
        description: e?.message ?? "Unable to delete recipient.",
        color: "danger"
      });
    }
  };

  if (!canRead) {
    return (
      <Card>
        <CardBody>You do not have permission to view recipients.</CardBody>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="border border-divider shadow-sm">
        <CardBody className="flex flex-col gap-4 p-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Recipients</h1>
            <p className="text-sm text-foreground/60">
              Save recipient addresses to reuse them while planning shipments.
            </p>
          </div>

          {canWrite ? (
            <Button
              color="primary"
              startContent={<Plus className="size-4" />}
              onPress={() => {
                setSelectedRecipient(null);
                setFormOpen(true);
              }}
              style={{ backgroundImage: "var(--primary-gradient)" }}
            >
              Add recipient
            </Button>
          ) : null}
        </CardBody>
      </Card>

      <Card className="border border-divider shadow-sm">
        <CardBody className="border-b border-divider px-6 py-5">
          <Input
            value={search}
            onValueChange={setSearch}
            placeholder="Search recipients"
            startContent={<Search className="size-4 text-foreground/40" />}
            className="w-full md:max-w-sm"
          />
        </CardBody>

        <CardBody className="p-0">
          <Table removeWrapper aria-label="Recipients table">
            <TableHeader>
              <TableColumn>Recipient</TableColumn>
              <TableColumn>Address</TableColumn>
              <TableColumn>Country</TableColumn>
              <TableColumn className="text-center">Actions</TableColumn>
            </TableHeader>
            <TableBody
              isLoading={isLoading || isFetching}
              loadingContent={<Spinner label="Loading recipients..." />}
              emptyContent={
                <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
                  <div
                    className="inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white"
                    style={{ backgroundImage: "var(--primary-gradient)" }}
                  >
                    <ContactRound className="size-6" />
                  </div>
                  <div>
                    <div className="font-semibold">No recipients found</div>
                    <div className="text-sm text-foreground/60">
                      Create a saved address before planning shipments.
                    </div>
                  </div>
                </div>
              }
            >
              {recipients.map((recipient) => (
                <TableRow key={recipient.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{formatRecipientName(recipient)}</div>
                        {recipient.isDefault ? (
                          <Chip size="sm" color="primary" variant="flat">
                            Default
                          </Chip>
                        ) : null}
                      </div>
                      <div className="text-xs text-foreground/55">{recipient.email || "-"}</div>
                      <div className="text-xs text-foreground/55">{recipient.phone || "-"}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-sm text-foreground/65">
                      <div>{recipient.addressLine1}</div>
                      {recipient.addressLine2 ? <div>{recipient.addressLine2}</div> : null}
                      <div>
                        {recipient.city}
                        {recipient.state ? `, ${recipient.state}` : ""} {recipient.postalCode}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{recipient.countryName}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <RowActionsDropdown
                        onEdit={
                          canWrite
                            ? () => {
                                setSelectedRecipient(recipient);
                                setFormOpen(true);
                              }
                            : undefined
                        }
                        onDelete={canWrite ? () => setDeleteTarget(recipient) : undefined}
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
              {error instanceof Error ? error.message : "Unable to load recipients."}
            </div>
          ) : null}
        </CardBody>
      </Card>

      <RecipientFormModal
        isOpen={formOpen}
        recipient={selectedRecipient}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onClose={closeForm}
        onSave={handleSave}
      />

      <DeleteConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete recipient"
        message={
          deleteTarget ? (
            <>
              Are you sure you want to delete <strong>{formatRecipientName(deleteTarget)}</strong>?
            </>
          ) : (
            "Are you sure you want to delete this recipient?"
          )
        }
        isLoading={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
