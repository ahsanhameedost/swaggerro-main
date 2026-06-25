"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Sparkles } from "lucide-react";
import {
  Button,
  Card,
  CardBody,
  Image,
  Input,
  Textarea
} from "@heroui/react";
import { addToast } from "@heroui/toast";
import { useMe } from "@/queries/auth";
import { useSubmitPublicOrder } from "@/lib/queries.catalog";
import { useCatalogCartStore } from "@/lib/cart-store";
import { calculateCatalogCartSummary } from "@/lib/catalog-cart";
import { createCatalogImageUpload, uploadFileToPresignedUrl } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { PageBanner } from "@/components/marketing/page-banner";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function buildFullName(firstName?: string | null, lastName?: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

function isValidEmail(value: string) {
  return EMAIL_REGEX.test(value.trim());
}

function formatRequirementList(items: string[]) {
  if (items.length <= 1) {
    return items.join("");
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function ProjectSubmissionPageContent() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const bulkItems = useCatalogCartStore((state) => state.bulkItems);
  const swagPackItems = useCatalogCartStore((state) => state.swagPackItems);
  const swagPackPackaging = useCatalogCartStore((state) => state.swagPackPackaging);
  const swagPackQuantity = useCatalogCartStore((state) => state.swagPackQuantity);
  const swagPackName = useCatalogCartStore((state) => state.swagPackName);
  const swagPackLogoUrl = useCatalogCartStore((state) => state.swagPackLogoUrl);
  const swagPackLogoKey = useCatalogCartStore((state) => state.swagPackLogoKey);
  const branding = useCatalogCartStore((state) => state.branding);
  const clearCart = useCatalogCartStore((state) => state.clearCart);

  const summary = useMemo(
    () =>
      calculateCatalogCartSummary({
        bulkItems,
        swagPackItems,
        swagPackPackaging,
        swagPackQuantity,
        swagPackName
      }),
    [bulkItems, swagPackItems, swagPackPackaging, swagPackQuantity, swagPackName]
  );

  const { data: user, isLoading: authLoading } = useMe();
  const submitMutation = useSubmitPublicOrder();

  // Checkout requires an account: a guest must sign in / sign up before adding
  // project details and placing an order. Cart is kept in localStorage, so it
  // survives the round-trip back here after login.
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?next=/project-submission");
    }
  }, [authLoading, user, router]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [budgetPerPerson, setBudgetPerPerson] = useState("");
  const [neededByDate, setNeededByDate] = useState("");
  const [notes, setNotes] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoKey, setLogoKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [touched, setTouched] = useState<{ name?: boolean; email?: boolean; budget?: boolean }>({});

  useEffect(() => {
    if (!user) {
      return;
    }

    const fullName = buildFullName(user.firstName, user.lastName);

    setName((current) => current || fullName);
    setEmail((current) => current || user.email || "");
    setPhone((current) => current || user.phone || "");
  }, [user]);

  // Carry the logo designed in the Swag Pack builder into this submission.
  useEffect(() => {
    if (!swagPackLogoUrl) {
      return;
    }
    setLogoUrl((current) => current ?? swagPackLogoUrl);
    setLogoKey((current) => current ?? swagPackLogoKey);
  }, [swagPackLogoUrl, swagPackLogoKey]);

  // Carry the logo + placement designed in the Mockup Studio into this submission
  // so the design team sees exactly where the logo goes.
  useEffect(() => {
    // Prefill the printable logo only. The placement note is NOT put into the
    // comments box (that stays free for the customer) — it's shown as a separate
    // read-only preview card and appended to the order notes at submit time.
    if (branding.logoUrl) {
      setLogoUrl((current) => current ?? branding.logoUrl);
      setLogoKey((current) => current ?? branding.logoKey);
    }
  }, [branding.logoUrl, branding.logoKey]);

  const trimmedName = name.trim();
  const emailIsValid = isValidEmail(email);
  const budgetValue = Number(budgetPerPerson);
  const budgetIsValid = Number.isFinite(budgetValue) && budgetValue > 0;

  const missingRequirements: string[] = [];
  if (!trimmedName) {
    missingRequirements.push("your full name");
  }
  if (!emailIsValid) {
    missingRequirements.push("a valid email");
  }
  if (!budgetIsValid) {
    missingRequirements.push("a budget per swag pack/person");
  }

  const isBusy = submitMutation.isPending || uploading;

  const canSubmit =
    summary.hasItems &&
    !summary.hasMissingPackaging &&
    !summary.hasInvalidBulkQuantities &&
    !summary.hasInvalidSwagPackQuantities &&
    missingRequirements.length === 0 &&
    !isBusy;

  const disabledReason = missingRequirements.length
    ? `To submit, please provide ${formatRequirementList(missingRequirements)}.`
    : null;

  const uploadLogo = async (file: File) => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
      addToast({
        title: "Unsupported file",
        description: "Please upload a JPG, PNG, or WEBP logo.",
        color: "warning"
      });
      return;
    }

    setUploading(true);

    try {
      const upload = await createCatalogImageUpload("projects", {
        filename: file.name,
        contentType: file.type as "image/jpeg" | "image/png" | "image/webp"
      });

      await uploadFileToPresignedUrl(upload.uploadUrl, file);
      setLogoUrl(upload.publicUrl);
      setLogoKey(upload.key);

      addToast({
        title: "Logo uploaded",
        description: "Your logo is ready for submission.",
        color: "success"
      });
    } catch (error: any) {
      addToast({
        title: "Upload failed",
        description: error?.message ?? "Logo upload failed.",
        color: "danger"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!summary.hasItems) {
      addToast({
        title: "Your cart is empty",
        description: "Add products before submitting a project.",
        color: "warning"
      });
      router.push("/cart");
      return;
    }

    if (summary.hasMissingPackaging) {
      addToast({
        title: "Packaging required",
        description: "Add one packaging product for your swag pack before continuing.",
        color: "warning"
      });
      router.push("/swag-pack");
      return;
    }

    if (summary.hasInvalidBulkQuantities || summary.hasInvalidSwagPackQuantities) {
      addToast({
        title: "Review your quantities",
        description: "One or more cart items exceed stock limits or need updates.",
        color: "warning"
      });
      router.push("/cart");
      return;
    }

    // Surface inline field errors if anything required is missing.
    setTouched({ name: true, email: true, budget: true });

    if (!trimmedName || !emailIsValid) {
      addToast({
        title: "Missing contact details",
        description: "Please provide your name and a valid email.",
        color: "warning"
      });
      return;
    }

    const parsedBudget = budgetValue;

    if (!budgetIsValid) {
      addToast({
        title: "Budget required",
        description: "Please enter your estimated budget per swag pack or person.",
        color: "warning"
      });
      return;
    }

    try {
      // The customer's comments stay free; the logo placement (from the Mockup
      // Studio) is appended as a clearly-labeled block for the design team.
      const finalNotes = [notes.trim(), branding.note?.trim()].filter(Boolean).join("\n\n") || null;
      const result = await submitMutation.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        companyName: companyName.trim() || null,
        phone: phone.trim() || null,
        notes: finalNotes,
        budgetPerPerson: parsedBudget,
        neededByDate: neededByDate || null,
        logoUrl,
        logoKey,
        bulkItems: summary.bulkItems.map((item) => ({
          productId: item.productId,
          productCatalogVariantId: item.productCatalogVariantId ?? null,
          quantity: item.quantity
        })),
        swagPack: summary.hasSwagPack
          ? {
            name: summary.swagPackName,
            packQuantity: summary.packQuantity,
            items: summary.swagPackItems.map((item) => ({
              productId: item.productId,
              productCatalogVariantId: item.productCatalogVariantId ?? null,
              quantityPerPack: item.quantityPerPack
            })),
            packaging: summary.swagPackPackaging
              ? {
                productId: summary.swagPackPackaging.productId,
                productCatalogVariantId:
                  summary.swagPackPackaging.productCatalogVariantId ?? null
              }
              : null
          }
          : null
      });

      clearCart();

      addToast({
        title: "Project request submitted",
        description: "Your order is now available from your dashboard.",
        color: "success"
      });

      const confirmEmail = encodeURIComponent(email.trim());
      router.push(`/order-confirmation?id=${result.order.id}&email=${confirmEmail}`);
    } catch (error: any) {
      addToast({
        title: "Submission failed",
        description: error?.message ?? "Unable to submit your project.",
        color: "danger"
      });
    }
  };

  if (authLoading || !user) {
    return (
      <div className="container flex min-h-[50vh] items-center justify-center text-black/50">
        Redirecting to sign in…
      </div>
    );
  }

  return (
    <>
      <PageBanner
        title="Project Submission"
        subtitle="Add your project details to request a quote."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Cart", href: "/cart" },
          { label: "Project Submission" },
        ]}
      />
      <div className="container py-10 lg:py-14">

      {!summary.hasItems ? (
        <Card className="border border-black/10 bg-white shadow-sm">
          <CardBody className="space-y-5 p-10 text-center">
            <div className="text-2xl font-semibold text-black">Your cart is empty</div>
            <p className="text-black/60">Add products or build a swag pack before checkout.</p>
            <div className="flex justify-center gap-3">
              <Link href="/shop">
                <Button variant="bordered">Continue shopping</Button>
              </Link>
              <Link href="/cart">
                <Button
                  color="primary"
                  className="text-white"
                  style={{ backgroundImage: "var(--primary-gradient)" }}
                >
                  Go to cart
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      ) : summary.hasMissingPackaging ? (
        <Card className="border border-warning/40 bg-warning-50 shadow-sm">
          <CardBody className="space-y-4 p-6">
            <div className="text-xl font-semibold text-black">Packaging is required</div>
            <p className="text-sm text-black/70">
              Your swag pack needs one packaging product before you can submit the project.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/swag-pack">
                <Button
                  color="primary"
                  className="text-white"
                  style={{ backgroundImage: "var(--primary-gradient)" }}
                >
                  Add packaging
                </Button>
              </Link>
              <Link href="/cart">
                <Button variant="bordered">Back to cart</Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_520px]">
          <Card className="border border-black/10 bg-white shadow-sm">
            <CardBody className="space-y-8 p-6 md:p-8">
              <div className="space-y-5">
                <div className="space-y-1">
                  <h2 className="text-2xl font-semibold text-black">
                    Hi, {name.trim() || user?.firstName || "there"}!
                  </h2>
                  <p className="text-sm text-black/60">
                    Confirm your details and tell us about your project.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Full name"
                    value={name}
                    onValueChange={setName}
                    isRequired
                    onBlur={() => setTouched((current) => ({ ...current, name: true }))}
                    isInvalid={Boolean(touched.name) && !trimmedName}
                    errorMessage={
                      touched.name && !trimmedName ? "Please enter your full name." : undefined
                    }
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={email}
                    onValueChange={setEmail}
                    isRequired
                    onBlur={() => setTouched((current) => ({ ...current, email: true }))}
                    isInvalid={Boolean(touched.email) && !emailIsValid}
                    errorMessage={
                      touched.email && !emailIsValid
                        ? email.trim()
                          ? "Please enter a valid email address."
                          : "Please enter your email."
                        : undefined
                    }
                  />
                  <Input label="Company name" value={companyName} onValueChange={setCompanyName} />
                  <Input label="Phone" value={phone} onValueChange={setPhone} />
                </div>
              </div>

              <div className="space-y-5 border-t border-black/10 pt-8">
                <h3 className="text-2xl font-semibold text-black">Project details</h3>

                <Input
                  label="What's your budget per swag pack/person?"
                  type="number"
                  min={0}
                  step="0.01"
                  value={budgetPerPerson}
                  onValueChange={setBudgetPerPerson}
                  placeholder="126.48"
                  isRequired
                  onBlur={() => setTouched((current) => ({ ...current, budget: true }))}
                  isInvalid={Boolean(touched.budget) && !budgetIsValid}
                  errorMessage={
                    touched.budget && !budgetIsValid
                      ? "Please enter a budget greater than 0."
                      : undefined
                  }
                />

                <Input
                  label="Do you need these by a certain date?"
                  type="date"
                  value={neededByDate}
                  onValueChange={setNeededByDate}
                />

                <Textarea
                  label="Any items we missed or comments you'd like to add?"
                  value={notes}
                  onValueChange={setNotes}
                  minRows={6}
                  placeholder="Insert card copy, special requests, or anything we missed."
                />

                {branding.note ? (
                  <div className="rounded-[28px] border border-[var(--primary)]/25 bg-[var(--primary)]/[0.04] p-4">
                    <div className="flex items-start gap-4">
                      {branding.mockupUrl ? (
                        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-black/10 bg-white">
                          <Image removeWrapper src={branding.mockupUrl} alt="Logo placement preview" className="h-full w-full object-contain" />
                        </div>
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-sm font-semibold text-black">
                          <Sparkles className="size-4 text-[var(--primary)]" /> Logo placement attached
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-black/55">
                          Designed in Mockup Studio — your design team will see exactly where the logo goes. This is sent automatically; your comments above stay separate.
                        </p>
                        {branding.mockupUrl ? (
                          <a
                            href={branding.mockupUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            <Eye className="size-3.5" /> View placement preview
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="rounded-[28px] border border-black/10 bg-[#f7f8fb] p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="text-xs text-black/55">
                      Accepted file types: JPG, PNG, WEBP
                    </div>

                    <Button variant="bordered" onPress={() => fileRef.current?.click()} isLoading={uploading}>
                      {logoUrl ? "Replace logo" : "Choose file"}
                    </Button>
                  </div>

                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void uploadLogo(file);
                      }
                    }}
                  />

                  {logoUrl ? (
                    <div className="mt-4 flex items-center gap-4 rounded-[22px] border border-black/10 bg-white p-3">
                      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-zinc-50">
                        <Image removeWrapper src={logoUrl} alt="Uploaded logo" className="h-full w-full object-contain" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-black">Logo uploaded</div>
                        <div className="truncate text-xs text-black/50">{logoKey}</div>
                      </div>
                      <Button
                        variant="light"
                        color="danger"
                        onPress={() => {
                          setLogoUrl(null);
                          setLogoKey(null);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-3 border-t border-black/10 pt-6">
                <div className="flex flex-wrap gap-3">
                  <Button
                    color="primary"
                    className="h-12 min-w-[220px] text-white"
                    style={{ backgroundImage: "var(--primary-gradient)" }}
                    onPress={handleSubmit}
                    isDisabled={!canSubmit}
                    isLoading={isBusy}
                  >
                    Submit Project Request
                  </Button>

                  <Link href="/cart">
                    <Button variant="bordered" className="h-12">
                      Back to cart
                    </Button>
                  </Link>
                </div>

                {disabledReason ? (
                  <p className="text-sm text-warning-600" role="status">
                    {disabledReason}
                  </p>
                ) : null}
              </div>
            </CardBody>
          </Card>

          <Card className="border border-black/10 bg-white shadow-sm">
            <CardBody className="space-y-6 p-6">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-black">Total Estimate</div>
                    <div className="text-xs text-black/50">(Not including taxes and fees)</div>
                  </div>
                  <div className="text-3xl font-semibold text-black">
                    {formatMoney(summary.total)}
                  </div>
                </div>

                <Button
                  color="primary"
                  className="h-12 w-full text-white"
                  style={{ backgroundImage: "var(--primary-gradient)" }}
                  onPress={handleSubmit}
                  isDisabled={!canSubmit}
                  isLoading={isBusy}
                >
                  Submit Project Request
                </Button>

                {disabledReason ? (
                  <p className="text-sm text-warning-600" role="status">
                    {disabledReason}
                  </p>
                ) : null}
              </div>

              <div className="border-t border-black/10 pt-6">
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-semibold text-black">In Your Cart</div>
                  <Link href="/cart" className="text-sm text-primary underline">
                    Edit
                  </Link>
                </div>

                <div className="mt-5 space-y-4">
                  {summary.bulkItems.length ? (
                    <div className="space-y-4">
                      <div className="text-sm font-semibold text-black">
                        {summary.bulkItems.length} Product{summary.bulkItems.length === 1 ? "" : "s"}
                      </div>
                      {summary.bulkItems.map((item) => (
                        <div key={`bulk-${item.productId}-${item.productCatalogVariantId ?? "base"}`} className="grid grid-cols-[56px_minmax(0,1fr)] gap-3">
                          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-zinc-50">
                            {item.imageUrl ? (
                              <Image removeWrapper src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="text-xs font-semibold text-black/35">{item.name.slice(0, 2).toUpperCase()}</div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-black">{item.name}</div>
                            <div className="text-xs text-black/55">{item.variantName || "Standard"}</div>
                            <div className="text-xs text-black/55">
                              Qty: {item.quantity} · {formatMoney(item.unitPrice, item.currency)} / item
                              {item.label ? ` · ${item.label}` : ""}
                            </div>
                            {item.savingsPercent > 0 ? (
                              <div className="text-xs font-medium text-success">
                                Save {item.savingsPercent}% (−{formatMoney(item.discountTotal, item.currency)})
                              </div>
                            ) : null}
                            <div className="text-sm font-semibold text-black">
                              {formatMoney(item.totalPrice, item.currency)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {summary.hasSwagPack ? (
                    <div className="space-y-4 border-t border-black/10 pt-4">
                      <div className="text-sm font-semibold text-black">
                        Swag Pack: {summary.swagPackItemCount} item{summary.swagPackItemCount === 1 ? "" : "s"}
                      </div>

                      <div className="rounded-[22px] bg-zinc-50 p-4">
                        <div className="text-sm font-semibold text-black">{summary.swagPackName}</div>
                        <div className="text-xs text-black/55">
                          Qty: {summary.packQuantity} · {formatMoney(summary.swagPackTotal / summary.packQuantity)} / pack
                        </div>
                        <div className="mt-2 text-sm font-semibold text-black">
                          {formatMoney(summary.swagPackTotal)}
                        </div>
                      </div>

                      <div className="space-y-3">
                        {summary.swagPackItems.map((item) => (
                          <div key={`pack-${item.productId}-${item.productCatalogVariantId ?? "base"}`} className="grid grid-cols-[56px_minmax(0,1fr)] gap-3">
                            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-zinc-50">
                              {item.imageUrl ? (
                                <Image removeWrapper src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="text-xs font-semibold text-black/35">{item.name.slice(0, 2).toUpperCase()}</div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-black">{item.name}</div>
                              <div className="text-xs text-black/55">
                                {item.quantityPerPack} / pack · {formatMoney(item.pricePerPack, item.currency)} / pack
                              </div>
                            </div>
                          </div>
                        ))}

                        {summary.swagPackPackaging ? (
                          <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-3">
                            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-zinc-50">
                              {summary.swagPackPackaging.imageUrl ? (
                                <Image
                                  removeWrapper
                                  src={summary.swagPackPackaging.imageUrl}
                                  alt={summary.swagPackPackaging.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="text-xs font-semibold text-black/35">
                                  {summary.swagPackPackaging.name.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-black">
                                Packaging: {summary.swagPackPackaging.name}
                              </div>
                              <div className="text-xs text-black/55">
                                1 / pack · {formatMoney(summary.swagPackPackaging.pricePerPack, summary.swagPackPackaging.currency)} / pack
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
      </div>
    </>
  );
}
