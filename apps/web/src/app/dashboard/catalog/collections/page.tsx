
"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Image,
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
import { FolderKanban, Plus, Search } from "lucide-react";
import { useMe } from "@/queries/auth";
import {
  createCatalogImageUpload,
  uploadFileToPresignedUrl,
  type CatalogCollection
} from "@/lib/catalog";
import {
  useCollections,
  useCreateCollection,
  useDeleteCollection,
  useUpdateCollection
} from "@/lib/queries.catalog";
import {
  CollectionFormModal,
  type CollectionFormValues
} from "@/app/components/dashboard/catalog/CollectionFormModal";
import { DataPagination } from "@/app/components/dashboard/shared/DataPagination";
import { DeleteConfirmDialog } from "@/app/components/dashboard/shared/DeleteConfirmDialog";
import { RowActionsDropdown } from "@/app/components/dashboard/shared/RowActionsDropdown";
import { formatServerDateTime } from "@/lib/helpers";

function EmptyState() {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
      <div
        className="inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white"
        style={{ backgroundImage: "var(--primary-gradient)" }}
      >
        <FolderKanban className="size-6" />
      </div>
      <div>
        <div className="font-semibold">No collections yet</div>
        <div className="text-sm text-foreground/60">Create featured catalog collections.</div>
      </div>
    </div>
  );
}

export default function CollectionsPage() {
  const { data: user } = useMe();
  const canRead = !!user?.permissions?.includes("catalog.collections.read");
  const canWrite = !!user?.permissions?.includes("catalog.collections.write");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<CatalogCollection | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CatalogCollection | null>(null);

  const deferredSearch = useDeferredValue(search);
  const queryParams = useMemo(
    () => ({
      search: deferredSearch,
      page,
      pageSize
    }),
    [deferredSearch, page, pageSize]
  );

  const { data, isLoading, isFetching, isError, error } = useCollections(queryParams);
  const collections = data?.items ?? [];
  const pagination = data?.pagination ?? {
    page,
    pageSize,
    total: 0,
    totalPages: 1
  };

  const createMutation = useCreateCollection();
  const updateMutation = useUpdateCollection();
  const deleteMutation = useDeleteCollection();

  const handleSave = async ({
    values,
    file,
    removeCurrentImage
  }: {
    values: CollectionFormValues;
    file: File | null;
    removeCurrentImage: boolean;
  }) => {
    try {
      const payload: {
        name: string;
        description?: string | null;
        imageUrl?: string | null;
        imageKey?: string | null;
        removeImage?: boolean;
      } = {
        name: values.name.trim(),
        description: values.description?.trim() ? values.description.trim() : null
      };

      if (file) {
        const upload = await createCatalogImageUpload("collections", {
          filename: file.name,
          contentType: file.type as "image/jpeg" | "image/png" | "image/webp"
        });
        await uploadFileToPresignedUrl(upload.uploadUrl, file);
        payload.imageUrl = upload.publicUrl;
        payload.imageKey = upload.key;
      } else if (removeCurrentImage) {
        payload.removeImage = true;
      }

      if (selectedCollection) {
        await updateMutation.mutateAsync({ id: selectedCollection.id, input: payload });
        addToast({ title: "Collection updated", color: "success" });
      } else {
        await createMutation.mutateAsync(payload);
        addToast({ title: "Collection created", color: "success" });
      }

      setFormOpen(false);
      setSelectedCollection(null);
    } catch (e: any) {
      addToast({ title: "Save failed", description: e?.message ?? "", color: "danger" });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      addToast({ title: "Collection deleted", color: "success" });
      setDeleteTarget(null);
    } catch (e: any) {
      addToast({ title: "Delete failed", description: e?.message ?? "", color: "danger" });
    }
  };

  if (!canRead) {
    return (
      <Card>
        <CardBody>You do not have permission to view catalog collections.</CardBody>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="border border-divider shadow-sm">
        <CardBody className="flex flex-col gap-6 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Collections</h1>
              {/* <p className="text-sm text-foreground/60">Create featured catalog groupings.</p> */}
            </div>

            {canWrite ? (
              <Button
                color="primary"
                startContent={<Plus className="size-4" />}
                onPress={() => {
                  setSelectedCollection(null);
                  setFormOpen(true);
                }}
                style={{ backgroundImage: "var(--primary-gradient)" }}
              >
                Add collection
              </Button>
            ) : null}
          </div>
        </CardBody>
      </Card>

      <Card className="border border-divider shadow-sm">
        <CardBody className="border-b border-divider px-6 py-5">
          <Input
            value={search}
            onValueChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search by name"
            startContent={<Search className="size-4 text-foreground/40" />}
            className="w-full md:max-w-sm"
          />
        </CardBody>

        <CardBody className="p-0">
          <Table aria-label="Catalog collections table" removeWrapper>
            <TableHeader>
              <TableColumn>Collection</TableColumn>
              <TableColumn>Slug</TableColumn>
              <TableColumn>Updated</TableColumn>
              <TableColumn className="text-center">Actions</TableColumn>
            </TableHeader>
            <TableBody
              emptyContent={isLoading ? null : <EmptyState />}
              isLoading={isLoading || isFetching}
              loadingContent={<Spinner label="Loading collections..." />}
            >
              {collections.map((collection) => (
                <TableRow key={collection.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-content2">
                        {collection.imageUrl ? (
                          <Image
                            removeWrapper
                            src={collection.imageUrl}
                            alt={collection.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="text-sm font-semibold text-foreground/50">
                            {collection.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="font-medium">{collection.name}</div>
                        <div className="truncate text-xs text-foreground/50">
                          {collection.description || "No description added yet."}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>{collection.slug}</TableCell>
                  <TableCell>{formatServerDateTime(collection.updatedAt)}</TableCell>

                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <RowActionsDropdown
                        onEdit={canWrite ? () => {
                          setSelectedCollection(collection);
                          setFormOpen(true);
                        } : undefined}
                        onDelete={canWrite ? () => setDeleteTarget(collection) : undefined}
                        isReadOnly={!canWrite}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between border-t border-divider px-6 py-4">
            <div className="text-sm text-foreground/60">
              Showing {collections.length} of {pagination.total} collections
            </div>
            <DataPagination
              page={pagination.page}
              pageSize={pagination.pageSize}
              totalPages={pagination.totalPages}
              disabled={isLoading || isFetching}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </div>

          {isError ? (
            <div className="border-t border-divider px-6 py-4 text-sm text-danger">
              {error instanceof Error ? error.message : "Failed to load collections."}
            </div>
          ) : null}
        </CardBody>
      </Card>

      <CollectionFormModal
        isOpen={formOpen}
        collection={selectedCollection}
        onClose={() => {
          setFormOpen(false);
          setSelectedCollection(null);
        }}
        onSave={handleSave}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <DeleteConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete collection"
        message={
          deleteTarget ? (
            <>
              Are you sure you want to delete <span className="font-semibold">{deleteTarget.name}</span>?
            </>
          ) : (
            ""
          )
        }
        isLoading={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
