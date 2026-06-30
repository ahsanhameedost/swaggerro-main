"use client";

import { useEffect, useRef, useState } from "react";
import { addToast } from "@heroui/toast";
import { Download, Loader2, Maximize2, Move, RotateCw, Trash2, Upload, X } from "lucide-react";
import { createCatalogImageUpload, uploadFileToPresignedUrl } from "@/modules/catalog/public/api";
import type { LogoPlacement, ProductBrandingInput } from "@/modules/stores/types";
import type { SwagCommissionType } from "@/modules/catalog/products/types";
import { computeCommission } from "@/lib/commission";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
type LogoType = (typeof LOGO_TYPES)[number];

const DEFAULT_PLACEMENT: LogoPlacement = { x: 50, y: 45, size: 28, rotation: 0, opacity: 100 };
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

// Load remote images through our same-origin proxy so the canvas stays
// "clean" (untainted) and toBlob() works. Local blob:/data: URLs load directly.
function proxied(src: string) {
  if (src.startsWith("blob:") || src.startsWith("data:")) return src;
  return `${API_URL}/storage/proxy?url=${encodeURIComponent(src)}`;
}

export type ProductLogoTarget = {
  id: string;
  name: string;
  imageUrl: string | null;
  logoUrl: string | null;
  placement: LogoPlacement | null;
  // Pricing + commission context (so the seller sees their earnings).
  currency?: string;
  basePrice: number;
  commissionType: SwagCommissionType;
  commissionValue: number | null;
  fallbackPercent: number;
  customPrice: number | null;
};

export function ProductLogoModal({
  product,
  onClose,
  onSave,
}: {
  product: ProductLogoTarget;
  onClose: () => void;
  onSave: (branding: ProductBrandingInput) => void;
}) {
  const currency = product.currency ?? "USD";
  const basePrice = product.basePrice > 0 ? product.basePrice : 0;

  // "Your price": default (catalog) vs a custom price the seller sets (>= base).
  const [useCustomPrice, setUseCustomPrice] = useState<boolean>(
    product.customPrice != null && product.customPrice > basePrice
  );
  const [customPriceInput, setCustomPriceInput] = useState<string>(
    product.customPrice != null ? String(product.customPrice) : ""
  );

  const parsedCustom = Number(customPriceInput);
  const customValid = useCustomPrice && customPriceInput.trim() !== "" && parsedCustom >= basePrice;
  const belowMin =
    useCustomPrice && customPriceInput.trim() !== "" && parsedCustom < basePrice;
  // The price actually used for the commission preview / save.
  const effectivePrice = customValid ? parsedCustom : basePrice;
  const commission = computeCommission(effectivePrice, {
    commissionType: product.commissionType,
    commissionValue: product.commissionValue,
    basePrice,
    fallbackPercent: product.fallbackPercent,
  });
  // Existing saved logo (remote url) or a freshly picked local file.
  const [logoUrl, setLogoUrl] = useState<string | null>(product.logoUrl);
  const [logoKey, setLogoKey] = useState<string | null>(null);
  const [localLogo, setLocalLogo] = useState<{ src: string; file: File } | null>(null);
  const [placement, setPlacement] = useState<LogoPlacement>(product.placement ?? DEFAULT_PLACEMENT);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const drag = useRef<
    | {
        mode: "move" | "resize" | "rotate";
        sx: number;
        sy: number;
        start: LogoPlacement;
        cx: number;
        cy: number;
        dist0: number;
        ang0: number;
      }
    | null
  >(null);

  const logoSrc = localLogo?.src ?? logoUrl;
  const hasLogo = Boolean(logoSrc);

  // ── pointer interactions (drag to move / resize / rotate) ──────────────────
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
      rot = (((rot + 180) % 360) + 360) % 360 - 180;
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
      mode,
      sx: e.clientX,
      sy: e.clientY,
      start: { ...placement },
      cx,
      cy,
      dist0: Math.hypot(e.clientX - cx, e.clientY - cy),
      ang0: (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI,
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };
  useEffect(
    () => () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    },
    []
  );

  // Pick a new logo file → upload to S3 immediately so we always have a remote url.
  const onFile = async (file: File) => {
    if (!(LOGO_TYPES as readonly string[]).includes(file.type)) {
      addToast({ title: "Unsupported file", description: "Use PNG, JPG or WEBP.", color: "warning" });
      return;
    }
    setLocalLogo({ src: URL.createObjectURL(file), file });
    setPlacement(product.placement ?? DEFAULT_PLACEMENT);
    setUploading(true);
    try {
      const up = await createCatalogImageUpload("projects", {
        filename: file.name,
        contentType: file.type as LogoType,
      });
      await uploadFileToPresignedUrl(up.uploadUrl, file);
      setLogoUrl(up.publicUrl);
      setLogoKey(up.key);
    } catch (e: any) {
      addToast({ title: "Upload failed", description: e?.message ?? "Try again.", color: "danger" });
      setLocalLogo(null);
    } finally {
      setUploading(false);
    }
  };

  // Composite product + placed logo into a PNG (for preview/download).
  async function exportPng(): Promise<Blob | null> {
    if (!product.imageUrl || !logoSrc) return null;
    const S = 1000;
    const canvas = document.createElement("canvas");
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(0, 0, S, S);
    const load = (src: string) =>
      new Promise<HTMLImageElement>((res, rej) => {
        const im = new Image();
        im.crossOrigin = "anonymous";
        im.onload = () => res(im);
        im.onerror = rej;
        im.src = src;
      });
    try {
      const prod = await load(proxied(product.imageUrl));
      const r = Math.min(S / prod.width, S / prod.height);
      const w = prod.width * r;
      const h = prod.height * r;
      ctx.drawImage(prod, (S - w) / 2, (S - h) / 2, w, h);
      const lg = await load(proxied(logoSrc));
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

  const handleDownload = async () => {
    if (!hasLogo) {
      addToast({ title: "Nothing to preview", description: "Add a logo first.", color: "warning" });
      return;
    }
    setDownloading(true);
    try {
      const blob = await exportPng();
      if (!blob) {
        addToast({
          title: "Couldn't generate preview",
          description: "The image couldn't be processed. Please try again.",
          color: "danger",
        });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${product.name.replace(/\s+/g, "-").toLowerCase()}-branded.png`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const removeLogo = () => {
    setLogoUrl(null);
    setLogoKey(null);
    setLocalLogo(null);
  };

  const handleSave = () => {
    if (uploading) {
      addToast({ title: "Please wait", description: "Your logo is still uploading.", color: "warning" });
      return;
    }
    if (belowMin) {
      addToast({
        title: "Price too low",
        description: `Your price can't be below the ${formatMoney(basePrice, currency)} base price.`,
        color: "warning",
      });
      return;
    }
    onSave({
      productId: product.id,
      logoUrl: logoUrl,
      logoKey: logoKey,
      placement: logoUrl ? placement : null,
      customPrice: customValid ? parsedCustom : null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <h3 className="font-display text-base font-bold">Customize this product</h3>
            <p className="text-xs text-muted-foreground">{product.name} · logo, price &amp; earnings</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
            <X className="size-5" />
          </button>
        </div>

        <div className="grid gap-5 overflow-y-auto p-5 sm:grid-cols-[1fr_22rem]">
          {/* Stage */}
          <div className="rounded-2xl border border-border bg-muted/30 p-3">
            <div
              ref={stageRef}
              className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-xl bg-muted"
            >
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="absolute inset-0 h-full w-full object-contain"
                  draggable={false}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No product image
                </div>
              )}

              {hasLogo ? (
                <div
                  className="absolute cursor-move"
                  style={{
                    left: `${placement.x}%`,
                    top: `${placement.y}%`,
                    width: `${placement.size}%`,
                    transform: `translate(-50%,-50%) rotate(${placement.rotation}deg)`,
                    opacity: placement.opacity / 100,
                  }}
                  onPointerDown={startDrag("move")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoSrc!} alt="Your logo" className="pointer-events-none w-full select-none" draggable={false} />
                  <span className="absolute inset-0 rounded border border-dashed border-primary/70" />
                  <button
                    type="button"
                    onPointerDown={startDrag("rotate")}
                    className="absolute -top-9 left-1/2 flex size-7 -translate-x-1/2 cursor-grab items-center justify-center rounded-full border border-primary bg-card text-primary shadow"
                  >
                    <RotateCw className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onPointerDown={startDrag("resize")}
                    className="absolute -bottom-3 -right-3 flex size-7 cursor-nwse-resize items-center justify-center rounded-full border border-primary bg-card text-primary shadow"
                  >
                    <Maximize2 className="size-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="absolute left-1/2 top-1/2 flex w-[60%] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 rounded-2xl border border-dashed border-primary/40 bg-card/80 px-4 py-8 text-center backdrop-blur transition-colors hover:border-primary"
                >
                  <Upload className="size-6 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Upload your logo</span>
                  <span className="text-xs text-muted-foreground">Then drag it onto the product</span>
                </button>
              )}
            </div>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <Move className="size-3.5" /> Drag to move · handles to resize / rotate
            </p>
            <input
              ref={fileRef}
              type="file"
              accept={LOGO_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
                e.target.value = "";
              }}
            />
          </div>

          {/* Controls */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 text-sm font-medium hover:border-primary/40 disabled:opacity-60"
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {hasLogo ? "Replace logo" : "Upload logo"}
            </button>

            <div className={cn("space-y-3 rounded-2xl border border-border bg-card p-4", !hasLogo && "opacity-50")}>
              <Slider label="Size" value={placement.size} min={6} max={90} suffix="%" disabled={!hasLogo} onChange={(v) => setPlacement((p) => ({ ...p, size: v }))} />
              <Slider label="Rotation" value={placement.rotation} min={-180} max={180} suffix="°" disabled={!hasLogo} onChange={(v) => setPlacement((p) => ({ ...p, rotation: v }))} />
              <Slider label="Opacity" value={placement.opacity} min={20} max={100} suffix="%" disabled={!hasLogo} onChange={(v) => setPlacement((p) => ({ ...p, opacity: v }))} />
            </div>

            <button
              type="button"
              onClick={handleDownload}
              disabled={!hasLogo || downloading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 text-sm font-medium hover:border-primary/40 disabled:opacity-50"
            >
              {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Download preview
            </button>

            {hasLogo ? (
              <button
                type="button"
                onClick={removeLogo}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" /> Remove logo
              </button>
            ) : null}

            {/* Your price & earnings */}
            <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Your price &amp; earnings</h4>
                <p className="text-xs text-muted-foreground">
                  {product.commissionType === "FLAT"
                    ? `Swaggeroo takes a flat fee of ${formatMoney(product.commissionValue ?? 0, currency)} at the base price (scales if you raise your price).`
                    : `Swaggeroo takes ${commission.effectivePercent}% commission on each sale.`}
                </p>
              </div>

              {/* Default vs custom price */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setUseCustomPrice(false)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left text-xs transition",
                    !useCustomPrice
                      ? "border-primary bg-brand-soft text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  <span className="block font-semibold">Default price</span>
                  <span className="block tabular-nums">{formatMoney(basePrice, currency)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUseCustomPrice(true)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left text-xs transition",
                    useCustomPrice
                      ? "border-primary bg-brand-soft text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  <span className="block font-semibold">Set my price</span>
                  <span className="block">Earn more per sale</span>
                </button>
              </div>

              {useCustomPrice ? (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Your price (min {formatMoney(basePrice, currency)})
                  </label>
                  <div className="mt-1 flex items-center gap-1 rounded-xl border border-input bg-background px-2.5">
                    <span className="text-sm text-muted-foreground">$</span>
                    <input
                      type="number"
                      min={basePrice}
                      step="0.01"
                      value={customPriceInput}
                      onChange={(e) => setCustomPriceInput(e.target.value)}
                      placeholder={basePrice.toFixed(2)}
                      className="h-9 w-full bg-transparent text-sm tabular-nums outline-none"
                    />
                  </div>
                  {belowMin ? (
                    <p className="mt-1 text-xs font-medium text-destructive">
                      Can&apos;t be below the {formatMoney(basePrice, currency)} base price.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {/* Live breakdown */}
              <div className="space-y-1 rounded-xl bg-muted/50 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Sale price</span>
                  <span className="font-medium tabular-nums">{formatMoney(effectivePrice, currency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Swaggeroo commission
                    {product.commissionType === "PERCENT" ? ` (${commission.effectivePercent}%)` : ""}
                  </span>
                  <span className="font-medium tabular-nums text-foreground">
                    −{formatMoney(commission.commission, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-1">
                  <span className="font-semibold text-foreground">You earn</span>
                  <span className="font-bold tabular-nums text-primary">
                    {formatMoney(commission.sellerEarning, currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={uploading || belowMin}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-brand transition hover:bg-primary/90 disabled:opacity-60"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  suffix,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-[var(--primary)]"
      />
    </div>
  );
}
