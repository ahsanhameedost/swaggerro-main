"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Image,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  Textarea
} from "@heroui/react";
import { addToast } from "@heroui/toast";
import { Download, UploadCloud } from "lucide-react";
import { useMe } from "@/queries/auth";
import {
  useApproveCatalogOrderItem,
  useCatalogOrders,
  useCreateCatalogOrderDesignUpload,
  useRequestCatalogOrderItemRevision
} from "@/lib/queries.catalog";
import { uploadFileToPresignedUrl } from "@/modules/catalog/public/api";
import { downloadApiFile } from "@/lib/download";
import { formatMoney } from "@/lib/money";
import {
  DESIGN_PHASES,
  formatDesignPhaseLabel,
  formatItemTypeLabel,
  getPhaseStepIndex,
  getPreferredDesignImage
} from "@/lib/order-flow";
import type { CatalogOrder, CatalogOrderItem } from "@/modules/catalog/orders/types";
import { hasAnyPermission, hasPermission } from "@/lib/permissions";

function PhaseStepper({ phase }: { phase: CatalogOrderItem["designPhase"] }) {
  const currentStep = getPhaseStepIndex(phase);

  return (
    <div className="grid gap-3 md:grid-cols-5">
      {DESIGN_PHASES.map((step, index) => {
        const active = currentStep === index;
        const done = currentStep > index || phase === "READY_TO_ORDER" && index === DESIGN_PHASES.length - 1;

        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={[
                "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
                done || active
                  ? "border-primary bg-primary text-white"
                  : "border-default-300 text-foreground/45"
              ].join(" ")}
            >
              {done ? "✓" : index + 1}
            </div>
            <div className={active ? "text-sm font-medium" : "text-sm text-foreground/60"}>
              {formatDesignPhaseLabel(step)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RevisionModal({
  isOpen,
  item,
  isSaving,
  onClose,
  onSubmit
}: {
  isOpen: boolean;
  item: { orderId: string; item: CatalogOrderItem } | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (input: { notes: string; logoUrl?: string | null; logoKey?: string | null }) => Promise<void>;
}) {
  const [notes, setNotes] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoKey, setLogoKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadMutation = useCreateCatalogOrderDesignUpload();

  const reset = () => {
    setNotes("");
    setLogoUrl(null);
    setLogoKey(null);
    onClose();
  };

  const uploadLogo = async (file: File) => {
    setUploading(true);

    try {
      const upload = await uploadMutation.mutateAsync({
        filename: file.name,
        contentType: file.type as "image/jpeg" | "image/png" | "image/webp",
        type: "revisions"
      });

      await uploadFileToPresignedUrl(upload.uploadUrl, file);
      setLogoUrl(upload.publicUrl);
      setLogoKey(upload.key);
      addToast({
        title: "Logo uploaded",
        color: "success"
      });
    } catch (e: any) {
      addToast({
        title: "Upload failed",
        description: e?.message ?? "Unable to upload logo.",
        color: "danger"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => (!open ? reset() : undefined)} size="2xl">
      <ModalContent>
        {() => (
          <>
            <ModalHeader>Request revision</ModalHeader>
            <ModalBody className="space-y-4">
              <div className="text-sm text-foreground/60">
                Share the exact updates you need for{" "}
                <span className="font-medium text-foreground">{item?.item.productName}</span>.
              </div>

              <Textarea
                label="Revision requirements"
                placeholder="Change logo size, adjust placement, use alternate logo, update colors..."
                value={notes}
                onValueChange={setNotes}
                minRows={6}
              />

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void uploadLogo(file);
                  }
                  event.currentTarget.value = "";
                }}
              />

              <div className="flex items-center gap-3">
                <Button
                  variant="bordered"
                  startContent={<UploadCloud className="size-4" />}
                  onPress={() => fileInputRef.current?.click()}
                  isLoading={uploading}
                >
                  {logoUrl ? "Replace logo" : "Upload alternate logo"}
                </Button>
                {logoUrl ? (
                  <a
                    href={logoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary underline"
                  >
                    View uploaded logo
                  </a>
                ) : null}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={reset}>
                Cancel
              </Button>
              <Button
                color="primary"
                isLoading={isSaving}
                onPress={() => void onSubmit({ notes, logoUrl, logoKey })}
                style={{ backgroundImage: "var(--primary-gradient)" }}
              >
                Submit revision
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

function CustomerDesignView({ orders }: { orders: CatalogOrder[] }) {
  const approveMutation = useApproveCatalogOrderItem();
  const revisionMutation = useRequestCatalogOrderItemRevision();
  const [revisionTarget, setRevisionTarget] = useState<{ orderId: string; item: CatalogOrderItem } | null>(null);

  return (
    <>
      <div className="flex flex-col gap-6">
        {orders.map((order) => (
          <Card key={order.id} className="border border-divider shadow-sm">
            <CardHeader className="flex flex-col gap-3 p-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-xl font-semibold">
                  {order.project?.swagPackName || order.project?.name || `Order #${order.id}`}
                </div>
                <div className="text-sm text-foreground/60">
                  Order #{order.id} · {new Date(order.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="bordered"
                  startContent={<Download className="size-4" />}
                  onPress={() => void downloadApiFile(`/catalog/orders/${order.id}/mockups.pdf`, `order-${order.id}-mockups.pdf`)}
                >
                  Download PDF
                </Button>
                <Link href={`/dashboard/orders/${order.id}`}>
                  <Button variant="bordered">View order</Button>
                </Link>
              </div>
            </CardHeader>

            <CardBody className="space-y-5 p-6 pt-0">
              {order.items.map((item) => {
                const allowMockupApproval = item.designPhase === "REVIEW_MOCKUP_DESIGN";
                const allowFinalApproval = item.designPhase === "REVIEW_FINAL_DESIGN";
                const canRequestRevision = item.designPhase === "REVIEW_MOCKUP_DESIGN" || item.designPhase === "REVIEW_FINAL_DESIGN";

                return (
                  <div key={item.id} className="rounded-3xl border border-divider p-5">
                    <div className="grid gap-5 xl:grid-cols-[180px_minmax(0,1fr)]">
                      <div className="flex h-[180px] items-center justify-center overflow-hidden rounded-3xl bg-default-100">
                        {getPreferredDesignImage(item) ? (
                          <Image
                            removeWrapper
                            src={getPreferredDesignImage(item)!}
                            alt={item.productName}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="text-sm text-foreground/55">Mockup in progress</div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-lg font-semibold">{item.productName}</div>
                              <Chip size="sm" variant="flat">
                                {formatItemTypeLabel(item.itemType)}
                              </Chip>
                              <Chip size="sm" variant="flat">
                                {formatDesignPhaseLabel(item.designPhase)}
                              </Chip>
                            </div>
                            <div className="text-sm text-foreground/60">{item.variantName || "Standard"}</div>
                            <div className="text-sm text-foreground/60">
                              {item.itemType === "BULK"
                                ? `Quantity: ${item.quantity}`
                                : `${item.quantityPerPack ?? 1} / pack · ${item.quantity} total`}
                            </div>
                            <div className="text-sm text-foreground/60">
                              {formatMoney(item.totalPrice, order.currency)}
                            </div>
                          </div>
                        </div>

                        <PhaseStepper phase={item.designPhase} />

                        {item.adminNotes ? (
                          <div className="rounded-2xl border border-divider bg-content1 px-4 py-3 text-sm text-foreground/70">
                            {item.adminNotes}
                          </div>
                        ) : null}

                        {item.revisions.length ? (
                          <div className="space-y-3">
                            <div className="text-sm font-semibold">Changes history</div>
                            {item.revisions.map((revision) => (
                              <div key={revision.id} className="rounded-2xl border border-divider p-3 text-sm">
                                <div className="font-medium">
                                  {revision.status === "OPEN" ? "Open request" : "Resolved request"}
                                </div>
                                <div className="text-foreground/70">{revision.notes}</div>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        <div className="flex flex-wrap gap-3">
                          {allowMockupApproval ? (
                            <Button
                              color="primary"
                              isLoading={approveMutation.isPending}
                              onPress={async () => {
                                try {
                                  await approveMutation.mutateAsync({
                                    orderId: order.id,
                                    itemId: item.id,
                                    stage: "MOCKUP"
                                  });
                                  addToast({ title: "Mockup approved", color: "success" });
                                } catch (e: any) {
                                  addToast({
                                    title: "Approval failed",
                                    description: e?.message ?? "Unable to approve item.",
                                    color: "danger"
                                  });
                                }
                              }}
                              style={{ backgroundImage: "var(--primary-gradient)" }}
                            >
                              Approve mockup
                            </Button>
                          ) : null}

                          {allowFinalApproval ? (
                            <Button
                              color="primary"
                              isLoading={approveMutation.isPending}
                              onPress={async () => {
                                try {
                                  await approveMutation.mutateAsync({
                                    orderId: order.id,
                                    itemId: item.id,
                                    stage: "FINAL"
                                  });
                                  addToast({ title: "Final design approved", color: "success" });
                                } catch (e: any) {
                                  addToast({
                                    title: "Approval failed",
                                    description: e?.message ?? "Unable to approve final design.",
                                    color: "danger"
                                  });
                                }
                              }}
                              style={{ backgroundImage: "var(--primary-gradient)" }}
                            >
                              Approve final design
                            </Button>
                          ) : null}

                          {canRequestRevision ? (
                            <Button variant="bordered" onPress={() => setRevisionTarget({ orderId: order.id, item })}>
                              Request revision
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardBody>
          </Card>
        ))}
      </div>

      <RevisionModal
        isOpen={!!revisionTarget}
        item={revisionTarget}
        isSaving={revisionMutation.isPending}
        onClose={() => setRevisionTarget(null)}
        onSubmit={async (input) => {
          if (!revisionTarget) {
            return;
          }

          if (!input.notes.trim()) {
            addToast({
              title: "Revision notes required",
              color: "warning"
            });
            return;
          }

          try {
            await revisionMutation.mutateAsync({
              orderId: revisionTarget.orderId,
              itemId: revisionTarget.item.id,
              input: {
                notes: input.notes.trim(),
                logoUrl: input.logoUrl ?? null,
                logoKey: input.logoKey ?? null
              }
            });
            addToast({
              title: "Revision submitted",
              description: "Your request was sent to the design team.",
              color: "success"
            });
            setRevisionTarget(null);
          } catch (e: any) {
            addToast({
              title: "Revision failed",
              description: e?.message ?? "Unable to submit revision.",
              color: "danger"
            });
          }
        }}
      />
    </>
  );
}

function TeamDesignView({ orders }: { orders: CatalogOrder[] }) {
  const rows = orders.flatMap((order) =>
    order.items.map((item) => ({
      orderId: order.id,
      orderName: order.project?.swagPackName || order.project?.name || order.id,
      customerName: order.name,
      item
    }))
  );

  return (
    <div className="grid gap-4">
      {rows.map((row) => (
        <Card key={`${row.orderId}:${row.item.id}`} className="border border-divider shadow-sm">
          <CardBody className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl bg-default-100">
                {getPreferredDesignImage(row.item) ? (
                  <Image
                    removeWrapper
                    src={getPreferredDesignImage(row.item)!}
                    alt={row.item.productName}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="text-xs text-foreground/55">No preview</div>
                )}
              </div>
              <div className="space-y-1">
                <div className="font-semibold">{row.item.productName}</div>
                <div className="text-sm text-foreground/60">{row.orderName}</div>
                <div className="text-sm text-foreground/60">
                  {row.customerName} · {formatDesignPhaseLabel(row.item.designPhase)}
                </div>
                {row.item.hasOpenRevision ? (
                  <Chip size="sm" color="warning" variant="flat">
                    Revision requested
                  </Chip>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href={`/dashboard/orders/${row.orderId}`}>
                <Button variant="bordered">Open order</Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

export default function DesignsPage() {
  const { data: user } = useMe();
  const isCustomer = hasPermission(user, "orders.self.read");
  const canRead = hasAnyPermission(user, [
    "design.read",
    "design.assigned.read",
    "catalog.orders.read",
    "orders.assigned.read",
    "orders.self.read"
  ]);

  const { data, isLoading, isFetching, isError, error } = useCatalogOrders(
    {
      page: 1,
      pageSize: 50
    },
    canRead
  );

  const orders = useMemo(
    () => (data?.items ?? []).filter((order) => order.items.length > 0),
    [data?.items]
  );

  if (!canRead) {
    return (
      <Card>
        <CardBody>You do not have permission to view designs.</CardBody>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="border border-divider shadow-sm">
        <CardHeader className="flex flex-col items-start gap-1 p-6">
          <div className="text-2xl font-semibold">{isCustomer ? "My Designs" : "Design Jobs"}</div>
          <div className="text-sm text-foreground/60">
            {isCustomer
              ? "Review uploaded mockups, download a combined PDF, approve designs, or request revisions."
              : "Monitor design phases for submitted orders and jump into any order to upload mockups or proofs."}
          </div>
        </CardHeader>
      </Card>

      {isLoading || isFetching ? (
        <Card>
          <CardBody className="flex min-h-[260px] items-center justify-center">
            <Spinner label="Loading designs..." />
          </CardBody>
        </Card>
      ) : isError ? (
        <Card>
          <CardBody className="text-danger">
            {error instanceof Error ? error.message : "Unable to load designs."}
          </CardBody>
        </Card>
      ) : orders.length ? (
        isCustomer ? <CustomerDesignView orders={orders} /> : <TeamDesignView orders={orders} />
      ) : (
        <Card>
          <CardBody className="py-16 text-center text-foreground/60">
            No design items are available yet.
          </CardBody>
        </Card>
      )}
    </div>
  );
}
