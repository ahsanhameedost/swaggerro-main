"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addToast } from "@heroui/toast";
import { Loader2, Maximize2, Move, RotateCw, Upload } from "lucide-react";
import { useCatalogCartStore } from "@/lib/cart-store";
import { resolveUnitPrice } from "@/lib/catalog-pricing";
import { formatMoney } from "@/lib/money";
import { getImprintMethods } from "@/lib/imprint";
import { createCatalogImageUpload, uploadFileToPresignedUrl } from "@/lib/catalog";
import type { CatalogProductDetail } from "@/modules/catalog/products/types";
import { cn } from "@/lib/utils";

const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
type LogoType = (typeof LOGO_TYPES)[number];

type Placement = { x: number; y: number; size: number; rotation: number; opacity: number };
const DEFAULT_PLACEMENT: Placement = { x: 50, y: 45, size: 28, rotation: 0, opacity: 100 };
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function MockupBuilder({ product }: { product: CatalogProductDetail }) {
  const router = useRouter();
  const addBulkItem = useCatalogCartStore((s) => s.addBulkItem);
  const setBranding = useCatalogCartStore((s) => s.setBranding);

  const colorGroup = product.variantGroups.find((g) => g.type === "COLOR");
  const sizeGroup = product.variantGroups.find((g) => g.type !== "COLOR");
  const imprintMethods = useMemo(() => getImprintMethods(product.category?.slug), [product.category?.slug]);

  const [colorId, setColorId] = useState<string | null>(colorGroup?.options[0]?.id ?? null);
  const [sizeId, setSizeId] = useState<string | null>(sizeGroup?.options[0]?.id ?? null);
  const [methodKey, setMethodKey] = useState<string>(imprintMethods[0]?.key ?? "");
  const [qty, setQty] = useState<number>(product.minQty || 25);

  const [logo, setLogo] = useState<{ src: string; file: File } | null>(null);
  const [placement, setPlacement] = useState<Placement>(DEFAULT_PLACEMENT);
  const [submitting, setSubmitting] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{ mode: "move" | "resize" | "rotate"; sx: number; sy: number; start: Placement; cx: number; cy: number; dist0: number; ang0: number } | null>(null);

  // matched concrete catalog variant for the current color+size
  const matchedVariant = useMemo(() => {
    const wanted = [colorId, sizeId].filter(Boolean) as string[];
    if (!wanted.length) return product.productCatalogVariants[0] ?? null;
    return (
      product.productCatalogVariants.find((v) =>
        wanted.every((id) => v.selectedOptions.some((o) => o.optionId === id)),
      ) ?? null
    );
  }, [product, colorId, sizeId]);

  const activeBasePrice = matchedVariant?.price ?? product.basePrice ?? 0;
  const activePricing = matchedVariant?.pricingOptions?.length ? matchedVariant.pricingOptions : product.pricingOptions;
  const method = imprintMethods.find((m) => m.key === methodKey) ?? null;
  const setupFee = method?.setupFee ?? 0;
  const unit = resolveUnitPrice(activeBasePrice, qty, activePricing);
  const subtotal = unit * qty;
  const total = subtotal + setupFee;
  const perUnitAllIn = qty > 0 ? total / qty : 0;
  const belowMoq = qty < (product.minQty || 1);

  const image = product.images?.[0]?.url ?? null;
  const colorName = colorGroup?.options.find((o) => o.id === colorId)?.label ?? null;
  const sizeName = sizeGroup?.options.find((o) => o.id === sizeId)?.label ?? null;

  // ── pointer interactions ───────────────────────────────────────────────────
  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    const stage = stageRef.current;
    if (!d || !stage) return;
    const rect = stage.getBoundingClientRect();
    if (d.mode === "move") {
      const dx = ((e.clientX - d.sx) / rect.width) * 100;
      const dy = ((e.clientY - d.sy) / rect.height) * 100;
      setPlacement((p) => ({ ...p, x: clamp(d.start.x + dx, 0, 100), y: clamp(d.start.y + dy, 0, 100) }));
    } else if (d.mode === "resize") {
      const dist = Math.hypot(e.clientX - d.cx, e.clientY - d.cy);
      setPlacement((p) => ({ ...p, size: clamp(Math.round(d.start.size * (dist / (d.dist0 || 1))), 6, 90) }));
    } else if (d.mode === "rotate") {
      const ang = (Math.atan2(e.clientY - d.cy, e.clientX - d.cx) * 180) / Math.PI;
      let rot = d.start.rotation + (ang - d.ang0);
      rot = ((rot + 180) % 360 + 360) % 360 - 180;
      setPlacement((p) => ({ ...p, rotation: Math.round(rot) }));
    }
  };
  const onPointerUp = () => {
    drag.current = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  };
  const startDrag = (mode: "move" | "resize" | "rotate") => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const cx = rect.left + (placement.x / 100) * rect.width;
    const cy = rect.top + (placement.y / 100) * rect.height;
    drag.current = {
      mode, sx: e.clientX, sy: e.clientY, start: { ...placement }, cx, cy,
      dist0: Math.hypot(e.clientX - cx, e.clientY - cy),
      ang0: (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI,
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };
  useEffect(() => () => { window.removeEventListener("pointermove", onPointerMove); window.removeEventListener("pointerup", onPointerUp); }, []);

  const onFile = (file: File) => {
    if (!(LOGO_TYPES as readonly string[]).includes(file.type)) {
      addToast({ title: "Unsupported file", description: "Use PNG, JPG or WEBP.", color: "warning" });
      return;
    }
    setLogo({ src: URL.createObjectURL(file), file });
    setPlacement(DEFAULT_PLACEMENT);
  };

  // composite product + placed logo to a PNG data url (same-origin images → no taint)
  async function exportMockup(): Promise<Blob | null> {
    if (!image || !logo) return null;
    const S = 1000;
    const canvas = document.createElement("canvas");
    canvas.width = S; canvas.height = S;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#f3f4f6"; ctx.fillRect(0, 0, S, S);
    const load = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => res(im); im.onerror = rej; im.src = src; });
    try {
      const prod = await load(image);
      const r = Math.min(S / prod.width, S / prod.height);
      const w = prod.width * r, h = prod.height * r;
      ctx.drawImage(prod, (S - w) / 2, (S - h) / 2, w, h);
      const lg = await load(logo.src);
      const lw = (placement.size / 100) * S;
      const lh = lw * (lg.height / lg.width);
      ctx.save();
      ctx.globalAlpha = placement.opacity / 100;
      ctx.translate((placement.x / 100) * S, (placement.y / 100) * S);
      ctx.rotate((placement.rotation * Math.PI) / 180);
      ctx.drawImage(lg, -lw / 2, -lh / 2, lw, lh);
      ctx.restore();
      return await new Promise((res) => canvas.toBlob((b) => res(b), "image/png"));
    } catch {
      return null;
    }
  }

  const handleAddToCart = async () => {
    if (!matchedVariant && product.productCatalogVariants.length) {
      addToast({ title: "Pick a variant", color: "warning" });
      return;
    }
    if (belowMoq) {
      addToast({ title: `Minimum is ${product.minQty}`, color: "warning" });
      return;
    }
    setSubmitting(true);
    try {
      let logoUrl: string | null = null, logoKey: string | null = null, mockupUrl: string | null = null;
      if (logo) {
        const up = await createCatalogImageUpload("projects", { filename: logo.file.name, contentType: logo.file.type as LogoType });
        await uploadFileToPresignedUrl(up.uploadUrl, logo.file);
        logoUrl = up.publicUrl; logoKey = up.key;
        const blob = await exportMockup();
        if (blob) {
          const mfile = new File([blob], `${product.slug}-mockup.png`, { type: "image/png" });
          const mup = await createCatalogImageUpload("projects", { filename: mfile.name, contentType: "image/png" });
          await uploadFileToPresignedUrl(mup.uploadUrl, mfile);
          mockupUrl = mup.publicUrl;
        }
      }
      const variantLabel = [colorName, sizeName].filter(Boolean).join(" / ") || null;
      addBulkItem({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        imageUrl: image,
        productCatalogVariantId: matchedVariant?.id ?? null,
        variantName: variantLabel,
        basePrice: activeBasePrice,
        compareAtPrice: product.compareAtPrice ?? null,
        stock: matchedVariant?.stock ?? product.baseStock ?? 0,
        minQty: product.minQty || 1,
        currency: product.currency,
        pricingOptions: activePricing,
        quantity: qty,
      });
      if (logo) {
        const note = `Logo placement — ${product.name}${variantLabel ? ` (${variantLabel})` : ""}: horizontal ${Math.round(placement.x)}%, vertical ${Math.round(placement.y)}%, size ${placement.size}% of width, rotation ${placement.rotation}°, opacity ${placement.opacity}%. Imprint: ${method?.name ?? "—"}.${mockupUrl ? ` Mockup preview: ${mockupUrl}` : ""}`;
        setBranding({ logoUrl, logoKey, mockupUrl, note });
      }
      addToast({ title: "Added to cart", description: logo ? "Logo & placement saved for the design team." : undefined, color: "success" });
      router.push("/cart");
    } catch (e) {
      addToast({ title: "Could not add to cart", description: e instanceof Error ? e.message : "Try again.", color: "danger" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="swag-redesign mx-auto max-w-site px-6 py-10">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-primary">Proof preview</span>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Mockup Studio</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Drop your logo onto the product, position it, and add it to cart. We send a production-ready proof before anything prints.
        </p>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
        {/* Stage */}
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <div ref={stageRef} className="relative mx-auto aspect-square w-full max-w-xl overflow-hidden rounded-2xl bg-muted">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt={product.name} className="absolute inset-0 h-full w-full object-contain" draggable={false} />
            ) : null}

            {logo ? (
              <div
                className="absolute cursor-move"
                style={{ left: `${placement.x}%`, top: `${placement.y}%`, width: `${placement.size}%`, transform: `translate(-50%,-50%) rotate(${placement.rotation}deg)`, opacity: placement.opacity / 100 }}
                onPointerDown={startDrag("move")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo.src} alt="Your logo" className="pointer-events-none w-full select-none" draggable={false} />
                <span className="absolute inset-0 rounded border border-dashed border-primary/70" />
                <button type="button" onPointerDown={startDrag("rotate")} className="absolute -top-9 left-1/2 flex size-7 -translate-x-1/2 cursor-grab items-center justify-center rounded-full border border-primary bg-card text-primary shadow"><RotateCw className="size-3.5" /></button>
                <button type="button" onPointerDown={startDrag("resize")} className="absolute -right-3 -bottom-3 flex size-7 cursor-nwse-resize items-center justify-center rounded-full border border-primary bg-card text-primary shadow"><Maximize2 className="size-3.5" /></button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} className="absolute top-1/2 left-1/2 flex w-[60%] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 rounded-2xl border border-dashed border-primary/40 bg-card/80 px-4 py-8 text-center backdrop-blur transition-colors hover:border-primary">
                <Upload className="size-6 text-primary" />
                <span className="text-sm font-semibold text-foreground">Upload your logo</span>
                <span className="text-xs text-muted-foreground">Then drag it onto the product</span>
              </button>
            )}
          </div>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <Move className="size-3.5" /> Drag to move · handles to resize / rotate · sliders to fine-tune. Free proof before printing.
          </p>
          <input ref={fileRef} type="file" accept={LOGO_TYPES.join(",")} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
        </div>

        {/* Controls */}
        <div className="space-y-5">
          <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 text-sm font-medium hover:border-primary/40">
            <Upload className="size-4" /> {logo ? "Replace logo" : "Upload logo"}
          </button>

          {/* sliders */}
          <div className={cn("space-y-3 rounded-2xl border border-border bg-card p-4", !logo && "opacity-50")}>
            <Slider label="Size" value={placement.size} min={6} max={90} suffix="%" disabled={!logo} onChange={(v) => setPlacement((p) => ({ ...p, size: v }))} />
            <Slider label="Rotation" value={placement.rotation} min={-180} max={180} suffix="°" disabled={!logo} onChange={(v) => setPlacement((p) => ({ ...p, rotation: v }))} />
            <Slider label="Opacity" value={placement.opacity} min={20} max={100} suffix="%" disabled={!logo} onChange={(v) => setPlacement((p) => ({ ...p, opacity: v }))} />
          </div>

          {/* color */}
          {colorGroup ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Color{colorName ? `: ${colorName}` : ""}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {colorGroup.options.map((o) => (
                  <button key={o.id} type="button" title={o.label} onClick={() => setColorId(o.id ?? null)}
                    className={cn("size-8 rounded-full border-2 transition", colorId === o.id ? "border-primary" : "border-border")}
                    style={{ backgroundColor: o.colorHex ?? "#ddd" }} />
                ))}
              </div>
            </div>
          ) : null}

          {/* size */}
          {sizeGroup ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Size</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {sizeGroup.options.map((o) => (
                  <button key={o.id} type="button" onClick={() => setSizeId(o.id ?? null)}
                    className={cn("h-9 min-w-9 rounded-lg border px-3 text-sm font-medium transition", sizeId === o.id ? "border-primary bg-brand-soft text-primary" : "border-border hover:border-foreground/30")}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* imprint */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Imprint method</p>
            <div className="mt-2 space-y-2">
              {imprintMethods.map((m) => (
                <button key={m.key} type="button" onClick={() => setMethodKey(m.key)}
                  className={cn("flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition", methodKey === m.key ? "border-primary bg-brand-soft" : "border-border hover:border-foreground/30")}>
                  <span className="font-medium text-foreground">{m.name}</span>
                  <span className="text-xs text-muted-foreground">{formatMoney(m.setupFee)} setup</span>
                </button>
              ))}
            </div>
          </div>

          {/* quantity */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quantity <span className="ml-1 normal-case text-muted-foreground/70">MOQ {product.minQty}</span></p>
            <div className="mt-2 flex items-center gap-2">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 25))} className="flex size-9 items-center justify-center rounded-lg border border-border">−</button>
              <input type="number" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} className="h-9 w-20 rounded-lg border border-input bg-background text-center text-sm outline-none focus-visible:border-ring" />
              <button type="button" onClick={() => setQty((q) => q + 25)} className="flex size-9 items-center justify-center rounded-lg border border-border">+</button>
            </div>
          </div>

          {/* price + actions */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">{formatMoney(perUnitAllIn, product.currency)}/ea all-in</span>
              <span className="font-display text-2xl font-bold tabular-nums">{formatMoney(total, product.currency)}</span>
            </div>
            <button type="button" onClick={handleAddToCart} disabled={submitting || belowMoq}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white disabled:opacity-50"
              style={{ backgroundImage: "var(--primary-gradient)" }}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null} Add to cart
            </button>
            {belowMoq ? <p className="mt-2 text-center text-xs text-warning">Minimum order is {product.minQty}.</p> : null}
            <p className="mt-2 text-center text-xs text-muted-foreground">Free production-ready proof before anything prints.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, suffix, disabled, onChange }: { label: string; value: number; min: number; max: number; suffix: string; disabled?: boolean; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-[var(--primary)]" />
    </div>
  );
}
