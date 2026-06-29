"use client";

import { useMemo, useRef, useState } from "react";
import { addToast } from "@heroui/toast";
import { Check, ExternalLink, ImagePlus, Loader2, Search, Upload, X } from "lucide-react";
import { usePublicProducts } from "@/lib/queries.catalog";
import { createCatalogImageUpload, uploadFileToPresignedUrl } from "@/modules/catalog/public/api";
import { formatMoney } from "@/lib/money";
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
  const [productIds, setProductIds] = useState<string[]>(store.products.map((p) => p.id));
  const [productSearch, setProductSearch] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // Per-product logo branding, keyed by productId, seeded from the saved store.
  const [branding, setBranding] = useState<Record<string, ProductBrandingInput>>(() => {
    const initial: Record<string, ProductBrandingInput> = {};
    for (const p of store.products) {
      if (p.branding?.logoUrl) {
        initial[p.id] = {
          productId: p.id,
          logoUrl: p.branding.logoUrl,
          logoKey: null,
          placement: p.branding.placement,
        };
      }
    }
    return initial;
  });
  const [brandingTarget, setBrandingTarget] = useState<ProductLogoTarget | null>(null);

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

  const openBranding = (product: { id: string; name: string; imageUrl?: string | null }) => {
    const existing = branding[product.id];
    setBrandingTarget({
      id: product.id,
      name: product.name,
      imageUrl: product.imageUrl ?? null,
      logoUrl: existing?.logoUrl ?? null,
      placement: existing?.placement ?? null,
    });
  };

  const saveBranding = (entry: ProductBrandingInput) => {
    setBranding((current) => {
      const next = { ...current };
      if (entry.logoUrl) next[entry.productId] = entry;
      else delete next[entry.productId];
      return next;
    });
    // Make sure a freshly branded product is part of the curated list.
    setProductIds((current) =>
      current.includes(entry.productId) || !entry.logoUrl ? current : [...current, entry.productId]
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
      theme: { primary, primarySoft, primaryForeground },
      productIds,
      // Only send branding for products still in the curated list.
      productBranding: productIds
        .map((id) => branding[id])
        .filter((b): b is ProductBrandingInput => Boolean(b?.logoUrl)),
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
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold">Theme</h2>
          <div className="mt-4 space-y-3">
            <ColorRow label="Primary" value={primary} onChange={setPrimary} />
            <ColorRow label="Primary soft (tint)" value={primarySoft} onChange={setPrimarySoft} />
            <ColorRow label="On-primary text" value={primaryForeground} onChange={setPrimaryForeground} />
          </div>
          <div
            className="mt-4 flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold"
            style={{ backgroundColor: primary, color: primaryForeground }}
          >
            Preview button
            <span
              className="rounded-full px-2 py-0.5 text-xs"
              style={{ backgroundColor: primarySoft, color: primary }}
            >
              tag
            </span>
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

        {loadingCatalog ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid max-h-[calc(100vh-15rem)] min-h-[24rem] grid-cols-2 gap-3 overflow-y-auto p-6 sm:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((product) => {
              const isSelected = selected.has(product.id);
              const isBranded = Boolean(branding[product.id]?.logoUrl);
              const price = product.floorPrice ?? product.basePrice ?? product.lowestPrice ?? 0;
              return (
                <div
                  key={product.id}
                  className={cn(
                    "group relative flex flex-col overflow-hidden rounded-xl border bg-card text-left transition hover:shadow-sm",
                    isSelected ? "border-primary ring-1 ring-primary/30" : "border-border"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleProduct(product.id)}
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
                    {isBranded && branding[product.id]?.placement ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={branding[product.id]!.logoUrl!}
                        alt=""
                        className="pointer-events-none absolute"
                        style={{
                          left: `${branding[product.id]!.placement!.x}%`,
                          top: `${branding[product.id]!.placement!.y}%`,
                          width: `${branding[product.id]!.placement!.size}%`,
                          transform: `translate(-50%,-50%) rotate(${branding[product.id]!.placement!.rotation}deg)`,
                          opacity: branding[product.id]!.placement!.opacity / 100,
                        }}
                      />
                    ) : null}
                    <span
                      className={cn(
                        "absolute right-2 top-2 flex size-6 items-center justify-center rounded-full border text-xs",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card"
                      )}
                    >
                      {isSelected ? <Check className="size-3.5" /> : null}
                    </span>
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
                  <div className="flex items-end justify-between gap-1 p-2">
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-xs font-medium text-foreground">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{formatMoney(price, product.currency)}/ea</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openBranding(product)}
                      title={isBranded ? "Edit logo branding" : "Add your logo"}
                      className={cn(
                        "flex shrink-0 items-center gap-1 rounded-lg border px-1.5 py-1 text-[11px] font-medium transition",
                        isBranded
                          ? "border-primary/40 bg-brand-soft text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      )}
                    >
                      <ImagePlus className="size-3.5" />
                      {isBranded ? "Logo" : "Brand"}
                    </button>
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
