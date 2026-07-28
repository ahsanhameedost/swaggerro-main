"use client";

import { Fragment, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  PackageOpen,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { usePublicCategories, usePublicProducts } from "@/lib/queries.catalog";
import { usePublicSettings } from "@/queries/settings";
import { ProductCard } from "@/components/shop/product-card";
import { PageHero } from "@/components/marketing/page-hero";
import { cn } from "@/lib/utils";
import type { CatalogProductListItem } from "@/modules/catalog/products/types";

const DEFAULT_PAGE_SIZE = 12;
// Catalog is small — fetch this many in one shot and filter/sort/paginate
// client-side. Comfortably covers catalog growth well past today's ~40
// products; the server caps this query at 300 (see public.dto.ts).
const FETCH_ALL_SIZE = 300;

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
  const { data, isLoading } = usePublicProducts({ page: 1, pageSize: FETCH_ALL_SIZE });
  const { data: categories = [] } = usePublicCategories();
  const { data: publicSettings } = usePublicSettings();
  const allProducts = useMemo(() => data?.items ?? [], [data]);
  // Admin-configurable in Platform Settings ("Shop products per page").
  const pageSize = Number(publicSettings?.settings.shop_products_per_page) || DEFAULT_PAGE_SIZE;

  const [search, setSearch] = useState("");
  // Seed the search box from a `?q=` param (e.g. the home page's catalog search
  // submits here) so arriving with a query actually filters. Read after mount to
  // avoid an SSR/hydration mismatch.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setSearch(q);
  }, []);
  const [category, setCategory] = useState<string | null>(null);
  const [subCategory, setSubCategory] = useState<string | null>(null);
  const [colors, setColors] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [shipTime, setShipTime] = useState<"" | "fast" | "standard" | "extended">("");
  const [sort, setSort] = useState<SortValue>("featured");
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search);

  // distinct color swatches across the catalog
  const availableColors = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const p of allProducts) for (const s of p.swatches ?? []) if (!map.has(s.name)) map.set(s.name, s.hex);
    return [...map.entries()].map(([name, hex]) => ({ name, hex }));
  }, [allProducts]);

  // distinct brands across the catalog
  const availableBrands = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of allProducts) if (p.brand && !map.has(p.brand.slug ?? p.brand.name)) map.set(p.brand.slug ?? p.brand.name, p.brand.name);
    return [...map.entries()].map(([slug, name]) => ({ slug, name }));
  }, [allProducts]);

  // sub-categories of the selected top-level category, derived from the products
  // themselves so the list only ever shows sub-categories that actually have stock.
  const availableSubCategories = useMemo(() => {
    if (!category) return [];
    const map = new Map<string, string>();
    for (const p of allProducts) {
      if (p.category?.slug !== category || !p.subCategory) continue;
      const slug = p.subCategory.slug ?? p.subCategory.name;
      if (!map.has(slug)) map.set(slug, p.subCategory.name);
    }
    return [...map.entries()].map(([slug, name]) => ({ slug, name }));
  }, [allProducts, category]);

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;
    let list = allProducts.filter((p) => {
      if (category && p.category?.slug !== category) return false;
      if (subCategory && p.subCategory?.slug !== subCategory) return false;
      if (colors.length && !(p.swatches ?? []).some((s) => colors.includes(s.name))) return false;
      if (brands.length && !(p.brand && brands.includes(p.brand.slug ?? p.brand.name))) return false;
      const price = fromPrice(p);
      if (min != null && price < min) return false;
      if (max != null && price > max) return false;
      if (shipTime) {
        const lt = p.leadTimeDays;
        if (lt == null) return false;
        if (shipTime === "fast" && lt > 7) return false;
        if (shipTime === "standard" && (lt <= 7 || lt > 14)) return false;
        if (shipTime === "extended" && lt <= 14) return false;
      }
      if (q && !`${p.name} ${p.shortDescription ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const byPrice = (a: CatalogProductListItem, b: CatalogProductListItem) => fromPrice(a) - fromPrice(b);
    if (sort === "price-asc") list = [...list].sort(byPrice);
    else if (sort === "price-desc") list = [...list].sort((a, b) => byPrice(b, a));
    else if (sort === "moq-asc") list = [...list].sort((a, b) => a.minQty - b.minQty);
    else if (sort === "newest") list = [...list].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    return list;
  }, [allProducts, category, subCategory, colors, brands, minPrice, maxPrice, shipTime, deferredSearch, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // scroll back to the top of the grid on page change so the new results are
  // visible — skip on first mount so arriving at the page doesn't jump you.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    document.getElementById("shop-results-top")?.scrollIntoView({ block: "start" });
  }, [currentPage]);

  // reset to page 1 when filters/search/sort change
  const resetPage = () => setPage(1);
  const toggleColor = (name: string) => {
    resetPage();
    setColors((cur) => (cur.includes(name) ? cur.filter((c) => c !== name) : [...cur, name]));
  };
  const toggleBrand = (slug: string) => {
    resetPage();
    setBrands((cur) => (cur.includes(slug) ? cur.filter((b) => b !== slug) : [...cur, slug]));
  };
  const selectCategory = (slug: string | null) => {
    resetPage();
    setCategory(slug);
    setSubCategory(null);
  };
  const clearAll = () => {
    setCategory(null); setSubCategory(null); setColors([]); setBrands([]); setMinPrice(""); setMaxPrice(""); setShipTime(""); setPage(1);
  };
  const hasActive = category || subCategory || colors.length || brands.length || minPrice || maxPrice || shipTime;

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
          <FilterRow active={!category} onClick={() => selectCategory(null)}>All products</FilterRow>
          {categories.map((c) => (
            <Fragment key={c.id}>
              <FilterRow active={category === c.slug} onClick={() => selectCategory(category === c.slug ? null : c.slug)}>
                {c.name}
              </FilterRow>
              {category === c.slug && availableSubCategories.length ? (
                <li>
                  <ul className="mt-0.5 ml-3 space-y-0.5 border-l border-border pl-2.5">
                    {availableSubCategories.map((sc) => (
                      <FilterRow
                        key={sc.slug}
                        active={subCategory === sc.slug}
                        onClick={() => { resetPage(); setSubCategory(subCategory === sc.slug ? null : sc.slug); }}
                      >
                        {sc.name}
                      </FilterRow>
                    ))}
                  </ul>
                </li>
              ) : null}
            </Fragment>
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

      {availableBrands.length ? (
        <div>
          <h3 className="mb-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Brand</h3>
          <div className="flex flex-wrap gap-2">
            {availableBrands.map((b) => {
              const on = brands.includes(b.slug);
              return (
                <button
                  key={b.slug}
                  type="button"
                  onClick={() => toggleBrand(b.slug)}
                  aria-pressed={on}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    on ? "border-primary bg-brand-soft text-primary" : "border-border bg-background text-muted-foreground hover:border-foreground/30",
                  )}
                >
                  {b.name}
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

      <div>
        <h3 className="mb-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Shipping time</h3>
        <div className="flex flex-col gap-1.5">
          {[
            { value: "", label: "Any" },
            { value: "fast", label: "Ships in ~1 week" },
            { value: "standard", label: "1–2 weeks" },
            { value: "extended", label: "3+ weeks" },
          ].map((opt) => (
            <button
              key={opt.value || "any"}
              type="button"
              onClick={() => { resetPage(); setShipTime(opt.value as typeof shipTime); }}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition",
                shipTime === opt.value ? "bg-brand-soft font-medium text-primary" : "text-foreground hover:bg-muted",
              )}
            >
              <span className={cn("size-2 rounded-full", shipTime === opt.value ? "bg-primary" : "bg-default-300")} />
              {opt.label}
            </button>
          ))}
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
          {/* max-h + overflow-y-auto: with enough colors/brands the filter list can
              exceed the viewport — without this, the sticky box pins in place and
              anything below the fold (Price, Shipping time) is unreachable until
              the page scrolls past the whole product grid. */}
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-1">{filters}</div>
        </aside>

        <div>
          {/* Toolbar */}
          <div id="shop-results-top" className="flex scroll-mt-24 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

          {totalPages > 1 ? (
            <ShopPagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ShopPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  // Windowed page numbers: first, last, and a small run around the current
  // page, with "…" filling any gaps — keeps the control compact however many
  // pages the catalog grows to.
  const pages = useMemo(() => {
    const spread = 1;
    const items: (number | "ellipsis")[] = [];
    let lastShown = 0;
    for (let n = 1; n <= totalPages; n++) {
      if (n === 1 || n === totalPages || Math.abs(n - page) <= spread) {
        if (lastShown && n - lastShown > 1) items.push("ellipsis");
        items.push(n);
        lastShown = n;
      }
    }
    return items;
  }, [page, totalPages]);

  const buttonClass = (active: boolean) =>
    cn(
      "flex h-9 min-w-9 items-center justify-center rounded-lg border px-2.5 text-sm font-medium transition-colors",
      active
        ? "border-primary bg-brand-soft text-primary"
        : "border-input bg-background text-foreground hover:border-foreground/30",
    );

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1.5">
      <button
        type="button"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className={cn(buttonClass(false), "disabled:pointer-events-none disabled:opacity-40")}
      >
        <ChevronLeft className="size-4" />
      </button>

      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span key={`e-${i}`} className="px-1 text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-current={p === page ? "page" : undefined}
            onClick={() => onPageChange(p)}
            className={buttonClass(p === page)}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        aria-label="Next page"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className={cn(buttonClass(false), "disabled:pointer-events-none disabled:opacity-40")}
      >
        <ChevronRight className="size-4" />
      </button>
    </nav>
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
