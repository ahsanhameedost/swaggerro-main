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
import { Plus, Search, Tag } from "lucide-react";
import { useMe } from "@/queries/auth";
import {
  createCatalogImageUpload,
  uploadFileToPresignedUrl,
  type CatalogBrand
} from "@/lib/catalog";
import {
  useBrands,
  useCreateBrand,
  useDeleteBrand,
  useUpdateBrand
} from "@/lib/queries.catalog";
import {
  BrandFormModal,
  type BrandFormValues
} from "@/app/components/dashboard/catalog/BrandFormModal";
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
        <Tag className="size-6" />
      </div>
      <div>
        <div className="font-semibold">No brands yet</div>
        <div className="text-sm text-foreground/60">Create your first catalog brand.</div>
      </div>
    </div>
  );
}

export default function BrandsPage() {
  const { data: user } = useMe();
  const canRead = !!user?.permissions?.includes("catalog.brands.read");
  const canWrite = !!user?.permissions?.includes("catalog.brands.write");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<CatalogBrand | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CatalogBrand | null>(null);

  const deferredSearch = useDeferredValue(search);
  const queryParams = useMemo(
    () => ({
      search: deferredSearch,
      page,
      pageSize
    }),
    [deferredSearch, page, pageSize]
  );

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error
  } = useBrands(queryParams);

  const brands = data?.items ?? [];
  const pagination = data?.pagination ?? {
    page,
    pageSize,
    total: 0,
    totalPages: 1
  };

  const createMutation = useCreateBrand();
  const updateMutation = useUpdateBrand();
  const deleteMutation = useDeleteBrand();

  const openCreate = () => {
    setSelectedBrand(null);
    setFormOpen(true);
  };

  const openEdit = (brand: CatalogBrand) => {
    setSelectedBrand(brand);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setSelectedBrand(null);
  };

  const handleSave = async ({
    values,
    file,
    removeCurrentImage
  }: {
    values: BrandFormValues;
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
        const upload = await createCatalogImageUpload("brands", {
          filename: file.name,
          contentType: file.type as "image/jpeg" | "image/png" | "image/webp"
        });

        await uploadFileToPresignedUrl(upload.uploadUrl, file);
        payload.imageUrl = upload.publicUrl;
        payload.imageKey = upload.key;
      } else if (removeCurrentImage) {
        payload.removeImage = true;
      }

      if (selectedBrand) {
        await updateMutation.mutateAsync({
          id: selectedBrand.id,
          input: payload
        });
        addToast({
          title: "Brand updated",
          description: "Your brand changes were saved.",
          color: "success"
        });
      } else {
        await createMutation.mutateAsync(payload);
        addToast({
          title: "Brand created",
          description: "The new catalog brand is now available.",
          color: "success"
        });
      }

      closeForm();
    } catch (e: any) {
      addToast({
        title: "Save failed",
        description: e?.message ?? "Could not save brand",
        color: "danger"
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      addToast({
        title: "Brand deleted",
        description: `${deleteTarget.name} has been removed.`,
        color: "success"
      });
      setDeleteTarget(null);
    } catch (e: any) {
      addToast({
        title: "Delete failed",
        description: e?.message ?? "Could not delete brand",
        color: "danger"
      });
    }
  };

  if (!canRead) {
    return (
      <Card>
        <CardBody>You do not have permission to view catalog brands.</CardBody>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="border border-divider shadow-sm">
        <CardBody className="flex flex-col gap-6 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Brands</h1>
            </div>

            {canWrite ? (
              <Button
                color="primary"
                startContent={<Plus className="size-4" />}
                onPress={openCreate}
                style={{ backgroundImage: "var(--primary-gradient)" }}
              >
                Add brand
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
          <Table aria-label="Catalog brands table" removeWrapper>
            <TableHeader>
              <TableColumn>Brand</TableColumn>
              <TableColumn>Slug</TableColumn>
              <TableColumn>Updated At</TableColumn>
              <TableColumn className="text-center">Actions</TableColumn>
            </TableHeader>
            <TableBody
              emptyContent={isLoading ? null : <EmptyState />}
              isLoading={isLoading || isFetching}
              loadingContent={<Spinner label="Loading brands..." />}
            >
              {brands.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-content2">
                        {brand.imageUrl ? (
                          <Image
                            removeWrapper
                            src={brand.imageUrl}
                            alt={brand.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="text-sm font-semibold text-foreground/50">
                            {brand.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="font-medium">{brand.name}</div>
                        <div className="truncate text-xs text-foreground/50">
                          {brand.description || "No description added yet."}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>{brand.slug}</TableCell>
                  <TableCell>{formatServerDateTime(brand.updatedAt)}</TableCell>

                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <RowActionsDropdown
                        onEdit={canWrite ? () => openEdit(brand) : undefined}
                        onDelete={canWrite ? () => setDeleteTarget(brand) : undefined}
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
              Showing {brands.length} of {pagination.total} brands
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
              {error instanceof Error ? error.message : "Failed to load brands."}
            </div>
          ) : null}
        </CardBody>
      </Card>

      <BrandFormModal
        isOpen={formOpen}
        brand={selectedBrand}
        onClose={closeForm}
        onSave={handleSave}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <DeleteConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete brand"
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
