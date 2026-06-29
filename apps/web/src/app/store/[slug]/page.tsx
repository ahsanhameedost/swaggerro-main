"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Spinner } from "@heroui/react";
import {
  ArrowRight,
  BadgeCheck,
  PackageOpen,
  Sparkles,
  Truck,
  Star,
} from "lucide-react";
import { usePublicStore } from "@/queries/stores";
import { ProductCard } from "@/components/shop/product-card";

const VALUE_PROPS = [
  { icon: Sparkles, title: "Free proofs", body: "See a digital mockup before anything prints." },
  { icon: Truck, title: "Fast turnaround", body: "Made-to-order and shipped on schedule." },
  { icon: BadgeCheck, title: "Quality guaranteed", body: "Premium blanks and crisp branding." },
  { icon: Star, title: "Volume pricing", body: "The more you order, the lower the unit price." },
];

export default function StorefrontPage() {
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
  const { data, isLoading, isError } = usePublicStore(slug ?? null);
  const store = data?.store;
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [priceMax, setPriceMax] = useState<number | null>(null);

  const productPrice = (p: { floorPrice?: number | null; basePrice?: number | null; lowestPrice?: number | null }) =>
    p.floorPrice ?? p.basePrice ?? p.lowestPrice ?? 0;

  const categories = useMemo(() => {
    if (!store) return [];
    const set = new Set<string>();
    store.products.forEach((p) => p.category?.name && set.add(p.category.name));
    return Array.from(set);
  }, [store]);

  const colors = useMemo(() => {
    if (!store) return [] as { name: string; hex: string | null }[];
    const map = new Map<string, string | null>();
    store.products.forEach((p) =>
      (p.swatches ?? []).forEach((s) => {
        if (s.name && !map.has(s.name)) map.set(s.name, s.hex ?? null);
      })
    );
    return Array.from(map, ([name, hex]) => ({ name, hex }));
  }, [store]);

  const priceCeiling = useMemo(() => {
    if (!store || !store.products.length) return 0;
    return Math.ceil(Math.max(...store.products.map((p) => productPrice(p))));
  }, [store]);

  const visibleProducts = useMemo(() => {
    if (!store) return [];
    return store.products.filter((p) => {
      if (activeCategory !== "All" && p.category?.name !== activeCategory) return false;
      if (selectedColors.length && !(p.swatches ?? []).some((s) => selectedColors.includes(s.name))) return false;
      if (priceMax != null && productPrice(p) > priceMax) return false;
      return true;
    });
  }, [store, activeCategory, selectedColors, priceMax]);

  const toggleColor = (name: string) =>
    setSelectedColors((c) => (c.includes(name) ? c.filter((x) => x !== name) : [...c, name]));
  const clearFilters = () => {
    setActiveCategory("All");
    setSelectedColors([]);
    setPriceMax(null);
  };
  const filtersActive = activeCategory !== "All" || selectedColors.length > 0 || priceMax != null;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Loading store…" />
      </div>
    );
  }

  if (isError || !store) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <PackageOpen className="size-10 text-muted-foreground" />
        <h1 className="font-display text-2xl font-bold">Store not found</h1>
        <Link href="/" className="text-sm font-medium text-primary hover:underline">
          Go to Swaggeroo
        </Link>
      </div>
    );
  }

  // Inject the tenant theme — children read these CSS vars so the whole store
  // re-skins to the brand without per-component overrides.
  const themeVars = {
    "--primary": store.theme.primary,
    "--brand": store.theme.primary,
    "--ring": store.theme.primary,
    "--brand-soft": store.theme.primarySoft,
    "--accent": store.theme.primarySoft,
    "--primary-foreground": store.theme.primaryForeground,
    "--brand-foreground": store.theme.primaryForeground,
    "--accent-foreground": store.theme.primary,
    "--brand-emphasis": store.theme.primary,
  } as React.CSSProperties;

  return (
    <div style={themeVars} className="swag-redesign flex min-h-screen flex-col bg-background">
      {/* White-label header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-site items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-3">
            {store.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={store.logoUrl} alt={store.name} className="h-10 w-auto max-w-[180px] object-contain" />
            ) : (
              <span className="text-xl font-bold tracking-tight text-foreground">{store.name}</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <a href="#products" className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline">
              Shop
            </a>
            <Link
              href="/"
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Powered by <span className="font-semibold text-primary">Swaggeroo</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--primary) 14%, transparent), transparent 55%), radial-gradient(70% 90% at 85% -10%, var(--brand-soft), transparent)",
            }}
          />
          <div className="mx-auto grid max-w-site items-center gap-10 px-6 py-16 sm:py-24 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary shadow-sm">
                <Sparkles className="size-3.5" /> {store.companyName ?? store.name}
              </span>
              <h1 className="mt-5 max-w-2xl font-display text-4xl font-bold leading-[1.05] tracking-[-0.03em] text-balance text-foreground sm:text-5xl lg:text-6xl">
                {store.heroHeadline ?? `Official ${store.name} swag`}
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
                {store.heroSubcopy ?? "Premium branded merch, made to order. Pick your gear, add your logo, and we handle the rest."}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href="#products"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-brand transition hover:opacity-90"
                >
                  Shop the collection <ArrowRight className="size-4" />
                </a>
                <span className="text-sm text-muted-foreground">
                  {store.products.length} product{store.products.length === 1 ? "" : "s"} available
                </span>
              </div>
            </div>

            {/* Hero product collage */}
            {store.products.length ? (
              <div className="relative hidden lg:block">
                <div className="grid grid-cols-2 gap-4">
                  {store.products.slice(0, 4).map((p, i) => (
                    <div
                      key={p.id}
                      className={`overflow-hidden rounded-3xl border border-border bg-card shadow-sm ${
                        i % 2 === 1 ? "translate-y-6" : ""
                      }`}
                    >
                      <div className="aspect-square bg-muted">
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground">
                            {p.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {/* Value props */}
        <section className="border-y border-border/60 bg-card/50">
          <div className="mx-auto grid max-w-site grid-cols-2 gap-6 px-6 py-8 lg:grid-cols-4">
            {VALUE_PROPS.map((v) => (
              <div key={v.title} className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-primary">
                  <v.icon className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{v.title}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{v.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Products — shop-style layout with a left filter sidebar */}
        <section id="products" className="mx-auto max-w-site px-6 py-14 scroll-mt-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight">Shop the collection</h2>
              <p className="mt-1 text-muted-foreground">Curated gear from {store.companyName ?? store.name}.</p>
            </div>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[15rem_1fr]">
            {/* Left filters */}
            <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-bold uppercase tracking-wide text-foreground">Filters</h3>
                {filtersActive ? (
                  <button onClick={clearFilters} className="text-xs font-medium text-primary hover:underline">
                    Clear
                  </button>
                ) : null}
              </div>

              {/* Category */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</p>
                <div className="mt-2 space-y-1">
                  {["All", ...categories].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm transition ${
                        activeCategory === cat
                          ? "bg-brand-soft font-medium text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Colors */}
              {colors.length ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Color</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {colors.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        title={c.name}
                        onClick={() => toggleColor(c.name)}
                        className={`size-7 rounded-full border-2 transition ${
                          selectedColors.includes(c.name) ? "border-primary ring-2 ring-primary/30" : "border-border"
                        }`}
                        style={{ backgroundColor: c.hex ?? "#ddd" }}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Price */}
              {priceCeiling > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Max price{priceMax != null ? `: $${priceMax}` : ""}
                  </p>
                  <input
                    type="range"
                    min={0}
                    max={priceCeiling}
                    value={priceMax ?? priceCeiling}
                    onChange={(e) => setPriceMax(Number(e.target.value))}
                    className="mt-3 w-full accent-[var(--primary)]"
                  />
                  <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                    <span>$0</span>
                    <span>${priceCeiling}</span>
                  </div>
                </div>
              ) : null}
            </aside>

            {/* Product grid */}
            <div>
              <p className="mb-4 text-sm text-muted-foreground">
                {visibleProducts.length} product{visibleProducts.length === 1 ? "" : "s"}
              </p>
              {visibleProducts.length ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      branding={product.branding}
                      storeSlug={store.slug}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
                  <PackageOpen className="size-6 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    {store.products.length ? "No products match these filters." : "This store hasn't added any products yet."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* CTA band */}
        <section className="mx-auto max-w-site px-6 pb-16">
          <div
            className="overflow-hidden rounded-3xl px-8 py-12 text-center sm:px-12"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            <h3 className="font-display text-2xl font-bold sm:text-3xl">Need it for your whole team?</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm opacity-90">
              Order in bulk for the best per-unit pricing, or grab a single piece — your call.
            </p>
            <a
              href="#products"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white/15 px-6 py-3 text-base font-semibold backdrop-blur transition hover:bg-white/25"
            >
              Start shopping <ArrowRight className="size-4" />
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 bg-muted/40">
        <div className="mx-auto flex max-w-site flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <span>
            © {new Date().getFullYear()} {store.companyName ?? store.name}. All rights reserved.
          </span>
          <Link href="/become-a-seller" className="font-medium hover:text-foreground">
            Want your own branded store? →
          </Link>
        </div>
      </footer>
    </div>
  );
}
