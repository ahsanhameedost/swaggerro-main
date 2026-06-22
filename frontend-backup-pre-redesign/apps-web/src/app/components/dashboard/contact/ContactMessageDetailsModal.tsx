"use client";

import {
  Chip,
  Divider,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Button,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow
} from "@heroui/react";
import type { ContactMessageDetails } from "@/lib/contact";

type ContactMessageDetailsModalProps = {
  isOpen: boolean;
  message: ContactMessageDetails | null;
  isLoading?: boolean;
  onClose: () => void;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export function ContactMessageDetailsModal({
  isOpen,
  message,
  isLoading,
  onClose
}: ContactMessageDetailsModalProps) {
  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)} size="5xl" scrollBehavior="inside">
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-2">
              <div className="text-xl font-semibold">Contact request details</div>
              {message ? (
                <div className="flex flex-wrap items-center gap-2 text-sm text-foreground/60">
                  <span>{message.companyName}</span>
                  <span>•</span>
                  <span>{message.contactName}</span>
                  <span>•</span>
                  <span>{formatDate(message.createdAt)}</span>
                </div>
              ) : null}
            </ModalHeader>

            <ModalBody>
              {isLoading ? (
                <div className="py-12 text-center text-sm text-foreground/60">Loading details...</div>
              ) : message ? (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <InfoCard label="Company" value={message.companyName} />
                    <InfoCard label="Contact name" value={message.contactName} />
                    <InfoCard label="Email" value={message.email} />
                    <InfoCard label="Phone" value={message.phone} />
                    <InfoCard label="Event / Project" value={message.eventName || "-"} />
                    <InfoCard label="Budget" value={message.budget || "-"} />
                    <InfoCard label="Artwork ready" value={message.artworkReady || "-"} />
                    <InfoCard label="In-hand date" value={message.inHandDate ? new Date(message.inHandDate).toLocaleDateString() : "-"} />
                    <InfoCard label="Admin email sent" value={message.emailedAt ? formatDate(message.emailedAt) : "Not sent yet"} />
                  </div>

                  <div className="rounded-3xl border border-divider bg-content1 p-5">
                    <div className="mb-3 text-sm font-semibold">Shipping details</div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <InfoCard label="Address" value={message.shippingAddress || "-"} />
                      <InfoCard label="City" value={message.city || "-"} />
                      <InfoCard label="State" value={message.state || "-"} />
                      <InfoCard label="ZIP" value={message.zip || "-"} />
                    </div>
                  </div>

                  <div className="rounded-3xl border border-divider bg-content1 p-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">Requested products</div>
                        <div className="text-xs text-foreground/55">
                          Includes the saved form requested products for this inquiry.
                        </div>
                      </div>
                      <Chip variant="flat" color="danger">
                        {message.products.length} item{message.products.length === 1 ? "" : "s"}
                      </Chip>
                    </div>

                    <Table removeWrapper aria-label="Requested products">
                      <TableHeader>
                        <TableColumn>Category</TableColumn>
                        <TableColumn>Quantity</TableColumn>
                        <TableColumn>Target Price</TableColumn>
                        <TableColumn>Decoration</TableColumn>
                        <TableColumn>Colors</TableColumn>
                      </TableHeader>
                      <TableBody emptyContent="No products added.">
                        {message.products.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">{item.productCategory}</div>
                                <div className="text-xs text-foreground/55">
                                  {item.productDescription || "No description added"}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{item.totalQuantity}</TableCell>
                            <TableCell>
                              {typeof item.targetUnitPrice === "number" ? `$${item.targetUnitPrice.toFixed(2)}` : "-"}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div>{item.decorationMethod || "-"}</div>
                                <div className="text-xs text-foreground/55">
                                  {item.decorationNotes || "No decoration notes"}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{item.colors || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="rounded-3xl border border-divider bg-content1 p-5">
                    <div className="mb-2 text-sm font-semibold">Additional notes</div>
                    <p className="text-sm leading-7 text-foreground/70">
                      {message.additionalNotes || "No additional notes provided."}
                    </p>
                  </div>

                  {message.emailError ? (
                    <>
                      <Divider />
                      <div className="rounded-3xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger">
                        Email error: {message.emailError}
                      </div>
                    </>
                  ) : null}
                </div>
              ) : (
                <div className="py-12 text-center text-sm text-foreground/60">No message selected.</div>
              )}
            </ModalBody>

            <ModalFooter>
              <Button variant="flat" onPress={onClose}>
                Close
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-divider bg-background p-4">
      <div className="text-[11px] uppercase tracking-[0.14em] text-foreground/45">{label}</div>
      <div className="mt-2 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}
