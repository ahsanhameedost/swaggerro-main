import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatMoneyRange } from "@/lib/money";
import type { CatalogProductListItem } from "@/modules/catalog/products/types";

/**
 * Redesigned storefront product card. Wired to the live catalog API shape
 * (CatalogProductListItem, prices in dollars) — not Supabase. Uses a plain
 * <img> for remote product images to avoid next/image remote-domain config.
 */
export function ProductCard({ product }: { product: CatalogProductListItem }) {
  // Show the true "from" price — the cheapest volume tier.
  const fromPrice =
    product.floorPrice ?? product.basePrice ?? product.lowestPrice ?? 0;
  const priceLabel = formatMoney(fromPrice, product.currency);
  const swatches = product.swatches ?? [];

  return (
    <Link
      href={`/shop/${product.slug}`}
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
          {product.minQty > 1 ? (
            <Badge variant="outline">{product.minQty} min</Badge>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
