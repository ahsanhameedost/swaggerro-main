"use client";

import { useDeferredValue, useMemo, useState, type Key } from "react";
import {
  Button,
  Card,
  CardBody,
  Chip,
  Image,
  Input,
  Select,
  SelectItem,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow
} from "@heroui/react";
import { addToast } from "@heroui/toast";
import { Boxes, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMe } from "@/queries/auth";
import {
  useCategories,
  useCollections,
  useDeleteProduct,
  useProducts
} from "@/lib/queries.catalog";
import { DataPagination } from "@/app/components/dashboard/shared/DataPagination";
import { DeleteConfirmDialog } from "@/app/components/dashboard/shared/DeleteConfirmDialog";
import { RowActionsDropdown } from "@/app/components/dashboard/shared/RowActionsDropdown";
import { formatMoney } from "@/lib/money";
import { formatServerDateTime } from "@/lib/helpers";

const ALL_STATUSES_KEY = "__all_statuses__";
const ALL_CATEGORIES_KEY = "__all_categories__";
const ALL_COLLECTIONS_KEY = "__all_collections__";

function getSingleSelectedKey(selection: "all" | Set<Key>) {
  if (selection === "all") return "";
  const first = selection.values().next().value;
  return typeof first === "string" ? first : first != null ? String(first) : "";
}

function EmptyState() {
  return (
    <div className="flex min-h-55 flex-col items-center justify-center gap-3 text-center">
      <div
        className="inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white"
        style={{ backgroundImage: "var(--primary-gradient)" }}
      >
        <Boxes className="size-6" />
      </div>
      <div>
        <div className="font-semibold">No products yet</div>
        <div className="text-sm text-foreground/60">Create products and variants for your public catalog.</div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const router = useRouter();
  const { data: user } = useMe();
  const canRead = !!user?.permissions?.includes("catalog.products.read");
  const canWrite = !!user?.permissions?.includes("catalog.products.write");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "ACTIVE" | "ARCHIVED" | "">("");
  const [categoryId, setCategoryId] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const deferredSearch = useDeferredValue(search);

  const queryParams = useMemo(
    () => ({
      search: deferredSearch,
      status: status || undefined,
      categoryId: categoryId || undefined,
      collectionId: collectionId || undefined,
      page,
      pageSize
    }),
    [deferredSearch, status, categoryId, collectionId, page, pageSize]
  );

  const { data, isLoading, isFetching, isError, error } = useProducts(queryParams);
  const { data: categoriesData } = useCategories({ page: 1, pageSize: 100 });
  const { data: collectionsData } = useCollections({ page: 1, pageSize: 100 });
  const deleteMutation = useDeleteProduct();

  const products = data?.items ?? [];
  const pagination = data?.pagination ?? {
    page,
    pageSize,
    total: 0,
    totalPages: 1
  };

  const categories = categoriesData?.items ?? [];
  const collections = collectionsData?.items ?? [];

  if (!canRead) {
    return (
      <Card>
        <CardBody className="py-16 text-center text-foreground/70">
          You do not have permission to view catalog products.
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="border border-divider shadow-sm">
        <CardBody className="flex flex-col gap-6 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
              {/* <p className="text-sm text-foreground/60">Create featured catalog groupings.</p> */}
            </div>

            {canWrite ? (
              <Button
                color="primary"
                startContent={<Plus className="size-4" />}
                onPress={() => router.push("/dashboard/catalog/products/new")}
                style={{ backgroundImage: "var(--primary-gradient)" }}
              >
                Add product
              </Button>
            ) : null}
          </div>
        </CardBody>
      </Card>

      <Card className="border border-divider shadow-sm">
        <CardBody className="border-b border-divider px-6 py-5">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_220px_220px]">
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search products"
              startContent={<Search className="size-4 text-foreground/50" />}
            />

            <Select
              label="Status"
              selectedKeys={[status || ALL_STATUSES_KEY]}
              disallowEmptySelection
              onSelectionChange={(selection) => {
                const value = getSingleSelectedKey(selection as Set<Key> | "all");
                setStatus((value === ALL_STATUSES_KEY ? "" : value) as typeof status);
                setPage(1);
              }}
            >
              <SelectItem key={ALL_STATUSES_KEY}>All statuses</SelectItem>
              <SelectItem key="DRAFT">Draft</SelectItem>
              <SelectItem key="ACTIVE">Active</SelectItem>
              <SelectItem key="ARCHIVED">Archived</SelectItem>
            </Select>

            <Select
              label="Category"
              items={[{ id: ALL_CATEGORIES_KEY, name: "All categories" }, ...categories]}
              selectedKeys={[categoryId || ALL_CATEGORIES_KEY]}
              disallowEmptySelection
              onSelectionChange={(selection) => {
                const value = getSingleSelectedKey(selection as Set<Key> | "all");
                setCategoryId(value === ALL_CATEGORIES_KEY ? "" : value);
                setPage(1);
              }}
            >
              {(item) => <SelectItem key={item.id}>{item.name}</SelectItem>}
            </Select>

            <Select
              label="Collection"
              items={[{ id: ALL_COLLECTIONS_KEY, name: "All collections" }, ...collections]}
              selectedKeys={[collectionId || ALL_COLLECTIONS_KEY]}
              disallowEmptySelection
              onSelectionChange={(selection) => {
                const value = getSingleSelectedKey(selection as Set<Key> | "all");
                setCollectionId(value === ALL_COLLECTIONS_KEY ? "" : value);
                setPage(1);
              }}
            >
              {(item) => <SelectItem key={item.id}>{item.name}</SelectItem>}
            </Select>
          </div>
        </CardBody>

        <CardBody className="p-0">
          {isLoading ? (
            <div className="flex min-h-60 items-center justify-center">
              <Spinner label="Loading products" />
            </div>
          ) : isError ? (
            <div className="rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
              {error instanceof Error ? error.message : "Unable to load products"}
            </div>
          ) : !products.length ? (
            <EmptyState />
          ) : (
            <>
              <Table removeWrapper aria-label="Products table">
                <TableHeader>
                  <TableColumn>PRODUCT</TableColumn>
                  <TableColumn>STATUS</TableColumn>
                  <TableColumn>CATEGORY</TableColumn>
                  <TableColumn>PRICE</TableColumn>
                  <TableColumn>VARIANTS</TableColumn>
                  <TableColumn>UPDATED</TableColumn>
                  <TableColumn> </TableColumn>
                </TableHeader>
                <TableBody items={products}>
                  {(product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="overflow-hidden rounded-2xl border border-default-200 bg-default-50">
                            <Image
                              src={product.imageUrl || undefined}
                              alt={product.name}
                              className="h-14 w-14 object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2"><div className="truncate font-medium">{product.name}</div>{product.isPackaging ? <Chip size="sm" variant="flat">Packaging</Chip> : null}</div>
                            <div className="truncate text-sm text-foreground/60">
                              {product.shortDescription || "No short description"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Chip
                          color={
                            product.status === "ACTIVE"
                              ? "success"
                              : product.status === "ARCHIVED"
                                ? "danger"
                                : "warning"
                          }
                          variant="flat"
                        >
                          {product.status}
                        </Chip>
                      </TableCell>
                      <TableCell>{product.category?.name || "—"}</TableCell>
                      <TableCell>{formatMoney(product.minPrice)}</TableCell>
                      <TableCell>{product.variantCount}</TableCell>
                      <TableCell>{formatServerDateTime(product.updatedAt)}</TableCell>
                      <TableCell>
                        <RowActionsDropdown
                          isReadOnly={!canWrite}
                          onEdit={() => router.push(`/dashboard/catalog/products/${product.id}`)}
                          onDelete={() => setDeleteTarget({ id: product.id, name: product.name })}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between border-t border-divider px-6 py-4">
                <div className="text-sm text-foreground/60">
                  Showing {products.length} of {pagination.total} products
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
            </>
          )}
        </CardBody>
      </Card>

      <DeleteConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete product"
        message={`Delete ${deleteTarget?.name || "this product"}? This action cannot be undone.`}
        isLoading={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;

          try {
            await deleteMutation.mutateAsync(deleteTarget.id);
            addToast({
              title: "Product deleted",
              color: "success"
            });
            setDeleteTarget(null);
          } catch (deleteError: any) {
            addToast({
              title: "Unable to delete product",
              description: deleteError?.message ?? "",
              color: "danger"
            });
          }
        }}
      />
    </div>
  );
}