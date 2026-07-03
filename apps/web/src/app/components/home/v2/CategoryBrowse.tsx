"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Backpack,
  Cpu,
  CupSoda,
  GlassWater,
  LayoutGrid,
  NotebookPen,
  Search,
  Shirt,
  type LucideIcon,
} from "lucide-react";
import { usePublicCategories, usePublicProducts } from "@/lib/queries.catalog";

// Per-slug presentation for known categories; anything else falls back gracefully.
const CONFIG: Record<string, { icon: LucideIcon; image: string; blurb: string }> = {
  apparel: { icon: Shirt, image: "/banner/category-apparel.webp", blurb: "Tees, hoodies & layers your crew will actually wear." },
  drinkware: { icon: CupSoda, image: "/banner/category-drinkware.webp", blurb: "Tumblers, mugs & bottles for the daily grind." },
  bags: { icon: Backpack, image: "/banner/category-bags.webp", blurb: "Totes, packs & carryalls for work and play." },
  tech: { icon: Cpu, image: "/banner/category-tech.webp", blurb: "Gadgets and desk gear that earn their keep." },
  notebooks: { icon: NotebookPen, image: "", blurb: "Notebooks & desk paper worth writing on." },
  drinkbottles: { icon: GlassWater, image: "/products/stainless-water-bottle-branded.webp", blurb: "Refillable bottles built to outlast the swag drawer." },
};

const DEFAULT_CFG = { icon: LayoutGrid, image: "/products/classic-cotton-tee.webp", blurb: "Browse the collection." };

export default function CategoryBrowse() {
  const { data: categories = [] } = usePublicCategories();
  // Pull a wide page once to derive per-category product counts client-side.
  const { data: productData } = usePublicProducts({ page: 1, pageSize: 100 });

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of productData?.items ?? []) {
      const slug = p.category?.slug;
      if (slug) map.set(slug, (map.get(slug) ?? 0) + 1);
    }
    return map;
  }, [productData]);

  // Cap the marquee/showcase to the first 6 categories to match the design rhythm.
  const cats = categories.slice(0, 6);
  const [hovered, setHovered] = useState(0);

  const cfg = (slug: string) => CONFIG[slug] ?? DEFAULT_CFG;

  if (!cats.length) return null;

  return (
    <section>
      <div className="mx-auto max-w-site px-6 py-20 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">Shop the catalog</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-[-0.02em] text-balance text-foreground sm:text-4xl">
            Find your people&apos;s next favorite thing
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Search the whole catalog, or jump straight to a category.
          </p>
        </div>

        {/* Search + category tab strip */}
        <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
          <form
            role="search"
            action="/shop"
            className="relative flex h-14 w-full shrink-0 overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40 lg:w-80"
          >
            <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              name="q"
              placeholder="Search products, brands & more…"
              aria-label="Search products"
              className="h-full w-full bg-transparent pr-3 pl-12 text-sm outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            <button
              type="submit"
              aria-label="Search"
              className="flex h-full w-14 shrink-0 items-center justify-center border-l border-border bg-primary text-primary-foreground transition-colors hover:bg-brand"
            >
              <Search className="size-5" />
            </button>
          </form>

          <div className="overflow-x-auto overflow-y-hidden rounded-lg border border-border bg-card shadow-sm lg:flex-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex w-max divide-x divide-border lg:w-full">
              {cats.map((c) => {
                const Icon = cfg(c.slug).icon;
                return (
                  <Link
                    key={c.id}
                    href={`/shop?category=${c.slug}`}
                    className="group flex h-14 shrink-0 items-center justify-center gap-2 px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:text-primary lg:flex-1"
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                    <span className="whitespace-nowrap">{c.name}</span>
                  </Link>
                );
              })}
              <Link
                href="/shop"
                className="group flex h-14 shrink-0 items-center justify-center gap-2 px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:text-primary lg:flex-1"
              >
                <LayoutGrid className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                <span className="whitespace-nowrap">All categories</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Expanding showcase (lg) + mobile grid */}
      <div className="relative overflow-hidden border-y border-border/60 bg-muted/30 py-20 sm:py-24">
        <div className="mx-auto hidden h-80 max-w-site items-stretch gap-2.5 px-6 lg:flex">
          {cats.map((c, i) => {
            const { icon: Icon, image } = cfg(c.slug);
            const count = counts.get(c.slug) ?? 0;
            const isOpen = hovered === i;
            return (
              <Link
                key={c.id}
                href={`/shop?category=${c.slug}`}
                aria-label={`${c.name} — ${count} products`}
                onMouseEnter={() => setHovered(i)}
                onFocus={() => setHovered(i)}
                className={`relative overflow-hidden rounded-2xl bg-navy ring-1 transition-[flex-grow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isOpen ? "ring-white/20" : "ring-white/10"}`}
                style={{ flexGrow: isOpen ? 6 : 1, flexBasis: 0 }}
              >
                {image ? (
                  <img
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out"
                    style={{ transform: isOpen ? "scale(1)" : "scale(1.05)" }}
                    src={image}
                  />
                ) : null}
                <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top_right,rgba(9,19,52,0.95),rgba(14,58,140,0.5)_30%,transparent_58%)]" />
                <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_75%_at_0%_100%,rgba(255,196,40,0.45),transparent_55%)]" />
                <span className={`pointer-events-none absolute inset-0 bg-black transition-opacity duration-500 ${isOpen ? "opacity-0" : "opacity-30"}`} />
                <span className={`absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-5 transition-opacity duration-500 ${isOpen ? "opacity-100" : "opacity-0"}`}>
                  <span className="min-w-0">
                    <span className="block truncate font-display text-2xl font-bold text-white">{c.name}</span>
                    <span className="text-sm text-white/80 tabular-nums">{count} products</span>
                  </span>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-navy">
                    <ArrowRight className="size-5" />
                  </span>
                </span>
                <span className={`absolute inset-0 flex flex-col items-center justify-center gap-3 drop-shadow-[0_2px_6px_rgba(0,0,0,0.75)] transition-opacity duration-300 ${isOpen ? "pointer-events-none opacity-0" : "opacity-100"}`}>
                  <Icon className="size-6 text-white/90" />
                  <span className="[writing-mode:vertical-rl] rotate-180 text-xs font-medium tracking-wider text-white/80 uppercase">{c.name}</span>
                </span>
              </Link>
            );
          })}
        </div>

        {/* Mobile / tablet grid */}
        <div className="mx-auto grid max-w-site grid-cols-2 gap-3 px-6 sm:grid-cols-3 lg:hidden">
          {cats.map((c) => {
            const { icon: Icon, image } = cfg(c.slug);
            const count = counts.get(c.slug) ?? 0;
            return (
              <Link
                key={c.id}
                href={`/shop?category=${c.slug}`}
                className="group relative overflow-hidden rounded-2xl bg-navy ring-1 ring-white/10"
              >
                <div className="relative aspect-[16/10]">
                  {image ? <img alt="" loading="lazy" className="absolute inset-0 size-full object-cover" src={image} /> : null}
                  <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top_right,rgba(9,19,52,0.92),rgba(14,58,140,0.45)_32%,transparent_60%)]" />
                  <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(75%_80%_at_0%_100%,rgba(255,196,40,0.4),transparent_58%)]" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-3">
                    <div className="flex items-center gap-2">
                      <Icon className="size-4 text-white/90" />
                      <span className="font-display text-base font-bold text-white">{c.name}</span>
                    </div>
                    <span className="text-xs text-white/70 tabular-nums">{count}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
