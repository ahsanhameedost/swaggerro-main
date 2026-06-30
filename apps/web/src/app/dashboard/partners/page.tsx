"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Textarea,
} from "@heroui/react";
import { addToast } from "@heroui/toast";
import { Download, ExternalLink, Search, Store } from "lucide-react";
import { useMe } from "@/queries/auth";
import {
  usePartnerApplication,
  usePartnerApplications,
  useUpdateSellerApplicationStatus,
} from "@/queries/partners";
import { exportSellerApplicationsCsv } from "@/modules/partners/api";
import type { SellerApplicationStatus } from "@/modules/partners/types";
import { DataPagination } from "@/app/components/dashboard/shared/DataPagination";

const STATUS_FILTERS: Array<{ key: SellerApplicationStatus | "ALL"; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "NEW", label: "New" },
  { key: "UNDER_REVIEW", label: "Under Review" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
];

const STATUS_META: Record<
  SellerApplicationStatus,
  { label: string; color: "default" | "warning" | "success" | "danger" }
> = {
  NEW: { label: "New", color: "default" },
  UNDER_REVIEW: { label: "Under Review", color: "warning" },
  APPROVED: { label: "Approved", color: "success" },
  REJECTED: { label: "Rejected", color: "danger" },
};

function StatusChip({ status }: { status: SellerApplicationStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.NEW;
  return (
    <Chip variant="flat" color={meta.color} size="sm">
      {meta.label}
    </Chip>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
      <div
        className="inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white"
        style={{ backgroundImage: "var(--primary-gradient)" }}
      >
        <Store className="size-6" />
      </div>
      <div>
        <div className="font-semibold">No seller applications yet</div>
        <div className="text-sm text-foreground/60">New partner applications will appear here.</div>
      </div>
    </div>
  );
}

function DetailModal({
  viewId,
  onClose,
  canWrite,
}: {
  viewId: string | null;
  onClose: () => void;
  canWrite: boolean;
}) {
  const { data, isLoading } = usePartnerApplication(viewId);
  const application = data?.application ?? null;
  const updateMutation = useUpdateSellerApplicationStatus();

  const [status, setStatus] = useState<SellerApplicationStatus>("NEW");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (application) {
      setStatus(application.status);
      setNotes(application.adminNotes ?? "");
    }
  }, [application?.id, application?.status, application?.adminNotes]);

  const save = async () => {
    if (!application) return;
    try {
      await updateMutation.mutateAsync({ id: application.id, status, adminNotes: notes });
      addToast({ title: "Application updated", color: "success" });
    } catch (error: any) {
      addToast({ title: "Update failed", description: error?.message ?? "", color: "danger" });
    }
  };

  return (
    <Modal isOpen={!!viewId} onOpenChange={(open) => !open && onClose()} size="3xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-0">
          <span>{application?.companyName ?? "Application"}</span>
          {application ? (
            <span className="text-sm font-normal text-foreground/55">
              Submitted {new Date(application.createdAt).toLocaleString()}
            </span>
          ) : null}
        </ModalHeader>
        <ModalBody>
          {isLoading || !application ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <Spinner label="Loading application…" />
            </div>
          ) : (
            <div className="space-y-5">
              {application.logoUrl ? (
                <div className="flex items-center gap-4 rounded-2xl border border-divider p-4">
                  <div className="flex size-20 items-center justify-center overflow-hidden rounded-xl bg-default-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={application.logoUrl} alt="Company logo" className="h-full w-full object-contain p-1" />
                  </div>
                  <a
                    href={application.logoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <Download className="size-4" /> Download logo
                  </a>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <Detail label="Contact person" value={application.contactName} />
                <Detail label="Email" value={application.email} />
                <Detail label="Phone" value={application.phone} />
                <Detail label="Industry" value={application.industry} />
                <Detail label="Country / region" value={application.country} />
                <Detail
                  label="Website"
                  value={
                    application.website ? (
                      <a
                        href={application.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        {application.website} <ExternalLink className="size-3.5" />
                      </a>
                    ) : (
                      "—"
                    )
                  }
                />
              </div>

              <Detail label="Company address" value={application.companyAddress} />
              <Detail label="Business description" value={application.businessDescription} multiline />
              {application.additionalInfo ? (
                <Detail label="Additional information" value={application.additionalInfo} multiline />
              ) : null}

              <Detail
                label="Seller Agreement"
                value={
                  application.termsAgreedAt
                    ? `Accepted on ${new Date(application.termsAgreedAt).toLocaleString()}${
                        application.termsVersion ? ` (v${application.termsVersion})` : ""
                      }`
                    : "Not recorded"
                }
              />

              <div className="rounded-2xl border border-divider p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold">Status</span>
                  <StatusChip status={application.status} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(STATUS_META) as SellerApplicationStatus[]).map((key) => (
                    <Button
                      key={key}
                      size="sm"
                      variant={status === key ? "solid" : "bordered"}
                      color={status === key ? STATUS_META[key].color : "default"}
                      isDisabled={!canWrite}
                      onPress={() => setStatus(key)}
                    >
                      {STATUS_META[key].label}
                    </Button>
                  ))}
                </div>
                <Textarea
                  className="mt-4"
                  label="Admin notes"
                  placeholder="Internal notes about this application…"
                  value={notes}
                  onValueChange={setNotes}
                  isDisabled={!canWrite}
                  minRows={2}
                />
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>
            Close
          </Button>
          {canWrite ? (
            <Button color="primary" onPress={save} isLoading={updateMutation.isPending} isDisabled={!application}>
              Save changes
            </Button>
          ) : null}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function Detail({
  label,
  value,
  multiline,
}: {
  label: string;
  value: React.ReactNode;
  multiline?: boolean;
}) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-foreground/45">{label}</div>
      <div className={`mt-1 text-sm text-foreground/85 ${multiline ? "whitespace-pre-wrap leading-relaxed" : ""}`}>
        {value || "—"}
      </div>
    </div>
  );
}

export default function SellerApplicationsPage() {
  const { data: me } = useMe();
  const canRead = !!me?.permissions?.includes("partners.applications.read");
  const canWrite = !!me?.permissions?.includes("partners.applications.write");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SellerApplicationStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [viewId, setViewId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const deferredSearch = useDeferredValue(search);
  const queryParams = useMemo(
    () => ({
      search: deferredSearch || undefined,
      status: statusFilter === "ALL" ? undefined : statusFilter,
      page,
      pageSize,
    }),
    [deferredSearch, statusFilter, page, pageSize]
  );

  const { data, isLoading, isFetching, isError, error } = usePartnerApplications(queryParams);
  const items = data?.items ?? [];
  const pagination = data?.pagination ?? { page, pageSize, total: 0, totalPages: 1 };

  const handleExport = async () => {
    setExporting(true);
    try {
      const csv = await exportSellerApplicationsCsv({
        search: deferredSearch || undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
      });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `seller-applications-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (exportError: any) {
      addToast({ title: "Export failed", description: exportError?.message ?? "", color: "danger" });
    } finally {
      setExporting(false);
    }
  };

  if (!canRead) {
    return (
      <div className="p-6">
        <Card>
          <CardBody>You do not have permission to view seller applications.</CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Card className="border border-divider shadow-sm">
        <CardBody className="flex flex-col gap-3 p-6">
          <h1 className="text-2xl font-semibold tracking-tight">Seller Applications</h1>
          <p className="text-sm text-foreground/60">
            Review and manage applications submitted through the “Become a Seller” form.
          </p>
        </CardBody>
      </Card>

      <Card className="border border-divider shadow-sm">
        <CardHeader className="flex flex-col gap-4 border-b border-divider px-6 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Input
              value={search}
              onValueChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search company, contact, email, industry…"
              startContent={<Search className="size-4 text-foreground/40" />}
              className="w-full sm:max-w-xs"
            />
            <Button
              variant="flat"
              className="h-10 shrink-0"
              startContent={<Download className="size-4" />}
              onPress={handleExport}
              isLoading={exporting}
            >
              Export CSV
            </Button>
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

        <CardBody className="overflow-x-auto p-0">
          <Table removeWrapper aria-label="Seller applications table">
            <TableHeader>
              <TableColumn>Company</TableColumn>
              <TableColumn>Contact</TableColumn>
              <TableColumn>Industry / Country</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Submitted</TableColumn>
              <TableColumn align="end">Actions</TableColumn>
            </TableHeader>
            <TableBody
              isLoading={isLoading}
              loadingContent={<Spinner label="Loading applications…" />}
              emptyContent={isLoading ? null : <EmptyState />}
            >
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center overflow-hidden rounded-lg bg-default-100">
                        {item.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.logoUrl} alt="" className="h-full w-full object-contain p-0.5" />
                        ) : (
                          <Store className="size-4 text-foreground/40" />
                        )}
                      </div>
                      <div className="font-medium">{item.companyName}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <div className="font-medium">{item.contactName}</div>
                      <div className="text-xs text-foreground/55">{item.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <div>{item.industry}</div>
                      <div className="text-xs text-foreground/55">{item.country}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={item.status} />
                  </TableCell>
                  <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button size="sm" variant="flat" onPress={() => setViewId(item.id)}>
                        View
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {isError ? (
            <div className="border-t border-divider px-6 py-4 text-sm text-danger">
              {error instanceof Error ? error.message : "Failed to load applications."}
            </div>
          ) : null}
        </CardBody>

        <div className="flex items-center justify-between gap-3 border-t border-divider px-6 py-4">
          <span className="text-sm text-foreground/55">{pagination.total} total</span>
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
      </Card>

      <DetailModal viewId={viewId} onClose={() => setViewId(null)} canWrite={canWrite} />
    </div>
  );
}
