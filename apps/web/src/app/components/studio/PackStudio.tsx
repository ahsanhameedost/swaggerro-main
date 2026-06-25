"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addToast } from "@heroui/toast";
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  Check,
  Loader2,
  Minus,
  Package,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  TrendingDown,
} from "lucide-react";
import { usePublicProducts } from "@/lib/queries.catalog";
import {
  getCartItemKey,
  useCatalogCartStore,
  useCartHydrated,
  type SwagPackCartItem,
  type SwagPackPackagingItem,
} from "@/lib/cart-store";
import { calculateCatalogCartSummary } from "@/lib/catalog-cart";
import { resolveUnitPrice } from "@/lib/catalog-pricing";
import { formatMoney } from "@/lib/money";
import { createCatalogImageUpload, uploadFileToPresignedUrl } from "@/lib/catalog";
import { getPublicProduct } from "@/modules/catalog/public/api";
import { PackagingProductDrawer } from "@/app/components/catalog/PackagingProductDrawer";
import { cn } from "@/lib/utils";
import type {
  CatalogProductDetail,
  CatalogProductListItem,
  ProductCatalogVariant,
} from "@/modules/catalog/products/types";

const STEPS = ["Pick", "Quantities", "Branding", "Review"] as const;
const ACCEPTED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

function resolveDefaultVariant(product: CatalogProductDetail) {
  return (
    product.productCatalogVariants.find((variant) => variant.isDefault) ??
    product.productCatalogVariants[0] ??
    null
  );
}

function buildVariantLabel(variant: ProductCatalogVariant | null) {
  if (!variant) return null;
  if (variant.title?.trim()) return variant.title.trim();
  const values = variant.selectedOptions.map((o) => o.label || o.code).filter(Boolean);
  return values.length ? values.join(" / ") : null;
}

function mapProductToSwagPackItem(
  product: CatalogProductDetail,
  variant: ProductCatalogVariant | null,
): SwagPackCartItem {
  return {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    imageUrl: product.images[0]?.url ?? null,
    productCatalogVariantId: variant?.id ?? null,
    variantName: buildVariantLabel(variant),
    basePrice: variant?.price ?? product.basePrice ?? product.minPrice ?? 0,
    compareAtPrice: product.compareAtPrice ?? null,
    stock: variant?.stock ?? product.baseStock ?? 0,
    minQty: 1,
    currency: product.currency,
    pricingOptions: variant?.pricingOptions?.length ? variant.pricingOptions : product.pricingOptions,
    quantityPerPack: 1,
  };
}

function mapPackagingToCartItem(
  product: CatalogProductDetail,
  variant: ProductCatalogVariant | null,
): SwagPackPackagingItem {
  return {
    ...mapProductToSwagPackItem(product, variant),
    quantityPerPack: 1,
    isPackaging: true,
  };
}

/** Quantity stepper styled to match the redesign tokens. */
function Stepper({
  value,
  onChange,
  min = 1,
  step = 1,
  max,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  step?: number;
  max?: number;
}) {
  const clamp = (n: number) => {
    let next = Math.max(min, Math.floor(n || min));
    if (typeof max === "number") next = Math.min(max, next);
    return next;
  };
  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(clamp(value - step))}
        className="flex size-9 items-center justify-center rounded-lg border border-border text-foreground transition hover:bg-muted disabled:opacity-40"
        disabled={value <= min}
        aria-label="Decrease"
      >
        <Minus className="size-4" />
      </button>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        className="h-9 w-20 rounded-lg border border-input bg-background text-center text-sm tabular-nums outline-none focus-visible:border-ring"
      />
      <button
        type="button"
        onClick={() => onChange(clamp(value + step))}
        className="flex size-9 items-center justify-center rounded-lg border border-border text-foreground transition hover:bg-muted disabled:opacity-40"
        aria-label="Increase"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

export function PackStudio() {
  const router = useRouter();
  const hydrated = useCartHydrated();

  const swagPackItems = useCatalogCartStore((s) => s.swagPackItems);
  const swagPackPackaging = useCatalogCartStore((s) => s.swagPackPackaging);
  const swagPackQuantity = useCatalogCartStore((s) => s.swagPackQuantity);
  const swagPackName = useCatalogCartStore((s) => s.swagPackName);
  const swagPackLogoUrl = useCatalogCartStore((s) => s.swagPackLogoUrl);
  const branding = useCatalogCartStore((s) => s.branding);

  const addSwagPackItem = useCatalogCartStore((s) => s.addSwagPackItem);
  const removeSwagPackItem = useCatalogCartStore((s) => s.removeSwagPackItem);
  const updateQuantityPerPack = useCatalogCartStore((s) => s.updateSwagPackQuantityPerPack);
  const setSwagPackPackaging = useCatalogCartStore((s) => s.setSwagPackPackaging);
  const setSwagPackQuantity = useCatalogCartStore((s) => s.setSwagPackQuantity);
  const setSwagPackName = useCatalogCartStore((s) => s.setSwagPackName);
  const setSwagPackLogo = useCatalogCartStore((s) => s.setSwagPackLogo);
  const setBranding = useCatalogCartStore((s) => s.setBranding);
  const clearSwagPack = useCatalogCartStore((s) => s.clearSwagPack);

  const [step, setStep] = useState(0);
  const [packagingDrawerOpen, setPackagingDrawerOpen] = useState(false);
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);
  const [selectingPackaging, setSelectingPackaging] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const { data, isLoading } = usePublicProducts({ page: 1, pageSize: 48 });
  const products = useMemo(
    () => (data?.items ?? []).filter((p) => !p.isPackaging),
    [data?.items],
  );

  const summary = useMemo(
    () =>
      calculateCatalogCartSummary({
        bulkItems: [],
        swagPackItems,
        swagPackPackaging,
        swagPackQuantity,
        swagPackName,
      }),
    [swagPackItems, swagPackPackaging, swagPackQuantity, swagPackName],
  );

  const hasItems = swagPackItems.length > 0;
  const perPack = summary.packQuantity > 0 ? summary.swagPackTotal / summary.packQuantity : 0;
  const pickedIds = useMemo(() => new Set(swagPackItems.map((i) => i.productId)), [swagPackItems]);

  const togglePick = async (product: CatalogProductListItem) => {
    if (pickedIds.has(product.id)) {
      swagPackItems
        .filter((i) => i.productId === product.id)
        .forEach((i) => removeSwagPackItem(getCartItemKey(i)));
      return;
    }
    setPendingProductId(product.id);
    try {
      const detail = (await getPublicProduct(product.slug)).product;
      addSwagPackItem(mapProductToSwagPackItem(detail, resolveDefaultVariant(detail)));
    } catch (error: any) {
      addToast({
        title: "Couldn't add product",
        description: error?.message ?? "Please try again.",
        color: "danger",
      });
    } finally {
      setPendingProductId(null);
    }
  };

  const handlePackagingSelect = async (product: CatalogProductListItem) => {
    setSelectingPackaging(true);
    try {
      const detail = (await getPublicProduct(product.slug)).product;
      setSwagPackPackaging(mapPackagingToCartItem(detail, resolveDefaultVariant(detail)));
      addToast({ title: "Packaging added", description: detail.name, color: "success" });
    } catch (error: any) {
      addToast({
        title: "Unable to add packaging",
        description: error?.message ?? "Please try again.",
        color: "danger",
      });
    } finally {
      setSelectingPackaging(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!ACCEPTED_LOGO_TYPES.includes(file.type as (typeof ACCEPTED_LOGO_TYPES)[number])) {
      addToast({ title: "Unsupported file", description: "Use JPG, PNG, or WEBP.", color: "warning" });
      return;
    }
    setUploadingLogo(true);
    try {
      const upload = await createCatalogImageUpload("projects", {
        filename: file.name,
        contentType: file.type as "image/jpeg" | "image/png" | "image/webp",
      });
      await uploadFileToPresignedUrl(upload.uploadUrl, file);
      setSwagPackLogo({ url: upload.publicUrl, key: upload.key });
      setBranding({ logoUrl: upload.publicUrl, logoKey: upload.key });
      addToast({ title: "Logo added", color: "success" });
    } catch (error: any) {
      addToast({ title: "Upload failed", description: error?.message ?? "", color: "danger" });
    } finally {
      setUploadingLogo(false);
    }
  };

  const goNext = () => {
    if (step === 0 && !hasItems) {
      addToast({ title: "Add at least one product to continue.", color: "warning" });
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const addPackToCart = () => {
    if (!hasItems) {
      addToast({ title: "Your pack is empty.", color: "warning" });
      return;
    }
    if (summary.hasMissingPackaging) {
      addToast({ title: "Choose a packaging option to continue.", color: "warning" });
      setStep(2);
      return;
    }
    addToast({
      title: "Pack added to cart",
      description: `${summary.swagPackName} · ${summary.packQuantity} packs`,
      color: "success",
    });
    router.push("/cart");
  };

  if (!hydrated || isLoading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-site items-center justify-center px-6">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="swag-redesign mx-auto max-w-site px-6 py-8 lg:py-12">
      {/* header */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pack Studio</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Build your swag pack
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Pick products, set quantities, add your branding, and review — volume pricing updates live as you go.
        </p>
      </div>

      {/* stepper */}
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((label, index) => {
          const done = index < step;
          const active = index === step;
          const reachable = index === 0 || hasItems;
          return (
            <div key={label} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => reachable && setStep(index)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : done
                      ? "border-primary bg-brand-soft text-primary"
                      : "border-border text-muted-foreground",
                  !reachable && "cursor-not-allowed opacity-50",
                )}
              >
                <span className="flex size-5 items-center justify-center rounded-full bg-current/10 text-xs tabular-nums">
                  {done ? <Check className="size-3.5" /> : index + 1}
                </span>
                {label}
              </button>
              {index < STEPS.length - 1 ? <span className="h-px flex-1 bg-border" /> : null}
            </div>
          );
        })}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        {/* main content */}
        <div>
          {step === 0 ? (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-xl font-bold">Pick your products</h2>
                {hasItems ? (
                  <button
                    type="button"
                    onClick={clearSwagPack}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="size-4" /> Start over
                  </button>
                ) : null}
              </div>
              {products.length ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {products.map((product) => {
                    const selected = pickedIds.has(product.id);
                    const pending = pendingProductId === product.id;
                    const price = product.floorPrice ?? product.basePrice ?? product.lowestPrice ?? 0;
                    return (
                      <button
                        key={product.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => togglePick(product)}
                        className={cn(
                          "group relative flex flex-col overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                          selected ? "border-primary ring-1 ring-primary/30" : "border-border",
                        )}
                      >
                        <div className="relative aspect-square overflow-hidden bg-muted">
                          {product.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                              {product.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span
                            className={cn(
                              "absolute right-2 top-2 flex size-7 items-center justify-center rounded-full border shadow-sm transition",
                              selected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card text-foreground",
                            )}
                          >
                            {pending ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : selected ? (
                              <Check className="size-4" />
                            ) : (
                              <Plus className="size-4" />
                            )}
                          </span>
                        </div>
                        <div className="p-3">
                          {product.category?.name ? (
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {product.category.name}
                            </span>
                          ) : null}
                          <p className="line-clamp-1 text-sm font-semibold text-foreground">{product.name}</p>
                          <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">
                            {formatMoney(price, product.currency)}/ea
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center text-muted-foreground">
                  No products available yet.
                </div>
              )}
            </div>
          ) : null}

          {step === 1 ? (
            <div>
              <h2 className="mb-1 font-display text-xl font-bold">Set quantities</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Choose how many of each product go into every pack, and how many packs you need.
              </p>

              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div>
                  <p className="text-sm font-semibold text-foreground">Number of swag packs</p>
                  <p className="text-xs text-muted-foreground">Minimum 25 packs</p>
                </div>
                <Stepper value={summary.packQuantity} min={25} step={25} onChange={setSwagPackQuantity} />
              </div>

              {hasItems ? (
                <div className="space-y-3">
                  {summary.swagPackItems.map((item) => (
                    <div
                      key={getCartItemKey(item)}
                      className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm"
                    >
                      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs font-semibold text-muted-foreground">
                            {item.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatMoney(item.unitPrice, item.currency)}/ea · {item.totalUnits} total units
                        </p>
                      </div>
                      <Stepper
                        value={item.quantityPerPack}
                        min={1}
                        onChange={(next) => updateQuantityPerPack(getCartItemKey(item), next)}
                      />
                      <button
                        type="button"
                        onClick={() => removeSwagPackItem(getCartItemKey(item))}
                        className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:text-destructive"
                        aria-label="Remove"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyPrompt onPick={() => setStep(0)} />
              )}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-6">
              <div>
                <h2 className="mb-1 font-display text-xl font-bold">Packaging &amp; branding</h2>
                <p className="text-sm text-muted-foreground">
                  Add one packaging item per pack and upload your logo.
                </p>
              </div>

              {/* packaging */}
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-primary">
                      <Boxes className="size-4" />
                    </span>
                    <p className="text-sm font-semibold text-foreground">Packaging</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPackagingDrawerOpen(true)}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition hover:bg-muted"
                  >
                    {swagPackPackaging ? "Change" : "Choose packaging"}
                  </button>
                </div>
                {swagPackPackaging ? (
                  <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                    <div className="flex size-14 items-center justify-center overflow-hidden rounded-lg bg-card">
                      {swagPackPackaging.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={swagPackPackaging.imageUrl} alt={swagPackPackaging.name} className="h-full w-full object-cover" />
                      ) : (
                        <Package className="size-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{swagPackPackaging.name}</p>
                      <p className="text-xs text-muted-foreground">1 per pack</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSwagPackPackaging(null)}
                      className="text-sm font-medium text-muted-foreground hover:text-destructive"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
                    No packaging selected yet.
                  </p>
                )}
              </div>

              {/* logo */}
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-primary">
                    <Sparkles className="size-4" />
                  </span>
                  <p className="text-sm font-semibold text-foreground">Your logo</p>
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleLogoUpload(file);
                    e.target.value = "";
                  }}
                />
                {swagPackLogoUrl ? (
                  <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                    <div className="flex size-14 items-center justify-center overflow-hidden rounded-lg bg-card">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={swagPackLogoUrl} alt="Your logo" className="h-full w-full object-contain p-1" />
                    </div>
                    <div className="flex flex-1 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition hover:bg-muted"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSwagPackLogo(null);
                          setBranding({ logoUrl: null, logoKey: null });
                        }}
                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-destructive"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-6 text-sm font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                  >
                    {uploadingLogo ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                    Upload your logo (PNG, JPG, WEBP)
                  </button>
                )}
              </div>

              {/* notes */}
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <p className="mb-2 text-sm font-semibold text-foreground">Notes for our team (optional)</p>
                <textarea
                  value={branding.note ?? ""}
                  onChange={(e) => setBranding({ note: e.target.value })}
                  rows={3}
                  placeholder="Placement, colors, deadlines…"
                  className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring"
                />
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-6">
              <div>
                <h2 className="mb-1 font-display text-xl font-bold">Review your pack</h2>
                <p className="text-sm text-muted-foreground">Name your pack and confirm the details.</p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <label htmlFor="packName" className="text-sm font-semibold text-foreground">
                  Pack name
                </label>
                <input
                  id="packName"
                  value={summary.swagPackName}
                  onChange={(e) => setSwagPackName(e.target.value)}
                  placeholder="Employee Welcome Kit"
                  className="mt-2 h-11 w-full max-w-sm rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring"
                />
              </div>

              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <p className="border-b border-border bg-muted/50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {summary.swagPackItems.length} products × {summary.packQuantity} packs
                </p>
                <div className="divide-y divide-border">
                  {summary.swagPackItems.map((item) => (
                    <div key={getCartItemKey(item)} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs text-muted-foreground">{item.name.slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantityPerPack}/pack · {formatMoney(item.unitPrice, item.currency)}/ea
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-foreground tabular-nums">
                        {formatMoney(item.pricePerPack, item.currency)}/pack
                      </p>
                    </div>
                  ))}
                  {summary.swagPackPackaging ? (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Boxes className="size-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {summary.swagPackPackaging.name}
                        </p>
                        <p className="text-xs text-muted-foreground">Packaging · 1/pack</p>
                      </div>
                      <p className="text-sm font-semibold text-foreground tabular-nums">
                        {formatMoney(summary.swagPackPackaging.pricePerPack, summary.swagPackPackaging.currency)}/pack
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {/* footer nav */}
          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:opacity-40"
            >
              <ArrowLeft className="size-4" /> Back
            </button>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-brand transition hover:bg-primary/90"
              >
                Next <ArrowRight className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={addPackToCart}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-brand transition hover:bg-primary/90"
              >
                Add Pack to Cart
              </button>
            )}
          </div>
        </div>

        {/* running total sidebar */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-bold">Running total</p>
              <span className="text-xs text-muted-foreground">{summary.swagPackItems.length} products</span>
            </div>

            {hasItems ? (
              <>
                <div className="mt-4 rounded-xl bg-brand-soft p-4">
                  <p className="text-xs font-medium text-primary/80">Per pack, all-in</p>
                  <p className="font-display text-3xl font-bold text-primary tabular-nums">
                    {formatMoney(perPack)}
                  </p>
                  <p className="text-xs text-primary/70">{summary.packQuantity} packs</p>
                </div>

                <dl className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <dt>Products</dt>
                    <dd className="tabular-nums text-foreground">
                      {formatMoney(summary.swagPackTotal - (summary.swagPackPackaging?.totalPrice ?? 0))}
                    </dd>
                  </div>
                  {summary.swagPackPackaging ? (
                    <div className="flex justify-between text-muted-foreground">
                      <dt>Packaging</dt>
                      <dd className="tabular-nums text-foreground">
                        {formatMoney(summary.swagPackPackaging.totalPrice)}
                      </dd>
                    </div>
                  ) : null}
                  <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
                    <dt>Total estimate</dt>
                    <dd className="tabular-nums">{formatMoney(summary.swagPackTotal)}</dd>
                  </div>
                </dl>

                {summary.hasMissingPackaging ? (
                  <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-warning/10 px-3 py-2 text-xs font-medium text-warning">
                    <Package className="size-3.5" /> Add packaging before checkout.
                  </p>
                ) : (
                  <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-success/10 px-3 py-2 text-xs font-medium text-success">
                    <TrendingDown className="size-3.5" /> Volume pricing applied at {summary.packQuantity} packs.
                  </p>
                )}

                <button
                  type="button"
                  onClick={addPackToCart}
                  className="mt-4 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-brand transition hover:bg-primary/90"
                >
                  Add Pack to Cart
                </button>
              </>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                Pick products to see your live pack price.
              </p>
            )}
            <Link
              href="/cart"
              className="mt-2 flex w-full items-center justify-center rounded-xl border border-border py-2.5 text-sm font-medium transition hover:bg-muted"
            >
              View cart
            </Link>
          </div>
        </aside>
      </div>

      <PackagingProductDrawer
        isOpen={packagingDrawerOpen}
        onOpenChange={setPackagingDrawerOpen}
        selectedProductId={swagPackPackaging?.productId ?? null}
        onSelect={(product) => {
          void handlePackagingSelect(product);
        }}
      />
    </div>
  );
}

function EmptyPrompt({ onPick }: { onPick: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
      <p className="text-muted-foreground">Your pack is empty.</p>
      <button
        type="button"
        onClick={onPick}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        <Plus className="size-4" /> Pick products
      </button>
    </div>
  );
}
