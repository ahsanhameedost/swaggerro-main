"use client";

import { useMemo, useRef, useState } from "react";
import { addToast } from "@heroui/toast";
import { Check, ExternalLink, Loader2, Plus, Search, Tag, Upload, X } from "lucide-react";
import { usePublicProducts } from "@/lib/queries.catalog";
import { createCatalogImageUpload, uploadFileToPresignedUrl } from "@/modules/catalog/public/api";
import { formatMoney } from "@/lib/money";
import { computeCommission } from "@/lib/commission";
import { cn } from "@/lib/utils";
import type {
  ProductBrandingInput,
  Store,
  StoreStatus,
  UpdateStoreInput,
} from "@/modules/stores/types";
import { ProductLogoModal, type ProductLogoTarget } from "./ProductLogoModal";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_BYTES = 5 * 1024 * 1024;

const inputClass =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring";

export function StoreEditor({
  store,
  mode,
  saving,
  onSave,
}: {
  store: Store;
  mode: "admin" | "seller";
  saving: boolean;
  onSave: (input: UpdateStoreInput) => Promise<void> | void;
}) {
  const [name, setName] = useState(store.name);
  const [slug, setSlug] = useState(store.slug);
  const [status, setStatus] = useState<StoreStatus>(store.status);
  const [companyName, setCompanyName] = useState(store.companyName ?? "");
  const [heroHeadline, setHeroHeadline] = useState(store.heroHeadline ?? "");
  const [heroSubcopy, setHeroSubcopy] = useState(store.heroSubcopy ?? "");
  const [logo, setLogo] = useState<{ url: string | null; key: string | null }>({
    url: store.logoUrl,
    key: store.logoKey,
  });
  const [primary, setPrimary] = useState(store.theme.primary);
  const [primarySoft, setPrimarySoft] = useState(store.theme.primarySoft);
  const [primaryForeground, setPrimaryForeground] = useState(store.theme.primaryForeground);
  const [accent, setAccent] = useState(store.theme.accent);
  const [secondary, setSecondary] = useState(store.theme.secondary);
  const [footerColor, setFooterColor] = useState(store.theme.footer);
  const [logoScale, setLogoScale] = useState(store.logoScale ?? 100);
  const [favicon, setFavicon] = useState<{ url: string | null; key: string | null }>({
    url: store.faviconUrl,
    key: store.faviconKey,
  });
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const faviconInputRef = useRef<HTMLInputElement | null>(null);
  // Optional separate footer logo. Empty => the header logo is used in the footer.
  const [footerLogo, setFooterLogo] = useState<{ url: string | null; key: string | null }>({
    url: store.footerLogoUrl,
    key: store.footerLogoKey,
  });
  const [uploadingFooterLogo, setUploadingFooterLogo] = useState(false);
  const footerLogoInputRef = useRef<HTMLInputElement | null>(null);
  // Seller-editable CTA band.
  const [ctaTitle, setCtaTitle] = useState(store.cta?.title ?? "");
  const [ctaSubtitle, setCtaSubtitle] = useState(store.cta?.subtitle ?? "");
  const [ctaPrimaryLabel, setCtaPrimaryLabel] = useState(store.cta?.primaryLabel ?? "");
  const [ctaPrimaryHref, setCtaPrimaryHref] = useState(store.cta?.primaryHref ?? "");
  const [ctaSecondaryLabel, setCtaSecondaryLabel] = useState(store.cta?.secondaryLabel ?? "");
  const [ctaSecondaryHref, setCtaSecondaryHref] = useState(store.cta?.secondaryHref ?? "");
  const [ctaPoints, setCtaPoints] = useState((store.cta?.points ?? []).join("\n"));
  const [productIds, setProductIds] = useState<string[]>(store.products.map((p) => p.id));
  const [productSearch, setProductSearch] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // Store default commission %, fallback for products without their own rate.
  const fallbackPercent = store.commissionPercent ?? 15;

  // Per-product overrides (logo + custom price), keyed by productId, seeded from
  // the saved store.
  const [branding, setBranding] = useState<Record<string, ProductBrandingInput>>(() => {
    const initial: Record<string, ProductBrandingInput> = {};
    for (const p of store.products) {
      if (p.branding?.logoUrl || p.customPrice != null) {
        initial[p.id] = {
          productId: p.id,
          logoUrl: p.branding?.logoUrl ?? null,
          logoKey: null,
          placement: p.branding?.placement ?? null,
          customPrice: p.customPrice ?? null,
        };
      }
    }
    return initial;
  });
  const [brandingTarget, setBrandingTarget] = useState<ProductLogoTarget | null>(null);
  // Central margin control (#38/#39): one % applied across every selected product.
  const [marginPercent, setMarginPercent] = useState("40");

  const { data: catalog, isLoading: loadingCatalog } = usePublicProducts({ page: 1, pageSize: 48 });
  const catalogProducts = catalog?.items ?? [];
  const selected = useMemo(() => new Set(productIds), [productIds]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return catalogProducts;
    return catalogProducts.filter((p) => p.name.toLowerCase().includes(q));
  }, [catalogProducts, productSearch]);

  const toggleProduct = (id: string) => {
    setProductIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  };

  // Set every selected product's price to base + margin% in one action (#39).
  const applyMarginToAll = () => {
    const pct = Number(marginPercent);
    if (!Number.isFinite(pct) || pct < 0) return;
    const factor = 1 + pct / 100;
    setBranding((current) => {
      const next = { ...current };
      for (const id of productIds) {
        const product = catalogProducts.find((p) => p.id === id);
        if (!product) continue;
        const basePrice = product.basePrice ?? product.floorPrice ?? product.lowestPrice ?? 0;
        if (basePrice <= 0) continue;
        const existing = next[id];
        next[id] = {
          productId: id,
          logoUrl: existing?.logoUrl ?? null,
          logoKey: existing?.logoKey ?? null,
          placement: existing?.placement ?? null,
          customPrice: Math.round(basePrice * factor * 100) / 100,
        };
      }
      return next;
    });
  };

  // Open the customize popup for a product (and select it if it isn't already).
  const openBranding = (product: (typeof catalogProducts)[number]) => {
    const existing = branding[product.id];
    const basePrice = product.basePrice ?? product.floorPrice ?? product.lowestPrice ?? 0;
    setProductIds((current) =>
      current.includes(product.id) ? current : [...current, product.id]
    );
    setBrandingTarget({
      id: product.id,
      name: product.name,
      imageUrl: product.imageUrl ?? null,
      logoUrl: existing?.logoUrl ?? null,
      placement: existing?.placement ?? null,
      currency: product.currency,
      basePrice,
      commissionType: product.commissionType ?? "PERCENT",
      commissionValue: product.commissionValue ?? null,
      fallbackPercent,
      customPrice: existing?.customPrice ?? null,
    });
  };

  const saveBranding = (entry: ProductBrandingInput) => {
    const hasOverride = Boolean(entry.logoUrl) || entry.customPrice != null;
    setBranding((current) => {
      const next = { ...current };
      if (hasOverride) next[entry.productId] = entry;
      else delete next[entry.productId];
      return next;
    });
    // A product configured in the popup is part of the curated list.
    setProductIds((current) =>
      current.includes(entry.productId) ? current : [...current, entry.productId]
    );
  };

  const handleLogo = async (file: File) => {
    if (!ACCEPTED.includes(file.type as (typeof ACCEPTED)[number])) {
      addToast({ title: "Unsupported file", description: "Use JPG, PNG, or WEBP.", color: "warning" });
      return;
    }
    if (file.size > MAX_BYTES) {
      addToast({ title: "File too large", description: "Logo must be 5MB or smaller.", color: "warning" });
      return;
    }
    setUploadingLogo(true);
    try {
      const upload = await createCatalogImageUpload("projects", {
        filename: file.name,
        contentType: file.type as "image/jpeg" | "image/png" | "image/webp",
      });
      await uploadFileToPresignedUrl(upload.uploadUrl, file);
      setLogo({ url: upload.publicUrl, key: upload.key });
    } catch (error: any) {
      addToast({ title: "Upload failed", description: error?.message ?? "", color: "danger" });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleFooterLogo = async (file: File) => {
    if (!ACCEPTED.includes(file.type as (typeof ACCEPTED)[number])) {
      addToast({ title: "Unsupported file", description: "Use JPG, PNG, or WEBP.", color: "warning" });
      return;
    }
    if (file.size > MAX_BYTES) {
      addToast({ title: "File too large", description: "Logo must be 5MB or smaller.", color: "warning" });
      return;
    }
    setUploadingFooterLogo(true);
    try {
      const upload = await createCatalogImageUpload("projects", {
        filename: file.name,
        contentType: file.type as "image/jpeg" | "image/png" | "image/webp",
      });
      await uploadFileToPresignedUrl(upload.uploadUrl, file);
      setFooterLogo({ url: upload.publicUrl, key: upload.key });
    } catch (error: any) {
      addToast({ title: "Upload failed", description: error?.message ?? "", color: "danger" });
    } finally {
      setUploadingFooterLogo(false);
    }
  };

  const handleFavicon = async (file: File) => {
    if (!ACCEPTED.includes(file.type as (typeof ACCEPTED)[number])) {
      addToast({ title: "Unsupported file", description: "Use JPG, PNG, or WEBP.", color: "warning" });
      return;
    }
    if (file.size > MAX_BYTES) {
      addToast({ title: "File too large", description: "Favicon must be 5MB or smaller.", color: "warning" });
      return;
    }
    setUploadingFavicon(true);
    try {
      const upload = await createCatalogImageUpload("projects", {
        filename: file.name,
        contentType: file.type as "image/jpeg" | "image/png" | "image/webp",
      });
      await uploadFileToPresignedUrl(upload.uploadUrl, file);
      setFavicon({ url: upload.publicUrl, key: upload.key });
    } catch (error: any) {
      addToast({ title: "Upload failed", description: error?.message ?? "", color: "danger" });
    } finally {
      setUploadingFavicon(false);
    }
  };

  const submit = async () => {
    if (!name.trim()) {
      addToast({ title: "Store name is required", color: "warning" });
      return;
    }
    const base: UpdateStoreInput = {
      name: name.trim(),
      companyName: companyName.trim() || null,
      heroHeadline: heroHeadline.trim() || null,
      heroSubcopy: heroSubcopy.trim() || null,
      logoUrl: logo.url,
      logoKey: logo.key,
      logoScale,
      faviconUrl: favicon.url,
      faviconKey: favicon.key,
      footerLogoUrl: footerLogo.url,
      footerLogoKey: footerLogo.key,
      theme: { primary, primarySoft, primaryForeground, accent, secondary, footer: footerColor },
      ctaTitle: ctaTitle.trim() || null,
      ctaSubtitle: ctaSubtitle.trim() || null,
      ctaPrimaryLabel: ctaPrimaryLabel.trim() || null,
      ctaPrimaryHref: ctaPrimaryHref.trim() || null,
      ctaSecondaryLabel: ctaSecondaryLabel.trim() || null,
      ctaSecondaryHref: ctaSecondaryHref.trim() || null,
      ctaPoints: ctaPoints
        .split("\n")
        .map((p) => p.trim())
        .filter(Boolean)
        .slice(0, 6),
      productIds,
      // Send per-product overrides (logo and/or custom price) for curated products.
      productBranding: productIds
        .map((id) => branding[id])
        .filter((b): b is ProductBrandingInput => Boolean(b?.logoUrl) || b?.customPrice != null),
    };
    if (mode === "admin") {
      base.slug = slug.trim();
      base.status = status;
    }
    await onSave(base);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Branding */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-display text-lg font-bold">Branding</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-foreground">Store name</span>
            <input className={cn(inputClass, "mt-1.5")} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-foreground">Company name</span>
            <input
              className={cn(inputClass, "mt-1.5")}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </label>
          {mode === "admin" ? (
            <>
              <label className="block">
                <span className="text-sm font-medium text-foreground">Slug</span>
                <input
                  className={cn(inputClass, "mt-1.5")}
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
                <span className="mt-1 block text-xs text-muted-foreground">/store/{slug || "…"}</span>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-foreground">Status</span>
                <select
                  className={cn(inputClass, "mt-1.5")}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StoreStatus)}
                >
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </label>
            </>
          ) : null}
        </div>

        <div className="mt-4 grid gap-4">
          <label className="block">
            <span className="text-sm font-medium text-foreground">Hero headline</span>
            <input
              className={cn(inputClass, "mt-1.5")}
              value={heroHeadline}
              onChange={(e) => setHeroHeadline(e.target.value)}
              placeholder="Official company swag store"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-foreground">Hero subcopy</span>
            <textarea
              className="mt-1.5 w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:border-ring"
              rows={2}
              value={heroSubcopy}
              onChange={(e) => setHeroSubcopy(e.target.value)}
            />
          </label>
        </div>
      </div>

      {/* Logo + theme */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold">Logo</h2>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleLogo(file);
              e.target.value = "";
            }}
          />
          <div className="mt-4">
            {logo.url ? (
              <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/40 p-4">
                <div className="flex size-20 items-center justify-center overflow-hidden rounded-xl bg-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logo.url} alt="Logo" className="h-full w-full object-contain p-1" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition hover:bg-muted"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogo({ url: null, key: null })}
                    className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-destructive"
                  >
                    <X className="size-3.5" /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-8 text-sm font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                {uploadingLogo ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                Upload logo
              </button>
            )}
          </div>

          {/* Logo size */}
          <div className="mt-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Logo size</span>
              <span className="text-xs tabular-nums text-muted-foreground">{logoScale}%</span>
            </div>
            <input
              type="range"
              min={60}
              max={200}
              step={5}
              value={logoScale}
              onChange={(e) => setLogoScale(Number(e.target.value))}
              className="mt-2 w-full accent-[color:var(--primary,#1e40af)]"
            />
          </div>

          {/* Favicon */}
          <div className="mt-5">
            <span className="text-sm font-medium text-foreground">Favicon</span>
            <input
              ref={faviconInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFavicon(file);
                e.target.value = "";
              }}
            />
            <div className="mt-2 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40">
                {favicon.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={favicon.url} alt="Favicon" className="h-full w-full object-contain p-0.5" />
                ) : (
                  <span className="text-[10px] text-muted-foreground">ico</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => faviconInputRef.current?.click()}
                disabled={uploadingFavicon}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition hover:bg-muted"
              >
                {uploadingFavicon ? <Loader2 className="size-4 animate-spin" /> : null}
                {favicon.url ? "Replace" : "Upload"}
              </button>
              {favicon.url ? (
                <button
                  type="button"
                  onClick={() => setFavicon({ url: null, key: null })}
                  className="text-sm text-muted-foreground hover:text-destructive"
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>

          {/* Footer logo (optional) — falls back to the header logo when empty */}
          <div className="mt-5">
            <span className="text-sm font-medium text-foreground">Footer logo</span>
            <p className="text-xs text-muted-foreground">
              Optional. Leave empty to reuse your header logo in the footer.
            </p>
            <input
              ref={footerLogoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFooterLogo(file);
                e.target.value = "";
              }}
            />
            <div className="mt-2 flex items-center gap-3">
              <div className="flex size-14 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40">
                {footerLogo.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={footerLogo.url} alt="Footer logo" className="h-full w-full object-contain p-1" />
                ) : (
                  <span className="text-[10px] text-muted-foreground">header</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => footerLogoInputRef.current?.click()}
                disabled={uploadingFooterLogo}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition hover:bg-muted"
              >
                {uploadingFooterLogo ? <Loader2 className="size-4 animate-spin" /> : null}
                {footerLogo.url ? "Replace" : "Upload"}
              </button>
              {footerLogo.url ? (
                <button
                  type="button"
                  onClick={() => setFooterLogo({ url: null, key: null })}
                  className="text-sm text-muted-foreground hover:text-destructive"
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold">Theme</h2>
          <div className="mt-4 space-y-3">
            <ColorRow label="Primary" value={primary} onChange={setPrimary} />
            <ColorRow label="Primary soft (tint)" value={primarySoft} onChange={setPrimarySoft} />
            <ColorRow label="On-primary text" value={primaryForeground} onChange={setPrimaryForeground} />
            <ColorRow label="Accent (section backgrounds)" value={accent} onChange={setAccent} />
            <ColorRow label="Secondary button" value={secondary} onChange={setSecondary} />
            <ColorRow label="Footer color" value={footerColor} onChange={setFooterColor} />
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <span
                className="flex flex-1 items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold"
                style={{ backgroundColor: primary, color: primaryForeground }}
              >
                Primary button
                <span className="rounded-full px-2 py-0.5 text-xs" style={{ backgroundColor: primarySoft, color: primary }}>
                  tag
                </span>
              </span>
              <span className="rounded-xl px-4 py-3 text-sm font-semibold text-white" style={{ backgroundColor: secondary }}>
                Secondary
              </span>
            </div>
            <div className="rounded-xl px-4 py-3 text-sm text-foreground" style={{ backgroundColor: accent }}>
              Section background sample
            </div>
            <div className="rounded-xl px-4 py-3 text-sm text-white" style={{ backgroundColor: footerColor }}>
              Footer sample
            </div>
          </div>
        </div>
      </div>

      {/* Storefront CTA */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-display text-lg font-bold">Call to action</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The banner near the bottom of your storefront. Leave the title empty to use the default copy.
        </p>
        <div className="mt-4 grid gap-4">
          <label className="block">
            <span className="text-sm font-medium text-foreground">Title</span>
            <input
              className={cn(inputClass, "mt-1.5")}
              value={ctaTitle}
              onChange={(e) => setCtaTitle(e.target.value)}
              placeholder="Ready to kit out your team?"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-foreground">Description</span>
            <textarea
              className="mt-1.5 w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:border-ring"
              rows={2}
              value={ctaSubtitle}
              onChange={(e) => setCtaSubtitle(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-foreground">
              Key points <span className="text-muted-foreground">(one per line, up to 6)</span>
            </span>
            <textarea
              className="mt-1.5 w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:border-ring"
              rows={4}
              value={ctaPoints}
              onChange={(e) => setCtaPoints(e.target.value)}
              placeholder={"Free proofs\nVolume pricing\nShips worldwide"}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-foreground">Primary button label</span>
              <input className={cn(inputClass, "mt-1.5")} value={ctaPrimaryLabel} onChange={(e) => setCtaPrimaryLabel(e.target.value)} placeholder="Shop the collection" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-foreground">Primary button link</span>
              <input className={cn(inputClass, "mt-1.5")} value={ctaPrimaryHref} onChange={(e) => setCtaPrimaryHref(e.target.value)} placeholder={`/store/${store.slug}`} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-foreground">Secondary button label</span>
              <input className={cn(inputClass, "mt-1.5")} value={ctaSecondaryLabel} onChange={(e) => setCtaSecondaryLabel(e.target.value)} placeholder="Build a pack" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-foreground">Secondary button link</span>
              <input className={cn(inputClass, "mt-1.5")} value={ctaSecondaryHref} onChange={(e) => setCtaSecondaryHref(e.target.value)} placeholder="/studio" />
            </label>
          </div>
        </div>
      </div>

      {/* Product curation */}
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        {/* Sticky header so the search + count stay visible while the grid scrolls */}
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-b border-border bg-card/95 p-6 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div>
            <h2 className="font-display text-lg font-bold">Products</h2>
            <p className="text-sm text-muted-foreground">{productIds.length} selected from the catalog</p>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-10 w-64 rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none focus-visible:border-ring"
              placeholder="Search products…"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Central margin control (#38/#39): set one % markup across all products. */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-muted/30 px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Margin</p>
            <p className="text-xs text-muted-foreground">
              Set every selected product&apos;s price to base + this % in one click.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <input
                type="number"
                min={0}
                value={marginPercent}
                onChange={(e) => setMarginPercent(e.target.value)}
                className="h-10 w-24 rounded-xl border border-input bg-background pl-3 pr-7 text-sm tabular-nums outline-none focus-visible:border-ring"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                %
              </span>
            </div>
            <button
              type="button"
              onClick={applyMarginToAll}
              disabled={loadingCatalog || !productIds.length}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            >
              <Tag className="size-4" /> Apply to all
            </button>
          </div>
        </div>

        {loadingCatalog ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid max-h-[calc(100vh-15rem)] min-h-[24rem] grid-cols-2 gap-3 overflow-y-auto p-6 sm:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((product) => {
              const isSelected = selected.has(product.id);
              const override = branding[product.id];
              const isBranded = Boolean(override?.logoUrl);
              const basePrice = product.basePrice ?? product.floorPrice ?? product.lowestPrice ?? 0;
              const hasCustom = override?.customPrice != null && override.customPrice > basePrice;
              const salePrice = hasCustom ? override!.customPrice! : basePrice;
              const earn = computeCommission(salePrice, {
                commissionType: product.commissionType ?? "PERCENT",
                commissionValue: product.commissionValue ?? null,
                basePrice,
                fallbackPercent,
              });
              return (
                <div
                  key={product.id}
                  className={cn(
                    "group relative flex flex-col overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                    isSelected ? "border-primary ring-1 ring-primary/30" : "border-border"
                  )}
                >
                  {/* Click the product to add it and open the customize popup (Pack Studio style). */}
                  <button
                    type="button"
                    onClick={() => openBranding(product)}
                    className="relative block aspect-square overflow-hidden bg-muted"
                  >
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        {product.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    {/* Branded logo preview on the seller's curation card. */}
                    {isBranded && override?.placement ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={override.logoUrl!}
                        alt=""
                        className="pointer-events-none absolute"
                        style={{
                          left: `${override.placement.x}%`,
                          top: `${override.placement.y}%`,
                          width: `${override.placement.size}%`,
                          transform: `translate(-50%,-50%) rotate(${override.placement.rotation}deg)`,
                          opacity: override.placement.opacity / 100,
                        }}
                      />
                    ) : null}
                    {/* Top-right add/selected badge — plus when not added, check when added. */}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Adding via "+" opens the same logo-preview popup as
                        // clicking the card; the "✓" state toggles off to remove.
                        if (isSelected) {
                          toggleProduct(product.id);
                        } else {
                          openBranding(product);
                        }
                      }}
                      className={cn(
                        "absolute right-2 top-2 flex size-7 items-center justify-center rounded-full border shadow-sm transition",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground group-hover:border-primary/50"
                      )}
                    >
                      {isSelected ? <Check className="size-4" /> : <Plus className="size-4" />}
                    </span>
                    {/* Custom-price tag */}
                    {hasCustom ? (
                      <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-primary/90 px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground shadow">
                        <Tag className="size-2.5" /> Your price
                      </span>
                    ) : null}
                    {/* Color swatches so sellers can see variant options at a glance. */}
                    {product.swatches?.length ? (
                      <div className="absolute bottom-1.5 left-1.5 flex gap-1">
                        {product.swatches.slice(0, 5).map((s, i) => (
                          <span
                            key={i}
                            className="size-3 rounded-full border border-white/70 shadow"
                            style={{ backgroundColor: s.hex ?? "#ddd" }}
                            title={s.name}
                          />
                        ))}
                      </div>
                    ) : null}
                  </button>
                  <div className="space-y-1 p-2.5">
                    <p className="line-clamp-1 text-xs font-semibold text-foreground">{product.name}</p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {formatMoney(salePrice, product.currency)}
                      </span>
                      {hasCustom ? (
                        <span className="text-[10px] text-muted-foreground line-through tabular-nums">
                          {formatMoney(basePrice, product.currency)}
                        </span>
                      ) : null}
                    </div>
                    {isSelected ? (
                      <p className="text-[11px] text-muted-foreground">
                        You earn{" "}
                        <span className="font-semibold text-primary tabular-nums">
                          {formatMoney(earn.sellerEarning, product.currency)}
                        </span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openBranding(product)}
                        className="text-[11px] font-medium text-primary hover:underline"
                      >
                        Add to store
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {!filteredProducts.length ? (
              <p className="col-span-full py-8 text-center text-sm text-muted-foreground">No products found.</p>
            ) : null}
          </div>
        )}
      </div>

      {/* Sticky action bar — always reachable without scrolling to the very bottom */}
      <div className="sticky bottom-0 -mx-4 mt-2 flex items-center justify-between gap-4 border-t border-border bg-card/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:mx-0 sm:rounded-2xl sm:border sm:px-6 sm:shadow-lg">
        <a
          href={`/store/${store.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          View storefront <ExternalLink className="size-3.5" />
        </a>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-brand transition hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          Save changes
        </button>
      </div>

      {brandingTarget ? (
        <ProductLogoModal
          product={brandingTarget}
          onClose={() => setBrandingTarget(null)}
          onSave={saveBranding}
        />
      ) : null}
    </div>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-24 rounded-lg border border-input bg-background px-2 text-xs tabular-nums outline-none focus-visible:border-ring"
        />
      </div>
    </div>
  );
}
