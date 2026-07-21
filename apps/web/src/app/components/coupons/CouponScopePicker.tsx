"use client";

import { useMemo, useState } from "react";
import { Chip, Input, Spinner } from "@heroui/react";
import { Boxes, FolderTree, Package, Search } from "lucide-react";
import { useCategories } from "@/queries/catalog/categories";
import { useCollections } from "@/queries/catalog/collections";
import { useProducts } from "@/queries/catalog/products";
import {
  usePublicCategories,
  usePublicCollections,
  usePublicProducts,
} from "@/queries/catalog/public";

export type CouponScope = {
  productIds: string[];
  categoryIds: string[];
  collectionIds: string[];
};

type Option = { type: "product" | "category" | "collection"; id: string; name: string };

const TYPE_META = {
  product: { label: "Product", color: "primary" as const, Icon: Package },
  category: { label: "Category", color: "secondary" as const, Icon: FolderTree },
  collection: { label: "Collection", color: "success" as const, Icon: Boxes },
};

// ── Presentational view (shared by admin + public variants) ───────────────────
function ScopePickerView({
  options,
  loading,
  value,
  onChange,
}: {
  options: Option[];
  loading: boolean;
  value: CouponScope;
  onChange: (next: CouponScope) => void;
}) {
  const [query, setQuery] = useState("");

  const selectedIds = useMemo(
    () => new Set([...value.productIds, ...value.categoryIds, ...value.collectionIds]),
    [value]
  );
  const totalSelected = selectedIds.size;

  const byId = useMemo(() => {
    const m = new Map<string, Option>();
    for (const o of options) m.set(o.id, o);
    return m;
  }, [options]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options;
    return list.slice(0, 60);
  }, [options, query]);

  const keyFor = (type: Option["type"]) =>
    type === "product" ? "productIds" : type === "category" ? "categoryIds" : "collectionIds";

  const toggle = (o: Option) => {
    const key = keyFor(o.type) as keyof CouponScope;
    const set = new Set(value[key]);
    if (set.has(o.id)) set.delete(o.id);
    else set.add(o.id);
    onChange({ ...value, [key]: Array.from(set) });
  };

  const selectedOptions: Option[] = [
    ...value.productIds,
    ...value.categoryIds,
    ...value.collectionIds,
  ]
    .map((id) => byId.get(id))
    .filter((o): o is Option => Boolean(o));

  return (
    <div className="space-y-3 rounded-2xl border border-divider p-4">
      <div>
        <div className="text-sm font-medium">Applies to</div>
        <div className="text-xs text-foreground/50">
          {totalSelected === 0
            ? "Nothing selected — this coupon applies to the whole order."
            : "The discount only applies to the selected products, categories and collections."}
        </div>
      </div>

      {selectedOptions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedOptions.map((o) => {
            const meta = TYPE_META[o.type];
            return (
              <Chip
                key={o.id}
                size="sm"
                variant="flat"
                color={meta.color}
                onClose={() => toggle(o)}
                startContent={<meta.Icon className="size-3" />}
              >
                {o.name}
              </Chip>
            );
          })}
        </div>
      ) : null}

      <Input
        size="sm"
        placeholder="Search products, categories, collections…"
        value={query}
        onValueChange={setQuery}
        startContent={<Search className="size-4 text-foreground/40" />}
      />

      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner size="sm" label="Loading catalog…" />
        </div>
      ) : (
        <div className="max-h-56 overflow-y-auto rounded-xl border border-divider">
          {results.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-foreground/50">No matches.</div>
          ) : (
            <ul className="divide-y divide-divider">
              {results.map((o) => {
                const meta = TYPE_META[o.type];
                const active = selectedIds.has(o.id);
                return (
                  <li key={`${o.type}:${o.id}`}>
                    <button
                      type="button"
                      onClick={() => toggle(o)}
                      className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-default-100 ${
                        active ? "bg-default-100" : ""
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <meta.Icon className="size-4 shrink-0 text-foreground/40" />
                        <span className="truncate">{o.name}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <Chip size="sm" variant="flat" color={meta.color}>
                          {meta.label}
                        </Chip>
                        {active ? <span className="text-xs text-success">✓</span> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ── Admin variant: authenticated catalog lists (all statuses) ─────────────────
function AdminScopePicker({ value, onChange }: { value: CouponScope; onChange: (n: CouponScope) => void }) {
  const products = useProducts({ pageSize: 200 });
  const categories = useCategories({ pageSize: 200 });
  const collections = useCollections({ pageSize: 200 });

  const options = useMemo<Option[]>(
    () => [
      ...(products.data?.items ?? []).map((p) => ({ type: "product" as const, id: p.id, name: p.name })),
      ...(categories.data?.items ?? []).map((c) => ({ type: "category" as const, id: c.id, name: c.name })),
      ...(collections.data?.items ?? []).map((c) => ({ type: "collection" as const, id: c.id, name: c.name })),
    ],
    [products.data, categories.data, collections.data]
  );

  return (
    <ScopePickerView
      options={options}
      loading={products.isLoading || categories.isLoading || collections.isLoading}
      value={value}
      onChange={onChange}
    />
  );
}

// ── Public variant: published catalog (used by sellers) ───────────────────────
function PublicScopePicker({ value, onChange }: { value: CouponScope; onChange: (n: CouponScope) => void }) {
  const products = usePublicProducts({ pageSize: 200 });
  const categories = usePublicCategories();
  const collections = usePublicCollections();

  const options = useMemo<Option[]>(
    () => [
      ...(products.data?.items ?? []).map((p) => ({ type: "product" as const, id: p.id, name: p.name })),
      ...(categories.data ?? []).map((c) => ({ type: "category" as const, id: c.id, name: c.name })),
      ...(collections.data ?? []).map((c) => ({ type: "collection" as const, id: c.id, name: c.name })),
    ],
    [products.data, categories.data, collections.data]
  );

  return (
    <ScopePickerView
      options={options}
      loading={products.isLoading || categories.isLoading || collections.isLoading}
      value={value}
      onChange={onChange}
    />
  );
}

export function CouponScopePicker({
  variant,
  value,
  onChange,
}: {
  variant: "admin" | "public";
  value: CouponScope;
  onChange: (next: CouponScope) => void;
}) {
  return variant === "admin" ? (
    <AdminScopePicker value={value} onChange={onChange} />
  ) : (
    <PublicScopePicker value={value} onChange={onChange} />
  );
}
