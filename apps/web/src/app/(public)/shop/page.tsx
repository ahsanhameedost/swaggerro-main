"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  PackageOpen,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { usePublicCategories, usePublicProducts } from "@/lib/queries.catalog";
import { ProductCard } from "@/components/shop/product-card";
import { PageHero } from "@/components/marketing/page-hero";
import { cn } from "@/lib/utils";
import type { CatalogProductListItem } from "@/modules/catalog/products/types";

const PAGE_SIZE = 12;

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "moq-asc", label: "Lowest minimum" },
  { value: "newest", label: "Newest" },
] as const;
type SortValue = (typeof SORT_OPTIONS)[number]["value"];

function fromPrice(p: CatalogProductListItem) {
  return p.floorPrice ?? p.basePrice ?? p.lowestPrice ?? 0;
}

export default function ShopPage() {
  // Catalog is small — fetch all (pageSize max 48) and filter/sort/paginate client-side.
  const { data, isLoading } = usePublicProducts({ page: 1, pageSize: 48 });
  const { data: categories = [] } = usePublicCategories();
  const allProducts = useMemo(() => data?.items ?? [], [data]);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [colors, setColors] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState<SortValue>("featured");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const deferredSearch = useDeferredValue(search);

  // distinct color swatches across the catalog
  const availableColors = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const p of allProducts) for (const s of p.swatches ?? []) if (!map.has(s.name)) map.set(s.name, s.hex);
    return [...map.entries()].map(([name, hex]) => ({ name, hex }));
  }, [allProducts]);

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;
    let list = allProducts.filter((p) => {
      if (category && p.category?.slug !== category) return false;
      if (colors.length && !(p.swatches ?? []).some((s) => colors.includes(s.name))) return false;
      const price = fromPrice(p);
      if (min != null && price < min) return false;
      if (max != null && price > max) return false;
      if (q && !`${p.name} ${p.shortDescription ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const byPrice = (a: CatalogProductListItem, b: CatalogProductListItem) => fromPrice(a) - fromPrice(b);
    if (sort === "price-asc") list = [...list].sort(byPrice);
    else if (sort === "price-desc") list = [...list].sort((a, b) => byPrice(b, a));
    else if (sort === "moq-asc") list = [...list].sort((a, b) => a.minQty - b.minQty);
    else if (sort === "newest") list = [...list].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    return list;
  }, [allProducts, category, colors, minPrice, maxPrice, deferredSearch, sort]);

  const pageItems = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // auto-load the next batch as the sentinel scrolls into view
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, filtered.length));
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, filtered.length]);

  // reset to the first batch when filters/search/sort change
  const resetPage = () => setVisibleCount(PAGE_SIZE);
  const toggleColor = (name: string) => {
    resetPage();
    setColors((cur) => (cur.includes(name) ? cur.filter((c) => c !== name) : [...cur, name]));
  };
  const clearAll = () => {
    setCategory(null); setColors([]); setMinPrice(""); setMaxPrice(""); setVisibleCount(PAGE_SIZE);
  };
  const hasActive = category || colors.length || minPrice || maxPrice;

  const activeCategory = categories.find((c) => c.slug === category) ?? null;

  const filters = (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Filters</h2>
        {hasActive ? (
          <button onClick={clearAll} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <X className="size-3.5" /> Clear
          </button>
        ) : null}
      </div>

      <div>
        <h3 className="mb-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Category</h3>
        <ul className="space-y-0.5">
          <FilterRow active={!category} onClick={() => { resetPage(); setCategory(null); }}>All products</FilterRow>
          {categories.map((c) => (
            <FilterRow key={c.id} active={category === c.slug} onClick={() => { resetPage(); setCategory(category === c.slug ? null : c.slug); }}>
              {c.name}
            </FilterRow>
          ))}
        </ul>
      </div>

      {availableColors.length ? (
        <div>
          <h3 className="mb-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Color</h3>
          <div className="flex flex-wrap gap-2">
            {availableColors.map((s) => {
              const on = colors.includes(s.name);
              return (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => toggleColor(s.name)}
                  aria-pressed={on}
                  title={s.name}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    on ? "border-primary bg-brand-soft text-primary" : "border-border bg-background text-muted-foreground hover:border-foreground/30",
                  )}
                >
                  <span className="size-3.5 rounded-full border border-border/70" style={{ backgroundColor: s.hex ?? "transparent" }} />
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div>
        <h3 className="mb-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Price (from $/ea)</h3>
        <div className="flex items-center gap-2">
          <input type="number" min={0} placeholder="Min" value={minPrice}
            onChange={(e) => { resetPage(); setMinPrice(e.target.value); }}
            className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
          <span className="text-muted-foreground">–</span>
          <input type="number" min={0} placeholder="Max" value={maxPrice}
            onChange={(e) => { resetPage(); setMaxPrice(e.target.value); }}
            className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="swag-redesign">
      <PageHero
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Shop", href: activeCategory ? "/shop" : undefined },
          ...(activeCategory ? [{ label: activeCategory.name }] : []),
        ]}
        eyebrow={activeCategory ? "Category" : "The Catalog"}
        title={activeCategory ? activeCategory.name : "Shop the catalog"}
        subtitle={
          activeCategory?.description ??
          "Bulk swag for your whole team — branded with your logo and colors, with volume pricing and free proofs before anything prints."
        }
      >
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs font-medium text-muted-foreground">
          <span>Made-to-order for teams</span>
          <span className="text-border">·</span>
          <span>Minimums apply</span>
          <span className="text-border">·</span>
          <span>Cheaper per unit at higher quantities</span>
        </div>
      </PageHero>

      <div className="mx-auto mt-8 grid max-w-site gap-8 px-6 pb-20 lg:grid-cols-[16rem_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24">{filters}</div>
        </aside>

        <div>
          {/* Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground/40" />
                <input
                  value={search}
                  onChange={(e) => { resetPage(); setSearch(e.target.value); }}
                  placeholder="Search products"
                  className="h-10 w-full rounded-xl border border-input bg-background pr-3 pl-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-72"
                />
              </div>
              <p className="hidden text-sm text-muted-foreground sm:block">
                {filtered.length} {filtered.length === 1 ? "product" : "products"}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <details className="group relative lg:hidden">
                <summary className="flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-lg border border-input bg-background px-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                  <SlidersHorizontal className="size-4" /> Filters
                </summary>
                <div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-border bg-background p-5 shadow-lg">
                  {filters}
                </div>
              </details>
              <select
                value={sort}
                onChange={(e) => { resetPage(); setSort(e.target.value as SortValue); }}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  <div className="aspect-square animate-pulse bg-muted" />
                  <div className="space-y-2 p-4">
                    <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                    <div className="h-5 w-1/4 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : pageItems.length ? (
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {pageItems.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-20 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <PackageOpen className="size-6" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">No swag matches those filters</h2>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">Try clearing a filter or two — the good stuff is in here somewhere.</p>
            </div>
          )}

          {/* Infinite scroll — auto-loads the next batch as you scroll */}
          {hasMore ? (
            <div ref={sentinelRef} className="mt-10 flex items-center justify-center py-6 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <span className="size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
                Loading more…
              </span>
            </div>
          ) : filtered.length > PAGE_SIZE ? (
            <p className="mt-10 text-center text-sm text-muted-foreground">
              You&apos;ve reached the end · {filtered.length} products
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FilterRow({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-sm transition-colors",
          active ? "bg-brand-soft font-semibold text-primary" : "text-foreground hover:bg-muted",
        )}
      >
        {children}
        {active ? <Check className="size-3.5" /> : null}
      </button>
    </li>
  );
}
