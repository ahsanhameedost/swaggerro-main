"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export type SearchProduct = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  categoryName?: string | null;
  price?: number | null;
  currency?: string | null;
};

/**
 * Reusable predictive/autocomplete product search. As the user types it shows a
 * live dropdown of matching products (thumbnail, name, category, price) plus a
 * "Search '<q>' in all products" action. Filtering is client-side over the
 * `products` pool passed in, so it works for both the global catalog and a
 * single store's catalog.
 */
export function PredictiveSearch({
  products,
  productHref,
  allResultsHref,
  placeholder = "Search products…",
  className,
  inputClassName,
  onNavigate,
}: {
  products: SearchProduct[];
  productHref: (p: SearchProduct) => string;
  allResultsHref: (q: string) => string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const query = q.trim().toLowerCase();
  const results = useMemo(
    () => (query ? products.filter((p) => p.name.toLowerCase().includes(query)).slice(0, 6) : []),
    [products, query],
  );

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    onNavigate?.();
    router.push(href);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    go(allResultsHref(q.trim()));
  };

  const showDropdown = open && query.length > 0;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <form role="search" onSubmit={submit}>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder={placeholder}
          aria-label="Search products"
          autoComplete="off"
          className={cn(
            "h-10 w-full rounded-full border border-border bg-card pr-9 pl-9 text-sm text-foreground outline-none transition focus-visible:border-ring [&::-webkit-search-cancel-button]:hidden",
            inputClassName,
          )}
        />
        {q ? (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setOpen(false);
            }}
            aria-label="Clear search"
            className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </form>

      {showDropdown ? (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
          {results.length ? (
            <ul className="max-h-[22rem] overflow-auto py-1">
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => go(productHref(p))}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-muted/60"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Search className="size-4 text-muted-foreground" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{p.name}</span>
                      {p.categoryName ? (
                        <span className="block truncate text-xs text-muted-foreground">{p.categoryName}</span>
                      ) : null}
                    </span>
                    {p.price != null ? (
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                        {formatMoney(p.price, p.currency ?? "USD")}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-4 text-sm text-muted-foreground">No products match “{q.trim()}”.</p>
          )}
          <button
            type="button"
            onClick={() => go(allResultsHref(q.trim()))}
            className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-left text-sm font-medium text-primary transition hover:bg-muted/60"
          >
            <Search className="size-4" /> Search “{q.trim()}” in all products
          </button>
        </div>
      ) : null}
    </div>
  );
}
