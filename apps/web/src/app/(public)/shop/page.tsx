
"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import {
  Button,
  Card,
  CardBody,
  Chip,
  Image,
  Input,
  Select,
  SelectItem,
  Spinner
} from "@heroui/react";
import { Search } from "lucide-react";
import { usePublicCategories, usePublicCollections, usePublicProducts } from "@/lib/queries.catalog";
import { formatMoney, formatMoneyRange } from "@/lib/money";

export default function ShopPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [collection, setCollection] = useState("");
  const deferredSearch = useDeferredValue(search);

  const query = useMemo(
    () => ({
      search: deferredSearch,
      category: category || undefined,
      collection: collection || undefined,
      page: 1,
      pageSize: 12
    }),
    [deferredSearch, category, collection]
  );

  const { data: categories = [] } = usePublicCategories();
  const { data: collections = [] } = usePublicCollections();
  const { data, isLoading, isFetching } = usePublicProducts(query);

  const items = data?.items ?? [];

  return (
    <div className="container mb-6">
      <div className="inline-flex rounded-full bg-red-50 px-4 py-2 mb-6 text-sm font-medium text-[var(--primary)]">
        All Catalog
      </div>
      <div className="grid items-center gap-4 rounded-[28px] border border-black/10 bg-white p-5 shadow-sm lg:grid-cols-[1.4fr_1fr_1fr]">
        <Input
          value={search}
          onValueChange={setSearch}
          size="lg"
          placeholder="Search products"
          startContent={<Search className="size-4 text-black/40" />}
        />

        <Select
          label="Category"
          size="sm"
          selectedKeys={category ? [category] : []}
          onSelectionChange={(keys) => setCategory(Array.from(keys as Set<string>)[0] ?? "")}
        >
          {categories.map((item) => (
            <SelectItem key={item.slug}>{item.name}</SelectItem>
          ))}
        </Select>

        <Select
          label="Collection"
          size="sm"
          selectedKeys={collection ? [collection] : []}
          onSelectionChange={(keys) => setCollection(Array.from(keys as Set<string>)[0] ?? "")}
        >
          {collections.map((item) => (
            <SelectItem key={item.slug}>{item.name}</SelectItem>
          ))}
        </Select>
      </div>

      <div className="mt-6">
        {isLoading || isFetching ? (
          <div className="flex min-h-[220px] items-center justify-center">
            <Spinner label="Loading catalog..." />
          </div>
        ) : items.length ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {items.map((product) => {
              const priceLabel = product.hasVariants
                ? formatMoneyRange(product.lowestPrice, product.highestPrice, product.currency)
                : formatMoney(product.basePrice ?? product.lowestPrice, product.currency);

              return (
                <Card key={product.id} className="overflow-hidden border border-black/10 bg-white shadow-sm">
                  <CardBody className="p-0">
                    <div className="flex h-72 items-center justify-center overflow-hidden bg-zinc-50">
                      {product.imageUrl ? (
                        <Image
                          removeWrapper
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="text-lg font-semibold text-black/35">
                          {product.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 p-6">
                      <div className="space-y-3">
                        <h3 className="text-2xl font-semibold text-black">{product.name}</h3>

                        {product.shipping.badges.length ? (
                          <div className="flex flex-wrap gap-2">
                            {product.shipping.badges.slice(0, 3).map((badge) => (
                              <Chip key={`${product.id}-${badge}`} size="sm" variant="flat" className="bg-black/5 text-black/70">
                                {badge}
                              </Chip>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="text-xl font-semibold text-black">{priceLabel}</div>

                          {!product.hasVariants &&
                            product.compareAtPrice &&
                            product.basePrice &&
                            product.compareAtPrice > product.basePrice ? (
                            <div className="text-sm text-black/35 line-through">
                              {formatMoney(product.compareAtPrice, product.currency)}
                            </div>
                          ) : null}
                        </div>

                        <Link href={`/shop/${product.slug}`}>
                          <Button
                            color="primary"
                            style={{ backgroundImage: "var(--primary-gradient)" }}
                          >
                            View details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[32px] border border-dashed border-black/10 px-6 py-16 text-center text-black/60">
            No products matched your filters.
          </div>
        )}
      </div>
    </div>
  );
}
