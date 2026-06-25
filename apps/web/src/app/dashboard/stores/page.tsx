"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import {
  Button,
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
  TableRow,
} from "@heroui/react";
import { Building2, ExternalLink, Search } from "lucide-react";
import { useMe } from "@/queries/auth";
import { useStores } from "@/queries/stores";
import type { StoreStatus } from "@/modules/stores/types";
import { DataPagination } from "@/app/components/dashboard/shared/DataPagination";

const STATUS_FILTERS: Array<{ key: StoreStatus | "ALL"; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "DRAFT", label: "Draft" },
  { key: "SUSPENDED", label: "Suspended" },
];

const STATUS_COLOR: Record<StoreStatus, "success" | "default" | "danger"> = {
  ACTIVE: "success",
  DRAFT: "default",
  SUSPENDED: "danger",
};

export default function StoresPage() {
  const { data: me } = useMe();
  const canRead = !!me?.permissions?.includes("partners.stores.read");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StoreStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const deferredSearch = useDeferredValue(search);
  const params = useMemo(
    () => ({
      search: deferredSearch || undefined,
      status: statusFilter === "ALL" ? undefined : statusFilter,
      page,
      pageSize,
    }),
    [deferredSearch, statusFilter, page, pageSize]
  );

  const { data, isLoading, isFetching, isError, error } = useStores(params);
  const items = data?.items ?? [];
  const pagination = data?.pagination ?? { page, pageSize, total: 0, totalPages: 1 };

  if (!canRead) {
    return (
      <div className="p-6">
        <Card>
          <CardBody>You do not have permission to view stores.</CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Card className="border border-divider shadow-sm">
        <CardBody className="flex flex-col gap-3 p-6">
          <h1 className="text-2xl font-semibold tracking-tight">White-label stores</h1>
          <p className="text-sm text-foreground/60">
            Manage seller storefronts. Approving a seller application auto-creates a store here.
          </p>
        </CardBody>
      </Card>

      <Card className="border border-divider shadow-sm">
        <CardHeader className="flex flex-col gap-4 border-b border-divider px-6 py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Input
              value={search}
              onValueChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search store, slug, company…"
              startContent={<Search className="size-4 text-foreground/40" />}
              className="w-full md:max-w-sm"
            />
            <div className="flex items-center gap-3">
              <Button as={Link} href="/dashboard/stores/new" color="primary">
                New store
              </Button>
              <DataPagination
                page={pagination.page}
                pageSize={pagination.pageSize}
                totalPages={pagination.totalPages}
                disabled={isLoading || isFetching}
                onPageChange={setPage}
                onPageSizeChange={(next) => {
                  setPageSize(next);
                  setPage(1);
                }}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((filter) => (
              <Button
                key={filter.key}
                size="sm"
                variant={statusFilter === filter.key ? "solid" : "bordered"}
                color={statusFilter === filter.key ? "primary" : "default"}
                onPress={() => {
                  setStatusFilter(filter.key);
                  setPage(1);
                }}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardBody className="p-0">
          <Table removeWrapper aria-label="Stores table">
            <TableHeader>
              <TableColumn>Store</TableColumn>
              <TableColumn>Owner</TableColumn>
              <TableColumn>Products</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn align="end">Actions</TableColumn>
            </TableHeader>
            <TableBody
              isLoading={isLoading}
              loadingContent={<Spinner label="Loading stores…" />}
              emptyContent={
                isLoading ? null : (
                  <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center">
                    <div
                      className="inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white"
                      style={{ backgroundImage: "var(--primary-gradient)" }}
                    >
                      <Building2 className="size-6" />
                    </div>
                    <div>
                      <div className="font-semibold">No stores yet</div>
                      <div className="text-sm text-foreground/60">
                        Approve a seller application to create one.
                      </div>
                    </div>
                  </div>
                )
              }
            >
              {items.map((store) => (
                <TableRow key={store.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center overflow-hidden rounded-lg bg-default-100">
                        {store.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={store.logoUrl} alt="" className="h-full w-full object-contain p-0.5" />
                        ) : (
                          <Building2 className="size-4 text-foreground/40" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{store.name}</div>
                        <div className="text-xs text-foreground/55">/store/{store.slug}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{store.owner?.email ?? "—"}</div>
                  </TableCell>
                  <TableCell>{store.productCount}</TableCell>
                  <TableCell>
                    <Chip size="sm" variant="flat" color={STATUS_COLOR[store.status]}>
                      {store.status}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        as="a"
                        href={`/store/${store.slug}`}
                        target="_blank"
                        size="sm"
                        variant="light"
                        endContent={<ExternalLink className="size-3.5" />}
                      >
                        View
                      </Button>
                      <Button as={Link} href={`/dashboard/stores/${store.id}`} size="sm" variant="flat">
                        Manage
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {isError ? (
            <div className="border-t border-divider px-6 py-4 text-sm text-danger">
              {error instanceof Error ? error.message : "Failed to load stores."}
            </div>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
