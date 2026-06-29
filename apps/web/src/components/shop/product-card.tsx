import Link from "next/link";
import { formatMoney } from "@/lib/money";
import type { CatalogProductListItem } from "@/modules/catalog/products/types";

type LogoPlacement = { x: number; y: number; size: number; rotation: number; opacity: number };
type ProductBranding = { logoUrl: string | null; placement: LogoPlacement | null };

/**
 * Redesigned storefront product card. Wired to the live catalog API shape
 * (CatalogProductListItem, prices in dollars) — not Supabase. Uses a plain
 * <img> for remote product images to avoid next/image remote-domain config.
 *
 * `branding` (white-label stores only) overlays the seller's logo on the
 * product image at view time — the underlying catalog image is never modified.
 */
export function ProductCard({
  product,
  branding,
  storeSlug,
}: {
  product: CatalogProductListItem;
  branding?: ProductBranding | null;
  // When set, the card links into the white-label store instead of the global shop.
  storeSlug?: string;
}) {
  // Show the true "from" price — the cheapest volume tier.
  const fromPrice = product.floorPrice ?? product.basePrice ?? product.lowestPrice ?? 0;
  const priceLabel = formatMoney(fromPrice, product.currency);
  const swatches = product.swatches ?? [];
  const overlay = branding?.logoUrl && branding.placement ? branding : null;
  const href = storeSlug ? `/store/${storeSlug}/${product.slug}` : `/shop/${product.slug}`;

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {product.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        {overlay ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={overlay.logoUrl!}
            alt=""
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              left: `${overlay.placement!.x}%`,
              top: `${overlay.placement!.y}%`,
              width: `${overlay.placement!.size}%`,
              transform: `translate(-50%,-50%) rotate(${overlay.placement!.rotation}deg)`,
              opacity: overlay.placement!.opacity / 100,
            }}
          />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {product.category?.name ? (
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {product.category.name}
          </span>
        ) : null}
        <h3 className="mt-1 text-base font-semibold leading-snug text-foreground">{product.name}</h3>
        {product.shortDescription ? (
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {product.shortDescription}
          </p>
        ) : null}

        {swatches.length ? (
          <div className="mt-3 flex items-center gap-1.5">
            {swatches.slice(0, 5).map((s) => (
              <span
                key={s.name}
                title={s.name}
                className="size-4 rounded-full border border-border/70 shadow-xs"
                style={{ backgroundColor: s.hex ?? "transparent" }}
              />
            ))}
            {swatches.length > 5 ? (
              <span className="text-xs text-muted-foreground">+{swatches.length - 5}</span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-auto flex items-end justify-between pt-4">
          <div>
            <span className="text-xs text-muted-foreground">from</span>
            <p className="text-lg font-bold text-foreground tabular-nums">
              {priceLabel}
              <span className="text-sm font-medium text-muted-foreground">/ea</span>
            </p>
          </div>
          <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-primary opacity-0 transition group-hover:opacity-100">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}
