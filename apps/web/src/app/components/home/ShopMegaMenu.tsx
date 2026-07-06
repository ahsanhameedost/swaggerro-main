"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  ChevronDown,
  Cpu,
  CupSoda,
  Layers,
  Milk,
  NotebookPen,
  Package,
  Shirt,
  ShoppingBag,
  Sparkles,
  TrendingDown,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { usePublicCategories, usePublicProducts } from "@/lib/queries.catalog";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

const CAT_ICONS: Record<string, LucideIcon> = {
  apparel: Shirt,
  drinkware: CupSoda,
  bags: ShoppingBag,
  tech: Cpu,
  notebooks: NotebookPen,
  drinkbottles: Milk,
};

const OCCASIONS = [
  { name: "New Hire Kit", desc: "Make day one feel like a win.", img: "/products/premium-hoodie-branded.webp" },
  { name: "Event Ready", desc: "Booth-worthy gear that travels well.", img: "/products/classic-cotton-tee-cobalt.webp" },
  { name: "Eco Mob", desc: "Planet-friendly picks, no greenwashing.", img: "/products/stainless-water-bottle-branded.webp" },
  { name: "Holiday Drop", desc: "Gifts that beat another branded stress ball.", img: "/products/bluetooth-speaker-branded.webp" },
];

const PROMISES = [
  { icon: BadgeCheck, title: "Free proofs", sub: "on every order" },
  { icon: Package, title: "No minimums", sub: "order from 1 unit" },
  { icon: TrendingDown, title: "Volume pricing", sub: "built right in" },
  { icon: Truck, title: "Ships worldwide", sub: "wherever they are" },
];

/**
 * "Shop" hover mega-menu for the marketing navbar. Opens on hover with a soft
 * slide/fade; a short close delay bridges the gap between the trigger and the
 * full-width panel so it doesn't flicker shut while the cursor travels down.
 */
export function ShopMegaMenu() {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: categories = [] } = usePublicCategories();
  const { data: productData } = usePublicProducts({ page: 1, pageSize: 8 });
  const popular = (productData?.items ?? []).slice(0, 4);

  const openNow = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  };
  const close = () => setOpen(false);

  return (
    <div className="static" onMouseEnter={openNow} onMouseLeave={scheduleClose}>
      <button
        type="button"
        aria-expanded={open}
        onClick={openNow}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
          open ? "bg-primary/5 text-primary" : "text-foreground/75 hover:text-primary",
        )}
      >
        Shop
        <ChevronDown className={cn("size-4 transition-transform duration-300", open && "rotate-180")} />
      </button>

      <div
        onMouseEnter={openNow}
        onMouseLeave={scheduleClose}
        className={cn(
          "fixed inset-x-0 top-20 z-40 transition-all duration-300 ease-out",
          open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-3 opacity-0",
        )}
      >
        <div className="container overflow-hidden rounded-b-2xl border border-t-0 border-navy/10 bg-white px-6 py-8 shadow-[0_30px_60px_-24px_rgba(13,27,61,0.45)] lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_1fr_1fr_1.1fr]">
            {/* Shop by category */}
            <div>
              <p className="mb-4 text-xs font-semibold tracking-wider text-black/40 uppercase">Shop by category</p>
              <ul className="space-y-1">
                {categories.slice(0, 6).map((c) => {
                  const Icon = CAT_ICONS[c.slug] ?? Boxes;
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/shop?category=${c.slug}`}
                        onClick={close}
                        className="group/item flex items-start gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-muted/60"
                      >
                        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-primary">
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                            {c.name}
                            <ArrowRight className="size-3.5 -translate-x-1 opacity-0 transition-all group-hover/item:translate-x-0 group-hover/item:opacity-100" />
                          </span>
                          {c.description ? (
                            <span className="block truncate text-xs text-muted-foreground">{c.description}</span>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <Link
                href="/shop"
                onClick={close}
                className="mt-3 inline-flex items-center gap-1.5 px-3 text-sm font-semibold text-primary hover:underline"
              >
                View all products <ArrowRight className="size-4" />
              </Link>
            </div>

            {/* Shop by occasion */}
            <div>
              <p className="mb-4 text-xs font-semibold tracking-wider text-black/40 uppercase">Shop by occasion</p>
              <ul className="space-y-1">
                {OCCASIONS.map((o) => (
                  <li key={o.name}>
                    <Link
                      href="/shop"
                      onClick={close}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-muted/60"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={o.img} alt="" className="h-full w-full object-cover" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-foreground">{o.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{o.desc}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Popular right now */}
            <div>
              <p className="mb-4 text-xs font-semibold tracking-wider text-black/40 uppercase">Popular right now</p>
              <ul className="space-y-1">
                {popular.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/shop/${p.slug}`}
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
                          <span className="font-semibold text-foreground">
                            {formatMoney(p.floorPrice ?? p.basePrice ?? p.lowestPrice ?? 0, p.currency)}
                          </span>
                          /ea
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Do it for me */}
            <div>
              <p className="mb-4 text-xs font-semibold tracking-wider text-black/40 uppercase">Do it for me</p>
              <Link
                href="/studio"
                onClick={close}
                className="group/card relative block overflow-hidden rounded-2xl bg-navy text-white"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/products/premium-hoodie-branded.webp"
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-55"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-navy via-navy/50 to-transparent" />
                <span className="relative flex h-72 flex-col justify-end p-5">
                  <span className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-highlight px-2.5 py-1 text-xs font-semibold text-navy">
                    <Sparkles className="size-3.5" /> Pack Studio
                  </span>
                  <span className="font-display text-lg font-bold leading-tight">
                    Bundle swag into ready-to-gift kits
                  </span>
                  <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold">
                    Build a pack <ArrowRight className="size-4 transition-transform group-hover/card:translate-x-0.5" />
                  </span>
                </span>
              </Link>
              <Link
                href="/mockup"
                onClick={close}
                className="mt-3 flex items-center justify-between rounded-2xl border border-border px-4 py-3 transition-colors hover:bg-muted/60"
              >
                <span className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-primary">
                    <Layers className="size-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-foreground">Mockup Studio</span>
                    <span className="block text-xs text-muted-foreground">See your logo on any product</span>
                  </span>
                </span>
                <ArrowRight className="size-4 text-muted-foreground" />
              </Link>
            </div>
          </div>

          {/* promises bar */}
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5 sm:grid-cols-4">
            {PROMISES.map(({ icon: Icon, title, sub }) => (
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
