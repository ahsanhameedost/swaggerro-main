"use client";

import { useRef, type CSSProperties, type MouseEvent } from "react";
import Link from "next/link";
import { ArrowUpRight, LogOut, ShoppingBag } from "lucide-react";
import { PredictiveSearch, type SearchProduct } from "@/app/components/search/PredictiveSearch";
import { StoreMegaMenu } from "@/app/components/stores/StoreMegaMenu";
import { cn } from "@/lib/utils";

// Structural shape of a store product for the header search — accepts whatever
// the store pages already have loaded without coupling to the full type.
type StoreSearchProduct = {
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

// The minimal white-label store identity the chrome needs. Kept structural (not
// tied to the full Store type) so both public store pages and checkout can pass
// whatever they already have loaded.
export type StoreChromeInfo = {
  slug: string;
  name: string;
  companyName?: string | null;
  logoUrl?: string | null;
  heroSubcopy?: string | null;
};

// Shared white-label header used across a store's product and checkout pages so
// the chrome stays consistent. The rich storefront homepage header (search,
// logout) is handled separately.
export function StoreHeader({
  store,
  cartHref,
}: {
  store: StoreChromeInfo;
  cartHref?: string;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-site items-center justify-between gap-4 px-6">
        <Link href={`/store/${store.slug}`} className="flex items-center gap-3">
          {store.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.logoUrl} alt={store.name} className="h-10 w-auto max-w-[180px] object-contain" />
          ) : (
            <span className="text-xl font-bold tracking-tight text-foreground">{store.name}</span>
          )}
        </Link>
        <div className="flex items-center gap-4">
          {cartHref ? (
            <Link
              href={cartHref}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ShoppingBag className="size-4" /> Cart
            </Link>
          ) : null}
          <Link
            href="/"
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Powered by <span className="font-semibold text-primary">Swaggeroo</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

// Rich, seller-branded header shared across all store pages (storefront, single
// product, checkout) so the chrome is identical everywhere: logo, a predictive
// product search, cart, "Powered by Swaggeroo", and an optional log-out.
export function StoreBrandHeader({
  store,
  products = [],
  authed = false,
  onLogout,
  logoScale = 100,
}: {
  store: StoreChromeInfo;
  products?: StoreSearchProduct[];
  authed?: boolean;
  onLogout?: () => void;
  logoScale?: number;
}) {
  const searchProducts: SearchProduct[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    imageUrl: p.imageUrl ?? null,
    categoryName: p.category?.name ?? null,
    price:
      p.customPrice && p.customPrice > 0
        ? p.customPrice
        : p.floorPrice ?? p.basePrice ?? p.lowestPrice ?? null,
    currency: p.currency ?? "USD",
  }));

  const searchEl = searchProducts.length ? (
    <PredictiveSearch
      products={searchProducts}
      productHref={(p) => `/store/${store.slug}/${p.slug}`}
      allResultsHref={(q) => `/store/${store.slug}?q=${encodeURIComponent(q)}`}
      placeholder={`Search ${store.name}…`}
    />
  ) : null;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="relative mx-auto flex h-16 max-w-site items-center gap-4 px-6">
        <Link href={`/store/${store.slug}`} className="flex shrink-0 items-center gap-3">
          {store.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={store.logoUrl}
              alt={store.name}
              className="w-auto max-w-[260px] object-contain"
              style={{ height: `${(48 * logoScale) / 100}px` }}
            />
          ) : (
            <span className="text-xl font-bold tracking-tight text-foreground">{store.name}</span>
          )}
        </Link>

        {/* Store-scoped mega menu + shop-all — centered via flex (no transform,
            which would trap the fixed mega panel to this nav's box). */}
        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          <StoreMegaMenu store={store} products={products} label="Kits" />
          <Link
            href={`/store/${store.slug}`}
            className="rounded-full px-3 py-1.5 text-sm font-medium text-foreground/75 transition-colors hover:text-primary"
          >
            Shop all
          </Link>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          {/* search sits next to the cart, not centered */}
          {searchEl ? <div className="hidden w-56 md:block lg:w-72">{searchEl}</div> : null}
          <Link
            href={`/store/${store.slug}/checkout`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ShoppingBag className="size-4" /> <span className="hidden sm:inline">Cart</span>
          </Link>
          {authed && onLogout ? (
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
            >
              <LogOut className="size-3.5" /> <span className="hidden sm:inline">Log out</span>
            </button>
          ) : null}
        </div>
      </div>

      {searchEl ? <div className="border-t border-border/60 px-6 py-2.5 md:hidden">{searchEl}</div> : null}
    </header>
  );
}

export function StoreFooter({ store }: { store: StoreChromeInfo }) {
  return (
    <footer className="border-t border-border/60 bg-muted/40">
      <div className="mx-auto flex max-w-site flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
        <span>
          © {new Date().getFullYear()} {store.companyName ?? store.name}. All rights reserved.
        </span>
        <span className="inline-flex items-center gap-3">
          <Link href={`/store/${store.slug}`} className="font-medium hover:text-foreground">
            Shop
          </Link>
          <Link href="/" className="text-xs hover:text-foreground">
            Powered by <span className="font-semibold text-primary">Swaggeroo</span>
          </Link>
        </span>
      </div>
    </footer>
  );
}

// ── Rich, seller-branded footer (Swaggeroo home-style) ───────────────────────
// Navy footer with ambient glows, link columns, a giant watermark wordmark with
// a cursor spotlight, and credits. Seller branding up top; "Powered by
// Swaggeroo" at the bottom. Shared by the storefront (interactive category
// filters via onSelectCategory) and other store pages (category links).
export function StoreBrandFooter({
  store,
  categories = [],
  onSelectCategory,
  logoScale = 100,
  footerColor = "#0d1b3d",
}: {
  store: StoreChromeInfo;
  categories?: string[];
  onSelectCategory?: (name: string) => void;
  logoScale?: number;
  footerColor?: string;
}) {
  const mark = useRef<HTMLDivElement>(null);
  const wordmark = (store.companyName ?? store.name).toUpperCase();
  const linkClass = "text-sm text-white/70 transition-colors duration-200 hover:text-white";
  const storeHref = `/store/${store.slug}`;

  const onMarkMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = mark.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  // On the storefront these filter in place; elsewhere they link back to the store.
  const catAction = (labelText: string, name: string) =>
    onSelectCategory ? (
      <button onClick={() => onSelectCategory(name)} className={linkClass}>
        {labelText}
      </button>
    ) : (
      <Link href={storeHref} className={linkClass}>
        {labelText}
      </Link>
    );

  return (
    <footer
      className="relative isolate overflow-hidden text-white"
      style={{ backgroundColor: footerColor }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,196,40,0.16),transparent_70%)]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 bottom-10 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(33,150,255,0.18),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-site px-6 pt-20">
        <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            {store.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={store.logoUrl}
                alt={store.name}
                className="w-auto max-w-[260px] object-contain"
                style={{ height: `${(48 * logoScale) / 100}px` }}
              />
            ) : (
              <span className="font-display text-2xl font-bold text-white">{store.name}</span>
            )}
            <p className="mt-5 text-sm leading-relaxed text-white/60">
              {store.heroSubcopy ??
                `Official ${store.companyName ?? store.name} merch — premium branded gear, made to order and shipped fast.`}
            </p>
          </div>

          <nav aria-label="shop">
            <h3 className="text-xs font-medium tracking-[0.2em] text-white/40 lowercase">shop</h3>
            <ul className="mt-4 space-y-3">
              <li>{catAction("All products", "All")}</li>
              <li>
                <Link href="/studio" className={linkClass}>
                  Build a Pack
                </Link>
              </li>
              <li>
                <Link href={`${storeHref}/checkout`} className={linkClass}>
                  Cart
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="categories">
            <h3 className="text-xs font-medium tracking-[0.2em] text-white/40 lowercase">categories</h3>
            <ul className="mt-4 space-y-3">
              {categories.slice(0, 5).map((cat) => (
                <li key={cat}>{catAction(cat, cat)}</li>
              ))}
              {!categories.length ? <li className="text-sm text-white/50">Coming soon</li> : null}
            </ul>
          </nav>

          <nav aria-label="more">
            <h3 className="text-xs font-medium tracking-[0.2em] text-white/40 lowercase">more</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href={storeHref} className={linkClass}>
                  Browse collection
                </Link>
              </li>
              <li>
                <Link href="/" className={cn(linkClass, "group inline-flex items-center gap-1")}>
                  Powered by Swaggeroo
                  <ArrowUpRight className="size-3.5 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <div
        ref={mark}
        aria-hidden
        onMouseMove={onMarkMove}
        style={{ "--mx": "50%", "--my": "50%" } as CSSProperties}
        className="group/mark relative mt-16 w-full select-none sm:mt-20"
      >
        <div className="flex w-full items-end justify-center px-[1.5vw] leading-[0.8]">
          <span className="font-display text-[13.5vw] font-extrabold tracking-tighter whitespace-nowrap text-white/[0.06]">
            {wordmark}
          </span>
        </div>
        <div className="pointer-events-none absolute inset-0 flex w-full items-end justify-center px-[1.5vw] leading-[0.8] opacity-0 transition-opacity duration-500 group-hover/mark:opacity-100 [mask-image:radial-gradient(circle_220px_at_var(--mx)_var(--my),#000_0%,transparent_68%)] [-webkit-mask-image:radial-gradient(circle_220px_at_var(--mx)_var(--my),#000_0%,transparent_68%)]">
          <span className="font-display text-[13.5vw] font-extrabold tracking-tighter whitespace-nowrap text-white/25">
            {wordmark}
          </span>
        </div>
      </div>

      <div className="relative mx-auto max-w-site px-6 pb-9">
        <div className="h-px w-full bg-gradient-to-r from-white/25 via-white/12 to-transparent" />
        <div className="mt-6 flex flex-col-reverse items-center justify-between gap-4 text-sm text-white/50 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {store.companyName ?? store.name} · All rights reserved.
          </p>
          <Link href="/" className="flex items-center gap-2 transition-colors hover:text-white" aria-label="Powered by Swaggeroo">
            Powered by
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/swaggeroo-logo.png" alt="Swaggeroo" className="h-4 w-auto" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
