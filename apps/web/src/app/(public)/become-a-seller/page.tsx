"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { addToast } from "@heroui/toast";
import { Country, State } from "country-state-city";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  Store,
  Upload,
  X,
} from "lucide-react";
import { isBusinessEmail } from "@/lib/business-email";
import { useSubmitSellerApplication } from "@/queries/partners";
import { checkSellerAvailability } from "@/modules/partners/api";
import { createCatalogImageUpload, uploadFileToPresignedUrl } from "@/modules/catalog/public/api";
import { cn } from "@/lib/utils";
import { SellerAgreementModal } from "@/app/components/partners/SellerAgreementModal";
import { SELLER_AGREEMENT_VERSION } from "@/lib/seller-agreement";

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

// Display-only prefix for the store URL. Functionally a slug maps to /store/<slug>.
const STORE_URL_PREFIX = "swaggeroo.com/store/";

// Keep in sync with the API slug format (lowercase alphanumerics + dashes).
function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

type FormState = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  companyAddress: string;
  businessDescription: string;
  industry: string;
  countryCode: string;
  stateName: string;
  slug: string;
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
  countryCode: "",
  stateName: "",
  slug: "",
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
        {label}{" "}
        {required ? (
          <span className="text-destructive">*</span>
        ) : (
          <span className="text-muted-foreground">(optional)</span>
        )}
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

  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [slugEdited, setSlugEdited] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [logo, setLogo] = useState<{ url: string; key: string } | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Seller Agreement gate.
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);

  // Live duplicate-check state for email + store URL.
  const [emailTaken, setEmailTaken] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [slugTaken, setSlugTaken] = useState(false);
  const [checkingSlug, setCheckingSlug] = useState(false);

  const countries = useMemo(() => Country.getAllCountries(), []);
  const states = useMemo(
    () => (form.countryCode ? State.getStatesOfCountry(form.countryCode) : []),
    [form.countryCode]
  );

  const set = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  // Auto-fill the store URL slug from the company name until the user edits it.
  const onCompanyNameChange = (value: string) => {
    setForm((current) => ({
      ...current,
      companyName: value,
      slug: slugEdited ? current.slug : slugify(value),
    }));
    setErrors((current) => ({ ...current, companyName: undefined }));
  };

  const onSlugChange = (value: string) => {
    setSlugEdited(true);
    set("slug", slugify(value));
  };

  // Debounced email availability check.
  useEffect(() => {
    const email = form.email.trim().toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !isBusinessEmail(email)) {
      setEmailTaken(false);
      setCheckingEmail(false);
      return;
    }
    setCheckingEmail(true);
    const handle = setTimeout(async () => {
      try {
        const res = await checkSellerAvailability({ email });
        setEmailTaken(Boolean(res.emailTaken));
      } catch {
        setEmailTaken(false);
      } finally {
        setCheckingEmail(false);
      }
    }, 450);
    return () => clearTimeout(handle);
  }, [form.email]);

  // Debounced store URL (slug) availability check.
  useEffect(() => {
    const slug = form.slug.trim();
    if (!slug) {
      setSlugTaken(false);
      setCheckingSlug(false);
      return;
    }
    setCheckingSlug(true);
    const handle = setTimeout(async () => {
      try {
        const res = await checkSellerAvailability({ slug });
        setSlugTaken(Boolean(res.slugTaken));
      } catch {
        setSlugTaken(false);
      } finally {
        setCheckingSlug(false);
      }
    }, 450);
    return () => clearTimeout(handle);
  }, [form.slug]);

  const handleLogoChange = async (file: File) => {
    if (!ACCEPTED_LOGO_TYPES.includes(file.type as (typeof ACCEPTED_LOGO_TYPES)[number])) {
      addToast({ title: "Unsupported file", description: "Use a JPG, PNG, or WEBP image.", color: "warning" });
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      addToast({ title: "File too large", description: "Logo must be 5MB or smaller.", color: "warning" });
      return;
    }
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

  const validateStep1 = () => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.companyName.trim()) next.companyName = "Company name is required";
    if (form.contactName.trim().length < 2) next.contactName = "Contact name is required";
    if (!form.email.trim()) next.email = "Email is required";
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) next.email = "Enter a valid email";
    else if (!isBusinessEmail(form.email.trim())) next.email = "Use your business email address";
    else if (emailTaken) next.email = "This business email is already registered";
    if (form.phone.trim().length < 6) next.phone = "Phone number is required";
    if (!form.industry.trim()) next.industry = "Select an industry";
    if (!form.countryCode) next.countryCode = "Country / region is required";
    if (!form.companyAddress.trim()) next.companyAddress = "Company address is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateStep2 = () => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.slug.trim()) next.slug = "Choose a store URL";
    else if (slugTaken) next.slug = "That store URL is already taken";
    if (!form.businessDescription.trim()) next.businessDescription = "Business description is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goNext = () => {
    if (checkingEmail) {
      addToast({ title: "Please wait", description: "Checking your email…", color: "warning" });
      return;
    }
    if (!validateStep1()) {
      addToast({ title: "Missing details", description: "Please complete the required fields.", color: "warning" });
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (uploadingLogo) {
      addToast({ title: "Please wait", description: "Your logo is still uploading.", color: "warning" });
      return;
    }
    if (checkingSlug) {
      addToast({ title: "Please wait", description: "Checking your store URL…", color: "warning" });
      return;
    }
    if (!validateStep2()) {
      addToast({ title: "Missing details", description: "Please complete the required fields.", color: "warning" });
      return;
    }
    if (!termsAccepted) {
      setTermsError("Please read and accept the Seller Agreement to continue.");
      addToast({ title: "Agreement required", description: "Please accept the Seller Agreement.", color: "warning" });
      return;
    }
    const countryName = countries.find((c) => c.isoCode === form.countryCode)?.name ?? form.countryCode;
    try {
      await submitMutation.mutateAsync({
        companyName: form.companyName.trim(),
        contactName: form.contactName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        companyAddress: form.companyAddress.trim(),
        businessDescription: form.businessDescription.trim(),
        industry: form.industry.trim(),
        country: countryName,
        state: form.stateName.trim() || undefined,
        desiredSlug: form.slug.trim() || undefined,
        website: form.website.trim() || undefined,
        additionalInfo: form.additionalInfo.trim() || undefined,
        logoUrl: logo?.url ?? null,
        logoKey: logo?.key ?? null,
        termsAccepted: true,
        termsVersion: SELLER_AGREEMENT_VERSION,
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
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-warning/10 text-warning">
          <Clock className="size-9" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold tracking-tight">Your application is under review</h1>
        <p className="mt-3 text-muted-foreground">
          Thanks for applying to partner with Swaggeroo. Our team is reviewing your application and the
          Swaggeroo side of the approval. Once approved, we&apos;ll email{" "}
          <span className="font-medium text-foreground">{form.email}</span> a secure link to set up your
          account — verify your email, choose a username and password — and unlock your seller dashboard at{" "}
          <span className="font-medium text-foreground">
            {STORE_URL_PREFIX}
            {form.slug}
          </span>
          .
        </p>
        <div className="mx-auto mt-8 max-w-md rounded-2xl border border-border bg-card p-5 text-left text-sm">
          <p className="font-semibold text-foreground">What happens next</p>
          <ol className="mt-3 space-y-2 text-muted-foreground">
            <li className="flex gap-2"><span className="font-semibold text-foreground">1.</span> Swaggeroo reviews your application.</li>
            <li className="flex gap-2"><span className="font-semibold text-foreground">2.</span> On approval you receive an account-setup email.</li>
            <li className="flex gap-2"><span className="font-semibold text-foreground">3.</span> Verify your email and set your password.</li>
            <li className="flex gap-2"><span className="font-semibold text-foreground">4.</span> Add products, brand them with your logo, and go live.</li>
          </ol>
        </div>
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
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Sell with Swaggeroo</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Apply to launch your own white-label storefront. Tell us about your business and claim your store
          URL — our team reviews every application.
        </p>
      </div>

      {/* Stepper */}
      <div className="mb-8 flex items-center gap-3">
        <StepPill index={1} label="Your company" active={step === 1} done={step > 1} />
        <div className="h-px flex-1 bg-border" />
        <StepPill index={2} label="Your store" active={step === 2} done={false} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {step === 1 ? (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-display text-lg font-bold">Company details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Company name" required error={errors.companyName}>
                <input className={inputClass} value={form.companyName} onChange={(e) => onCompanyNameChange(e.target.value)} placeholder="Acme Corp" />
              </Field>
              <Field label="Contact person name" required error={errors.contactName}>
                <input className={inputClass} value={form.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder="Jane Doe" />
              </Field>
              <Field
                label="Business email"
                required
                error={errors.email ?? (emailTaken ? "This business email is already registered" : undefined)}
                hint={
                  checkingEmail
                    ? "Checking availability…"
                    : "Use your company email (not gmail/yahoo/etc.)"
                }
              >
                <input
                  className={cn(inputClass, emailTaken && "border-destructive")}
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="you@company.com"
                />
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
                    <option key={industry} value={industry}>{industry}</option>
                  ))}
                </select>
              </Field>
              <Field label="Country / region" required error={errors.countryCode}>
                <select
                  className={cn(inputClass, !form.countryCode && "text-muted-foreground")}
                  value={form.countryCode}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, countryCode: e.target.value, stateName: "" }))
                  }
                >
                  <option value="">Select a country…</option>
                  {countries.map((c) => (
                    <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="State / province" required={false} error={errors.stateName}>
                <select
                  className={cn(inputClass, !form.stateName && "text-muted-foreground")}
                  value={form.stateName}
                  onChange={(e) => set("stateName", e.target.value)}
                  disabled={!form.countryCode || states.length === 0}
                >
                  <option value="">
                    {!form.countryCode
                      ? "Select a country first"
                      : states.length === 0
                        ? "No states listed"
                        : "Select a state…"}
                  </option>
                  {states.map((s) => (
                    <option key={s.isoCode} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Website" error={errors.website}>
                <input className={inputClass} value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://company.com" />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Company address" required error={errors.companyAddress}>
                <input className={inputClass} value={form.companyAddress} onChange={(e) => set("companyAddress", e.target.value)} placeholder="123 Market St, San Francisco, CA" />
              </Field>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-brand transition hover:bg-primary/90"
              >
                Continue <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold">Your store URL</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                This is where your branded storefront will live. We pre-filled it from your company name —
                edit it if you like.
              </p>
              <div className="mt-4">
                <Field
                  label="Store URL"
                  required
                  error={errors.slug ?? (slugTaken ? "This store URL is already taken" : undefined)}
                  hint={
                    checkingSlug
                      ? "Checking availability…"
                      : form.slug && !slugTaken
                        ? "This store URL is available."
                        : undefined
                  }
                >
                  <div
                    className={cn(
                      "flex items-stretch overflow-hidden rounded-xl border bg-background",
                      slugTaken ? "border-destructive" : "border-input focus-within:border-ring"
                    )}
                  >
                    <span className="flex select-none items-center whitespace-nowrap border-r border-border bg-muted px-3 text-sm text-muted-foreground">
                      {STORE_URL_PREFIX}
                    </span>
                    <input
                      className="h-11 w-full bg-transparent px-3 text-sm outline-none"
                      value={form.slug}
                      onChange={(e) => onSlugChange(e.target.value)}
                      placeholder="acme-corp"
                      autoCapitalize="none"
                      spellCheck={false}
                    />
                    <span className="flex items-center pr-3">
                      {checkingSlug ? (
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      ) : form.slug && !slugTaken ? (
                        <CheckCircle2 className="size-4 text-success" />
                      ) : null}
                    </span>
                  </div>
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

            {/* Seller Agreement gate */}
            <div
              className={cn(
                "rounded-2xl border bg-card p-4",
                termsError ? "border-destructive/60" : "border-border",
              )}
            >
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setTermsError(null);
                    if (checked) {
                      // Force the seller to read the contract: open it instead of
                      // ticking immediately. They accept from inside the modal.
                      setTermsAccepted(false);
                      setAgreementOpen(true);
                    } else {
                      setTermsAccepted(false);
                    }
                  }}
                  className="mt-0.5 size-4 shrink-0 rounded border-input accent-primary"
                />
                <span className="text-sm text-foreground">
                  I have read and agree to the{" "}
                  <button
                    type="button"
                    onClick={() => setAgreementOpen(true)}
                    className="font-semibold text-primary underline underline-offset-2 hover:opacity-80"
                  >
                    Swaggeroo Seller Agreement
                  </button>
                  , including the commission and pricing terms (0–15% or a per-product flat fee).
                </span>
              </label>
              {termsError ? (
                <p className="mt-2 text-xs font-medium text-destructive">{termsError}</p>
              ) : termsAccepted ? (
                <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-success">
                  <CheckCircle2 className="size-3.5" /> Agreement accepted
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-5 py-3 text-sm font-medium transition hover:bg-muted"
              >
                <ArrowLeft className="size-4" /> Back
              </button>
              <button
                type="submit"
                disabled={submitMutation.isPending || uploadingLogo || !termsAccepted}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-brand transition hover:bg-primary/90 disabled:opacity-60"
              >
                {submitMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Submit application
              </button>
            </div>
          </>
        )}
      </form>

      <SellerAgreementModal
        open={agreementOpen}
        onClose={() => setAgreementOpen(false)}
        onAccept={() => {
          setTermsAccepted(true);
          setTermsError(null);
          setAgreementOpen(false);
        }}
      />
    </div>
  );
}

function StepPill({
  index,
  label,
  active,
  done,
}: {
  index: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "flex size-7 items-center justify-center rounded-full text-xs font-bold",
          active
            ? "bg-primary text-primary-foreground"
            : done
              ? "bg-success text-white"
              : "bg-muted text-muted-foreground"
        )}
      >
        {done ? <CheckCircle2 className="size-4" /> : index}
      </span>
      <span className={cn("text-sm font-medium", active ? "text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
    </div>
  );
}
