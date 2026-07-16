"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Select,
  SelectItem,
  Spinner,
  Textarea
} from "@heroui/react";
import { addToast } from "@heroui/toast";
import { CheckCircle2, Download, Eye, Sparkles, UploadCloud } from "lucide-react";
import { useMe } from "@/queries/auth";
import { parseLogoPlacement } from "@/lib/logo-placement";
import {
  useApproveCatalogOrderItem,
  useCatalogOrders,
  useCreateCatalogOrderDesignUpload,
  useRequestCatalogOrderItemRevision,
  useUpdateCatalogOrderItemDesign
} from "@/lib/queries.catalog";
import { uploadFileToPresignedUrl } from "@/modules/catalog/public/api";
import { downloadApiFile } from "@/lib/download";
import { formatMoney } from "@/lib/money";
import {
  DESIGN_PHASES,
  formatDesignPhaseLabel,
  formatItemTypeLabel,
  formatOrderDisplayName,
  formatOrderNumber,
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
  const router = useRouter();
  const approveMutation = useApproveCatalogOrderItem();
  const revisionMutation = useRequestCatalogOrderItemRevision();
  const [revisionTarget, setRevisionTarget] = useState<{ orderId: string; item: CatalogOrderItem } | null>(null);
  // Click-to-enlarge lightbox for approved/mockup design images.
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  return (
    <>
      <div className="flex flex-col gap-6">
        {orders.map((order) => (
          <Card key={order.id} className="border border-divider shadow-sm">
            <CardHeader className="flex flex-col gap-3 p-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-xl font-semibold">
                  Order# {formatOrderNumber(order.orderNumber)}
                  {(() => {
                    const code = formatOrderNumber(order.orderNumber);
                    const name = formatOrderDisplayName(order);
                    // Only append a name when it's a real, distinct label (skip the
                    // redundant "SW-035" / "Order SW-035" fallbacks).
                    return name && name !== code && name !== `Order ${code}` ? ` · ${name}` : "";
                  })()}
                </div>
                <div className="text-sm text-foreground/60">
                  {new Date(order.createdAt).toLocaleDateString()}
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
                {order.items.some((i) => i.designPhase === "REVIEW_FINAL_DESIGN") ? (
                  <Button
                    color="primary"
                    startContent={<CheckCircle2 className="size-4" />}
                    isLoading={approveMutation.isPending}
                    onPress={async () => {
                      const finalItems = order.items.filter(
                        (i) => i.designPhase === "REVIEW_FINAL_DESIGN"
                      );
                      try {
                        for (const it of finalItems) {
                          await approveMutation.mutateAsync({
                            orderId: order.id,
                            itemId: it.id,
                            stage: "FINAL"
                          });
                        }
                        addToast({ title: "All final designs approved", color: "success" });
                        // Approved → straight to checkout to pay.
                        router.push(`/dashboard/orders/${order.id}/checkout`);
                      } catch (e: any) {
                        addToast({
                          title: "Approval failed",
                          description: e?.message ?? "Unable to approve final designs.",
                          color: "danger"
                        });
                      }
                    }}
                    style={{ backgroundImage: "var(--primary-gradient)" }}
                  >
                    Approve All Final Design
                  </Button>
                ) : null}
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
                      {getPreferredDesignImage(item) ? (
                        <button
                          type="button"
                          onClick={() => setLightboxSrc(getPreferredDesignImage(item)!)}
                          className="group flex h-[180px] cursor-zoom-in items-center justify-center overflow-hidden rounded-3xl bg-default-100"
                          aria-label={`Enlarge ${item.productName} design`}
                        >
                          <Image
                            removeWrapper
                            src={getPreferredDesignImage(item)!}
                            alt={item.productName}
                            className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
                          />
                        </button>
                      ) : (
                        <div className="flex h-[180px] items-center justify-center overflow-hidden rounded-3xl bg-default-100 text-sm text-foreground/55">
                          Mockup in progress
                        </div>
                      )}

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
                                  // Approving the mockup finalizes the design (no
                                  // separate proof step). Once the whole order is
                                  // ready, send the customer to checkout.
                                  const res = await approveMutation.mutateAsync({
                                    orderId: order.id,
                                    itemId: item.id,
                                    stage: "MOCKUP"
                                  });
                                  addToast({ title: "Design approved", color: "success" });
                                  if (res?.order?.allItemsReadyToOrder) {
                                    router.push(`/dashboard/orders/${order.id}/checkout`);
                                  }
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
                              Approve design
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
                                  // Approved → straight to checkout to pay.
                                  router.push(`/dashboard/orders/${order.id}/checkout`);
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

      <Modal isOpen={!!lightboxSrc} onOpenChange={(open) => (!open ? setLightboxSrc(null) : undefined)} size="4xl">
        <ModalContent>
          {() => (
            <ModalBody className="flex items-center justify-center p-2">
              {lightboxSrc ? (
                <Image
                  removeWrapper
                  src={lightboxSrc}
                  alt="Design preview"
                  className="max-h-[80vh] w-auto object-contain"
                />
              ) : null}
            </ModalBody>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}

// What the design team should do next for a given phase — the only step that
// matters to them, so the queue reads as a clear to-do list.
function designerNextStep(phase: CatalogOrderItem["designPhase"]): {
  label: string;
  group: "action" | "waiting" | "done";
} {
  switch (phase) {
    case "MOCKUP_IN_PROGRESS":
      return { label: "Upload mockup", group: "action" };
    case "REVISION_REQUESTED":
      return { label: "Address revision", group: "action" };
    case "FINALIZING_PROOF_DESIGN":
      return { label: "Upload final proof", group: "action" };
    case "REVIEW_MOCKUP_DESIGN":
      return { label: "Awaiting customer review", group: "waiting" };
    case "REVIEW_FINAL_DESIGN":
      return { label: "Awaiting final approval", group: "waiting" };
    case "READY_TO_ORDER":
      return { label: "Approved & ready", group: "done" };
    default:
      return { label: formatDesignPhaseLabel(phase), group: "waiting" };
  }
}

const TEAM_GROUPS: { key: "action" | "waiting" | "done"; title: string; hint: string }[] = [
  { key: "action", title: "Needs your action", hint: "Upload or revise these designs" },
  { key: "waiting", title: "Waiting on customer", hint: "Submitted — pending customer review" },
  { key: "done", title: "Completed", hint: "Approved and ready to order" }
];

// The phases a designer can move a job through, in workflow order. Uploading a
// mockup/proof also advances the phase automatically, but this lets them set it
// manually (e.g. back to "Mockup In Progress" or flag "Revision Requested").
const DESIGNER_PHASE_OPTIONS: CatalogOrderItem["designPhase"][] = [
  "MOCKUP_IN_PROGRESS",
  "REVIEW_MOCKUP_DESIGN",
  "READY_TO_ORDER",
  "REVISION_REQUESTED"
];

// A single design asset slot. Product / Mockup / Proof are shown side by side so
// it's clear the mockup and proof are separate uploads that never overwrite the
// original product image.
function AssetThumb({ label, src, hint }: { label: string; src?: string | null; hint: string }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-foreground/55">{label}</div>
      <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-divider bg-default-100">
        {src ? (
          <Image removeWrapper src={src} alt={label} className="h-full w-full object-contain" />
        ) : (
          <span className="px-2 text-center text-[11px] text-foreground/40">{hint}</span>
        )}
      </div>
    </div>
  );
}

function DesignJobCard({
  orderId,
  orderName,
  customerName,
  item,
  step,
  accent,
  orderNotes,
  orderLogoUrl
}: {
  orderId: string;
  orderName: string;
  customerName: string;
  item: CatalogOrderItem;
  step: { label: string; group: "action" | "waiting" | "done" };
  accent: "warning" | "success" | "default";
  orderNotes?: string | null;
  orderLogoUrl?: string | null;
}) {
  const uploadMutation = useCreateCatalogOrderDesignUpload();
  const updateMutation = useUpdateCatalogOrderItemDesign();
  const mockupInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingKind, setPendingKind] = useState<null | "mockups" | "proofs">(null);

  // The customer's logo + placement designed in the Mockup Studio, parsed from
  // the order notes so the designer sees exactly where the logo goes.
  const { placement } = parseLogoPlacement(orderNotes);
  const hasBranding = Boolean(orderLogoUrl || placement);

  const uploadAsset = async (
    file: File,
    type: "mockups" | "proofs",
    nextPhase: CatalogOrderItem["designPhase"]
  ) => {
    setPendingKind(type);
    try {
      const upload = await uploadMutation.mutateAsync({
        filename: file.name,
        contentType: file.type as "image/jpeg" | "image/png" | "image/webp",
        type
      });
      await uploadFileToPresignedUrl(upload.uploadUrl, file);
      // Mockups and proofs write to their own fields (mockupImageUrl /
      // proofImageUrl) — the product imageUrl is never touched.
      await updateMutation.mutateAsync({
        orderId,
        itemId: item.id,
        input:
          type === "mockups"
            ? {
                mockupImageUrl: upload.publicUrl,
                mockupImageKey: upload.key,
                designPhase: nextPhase,
                resolveOpenRevision: true
              }
            : {
                proofImageUrl: upload.publicUrl,
                proofImageKey: upload.key,
                designPhase: nextPhase
              }
      });
      addToast({
        title: type === "mockups" ? "Mockup uploaded — sent for review" : "Proof uploaded — sent for final review",
        color: "success"
      });
    } catch (e: any) {
      addToast({
        title: "Upload failed",
        description: e?.message ?? "Unable to upload design asset.",
        color: "danger"
      });
    } finally {
      setPendingKind(null);
    }
  };

  const openRevision = item.revisions.find((revision) => revision.status === "OPEN");
  const busy = updateMutation.isPending || uploadMutation.isPending;

  return (
    <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-base font-semibold">{item.productName}</div>
              <Chip size="sm" variant="flat">
                {formatItemTypeLabel(item.itemType)}
              </Chip>
              <Chip size="sm" color={accent} variant="flat">
                {step.label}
              </Chip>
              {item.hasOpenRevision ? (
                <Chip size="sm" color="warning" variant="flat">
                  Revision requested
                </Chip>
              ) : null}
            </div>
            <div className="text-sm text-foreground/60">
              {orderName} · {customerName}
            </div>
            <div className="text-sm text-foreground/60">
              {item.variantName || "Standard"} ·{" "}
              {item.itemType === "BULK"
                ? `Qty ${item.quantity}`
                : `${item.quantityPerPack ?? 1} / pack · ${item.quantity} total`}
            </div>
          </div>

          <Select
            aria-label="Update design status"
            label="Status"
            labelPlacement="outside"
            selectedKeys={[item.designPhase]}
            isDisabled={busy}
            disallowEmptySelection
            onSelectionChange={async (keys) => {
              const nextPhase = Array.from(keys as Set<string>)[0] as CatalogOrderItem["designPhase"];
              if (!nextPhase || nextPhase === item.designPhase) return;
              try {
                await updateMutation.mutateAsync({
                  orderId,
                  itemId: item.id,
                  input: { designPhase: nextPhase }
                });
                addToast({ title: "Status updated", color: "success" });
              } catch (e: any) {
                addToast({
                  title: "Update failed",
                  description: e?.message ?? "Unable to update status.",
                  color: "danger"
                });
              }
            }}
            className="w-full shrink-0 lg:w-64"
          >
            {DESIGNER_PHASE_OPTIONS.map((phase) => (
              <SelectItem key={phase}>{formatDesignPhaseLabel(phase)}</SelectItem>
            ))}
          </Select>
        </div>

        {openRevision ? (
          <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4 text-sm">
            <div className="font-semibold">Customer requested a revision</div>
            <div className="mt-1 text-foreground/70">{openRevision.notes}</div>
            {openRevision.logoUrl ? (
              <a
                href={openRevision.logoUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex text-primary underline"
              >
                View attached logo
              </a>
            ) : null}
          </div>
        ) : null}

        {hasBranding ? (
          <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">
              <Sparkles className="size-4 text-primary" /> Logo &amp; placement
            </div>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row">
              <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-divider bg-white">
                {placement?.mockupUrl ? (
                  <Image removeWrapper src={placement.mockupUrl} alt="Logo placement preview" className="h-full w-full object-contain" />
                ) : orderLogoUrl ? (
                  <Image removeWrapper src={orderLogoUrl} alt="Customer logo" className="h-full w-full object-contain" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                {placement?.target ? (
                  <div className="text-sm font-semibold text-foreground">{placement.target}</div>
                ) : null}
                {placement ? (
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {[
                      { label: "Horizontal", value: placement.horizontal != null ? `${placement.horizontal}%` : "—" },
                      { label: "Vertical", value: placement.vertical != null ? `${placement.vertical}%` : "—" },
                      { label: "Width", value: placement.width != null ? `${placement.width}%` : "—" },
                      { label: "Rotation", value: placement.rotation != null ? `${placement.rotation}°` : "—" },
                      { label: "Opacity", value: placement.opacity != null ? `${placement.opacity}%` : "—" },
                      { label: "Imprint", value: placement.imprint ?? "—" }
                    ].map((f) => (
                      <div key={f.label} className="rounded-xl border border-divider bg-background px-3 py-2">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-foreground/40">{f.label}</div>
                        <div className="truncate text-sm font-medium text-foreground">{f.value}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-foreground/60">Logo uploaded by the customer.</div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {placement?.mockupUrl ? (
                    <a
                      href={placement.mockupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-white"
                    >
                      <Eye className="size-3.5" /> Preview mockup
                    </a>
                  ) : null}
                  {orderLogoUrl ? (
                    <a
                      href={orderLogoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-divider bg-background px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-content2"
                    >
                      <Download className="size-3.5" /> Original logo
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-end gap-4">
          <AssetThumb label="Product" src={item.imageUrl} hint="No image" />
          <AssetThumb label="Mockup" src={item.mockupImageUrl} hint="Not uploaded" />

          <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
            <input
              ref={mockupInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadAsset(file, "mockups", "REVIEW_MOCKUP_DESIGN");
                event.currentTarget.value = "";
              }}
            />
            <Button
              variant="bordered"
              startContent={<UploadCloud className="size-4" />}
              isLoading={pendingKind === "mockups"}
              isDisabled={busy}
              onPress={() => mockupInputRef.current?.click()}
            >
              {item.mockupImageUrl ? "Replace mockup" : "Upload mockup"}
            </Button>
          </div>
        </div>
    </div>
  );
}

type DesignRow = {
  key: string;
  orderId: string;
  orderNumber: number;
  orderName: string;
  customerName: string;
  item: CatalogOrderItem;
  step: { label: string; group: "action" | "waiting" | "done" };
  orderNotes: string | null;
  orderLogoUrl: string | null;
};

// Minimal list row — order # + name for history, plus a View button that opens
// the full editor. Keeps the queue scannable instead of a wall of big cards.
function DesignJobRow({
  row,
  accent,
  onView
}: {
  row: DesignRow;
  accent: "warning" | "success" | "default";
  onView: () => void;
}) {
  const preview = getPreferredDesignImage(row.item);
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-divider bg-background p-3 transition hover:bg-content2">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-default-100">
        {preview ? (
          <Image removeWrapper src={preview} alt={row.item.productName} className="h-full w-full object-contain" />
        ) : (
          <span className="px-1 text-center text-[10px] text-foreground/40">No preview</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-semibold text-foreground">{formatOrderNumber(row.orderNumber)}</span>
          <span className="truncate text-foreground/70">{row.orderName}</span>
        </div>
        <div className="mt-0.5 truncate text-xs text-foreground/55">
          {row.item.productName} · {row.item.variantName || "Standard"} · {row.customerName}
        </div>
      </div>

      <Chip size="sm" color={accent} variant="flat" className="hidden shrink-0 sm:flex">
        {row.step.label}
      </Chip>
      {row.item.hasOpenRevision ? (
        <Chip size="sm" color="warning" variant="flat" className="hidden shrink-0 md:flex">
          Revision
        </Chip>
      ) : null}

      <Button
        size="sm"
        variant="bordered"
        startContent={<Eye className="size-4" />}
        onPress={onView}
        className="shrink-0"
      >
        View
      </Button>
    </div>
  );
}

function TeamDesignView({ orders }: { orders: CatalogOrder[] }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const rows: DesignRow[] = orders.flatMap((order) =>
    order.items.map((item) => ({
      key: `${order.id}:${item.id}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderName: formatOrderDisplayName(order),
      customerName: order.name,
      item,
      step: designerNextStep(item.designPhase),
      orderNotes: order.notes ?? null,
      orderLogoUrl: order.logoUrl ?? null
    }))
  );

  // Derive the open row from the latest data each render, so uploads / status
  // changes made in the modal reflect immediately once the query refetches.
  const selected = rows.find((r) => r.key === selectedKey) ?? null;
  const selectedAccent = selected
    ? selected.step.group === "action"
      ? "warning"
      : selected.step.group === "done"
        ? "success"
        : "default"
    : "default";

  return (
    <div className="flex flex-col gap-8">
      {TEAM_GROUPS.map((group) => {
        const groupRows = rows.filter((r) => r.step.group === group.key);
        if (!groupRows.length) return null;
        const chipColor =
          group.key === "action" ? "warning" : group.key === "done" ? "success" : "default";
        return (
          <div key={group.key} className="space-y-3">
            <div className="flex items-baseline gap-3">
              <h2 className="text-lg font-semibold">{group.title}</h2>
              <span className="text-sm text-foreground/55">
                {groupRows.length} · {group.hint}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {groupRows.map((row) => (
                <DesignJobRow
                  key={row.key}
                  row={row}
                  accent={chipColor}
                  onView={() => setSelectedKey(row.key)}
                />
              ))}
            </div>
          </div>
        );
      })}

      <Modal
        isOpen={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelectedKey(null);
        }}
        size="3xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {() =>
            selected ? (
              <>
                <ModalHeader className="flex flex-col gap-0.5">
                  <span className="text-base">
                    {formatOrderNumber(selected.orderNumber)} · {selected.orderName}
                  </span>
                  <span className="text-xs font-normal text-foreground/55">{selected.customerName}</span>
                </ModalHeader>
                <ModalBody className="pb-6">
                  <DesignJobCard
                    key={selected.key}
                    orderId={selected.orderId}
                    orderName={selected.orderName}
                    customerName={selected.customerName}
                    item={selected.item}
                    step={selected.step}
                    accent={selectedAccent}
                    orderNotes={selected.orderNotes}
                    orderLogoUrl={selected.orderLogoUrl}
                  />
                </ModalBody>
              </>
            ) : null
          }
        </ModalContent>
      </Modal>
    </div>
  );
}

export default function DesignsPage() {
  const { data: user } = useMe();
  // Anyone holding a design permission is treated as the design team — even if
  // they also carry the customer-scoped orders.self.read — so designers get the
  // production queue view, not the customer "My Designs" review view.
  const isDesignTeam = hasAnyPermission(user, ["design.read", "design.assigned.read", "design.write"]);
  const isCustomer = !isDesignTeam && hasPermission(user, "orders.self.read");
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
          <div className="text-2xl font-semibold">{isCustomer ? "My Designs" : "Design Queue"}</div>
          <div className="text-sm text-foreground/60">
            {isCustomer
              ? "Review uploaded mockups, download a combined PDF, approve designs, or request revisions."
              : "Every order that needs artwork, in one place — upload mockups, send proofs for review, and move each job from mockup to ready-to-print."}
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
            {isCustomer
              ? "No design items are available yet."
              : "Your design queue is empty — no orders need artwork right now."}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
