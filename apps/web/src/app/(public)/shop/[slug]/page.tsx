"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Spinner } from "@heroui/react";
import { addToast } from "@heroui/toast";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  PackageOpen,
  Sparkles,
  TrendingDown,
  Truck,
} from "lucide-react";
import { usePublicProduct } from "@/lib/queries.catalog";
import { useCatalogCartStore } from "@/lib/cart-store";
import { resolveUnitPrice, computeSavingsPercent } from "@/lib/catalog-pricing";
import { formatMoney } from "@/lib/money";
import { getImprintMethods } from "@/lib/imprint";
import { cn } from "@/lib/utils";

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
  const { data, isLoading, isError, error } = usePublicProduct(slug ?? "", !!slug);
  const product = data?.product;

  const addBulkItem = useCatalogCartStore((s) => s.addBulkItem);

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [methodKey, setMethodKey] = useState<string>("");
  const [imageIndex, setImageIndex] = useState(0);

  const variantGroups = product?.variantGroups ?? [];
  const hasVariants = (product?.productCatalogVariants.length ?? 0) > 0;
  const imprintMethods = useMemo(() => getImprintMethods(product?.category?.slug), [product?.category?.slug]);

  useEffect(() => {
    if (imprintMethods.length) setMethodKey((k) => k || imprintMethods[0].key);
  }, [imprintMethods]);

  useEffect(() => {
    if (!product) return;
    setSelectedOptions({});
    setQuantity(product.minQty || 1);
    setImageIndex(0);
  }, [product?.id]);

  const matchedVariant = useMemo(() => {
    if (!product || !hasVariants) return null;
    if (Object.keys(selectedOptions).length !== variantGroups.length) return null;
    return (
      product.productCatalogVariants.find(
        (v) =>
          v.selectedOptions.length === variantGroups.length &&
          Object.entries(selectedOptions).every(([g, id]) =>
            v.selectedOptions.some((o) => o.variantName === g && o.optionId === id),
          ),
      ) ?? null
    );
  }, [product, hasVariants, selectedOptions, variantGroups.length]);

  const bulkEnabled = product?.bulkPricingEnabled !== false;
  const activePricing = bulkEnabled
    ? (matchedVariant?.pricingOptions?.length ? matchedVariant.pricingOptions : product?.pricingOptions ?? [])
    : [];
  const activeBasePrice = matchedVariant?.price ?? product?.basePrice ?? 0;
  const activeMinQty = matchedVariant?.minQty ?? product?.minQty ?? 1;
  const activeStock = matchedVariant?.stock ?? product?.baseStock ?? 0;

  const method = imprintMethods.find((m) => m.key === methodKey) ?? null;
  const setupFee = method?.setupFee ?? 0;
  const unit = resolveUnitPrice(activeBasePrice, quantity, activePricing);
  const subtotal = unit * quantity;
  const total = subtotal + setupFee;
  const perUnitAllIn = quantity > 0 ? total / quantity : 0;
  const savingsPercent = computeSavingsPercent(activeBasePrice, unit);
  const discountPerUnit = Math.max(0, activeBasePrice - unit);
  const discountTotal = discountPerUnit * quantity;

  // volume tiers sorted
  const tiers = useMemo(
    () => [...activePricing].sort((a, b) => (a.qtyFrom ?? 0) - (b.qtyFrom ?? 0)),
    [activePricing],
  );
  const nextTier = useMemo(() => tiers.find((t) => (t.qtyFrom ?? 0) > quantity) ?? null, [tiers, quantity]);
  const appliedTier = useMemo(() => [...tiers].reverse().find((t) => quantity >= (t.qtyFrom ?? 0)) ?? null, [tiers, quantity]);

  const gallery = product?.images ?? [];
  const activeImage = gallery[imageIndex] ?? gallery[0];

  const isOptionAvailable = (groupName: string, optionId?: string | null) => {
    if (!optionId || !product) return false;
    return product.productCatalogVariants.some((variant) => {
      if (!variant.selectedOptions.some((o) => o.variantName === groupName && o.optionId === optionId)) return false;
      return Object.entries(selectedOptions).every(([g, id]) =>
        g === groupName ? true : variant.selectedOptions.some((o) => o.variantName === g && o.optionId === id),
      );
    });
  };

  const canAdd = !!product && (!hasVariants || !!matchedVariant) && quantity >= activeMinQty;

  const handleAddToCart = () => {
    if (!product || !canAdd) {
      addToast({ title: hasVariants && !matchedVariant ? "Select all options" : "Cannot add", color: "warning" });
      return;
    }
    const variantLabel = matchedVariant
      ? matchedVariant.title ?? matchedVariant.selectedOptions.map((o) => o.label).join(" / ")
      : null;
    addBulkItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      imageUrl: activeImage?.url ?? product.images[0]?.url ?? null,
      productCatalogVariantId: matchedVariant?.id ?? null,
      variantName: variantLabel,
      basePrice: activeBasePrice,
      compareAtPrice: product.compareAtPrice ?? null,
      stock: activeStock,
      minQty: activeMinQty,
      currency: product.currency,
      pricingOptions: activePricing,
      quantity,
    });
    addToast({ title: "Added to cart", description: `${product.name} is in your cart.`, color: "success" });
    router.push("/cart");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner label="Loading product…" />
      </div>
    );
  }
  if (isError || !product) {
    return (
      <div className="swag-redesign mx-auto max-w-site px-6 py-20 text-center">
        <PackageOpen className="mx-auto size-10 text-muted-foreground" />
        <h1 className="mt-4 font-display text-2xl font-bold">{error instanceof Error ? error.message : "Product not found"}</h1>
        <Link href="/shop" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="size-4" /> Back to shop
        </Link>
      </div>
    );
  }

  return (
    <div className="swag-redesign mx-auto max-w-site px-6 py-8">
      {/* breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/shop" className="hover:text-foreground">Shop</Link>
        {product.category ? (<><span>/</span><Link href={`/shop?category=${product.category.slug}`} className="hover:text-foreground">{product.category.name}</Link></>) : null}
        <span>/</span><span className="truncate text-foreground/70">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="relative aspect-square overflow-hidden rounded-3xl border border-border bg-muted">
            {activeImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activeImage.url} alt={activeImage.alt ?? product.name} className="h-full w-full object-contain p-8" />
            ) : (
              <div className="flex h-full items-center justify-center text-3xl font-semibold text-muted-foreground">{product.name.slice(0, 2).toUpperCase()}</div>
            )}
            {gallery.length > 1 ? (
              <div className="absolute right-4 bottom-4 flex gap-2">
                <button onClick={() => setImageIndex((i) => (i === 0 ? gallery.length - 1 : i - 1))} className="flex size-9 items-center justify-center rounded-full border border-border bg-card/90 shadow-sm backdrop-blur"><ChevronLeft className="size-4" /></button>
                <button onClick={() => setImageIndex((i) => (i === gallery.length - 1 ? 0 : i + 1))} className="flex size-9 items-center justify-center rounded-full border border-border bg-card/90 shadow-sm backdrop-blur"><ChevronRight className="size-4" /></button>
              </div>
            ) : null}
          </div>
          {gallery.length > 1 ? (
            <div className="mt-3 flex gap-2">
              {gallery.map((img, i) => (
                <button key={img.id ?? img.url} onClick={() => setImageIndex(i)} className={cn("size-16 overflow-hidden rounded-xl border bg-muted", i === imageIndex ? "border-primary" : "border-border")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="h-full w-full object-contain p-1" />
                </button>
              ))}
            </div>
          ) : null}

          {product.description ? (
            <div className="mt-8">
              <h3 className="font-display text-lg font-bold">Details</h3>
              <div className="prose prose-sm mt-2 max-w-none leading-relaxed text-muted-foreground" dangerouslySetInnerHTML={{ __html: product.description }} />
            </div>
          ) : null}
        </div>

        {/* Buy panel */}
        <div>
          {product.category ? <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{product.category.name}</p> : null}
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">{product.name}</h1>
          {product.shortDescription ? <p className="mt-2 text-muted-foreground">{product.shortDescription}</p> : null}

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Truck className="size-3.5" /> Made to order</span>
            <span className="inline-flex items-center gap-1.5"><PackageOpen className="size-3.5" /> Min order {product.minQty} units</span>
            <span className="inline-flex items-center gap-1.5"><TrendingDown className="size-3.5" /> Volume pricing — cheaper per unit at scale</span>
          </div>

          {/* color / size / imprint */}
          {variantGroups.map((group) => (
            <div key={group.id ?? group.name} className="mt-6">
              <p className="text-sm font-semibold text-foreground">
                {group.name}
                {selectedOptions[group.name] ? `: ${group.options.find((o) => o.id === selectedOptions[group.name])?.label}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {group.options.map((option) => {
                  const selected = selectedOptions[group.name] === option.id;
                  const available = isOptionAvailable(group.name, option.id);
                  if (group.type === "COLOR") {
                    return (
                      <button key={option.id ?? option.code} type="button" title={option.label} disabled={!available}
                        onClick={() => setSelectedOptions((c) => ({ ...c, [group.name]: option.id ?? "" }))}
                        className={cn("flex size-9 items-center justify-center rounded-full border-2 transition", selected ? "border-primary" : "border-border", !available && "cursor-not-allowed opacity-30")}
                        style={{ backgroundColor: option.colorHex ?? "#ddd" }}>
                        {selected ? <Check className="size-4 text-white drop-shadow" /> : null}
                      </button>
                    );
                  }
                  return (
                    <button key={option.id ?? option.code} type="button" disabled={!available}
                      onClick={() => setSelectedOptions((c) => ({ ...c, [group.name]: option.id ?? "" }))}
                      className={cn("h-9 min-w-9 rounded-lg border px-3 text-sm font-medium transition", selected ? "border-primary bg-brand-soft text-primary" : "border-border hover:border-foreground/30", !available && "cursor-not-allowed opacity-30")}>
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {imprintMethods.length ? (
            <div className="mt-6">
              <p className="text-sm font-semibold text-foreground">Imprint method</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {imprintMethods.map((m) => (
                  <button key={m.key} type="button" onClick={() => setMethodKey(m.key)}
                    className={cn("rounded-xl border px-3 py-2.5 text-left transition", methodKey === m.key ? "border-primary bg-brand-soft" : "border-border hover:border-foreground/30")}>
                    <span className="block text-sm font-medium text-foreground">{m.name}</span>
                    <span className="block text-xs text-muted-foreground">{formatMoney(m.setupFee)} setup</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* quantity + tier chips */}
          <div className="mt-6">
            <p className="text-sm font-semibold text-foreground">Quantity</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 25))} className="flex size-9 items-center justify-center rounded-lg border border-border">−</button>
                <input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))} className="h-9 w-20 rounded-lg border border-input bg-background text-center text-sm outline-none focus-visible:border-ring" />
                <button onClick={() => setQuantity((q) => q + 25)} className="flex size-9 items-center justify-center rounded-lg border border-border">+</button>
              </div>
              {tiers.map((t) => (
                <button key={t.qtyFrom} onClick={() => setQuantity(t.qtyFrom ?? 1)} className={cn("h-9 rounded-full border px-3 text-sm tabular-nums transition", quantity === t.qtyFrom ? "border-primary text-primary" : "border-border text-muted-foreground hover:border-foreground/30")}>{t.qtyFrom}</button>
              ))}
            </div>
          </div>

          {/* price panel */}
          <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Unit price</p>
                <p className="font-display text-2xl font-bold tabular-nums">{formatMoney(unit, product.currency)}<span className="text-sm font-medium text-muted-foreground"> /ea</span></p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-display text-2xl font-bold tabular-nums">{formatMoney(total, product.currency)}</p>
              </div>
            </div>

            {savingsPercent > 0 ? (
              <div className="mt-3 flex items-center justify-between rounded-lg bg-success/10 px-3 py-2 text-xs font-medium text-success">
                <span className="inline-flex items-center gap-1.5">
                  <TrendingDown className="size-3.5" /> You are saving {savingsPercent}% on this quantity
                </span>
                <span className="tabular-nums">−{formatMoney(discountTotal, product.currency)}</span>
              </div>
            ) : null}

            {nextTier ? (
              <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-success/10 px-3 py-2 text-xs font-medium text-success">
                <TrendingDown className="size-3.5" /> Add {(nextTier.qtyFrom ?? 0) - quantity} more to drop to {formatMoney(nextTier.price, product.currency)}/ea
              </div>
            ) : null}

            <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal ({quantity} × {formatMoney(unit, product.currency)})</span><span className="tabular-nums text-foreground">{formatMoney(subtotal, product.currency)}</span></div>
              {setupFee ? <div className="flex justify-between text-muted-foreground"><span>Setup fee · {method?.name}</span><span className="tabular-nums text-foreground">{formatMoney(setupFee, product.currency)}</span></div> : null}
              <div className="flex justify-between text-muted-foreground"><span>Per unit, all-in</span><span className="tabular-nums text-foreground">{formatMoney(perUnitAllIn, product.currency)}/ea</span></div>
            </div>

            <button onClick={handleAddToCart} disabled={!canAdd}
              className="mt-4 w-full rounded-xl py-3 font-semibold text-white disabled:opacity-50"
              style={{ backgroundImage: "var(--primary-gradient)" }}>
              Add to Cart
            </button>
            <Link href={`/mockup?product=${product.slug}`} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 text-sm font-semibold hover:border-primary/40">
              <Sparkles className="size-4 text-primary" /> Preview your logo
            </Link>
            <p className="mt-2 text-center text-xs text-muted-foreground">Free proofs before anything prints · cancel anytime before approval</p>
            {hasVariants && !matchedVariant ? <p className="mt-2 text-center text-xs text-warning">Select all options to add to cart.</p> : null}
          </div>

          {/* volume pricing table */}
          {tiers.length ? (
            <div className="mt-6 overflow-hidden rounded-2xl border border-border">
              <p className="bg-muted/50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Volume pricing</p>
              <table className="w-full text-sm">
                <tbody>
                  {tiers.map((t) => (
                    <tr key={t.qtyFrom} className={cn("border-t border-border", appliedTier?.qtyFrom === t.qtyFrom && "bg-brand-soft")}>
                      <td className="px-4 py-2.5 text-foreground">{t.qtyFrom}+ units</td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-foreground">{formatMoney(t.price, product.currency)}/ea</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
