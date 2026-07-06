"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Spinner } from "@heroui/react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Layers,
  PackageOpen,
  Play,
  Sparkles,
  Star,
  TrendingDown,
  Truck,
} from "lucide-react";
import { usePublicStore } from "@/queries/stores";
import { useMe } from "@/queries/auth";
import { logout as logoutRequest } from "@/modules/auth/api";
import { ProductCard } from "@/components/shop/product-card";
import CurvedLoop from "@/components/reactbits/CurvedLoop";
import { CtaBand } from "@/components/marketing/cta-band";
import { StoreBrandHeader, StoreBrandFooter } from "@/app/components/stores/StoreChrome";
// Home-style curved hero rail (.hero-arch / .hero-arch-card).
import "@/components/landing/hero-carousel.css";

const PAGE_SIZE = 12;

const VALUE_PROPS = [
  { icon: Sparkles, title: "Free proofs", body: "See a digital mockup before anything prints." },
  { icon: Truck, title: "Fast turnaround", body: "Made-to-order and shipped on schedule." },
  { icon: BadgeCheck, title: "Quality guaranteed", body: "Premium blanks and crisp branding." },
  { icon: Star, title: "Volume pricing", body: "The more you order, the lower the unit price." },
];

const productPrice = (p: {
  floorPrice?: number | null;
  basePrice?: number | null;
  lowestPrice?: number | null;
  customPrice?: number | null;
}) => (p.customPrice != null && p.customPrice > 0 ? p.customPrice : p.floorPrice ?? p.basePrice ?? p.lowestPrice ?? 0);

// Per-product seller logo overlay (composited on view, like ProductCard).
type ProductBranding = {
  logoUrl: string | null;
  placement: { x: number; y: number; size: number; rotation: number; opacity: number } | null;
} | null;

// Renders the seller's logo over a product image using its saved placement.
function LogoOverlay({ branding }: { branding?: ProductBranding }) {
  if (!branding?.logoUrl || !branding.placement) return null;
  const pl = branding.placement;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={branding.logoUrl}
      alt=""
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        left: `${pl.x}%`,
        top: `${pl.y}%`,
        width: `${pl.size}%`,
        transform: `translate(-50%,-50%) rotate(${pl.rotation}deg)`,
        opacity: pl.opacity / 100,
      }}
    />
  );
}

export default function StorefrontPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
  const { data, isLoading, isError } = usePublicStore(slug ?? null);
  const store = data?.store;
  const { data: me } = useMe();

  const [search, setSearch] = useState("");
  // Seed the grid filter from a `?q=` param (the header's predictive search sends
  // "search in all products" here). Read after mount to avoid a hydration mismatch.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setSearch(q);
  }, []);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [priceMax, setPriceMax] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Seed the category filter from a `?category=` param (the mega menu links here).
  useEffect(() => {
    const category = new URLSearchParams(window.location.search).get("category");
    if (category) setActiveCategory(category);
  }, []);

  const categories = useMemo(() => {
    if (!store) return [];
    const set = new Set<string>();
    store.products.forEach((p) => p.category?.name && set.add(p.category.name));
    return Array.from(set);
  }, [store]);

  // A representative card per category (first product's image + a count) for the
  // "Shop the Catalog" section.
  const categoryCards = useMemo(() => {
    if (!store)
      return [] as { name: string; imageUrl: string | null; count: number; branding: ProductBranding }[];
    return categories.map((name) => {
      const inCat = store.products.filter((p) => p.category?.name === name);
      const rep = inCat.find((p) => p.imageUrl);
      return {
        name,
        imageUrl: rep?.imageUrl ?? null,
        count: inCat.length,
        branding: (rep?.branding ?? null) as ProductBranding,
      };
    });
  }, [store, categories]);

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
    const q = search.trim().toLowerCase();
    return store.products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (activeCategory !== "All" && p.category?.name !== activeCategory) return false;
      if (selectedColors.length && !(p.swatches ?? []).some((s) => selectedColors.includes(s.name))) return false;
      if (priceMax != null && productPrice(p) > priceMax) return false;
      return true;
    });
  }, [store, search, activeCategory, selectedColors, priceMax]);

  // infinite scroll — show 12, then auto-load the next 12 as the sentinel scrolls into view
  const shownProducts = visibleProducts.slice(0, visibleCount);
  const hasMore = visibleCount < visibleProducts.length;
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // reset to the first batch whenever the filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, activeCategory, selectedColors, priceMax]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, visibleProducts.length));
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, visibleProducts.length]);

  const toggleColor = (name: string) =>
    setSelectedColors((c) => (c.includes(name) ? c.filter((x) => x !== name) : [...c, name]));
  const clearFilters = () => {
    setActiveCategory("All");
    setSelectedColors([]);
    setPriceMax(null);
    setSearch("");
  };
  const filtersActive = activeCategory !== "All" || selectedColors.length > 0 || priceMax != null || !!search.trim();

  const selectCategory = (name: string) => {
    setActiveCategory(name);
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } catch {
      // ignore
    }
    await queryClient.invalidateQueries({ queryKey: ["me"] });
    router.push("/login");
    router.refresh();
  };

  // Swap the browser-tab favicon to the seller's, restoring it on unmount.
  useEffect(() => {
    const url = store?.faviconUrl;
    if (!url) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    const created = !link;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    const prev = link.getAttribute("href");
    link.setAttribute("href", url);
    return () => {
      if (created) link?.remove();
      else if (prev) link?.setAttribute("href", prev);
    };
  }, [store?.faviconUrl]);

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
    // The seller's Accent color drives light-section backgrounds + soft tints.
    "--brand-soft": store.theme.accent,
    "--accent": store.theme.accent,
    "--secondary": store.theme.secondary,
    "--primary-foreground": store.theme.primaryForeground,
    "--brand-foreground": store.theme.primaryForeground,
    "--accent-foreground": store.theme.primary,
    "--brand-emphasis": store.theme.primary,
  } as React.CSSProperties;

  return (
    <div style={themeVars} className="swag-redesign flex min-h-screen flex-col bg-background">
      {/* ── Shared seller-branded header (logo, predictive search, cart, logout) ── */}
      <StoreBrandHeader
        store={store}
        products={store.products}
        authed={!!me}
        onLogout={handleLogout}
        logoScale={store.logoScale}
      />

      <main className="flex-1">
        {/* ── Hero product slider ── */}
        <HeroSlider store={store} />

        {/* ── Curved marquee ── */}
        <div className="relative -mt-2 select-none text-primary/15">
          <CurvedLoop
            marqueeText={`${store.companyName ?? store.name} ✦ Custom Swag ✦ Free Proofs ✦ Ships Fast ✦`}
            speed={1.1}
            curveAmount={70}
            interactive
            className="text-[3rem]"
          />
        </div>

        {/* ── Value props ── */}
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

        {/* ── Shop the Catalog (categories) — home-style banner cards on a shaded backdrop ── */}
        {categoryCards.length ? (
          <section className="relative overflow-hidden border-y border-border/60 py-16 sm:py-20">
            {/* home-style shaded gradient backdrop */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10"
              style={{
                background:
                  "linear-gradient(120deg, color-mix(in srgb, var(--brand-soft) 55%, white), white 45%, #fdf7ec)",
              }}
            />
            <div className="mx-auto max-w-site px-6">
              <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                    <Layers className="size-4" /> Shop the catalog
                  </span>
                  <h2 className="mt-2 font-display text-3xl font-bold tracking-tight">Browse by category</h2>
                </div>
                <button
                  onClick={() => selectCategory("All")}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  View all <ArrowRight className="size-4" />
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {categoryCards.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => selectCategory(c.name)}
                    className="group relative flex min-h-48 overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:min-h-52"
                  >
                    {/* product photo bleeding in from the right, with the seller logo composited on */}
                    <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-3/5">
                      {c.imageUrl ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={c.imageUrl} alt="" className="h-full w-full object-cover object-center" />
                          <LogoOverlay branding={c.branding} />
                        </>
                      ) : null}
                      <div className="absolute inset-0 bg-gradient-to-r from-card via-card/50 via-[30%] to-transparent to-[58%]" />
                    </div>

                    <div className="relative z-10 flex max-w-[64%] flex-col justify-center p-6 sm:p-7">
                      <h3 className="font-display text-2xl font-bold tracking-tight text-foreground uppercase">
                        {c.name}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {c.count} product{c.count === 1 ? "" : "s"}
                      </p>
                      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                        Shop <ArrowRight className="size-4" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* ── Products — shop-style layout with a left filter sidebar ── */}
        <section id="products" className="mx-auto max-w-site px-6 py-6 scroll-mt-20">
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
                {search.trim() ? ` matching “${search.trim()}”` : ""}
              </p>
              {visibleProducts.length ? (
                <>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {shownProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        branding={product.branding}
                        storeSlug={store.slug}
                      />
                    ))}
                  </div>
                  {hasMore ? (
                    <div ref={sentinelRef} className="mt-10 flex items-center justify-center py-6 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <span className="size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
                        Loading more…
                      </span>
                    </div>
                  ) : visibleProducts.length > PAGE_SIZE ? (
                    <p className="mt-10 text-center text-sm text-muted-foreground">
                      You&apos;ve reached the end · {visibleProducts.length} products
                    </p>
                  ) : null}
                </>
              ) : (
                <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
                  <PackageOpen className="size-6 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    {store.products.length ? "No products match these filters." : "This store hasn't added any products yet."}
                  </p>
                  {filtersActive ? (
                    <button onClick={clearFilters} className="mt-3 text-sm font-medium text-primary hover:underline">
                      Clear filters
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Build a Pack (demo) — shaded band ── */}
        <section className="border-y border-border/60 bg-muted/30 py-14 sm:py-16">
          <div className="mx-auto max-w-site px-6">
          <div className="grid items-center gap-10 rounded-3xl border border-border bg-card p-6 shadow-sm lg:grid-cols-2 lg:p-10">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="size-3.5" /> Build a Pack
              </span>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Bundle it into a branded swag pack
              </h2>
              <p className="mt-4 max-w-lg leading-relaxed text-muted-foreground">
                Mix and match items into a curated kit, add your logo, and send one link — recipients pick
                their sizes and ship to their own address. Watch how it works.
              </p>
              <Link
                href="/studio"
                className="mt-7 inline-flex h-12 items-center gap-2 rounded-xl px-6 text-base font-semibold text-white"
                style={{ backgroundImage: "var(--primary-gradient)", backgroundColor: "var(--primary)" }}
              >
                Start a pack <ArrowRight className="size-4" />
              </Link>
            </div>

            {/* Placeholder demo media — swap this block for a real <video>/gif. */}
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-dashed border-border bg-muted">
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(60% 60% at 50% 40%, color-mix(in srgb, var(--primary) 18%, transparent), transparent)",
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
                <span className="flex size-16 items-center justify-center rounded-full bg-card/90 text-primary shadow-lg ring-1 ring-border">
                  <Play className="size-7 translate-x-0.5" fill="currentColor" />
                </span>
                <p className="text-sm font-medium text-muted-foreground">Demo video coming soon</p>
                <p className="text-xs text-muted-foreground/70">Drop your Build-a-Pack clip here</p>
              </div>
            </div>
          </div>
          </div>
        </section>

        {/* ── CTA band — seller-editable, falls back to the default copy ── */}
        {store.cta?.title ? (
          <CtaBand
            title={store.cta.title}
            subtitle={store.cta.subtitle ?? undefined}
            primary={{
              label: store.cta.primaryLabel || "Shop the collection",
              href: store.cta.primaryHref || `/store/${store.slug}`,
            }}
            secondary={
              store.cta.secondaryLabel
                ? { label: store.cta.secondaryLabel, href: store.cta.secondaryHref || "/studio" }
                : null
            }
            benefits={
              store.cta.points.length ? store.cta.points.map((p) => ({ icon: Check, title: p })) : undefined
            }
          />
        ) : (
          <CtaBand />
        )}
      </main>

      {/* ── Shared seller-branded footer ── */}
      <StoreBrandFooter store={store} categories={categories} onSelectCategory={selectCategory} logoScale={store.logoScale} footerColor={store.theme.footer} />
    </div>
  );
}

// ── Hero (home-style) ───────────────────────────────────────────────────────
// Centered headline + auto-scrolling product rail + CTAs + trust bullets,
// mirroring the marketing home page's hero, themed to the store.
function HeroSlider({ store }: { store: NonNullable<ReturnType<typeof usePublicStore>["data"]>["store"] }) {
  const productCount = store.products.length;

  return (
    <section className="relative overflow-hidden">
      {/* dotted ambient backdrop (fades out toward the bottom) — same as home */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(currentColor_1px,transparent_1px)] [background-size:22px_22px] text-border/55 [mask-image:linear-gradient(to_bottom,black,transparent_88%)]"
      />

      <div className="mx-auto max-w-site px-6 pt-12 text-center sm:pt-16">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary shadow-sm">
          <Sparkles className="size-3.5" /> {store.companyName ?? store.name}
        </span>
        <h1 className="mx-auto mt-5 max-w-4xl font-display text-[2.75rem] font-bold leading-[0.98] tracking-[-0.035em] text-balance text-foreground sm:text-6xl lg:text-7xl">
          {store.heroHeadline ?? (
            <>
              Swag your team will <span className="text-primary">actually wear</span>.
            </>
          )}
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
          {store.heroSubcopy ??
            "Premium branded merch, made to order. Pick your gear, add your logo, and we handle the rest."}
        </p>
      </div>

      {/* Curved auto-scrolling product rail (home-style arch) */}
      <div className="mt-10 w-full sm:mt-12">
        <StoreHeroRail slug={store.slug} products={store.products} />
      </div>

      <div className="mx-auto max-w-site px-6 pt-2 pb-14 text-center">
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:mt-8 sm:flex-row">
          <a
            href="#products"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-7 text-base font-semibold text-primary-foreground shadow-brand transition hover:opacity-90"
          >
            Shop the collection <ArrowRight className="size-4" />
          </a>
          <Link
            href="/studio"
            className="inline-flex h-12 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-6 text-base font-medium transition-all hover:bg-muted hover:text-foreground"
          >
            Build a pack
          </Link>
        </div>
        <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <Check className="size-4 text-primary" /> Free proof before print
          </li>
          <li className="flex items-center gap-1.5">
            <TrendingDown className="size-4 text-primary" /> Volume pricing
          </li>
          <li className="flex items-center gap-1.5">
            <Truck className="size-4 text-primary" /> {productCount} product{productCount === 1 ? "" : "s"} available
          </li>
        </ul>
      </div>
    </section>
  );
}

// ── Curved hero rail (home-style arch) ───────────────────────────────────────
// Full-width product rail that loops along a gentle arch — each card's vertical
// offset + tilt is a function of its live screen position, so the arch stays
// fixed while products glide through it. Mirrors the marketing HeroCarousel,
// fed with the store's own products. Pauses on hover; respects reduced-motion.
function StoreHeroRail({
  slug,
  products,
}: {
  slug: string;
  products: {
    id: string;
    slug: string;
    name: string;
    imageUrl: string | null;
    branding?: ProductBranding;
  }[];
}) {
  const base = useMemo(() => products.filter((p) => p.imageUrl).slice(0, 12), [products]);
  // Repeat the set so the rail always over-fills the widest viewport (seamless,
  // full-width loop) even when a store has only a handful of products.
  const tiles = useMemo(() => {
    if (!base.length) return [] as typeof base;
    const repeats = Math.max(3, Math.ceil(15 / base.length));
    return Array.from({ length: repeats }, () => base).flat();
  }, [base]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const hover = useRef(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !tiles.length) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const n = tiles.length;

    let W = 0;
    let cardW = 200;
    let step = 224;
    let L = n * step;
    let depth = 80;
    let tilt = 14;
    let cx = 0;
    const PAD = 14;
    const SPEED = 60; // px / second

    const recalc = () => {
      W = wrap.clientWidth || wrap.getBoundingClientRect().width || window.innerWidth || 1;
      cardW = W < 640 ? 152 : W < 1024 ? 190 : 220;
      const gap = 24;
      step = cardW + gap;
      L = n * step;
      depth = W < 640 ? 46 : W < 1024 ? 66 : 86;
      tilt = W < 640 ? 11 : 14;
      cx = W / 2;
      wrap.style.setProperty("--card-w", `${cardW}px`);
      wrap.style.height = `${PAD + cardW + depth + 10}px`;
    };

    const place = (offset: number) => {
      const half = W * 0.55;
      const start = cardW + 48;
      for (let i = 0; i < n; i++) {
        const el = cardRefs.current[i];
        if (!el) continue;
        const x = ((((i * step - offset + start) % L) + L) % L) - start;
        const center = x + cardW / 2;
        const tc = Math.max(-1, Math.min(1, (center - cx) / half));
        const y = PAD + depth * tc * tc; // ∩ arch — apex centered, edges dip
        const rot = tilt * tc;
        el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rot}deg)`;
      }
    };

    let offset = 0;
    recalc();
    place(offset);
    wrap.style.opacity = "1";

    const ro = new ResizeObserver(() => {
      recalc();
      place(offset);
    });
    ro.observe(wrap);

    let raf = 0;
    let last = performance.now();
    const frame = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (!hover.current && !reduce) offset = (offset + SPEED * dt) % L;
      place(offset);
      raf = requestAnimationFrame(frame);
    };
    if (!reduce) raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [tiles]);

  if (!tiles.length) return null;

  return (
    <div
      ref={wrapRef}
      className="hero-arch group/rail relative min-h-[230px] w-full overflow-hidden opacity-0 transition-opacity duration-500 sm:min-h-[290px] lg:min-h-[330px]"
      onMouseEnter={() => (hover.current = true)}
      onMouseLeave={() => (hover.current = false)}
    >
      {tiles.map((p, i) => (
        <Link
          key={`${p.id}-${i}`}
          ref={(el) => {
            cardRefs.current[i] = el;
          }}
          href={`/store/${slug}/${p.slug}`}
          aria-label={p.name}
          aria-hidden={i >= base.length}
          tabIndex={i >= base.length ? -1 : undefined}
          className="hero-arch-card group/card"
        >
          <div className="overflow-hidden rounded-3xl border-2 border-white bg-card shadow-[0_18px_40px_-16px_rgba(13,27,61,0.35)] ring-1 ring-black/5 transition-transform duration-300 ease-out group-hover/card:-translate-y-1.5">
            <div className="relative aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.imageUrl!} alt={p.name} className="absolute inset-0 size-full object-cover" />
              <LogoOverlay branding={p.branding} />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
