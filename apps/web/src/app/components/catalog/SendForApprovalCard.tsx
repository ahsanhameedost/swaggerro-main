"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Textarea,
} from "@heroui/react";
import { addToast } from "@heroui/toast";
import { Check, Loader2, Upload, X } from "lucide-react";
import { useMe } from "@/queries/auth";
import { useSubmitPublicOrder } from "@/lib/queries.catalog";
import { createCatalogImageUpload, uploadFileToPresignedUrl } from "@/lib/catalog";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"] as const;
type AcceptedType = (typeof ACCEPTED)[number];

type Props = {
  productId: string;
  productName: string;
  /** Concrete variant id, if one is selected. */
  productCatalogVariantId: string | null;
  quantity: number;
  /** Whether the current selection is valid (variant chosen, in stock, etc.). */
  canSubmit: boolean;
  disabledReason?: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Product-page logo upload + "Send for approval" flow. Uploads the logo via the
 * existing presigned-URL helpers and creates a CatalogOrder (PENDING_REVIEW) via
 * submitPublicOrder — the same backend path admins already use. Name/email are
 * prefilled when the visitor is signed in; otherwise a popup collects them.
 */
export function SendForApprovalCard({
  productId,
  productName,
  productCatalogVariantId,
  quantity,
  canSubmit,
  disabledReason,
}: Props) {
  const router = useRouter();
  const { data: user } = useMe();
  const submitMutation = useSubmitPublicOrder();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoKey, setLogoKey] = useState<string | null>(null);
  const [logoName, setLogoName] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");
  const [touched, setTouched] = useState(false);

  // Prefill from the signed-in account.
  useEffect(() => {
    if (!user) return;
    setName((c) => c || [user.firstName, user.lastName].filter(Boolean).join(" ").trim());
    setEmail((c) => c || user.email || "");
    setPhone((c) => c || user.phone || "");
  }, [user]);

  const handleFile = async (file: File) => {
    if (!(ACCEPTED as readonly string[]).includes(file.type)) {
      addToast({ title: "Unsupported file", description: "Use PNG, JPG or WEBP.", color: "warning" });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      addToast({ title: "File too large", description: "Logo must be under 8MB.", color: "warning" });
      return;
    }
    setUploading(true);
    try {
      const upload = await createCatalogImageUpload("projects", {
        filename: file.name,
        contentType: file.type as AcceptedType,
      });
      await uploadFileToPresignedUrl(upload.uploadUrl, file);
      setLogoUrl(upload.publicUrl);
      setLogoKey(upload.key);
      setLogoName(file.name);
      addToast({ title: "Logo uploaded", color: "success" });
    } catch (err) {
      addToast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Please try again.",
        color: "danger",
      });
    } finally {
      setUploading(false);
    }
  };

  const clearLogo = () => {
    setLogoUrl(null);
    setLogoKey(null);
    setLogoName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openApproval = () => {
    if (!canSubmit) {
      addToast({ title: "Complete your selection", description: disabledReason, color: "warning" });
      return;
    }
    // Order creation is auth-gated by the backend, so guests sign in first
    // (the logo + selection are preserved when they come back to this page).
    if (!user) {
      const next = typeof window !== "undefined" ? window.location.pathname : "/shop";
      addToast({
        title: "Please sign in",
        description: "Sign in to send this product for approval.",
        color: "warning",
      });
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    setOpen(true);
  };

  const trimmedName = name.trim();
  const emailValid = isValidEmail(email);
  const budgetValue = Number(budget);
  const budgetValid = budget.trim() !== "" && !Number.isNaN(budgetValue) && budgetValue > 0;

  const handleSubmit = async () => {
    setTouched(true);
    if (!trimmedName || !emailValid || !budgetValid) {
      addToast({
        title: "Missing details",
        description: "Please add your name, a valid email, and a budget per person.",
        color: "warning",
      });
      return;
    }
    try {
      const result = await submitMutation.mutateAsync({
        name: trimmedName,
        email: email.trim(),
        companyName: companyName.trim() || null,
        phone: phone.trim() || null,
        notes: notes.trim() || null,
        budgetPerPerson: budgetValue,
        neededByDate: null,
        logoUrl,
        logoKey,
        bulkItems: [
          {
            productId,
            productCatalogVariantId: productCatalogVariantId ?? null,
            quantity,
          },
        ],
        swagPack: null,
      });
      addToast({
        title: "Sent for approval",
        description: "Our team will review your request and get back to you.",
        color: "success",
      });
      setOpen(false);
      router.push(`/order-confirmation?id=${result.order.id}&email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      addToast({
        title: "Could not send",
        description: err instanceof Error ? err.message : "Please try again.",
        color: "danger",
      });
    }
  };

  return (
    <div className="swag-redesign rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">Add your logo & get approval</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload your logo and send this product to our team for a free proof — nothing prints until
            you approve.
          </p>
        </div>
      </div>

      {/* Logo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {logoUrl ? (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-background p-3">
          <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Uploaded logo" className="h-full w-full object-contain" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{logoName || "Logo uploaded"}</p>
            <p className="flex items-center gap-1 text-xs text-success">
              <Check className="size-3.5" /> Ready
            </p>
          </div>
          <button
            type="button"
            onClick={clearLogo}
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label="Remove logo"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-background px-4 py-7 text-center transition-colors hover:border-primary/40 hover:bg-muted/40 disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="size-6 animate-spin text-primary" />
          ) : (
            <Upload className="size-6 text-primary" />
          )}
          <span className="text-sm font-medium text-foreground">
            {uploading ? "Uploading…" : "Upload your logo"}
          </span>
          <span className="text-xs text-muted-foreground">PNG, JPG or WEBP · up to 8MB · optional</span>
        </button>
      )}

      <Button
        className="mt-5 h-13 w-full text-base font-semibold text-white"
        style={{ backgroundImage: "var(--primary-gradient)" }}
        isDisabled={uploading}
        onPress={openApproval}
      >
        Send for approval
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {user ? "We'll link this to your account." : "You'll be asked to sign in first."}
      </p>

      <Modal isOpen={open} onOpenChange={setOpen} placement="center" size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <span className="font-display text-xl font-bold">Send for approval</span>
                <span className="text-sm font-normal text-foreground/60">
                  {productName} · qty {quantity}
                </span>
              </ModalHeader>
              <ModalBody className="gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Full name"
                    isRequired
                    value={name}
                    onValueChange={setName}
                    isInvalid={touched && !trimmedName}
                    errorMessage={touched && !trimmedName ? "Enter your name" : undefined}
                  />
                  <Input
                    label="Email"
                    type="email"
                    isRequired
                    value={email}
                    onValueChange={setEmail}
                    isInvalid={touched && !emailValid}
                    errorMessage={touched && !emailValid ? "Enter a valid email" : undefined}
                  />
                  <Input label="Company (optional)" value={companyName} onValueChange={setCompanyName} />
                  <Input label="Phone (optional)" value={phone} onValueChange={setPhone} />
                  <Input
                    label="Budget per person (USD)"
                    type="number"
                    isRequired
                    value={budget}
                    onValueChange={setBudget}
                    startContent={<span className="text-foreground/50">$</span>}
                    isInvalid={touched && !budgetValid}
                    errorMessage={touched && !budgetValid ? "Enter a budget greater than 0" : undefined}
                  />
                </div>
                <Textarea
                  label="Notes (optional)"
                  value={notes}
                  onValueChange={setNotes}
                  placeholder="Colors, imprint placement, deadlines…"
                  minRows={2}
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  className="font-semibold text-white"
                  style={{ backgroundImage: "var(--primary-gradient)" }}
                  isLoading={submitMutation.isPending}
                  onPress={handleSubmit}
                >
                  Send request
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
