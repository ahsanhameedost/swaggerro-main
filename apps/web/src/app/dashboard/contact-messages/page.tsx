"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
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
import { Mailbox, Search } from "lucide-react";
import { useMe } from "@/queries/auth";
import type { ContactMessageListItem } from "@/lib/contact";
import {
  useContactMessage,
  useContactMessages,
  useDeleteContactMessage
} from "@/lib/queries.contact";
import { DataPagination } from "@/app/components/dashboard/shared/DataPagination";
import { DeleteConfirmDialog } from "@/app/components/dashboard/shared/DeleteConfirmDialog";
import { RowActionsDropdown } from "@/app/components/dashboard/shared/RowActionsDropdown";
import { ContactMessageDetailsModal } from "@/app/components/dashboard/contact/ContactMessageDetailsModal";

function EmptyState() {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
      <div
        className="inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white"
        style={{ backgroundImage: "var(--primary-gradient)" }}
      >
        <Mailbox className="size-6" />
      </div>
      <div>
        <div className="font-semibold">No contact messages yet</div>
        <div className="text-sm text-foreground/60">New inquiries will appear here.</div>
      </div>
    </div>
  );
}

export default function ContactMessagesPage() {
  const { data: me } = useMe();
  const canRead = !!me?.permissions?.includes("contact.messages.read");
  const canDelete = !!me?.permissions?.includes("contact.messages.delete");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [viewId, setViewId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContactMessageListItem | null>(null);

  const deferredSearch = useDeferredValue(search);
  const queryParams = useMemo(
    () => ({
      search: deferredSearch,
      page,
      pageSize
    }),
    [deferredSearch, page, pageSize]
  );

  const { data, isLoading, isFetching, isError, error } = useContactMessages(queryParams);
  const { data: detail, isLoading: isLoadingDetails } = useContactMessage(viewId);
  const deleteMutation = useDeleteContactMessage();

  const items = data?.items ?? [];
  const pagination = data?.pagination ?? {
    page,
    pageSize,
    total: 0,
    totalPages: 1
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      addToast({
        title: "Contact message deleted",
        description: "The inquiry and its requested products were removed.",
        color: "success"
      });
      setDeleteTarget(null);
      if (items.length === 1 && pagination.page > 1) {
        setPage((current) => current - 1);
      }
    } catch (deleteError: any) {
      addToast({
        title: "Delete failed",
        description: deleteError?.message ?? "Could not delete this contact message",
        color: "danger"
      });
    }
  };

  if (!canRead) {
    return (
      <div className="p-6">
        <Card>
          <CardBody>You do not have permission to view contact messages.</CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Card className="border border-divider shadow-sm">
        <CardBody className="flex flex-col gap-3 p-6">
          <h1 className="text-2xl font-semibold tracking-tight">Contact messages</h1>
          <p className="text-sm text-foreground/60">
            Review inquiries submitted from the contact form, inspect requested products, and delete spam or duplicate entries.
          </p>
        </CardBody>
      </Card>

      <Card className="border border-divider shadow-sm">
        <CardHeader className="flex flex-col gap-4 border-b border-divider px-6 py-5 md:flex-row md:items-center md:justify-between">
          <Input
            value={search}
            onValueChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search company, contact, or email"
            startContent={<Search className="size-4 text-foreground/40" />}
            className="w-full md:max-w-sm"
          />

          <DataPagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            totalPages={pagination.totalPages}
            disabled={isLoading || isFetching}
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(1);
            }}
          />
        </CardHeader>

        <CardBody className="p-0">
          <Table removeWrapper aria-label="Contact messages table">
            <TableHeader>
              <TableColumn>Contact</TableColumn>
              <TableColumn>Company</TableColumn>
              <TableColumn>Requested Products</TableColumn>
              <TableColumn>Submitted</TableColumn>
              <TableColumn align="end">Actions</TableColumn>
            </TableHeader>
            <TableBody
              isLoading={isLoading}
              loadingContent={<Spinner label="Loading contact messages..." />}
              emptyContent={isLoading ? null : <EmptyState />}
            >
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{item.contactName}</div>
                      <div className="text-xs text-foreground/55">{item.email}</div>
                      <div className="text-xs text-foreground/45">{item.phone}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{item.companyName}</div>
                      <div className="text-xs text-foreground/55">{item.eventName || "No event name"}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Chip variant="flat" color="danger">
                      {item.productsCount} item{item.productsCount === 1 ? "" : "s"}
                    </Chip>
                  </TableCell>
                  <TableCell>{new Date(item.createdAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <RowActionsDropdown
                        onView={() => setViewId(item.id)}
                        onDelete={canDelete ? () => setDeleteTarget(item) : undefined}
                        isReadOnly={!canDelete}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {isError ? (
            <div className="border-t border-divider px-6 py-4 text-sm text-danger">
              {error instanceof Error ? error.message : "Failed to load contact messages."}
            </div>
          ) : null}
        </CardBody>
      </Card>

      <ContactMessageDetailsModal
        isOpen={!!viewId}
        message={detail ?? null}
        isLoading={isLoadingDetails}
        onClose={() => setViewId(null)}
      />

      <DeleteConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete contact message"
        message={
          deleteTarget ? (
            <>
              Are you sure you want to delete <span className="font-semibold">{deleteTarget.contactName}</span>&apos;s inquiry?
              This will also delete its saved form requested products.
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
