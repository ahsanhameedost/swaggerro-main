"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Spinner } from "@heroui/react";
import { PackageOpen } from "lucide-react";
import { usePublicStore } from "@/queries/stores";
import { ProductCard } from "@/components/shop/product-card";

export default function StorefrontPage() {
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
  const { data, isLoading, isError } = usePublicStore(slug ?? null);
  const store = data?.store;

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
              <img src={store.logoUrl} alt={store.name} className="h-9 w-auto max-w-[160px] object-contain" />
            ) : (
              <span className="text-xl font-bold tracking-tight text-foreground">{store.name}</span>
            )}
          </div>
          <Link
            href="/"
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Powered by <span className="font-semibold text-primary">Swaggeroo</span>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/60">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(60% 80% at 30% -10%, var(--brand-soft), transparent)",
            }}
          />
          <div className="mx-auto max-w-site px-6 py-16 sm:py-20">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              {store.companyName ?? store.name}
            </span>
            <h1 className="mt-5 max-w-2xl font-display text-4xl font-bold tracking-[-0.03em] text-foreground sm:text-5xl">
              {store.heroHeadline ?? store.name}
            </h1>
            {store.heroSubcopy ? (
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
                {store.heroSubcopy}
              </p>
            ) : null}
          </div>
        </section>

        {/* Products */}
        <section className="mx-auto max-w-site px-6 py-12">
          <h2 className="font-display text-2xl font-bold tracking-tight">Available swag</h2>
          {store.products.length ? (
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {store.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
              <PackageOpen className="size-6 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                This store hasn&apos;t added any products yet.
              </p>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-border/60 bg-muted/40">
        <div className="mx-auto flex max-w-site items-center justify-between px-6 py-6 text-sm text-muted-foreground">
          <span>
            © {new Date().getFullYear()} {store.companyName ?? store.name}
          </span>
          <Link href="/become-a-seller" className="hover:text-foreground">
            Make your own store →
          </Link>
        </div>
      </footer>
    </div>
  );
}
