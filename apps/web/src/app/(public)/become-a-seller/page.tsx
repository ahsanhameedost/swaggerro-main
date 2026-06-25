"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { addToast } from "@heroui/toast";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Store,
  Upload,
  X,
} from "lucide-react";
import { isBusinessEmail } from "@/lib/business-email";
import { useSubmitSellerApplication } from "@/queries/partners";
import { createCatalogImageUpload, uploadFileToPresignedUrl } from "@/modules/catalog/public/api";
import { cn } from "@/lib/utils";

const INDUSTRIES = [
  "Apparel & Fashion",
  "Technology / SaaS",
  "Promotional Products",
  "Events & Agencies",
  "Education",
  "Healthcare",
  "Finance",
  "Retail / E-commerce",
  "Non-profit",
  "Other",
];

const ACCEPTED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_LOGO_BYTES = 5 * 1024 * 1024; // 5MB

type FormState = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  companyAddress: string;
  businessDescription: string;
  industry: string;
  country: string;
  website: string;
  additionalInfo: string;
};

const EMPTY: FormState = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  companyAddress: "",
  businessDescription: "",
  industry: "",
  country: "",
  website: "",
  additionalInfo: "",
};

function Field({
  label,
  required,
  error,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">
        {label} {required ? <span className="text-destructive">*</span> : <span className="text-muted-foreground">(optional)</span>}
      </span>
      <div className="mt-1.5">{children}</div>
      {hint && !error ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p className="mt-1 text-xs font-medium text-destructive">{error}</p> : null}
    </label>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring";

export default function BecomeASellerPage() {
  const submitMutation = useSubmitSellerApplication();
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [logo, setLogo] = useState<{ url: string; key: string } | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleLogoChange = async (file: File) => {
    if (!ACCEPTED_LOGO_TYPES.includes(file.type as (typeof ACCEPTED_LOGO_TYPES)[number])) {
      addToast({ title: "Unsupported file", description: "Use a JPG, PNG, or WEBP image.", color: "warning" });
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      addToast({ title: "File too large", description: "Logo must be 5MB or smaller.", color: "warning" });
      return;
    }
    // Live preview immediately.
    setLogoPreview(URL.createObjectURL(file));
    setUploadingLogo(true);
    try {
      const upload = await createCatalogImageUpload("projects", {
        filename: file.name,
        contentType: file.type as "image/jpeg" | "image/png" | "image/webp",
      });
      await uploadFileToPresignedUrl(upload.uploadUrl, file);
      setLogo({ url: upload.publicUrl, key: upload.key });
    } catch (error: any) {
      addToast({ title: "Upload failed", description: error?.message ?? "Try again.", color: "danger" });
      setLogoPreview(null);
    } finally {
      setUploadingLogo(false);
    }
  };

  const clearLogo = () => {
    setLogo(null);
    setLogoPreview(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const validate = () => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.companyName.trim()) next.companyName = "Company name is required";
    if (form.contactName.trim().length < 2) next.contactName = "Contact name is required";
    if (!form.email.trim()) next.email = "Email is required";
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) next.email = "Enter a valid email";
    else if (!isBusinessEmail(form.email.trim())) next.email = "Use your business email address";
    if (form.phone.trim().length < 6) next.phone = "Phone number is required";
    if (!form.companyAddress.trim()) next.companyAddress = "Company address is required";
    if (!form.businessDescription.trim()) next.businessDescription = "Business description is required";
    if (!form.industry.trim()) next.industry = "Select an industry";
    if (!form.country.trim()) next.country = "Country / region is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (uploadingLogo) {
      addToast({ title: "Please wait", description: "Your logo is still uploading.", color: "warning" });
      return;
    }
    if (!validate()) {
      addToast({ title: "Missing details", description: "Please complete the required fields.", color: "warning" });
      return;
    }
    try {
      await submitMutation.mutateAsync({
        companyName: form.companyName.trim(),
        contactName: form.contactName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        companyAddress: form.companyAddress.trim(),
        businessDescription: form.businessDescription.trim(),
        industry: form.industry.trim(),
        country: form.country.trim(),
        website: form.website.trim() || undefined,
        additionalInfo: form.additionalInfo.trim() || undefined,
        logoUrl: logo?.url ?? null,
        logoKey: logo?.key ?? null,
      });
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error: any) {
      addToast({
        title: "Submission failed",
        description: error?.message ?? "Please try again.",
        color: "danger",
      });
    }
  };

  if (submitted) {
    return (
      <div className="swag-redesign mx-auto max-w-2xl px-6 py-20 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-success/10 text-success">
          <CheckCircle2 className="size-9" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold tracking-tight">Application received</h1>
        <p className="mt-3 text-muted-foreground">
          Thanks for applying to partner with Swaggeroo. Our team will review your application and reach
          out to <span className="font-medium text-foreground">{form.email}</span> shortly.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-brand transition hover:bg-primary/90"
          >
            Browse the shop <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-muted"
          >
            Back home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="swag-redesign mx-auto max-w-3xl px-6 py-10 lg:py-14">
      <div className="mb-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-primary">
          <Store className="size-3.5" /> Become a Partner
        </span>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Sell with Swaggeroo
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Apply to become a Swaggeroo seller / partner. Tell us about your business and our team will
          review your application. White-label storefronts and seller dashboards come next.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold">Company details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Company name" required error={errors.companyName}>
              <input className={inputClass} value={form.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder="Acme Corp" />
            </Field>
            <Field label="Contact person name" required error={errors.contactName}>
              <input className={inputClass} value={form.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder="Jane Doe" />
            </Field>
            <Field label="Business email" required error={errors.email} hint="Use your company email (not gmail/yahoo/etc.)">
              <input className={inputClass} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@company.com" />
            </Field>
            <Field label="Phone number" required error={errors.phone}>
              <input className={inputClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 555 000 0000" />
            </Field>
            <Field label="Industry / business type" required error={errors.industry}>
              <select
                className={cn(inputClass, !form.industry && "text-muted-foreground")}
                value={form.industry}
                onChange={(e) => set("industry", e.target.value)}
              >
                <option value="">Select an industry…</option>
                {INDUSTRIES.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Country / region" required error={errors.country}>
              <input className={inputClass} value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="United States" />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Company address" required error={errors.companyAddress}>
              <input className={inputClass} value={form.companyAddress} onChange={(e) => set("companyAddress", e.target.value)} placeholder="123 Market St, San Francisco, CA" />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Website" error={errors.website}>
              <input className={inputClass} value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://company.com" />
            </Field>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold">About your business</h2>
          <div className="mt-4 space-y-4">
            <Field label="Business description" required error={errors.businessDescription}>
              <textarea
                className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus-visible:border-ring"
                rows={4}
                value={form.businessDescription}
                onChange={(e) => set("businessDescription", e.target.value)}
                placeholder="Tell us what your company does and why you want to partner with Swaggeroo."
              />
            </Field>
            <Field label="Additional information" error={errors.additionalInfo}>
              <textarea
                className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus-visible:border-ring"
                rows={3}
                value={form.additionalInfo}
                onChange={(e) => set("additionalInfo", e.target.value)}
                placeholder="Anything else we should know?"
              />
            </Field>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold">Company logo</h2>
          <p className="mt-1 text-sm text-muted-foreground">Optional. JPG, PNG, or WEBP up to 5MB.</p>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleLogoChange(file);
            }}
          />
          <div className="mt-4">
            {logoPreview ? (
              <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/40 p-4">
                <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoPreview} alt="Logo preview" className="h-full w-full object-contain p-1" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    {uploadingLogo ? (
                      <><Loader2 className="size-4 animate-spin" /> Uploading…</>
                    ) : (
                      <><CheckCircle2 className="size-4 text-success" /> Logo ready</>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={clearLogo}
                    className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-destructive"
                  >
                    <X className="size-3.5" /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-8 text-sm font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                <Upload className="size-4" /> Upload company logo
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            By submitting you agree to be contacted about partnering with Swaggeroo.
          </p>
          <button
            type="submit"
            disabled={submitMutation.isPending || uploadingLogo}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-brand transition hover:bg-primary/90 disabled:opacity-60"
          >
            {submitMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Submit application
          </button>
        </div>
      </form>
    </div>
  );
}
