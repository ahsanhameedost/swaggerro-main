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
import { Plus, Search, Tags } from "lucide-react";
import { useMe } from "@/queries/auth";
import {
  createCatalogImageUpload,
  uploadFileToPresignedUrl,
  type CatalogCategory
} from "@/lib/catalog";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory
} from "@/lib/queries.catalog";
import {
  CategoryFormModal,
  type CategoryFormValues
} from "@/app/components/dashboard/catalog/CategoryFormModal";
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
        <Tags className="size-6" />
      </div>
      <div>
        <div className="font-semibold">No categories yet</div>
        <div className="text-sm text-foreground/60">Create your first catalog category.</div>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const { data: user } = useMe();
  const canRead = !!user?.permissions?.includes("catalog.categories.read");
  const canWrite = !!user?.permissions?.includes("catalog.categories.write");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CatalogCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CatalogCategory | null>(null);

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
  } = useCategories(queryParams);

  const categories = data?.items ?? [];
  const pagination = data?.pagination ?? {
    page,
    pageSize,
    total: 0,
    totalPages: 1
  };

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const openCreate = () => {
    setSelectedCategory(null);
    setFormOpen(true);
  };

  const openEdit = (category: CatalogCategory) => {
    setSelectedCategory(category);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setSelectedCategory(null);
  };

  const handleSave = async ({
    values,
    file,
    removeCurrentImage
  }: {
    values: CategoryFormValues;
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
        const upload = await createCatalogImageUpload("categories", {
          filename: file.name,
          contentType: file.type as "image/jpeg" | "image/png" | "image/webp"
        });

        await uploadFileToPresignedUrl(upload.uploadUrl, file);
        payload.imageUrl = upload.publicUrl;
        payload.imageKey = upload.key;
      } else if (removeCurrentImage) {
        payload.removeImage = true;
      }

      if (selectedCategory) {
        await updateMutation.mutateAsync({
          id: selectedCategory.id,
          input: payload
        });
        addToast({
          title: "Category updated",
          description: "Your category changes were saved.",
          color: "success"
        });
      } else {
        await createMutation.mutateAsync(payload);
        addToast({
          title: "Category created",
          description: "The new catalog category is now available.",
          color: "success"
        });
      }

      closeForm();
    } catch (e: any) {
      addToast({
        title: "Save failed",
        description: e?.message ?? "Could not save category",
        color: "danger"
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      addToast({
        title: "Category deleted",
        description: `${deleteTarget.name} has been removed.`,
        color: "success"
      });
      setDeleteTarget(null);
    } catch (e: any) {
      addToast({
        title: "Delete failed",
        description: e?.message ?? "Could not delete category",
        color: "danger"
      });
    }
  };

  if (!canRead) {
    return (
      <Card>
        <CardBody>You do not have permission to view catalog categories.</CardBody>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="border border-divider shadow-sm">
        <CardBody className="flex flex-col gap-6 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
            </div>

            {canWrite ? (
              <Button
                color="primary"
                startContent={<Plus className="size-4" />}
                onPress={openCreate}
                style={{ backgroundImage: "var(--primary-gradient)" }}
              >
                Add category
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
          <Table aria-label="Catalog categories table" removeWrapper>
            <TableHeader>
              <TableColumn>Category</TableColumn>
              <TableColumn>Slug</TableColumn>
              <TableColumn>Updated At</TableColumn>
              <TableColumn className="text-center">Actions</TableColumn>
            </TableHeader>
            <TableBody
              emptyContent={isLoading ? null : <EmptyState />}
              isLoading={isLoading || isFetching}
              loadingContent={<Spinner label="Loading categories..." />}
            >
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-content2">
                        {category.imageUrl ? (
                          <Image
                            removeWrapper
                            src={category.imageUrl}
                            alt={category.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="text-sm font-semibold text-foreground/50">
                            {category.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="font-medium">{category.name}</div>
                        <div className="truncate text-xs text-foreground/50">
                          {category.description || "No description added yet."}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>{category.slug}</TableCell>
                  <TableCell>{formatServerDateTime(category.updatedAt)}</TableCell>

                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <RowActionsDropdown
                        onEdit={canWrite ? () => openEdit(category) : undefined}
                        onDelete={canWrite ? () => setDeleteTarget(category) : undefined}
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
              Showing {categories.length} of {pagination.total} categories
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
              {error instanceof Error ? error.message : "Failed to load categories."}
            </div>
          ) : null}
        </CardBody>
      </Card>

      <CategoryFormModal
        isOpen={formOpen}
        category={selectedCategory}
        onClose={closeForm}
        onSave={handleSave}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <DeleteConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete category"
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
