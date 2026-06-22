"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  Image,
  Input,
  Spinner
} from "@heroui/react";
import { Search } from "lucide-react";
import { usePublicProducts } from "@/lib/queries.catalog";
import type { CatalogProductListItem } from "@/modules/catalog/products/types";
import { formatMoneyRange } from "@/lib/money";

type PackagingProductDrawerProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  selectedProductId?: string | null;
  onSelect: (product: CatalogProductListItem) => void;
};

export function PackagingProductDrawer({
  isOpen,
  onOpenChange,
  selectedProductId,
  onSelect
}: PackagingProductDrawerProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const query = useMemo(
    () => ({
      search: search.trim() || undefined,
      isPackaging: true,
      page,
      pageSize: 8
    }),
    [page, search]
  );

  const { data, isLoading, isFetching } = usePublicProducts(query);
  const items = data?.items ?? [];
  const pagination = data?.pagination;

  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="right"
      size="2xl"
      backdrop="opaque"
      classNames={{
        base: "rounded-none sm:rounded-l-[28px]"
      }}
    >
      <DrawerContent>
        {(onClose) => (
          <>
            <DrawerHeader className="border-b border-black/10">
              <div>
                <div className="text-sm font-semibold text-black">Add packaging</div>
                <div className="mt-1 text-sm text-black/55">
                  Choose one packaging product for this swag pack.
                </div>
              </div>
            </DrawerHeader>

            <DrawerBody className="space-y-4 py-6">
              <Input
                value={search}
                onValueChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                placeholder="Search packaging by title"
                startContent={<Search className="size-4 text-black/40" />}
              />

              {isLoading || isFetching ? (
                <div className="flex min-h-[320px] items-center justify-center">
                  <Spinner label="Loading packaging..." />
                </div>
              ) : items.length ? (
                <div className="grid gap-4">
                  {items.map((product) => {
                    const isSelected = selectedProductId === product.id;

                    return (
                      <div
                        key={product.id}
                        className="grid gap-4 rounded-[24px] border border-black/10 bg-white p-4 sm:grid-cols-[96px_minmax(0,1fr)_auto]"
                      >
                        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-zinc-50">
                          {product.imageUrl ? (
                            <Image
                              removeWrapper
                              src={product.imageUrl}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="text-sm font-semibold text-black/35">
                              {product.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 space-y-2">
                          <div className="text-base font-semibold text-black">{product.name}</div>
                          <div className="text-sm text-black/55">{product.shortDescription}</div>
                          <div className="text-sm font-medium text-black">
                            {formatMoneyRange(product.lowestPrice, product.highestPrice, product.currency)}
                          </div>
                        </div>

                        <div className="flex items-center">
                          <Button
                            color="primary"
                            className="text-white"
                            style={{ backgroundImage: "var(--primary-gradient)" }}
                            onPress={() => {
                              onSelect(product);
                              onClose();
                            }}
                          >
                            {isSelected ? "Selected" : "Add packaging"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[28px] border border-dashed border-black/10 px-6 py-16 text-center text-black/60">
                  No packaging products found.
                </div>
              )}

              {pagination && pagination.totalPages > 1 ? (
                <div className="flex items-center justify-between gap-3 pt-2">
                  <Button
                    variant="bordered"
                    isDisabled={page <= 1}
                    onPress={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </Button>
                  <div className="text-sm text-black/60">
                    Page {pagination.page} of {pagination.totalPages}
                  </div>
                  <Button
                    variant="bordered"
                    isDisabled={page >= pagination.totalPages}
                    onPress={() =>
                      setPage((current) => Math.min(pagination.totalPages, current + 1))
                    }
                  >
                    Next
                  </Button>
                </div>
              ) : null}
            </DrawerBody>

            <DrawerFooter className="border-t border-black/10">
              <Link href="/shop" className="w-full">
                <Button variant="bordered" className="w-full border-black/15">
                  Browse all products
                </Button>
              </Link>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
