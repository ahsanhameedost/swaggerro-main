"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  Layers,
  Package,
  Send,
  Sparkles,
  TrendingDown,
  Truck,
} from "lucide-react";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type MegaProduct = {
  id: string;
  slug: string;
  name: string;
  imageUrl?: string | null;
  category?: { name: string } | null;
  currency?: string | null;
  customPrice?: number | null;
  floorPrice?: number | null;
  basePrice?: number | null;
  lowestPrice?: number | null;
};

const price = (p: MegaProduct) =>
  p.customPrice && p.customPrice > 0
    ? p.customPrice
    : p.floorPrice ?? p.basePrice ?? p.lowestPrice ?? 0;

/**
 * Store-scoped hover mega-menu (the seller's "custom menu"). Derives its columns
 * from the store's own catalog: shop-by-category, ways to send, popular products,
 * and a "need something custom" card. Themed via the store's CSS vars.
 */
export function StoreMegaMenu({
  store,
  products = [],
  label = "Shop",
}: {
  store: { slug: string; name: string; companyName?: string | null };
  products?: MegaProduct[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openNow = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  };
  const close = () => setOpen(false);

  const catMap = new Map<string, { count: number; from: number }>();
  for (const p of products) {
    const n = p.category?.name;
    if (!n) continue;
    const e = catMap.get(n) ?? { count: 0, from: Number.POSITIVE_INFINITY };
    e.count += 1;
    e.from = Math.min(e.from, price(p));
    catMap.set(n, e);
  }
  const categories = Array.from(catMap, ([name, v]) => ({ name, ...v })).slice(0, 6);
  const popular = products.filter((p) => p.imageUrl).slice(0, 4);
  const currency = products[0]?.currency ?? "USD";
  const storeHref = `/store/${store.slug}`;
  const brand = store.companyName ?? store.name;

  return (
    <div className="static" onMouseEnter={openNow} onMouseLeave={scheduleClose}>
      <button
        type="button"
        aria-expanded={open}
        onClick={openNow}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
          open ? "bg-brand-soft text-primary" : "text-foreground/75 hover:text-primary",
        )}
      >
        {label}
        <ChevronDown className={cn("size-4 transition-transform duration-300", open && "rotate-180")} />
      </button>

      <div
        onMouseEnter={openNow}
        onMouseLeave={scheduleClose}
        className={cn(
          "fixed inset-x-0 top-16 z-30 px-4 transition-all duration-300 ease-out",
          open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-3 opacity-0",
        )}
      >
        <div className="mx-auto max-w-site overflow-hidden rounded-b-2xl border border-t-0 border-border bg-background px-6 py-8 shadow-[0_30px_60px_-24px_rgba(13,27,61,0.45)] lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_1fr_1fr_1.1fr]">
            {/* Shop by category */}
            <div>
              <p className="mb-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Shop by category
              </p>
              <ul className="space-y-1">
                {categories.map((c) => (
                  <li key={c.name}>
                    <Link
                      href={`${storeHref}?category=${encodeURIComponent(c.name)}`}
                      onClick={close}
                      className="group/item flex items-center justify-between gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-muted/60"
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-primary">
                          <Layers className="size-4" />
                        </span>
                        <span>
                          <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                            {c.name}
                            <ArrowRight className="size-3.5 -translate-x-1 opacity-0 transition-all group-hover/item:translate-x-0 group-hover/item:opacity-100" />
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {c.count} product{c.count === 1 ? "" : "s"}
                          </span>
                        </span>
                      </span>
                      {Number.isFinite(c.from) && c.from > 0 ? (
                        <span className="shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">
                          from {formatMoney(c.from, currency)}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
                {!categories.length ? (
                  <li className="px-3 text-sm text-muted-foreground">Products coming soon</li>
                ) : null}
              </ul>
              <Link
                href={storeHref}
                onClick={close}
                className="mt-3 inline-flex items-center gap-1.5 px-3 text-sm font-semibold text-primary hover:underline"
              >
                Shop all products <ArrowRight className="size-4" />
              </Link>
            </div>

            {/* Ways to send it */}
            <div>
              <p className="mb-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Ways to send it
              </p>
              <ul className="space-y-1">
                <li>
                  <Link
                    href="/studio"
                    onClick={close}
                    className="flex items-start gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-muted/60"
                  >
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-primary">
                      <Send className="size-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-foreground">Claim links</span>
                      <span className="block text-xs text-muted-foreground">Each recipient picks their size &amp; address.</span>
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href={`${storeHref}/checkout`}
                    onClick={close}
                    className="flex items-start gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-muted/60"
                  >
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-primary">
                      <Package className="size-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-foreground">Bulk shipment</span>
                      <span className="block text-xs text-muted-foreground">One address, you hand kits out.</span>
                    </span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Popular products */}
            <div>
              <p className="mb-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Popular products
              </p>
              <ul className="space-y-1">
                {popular.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`${storeHref}/${p.slug}`}
                      onClick={close}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-muted/60"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground">{p.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          from{" "}
                          <span className="font-semibold text-foreground">{formatMoney(price(p), p.currency ?? "USD")}</span>
                          /ea
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
                {!popular.length ? (
                  <li className="px-3 text-sm text-muted-foreground">Products coming soon</li>
                ) : null}
              </ul>
            </div>

            {/* Need something custom */}
            <div>
              <p className="mb-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Need something custom?
              </p>
              <Link
                href="/studio"
                onClick={close}
                className="group/card relative block overflow-hidden rounded-2xl bg-navy text-white"
              >
                <span
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(80% 90% at 80% 0%, color-mix(in srgb, var(--primary) 55%, transparent), transparent 60%)",
                  }}
                />
                <span className="relative flex h-64 flex-col justify-end p-5">
                  <span className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">
                    <Sparkles className="size-3.5" /> Pack Studio
                  </span>
                  <span className="font-display text-lg font-bold leading-tight">Build your own mix</span>
                  <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold">
                    Customize a kit <ArrowRight className="size-4 transition-transform group-hover/card:translate-x-0.5" />
                  </span>
                </span>
              </Link>
              <Link
                href="/contact"
                onClick={close}
                className="mt-3 flex items-center justify-between rounded-2xl border border-border px-4 py-3 transition-colors hover:bg-muted/60"
              >
                <span className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-primary">
                    <Sparkles className="size-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-foreground">Talk to {brand}</span>
                    <span className="block text-xs text-muted-foreground">Questions about a bulk order?</span>
                  </span>
                </span>
                <ArrowRight className="size-4 text-muted-foreground" />
              </Link>
            </div>
          </div>

          {/* promises bar */}
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5 sm:grid-cols-4">
            {[
              { icon: BadgeCheck, title: "Free proofs", sub: "on every order" },
              { icon: Package, title: "No minimums", sub: "order from 1 unit" },
              { icon: TrendingDown, title: "Volume pricing", sub: "built right in" },
              { icon: Truck, title: "Ships worldwide", sub: "wherever they are" },
            ].map(({ icon: Icon, title, sub }) => (
              <div key={title} className="flex items-center gap-2.5">
                <Icon className="size-5 text-primary" />
                <span className="text-sm">
                  <span className="font-semibold text-foreground">{title}</span>{" "}
                  <span className="text-muted-foreground">{sub}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
