"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Button,
  Card,
  CardBody,
  Image,
  Input
} from "@heroui/react";
import { addToast } from "@heroui/toast";
import HomeNavbar from "@/app/components/home/HomeNavbar";
import Footer from "@/app/components/home/Footer";
import { QuantityStepper } from "@/app/components/catalog/QuantityStepper";
import { PackagingProductDrawer } from "@/app/components/catalog/PackagingProductDrawer";
import { SwagPackPriceBreaksDrawer } from "@/app/components/catalog/SwagPackPriceBreaksDrawer";
import { getCartItemKey, useCatalogCartStore, type SwagPackPackagingItem } from "@/lib/cart-store";
import { calculateCatalogCartSummary } from "@/lib/catalog-cart";
import { resolveUnitPrice } from "@/lib/catalog-pricing";
import { formatMoney } from "@/lib/money";
import type { CatalogProductListItem, CatalogProductDetail, ProductCatalogVariant } from "@/modules/catalog/products/types";
import { getPublicProduct } from "@/modules/catalog/public/api";

const PRICE_BREAK_QUANTITIES = [25, 50, 100, 150, 250, 500, 1000, 5000] as const;

function resolvePackagingVariant(product: CatalogProductDetail) {
  return (
    product.productCatalogVariants.find((variant) => variant.isDefault) ??
    product.productCatalogVariants[0] ??
    null
  );
}

function buildVariantLabel(variant: ProductCatalogVariant | null) {
  if (!variant) {
    return null;
  }

  if (variant.title?.trim()) {
    return variant.title.trim();
  }

  const values = variant.selectedOptions
    .map((option) => option.label || option.code)
    .filter(Boolean);

  return values.length ? values.join(" / ") : null;
}

function mapPackagingProductToCartItem(
  product: CatalogProductDetail,
  variant: ProductCatalogVariant | null
): SwagPackPackagingItem {
  return {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    imageUrl: product.images[0]?.url ?? null,
    productCatalogVariantId: variant?.id ?? null,
    variantName: buildVariantLabel(variant),
    basePrice: variant?.price ?? product.basePrice ?? product.minPrice ?? 0,
    compareAtPrice: product.compareAtPrice ?? null,
    stock: variant?.stock ?? product.baseStock ?? 0,
    minQty: 1,
    currency: product.currency,
    pricingOptions:
      variant?.pricingOptions?.length ? variant.pricingOptions : product.pricingOptions,
    quantityPerPack: 1,
    isPackaging: true
  };
}

export default function SwagPackPage() {
  const swagPackItems = useCatalogCartStore((state) => state.swagPackItems);
  const swagPackPackaging = useCatalogCartStore((state) => state.swagPackPackaging);
  const swagPackQuantity = useCatalogCartStore((state) => state.swagPackQuantity);
  const swagPackName = useCatalogCartStore((state) => state.swagPackName);

  const setSwagPackQuantity = useCatalogCartStore((state) => state.setSwagPackQuantity);
  const setSwagPackName = useCatalogCartStore((state) => state.setSwagPackName);
  const updateQuantityPerPack = useCatalogCartStore((state) => state.updateSwagPackQuantityPerPack);
  const removeSwagPackItem = useCatalogCartStore((state) => state.removeSwagPackItem);
  const setSwagPackPackaging = useCatalogCartStore((state) => state.setSwagPackPackaging);

  const [packagingDrawerOpen, setPackagingDrawerOpen] = useState(false);
  const [priceBreaksOpen, setPriceBreaksOpen] = useState(false);
  const [selectingPackaging, setSelectingPackaging] = useState(false);

  const summary = useMemo(
    () =>
      calculateCatalogCartSummary({
        bulkItems: [],
        swagPackItems,
        swagPackPackaging,
        swagPackQuantity,
        swagPackName
      }),
    [swagPackItems, swagPackPackaging, swagPackQuantity, swagPackName]
  );

  const priceBreakRows = useMemo(
    () =>
      PRICE_BREAK_QUANTITIES.map((quantity) => {
        const itemsTotal = swagPackItems.reduce((sum, item) => {
          const unitPrice = resolveUnitPrice(item.basePrice, quantity, item.pricingOptions);
          return sum + unitPrice * Math.max(1, item.quantityPerPack);
        }, 0);

        const packagingTotal = swagPackPackaging
          ? resolveUnitPrice(
            swagPackPackaging.basePrice,
            quantity,
            swagPackPackaging.pricingOptions
          )
          : 0;

        return {
          quantity,
          pricePerPack: itemsTotal + packagingTotal
        };
      }),
    [swagPackItems, swagPackPackaging]
  );

  const handlePackagingSelect = async (product: CatalogProductListItem) => {
    setSelectingPackaging(true);

    try {
      const response = await getPublicProduct(product.slug);
      const detail = response.product;
      const variant = resolvePackagingVariant(detail);

      setSwagPackPackaging(mapPackagingProductToCartItem(detail, variant));

      addToast({
        title: "Packaging added",
        description: `${detail.name} was added to your swag pack.`,
        color: "success"
      });
    } catch (error: any) {
      addToast({
        title: "Unable to add packaging",
        description: error?.message ?? "Please try again.",
        color: "danger"
      });
    } finally {
      setSelectingPackaging(false);
    }
  };

  return (
    <div className="container">
      <div className="mb-6 space-y-3">
        <Link href="/cart" className="inline-flex items-center text-sm text-black/60 underline">
          Back To Cart
        </Link>
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-black">
            Customize your Swag Pack
          </h1>
          <p className="mt-2 text-black/60">Total ({summary.swagPackItems.length} products)</p>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[420px_minmax(0,1fr)_420px]">
        <Card className="border border-black/10 bg-white shadow-sm">
          <CardBody className="max-h-[760px] space-y-4 overflow-auto p-6">
            {summary.swagPackItems.length ? (
              summary.swagPackItems.map((item) => {
                const maxPerPack =
                  item.stock > 0 ? Math.max(1, Math.floor(item.stock / summary.packQuantity)) : undefined;

                return (
                  <div
                    key={getCartItemKey(item)}
                    className="space-y-4 rounded-[28px] border border-black/10 p-4"
                  >
                    <div className="flex gap-4">
                      <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-zinc-50">
                        {item.imageUrl ? (
                          <Image removeWrapper src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="text-sm font-semibold text-black/35">{item.name.slice(0, 2).toUpperCase()}</div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="text-xl font-semibold text-black">{item.name}</div>
                        <div className="text-sm text-black/55">{item.variantName || "Standard"}</div>
                        <div className="text-base font-semibold text-black">
                          {formatMoney(item.unitPrice, item.currency)} / per item
                        </div>
                        <div className="text-xs text-black/45">
                          {item.totalUnits} total units across {summary.packQuantity} swag packs
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                      <QuantityStepper
                        label="Quantity per pack"
                        value={item.quantityPerPack}
                        minValue={1}
                        maxValue={maxPerPack}
                        onChange={(nextValue) => updateQuantityPerPack(getCartItemKey(item), nextValue)}
                        helperText={`Based on ${summary.packQuantity} swag packs`}
                      />

                      <Button variant="light" color="danger" onPress={() => removeSwagPackItem(getCartItemKey(item))}>
                        Remove
                      </Button>
                    </div>

                    <div className="flex items-center justify-between rounded-[22px] bg-zinc-50 px-4 py-3 text-sm">
                      <span className="text-black/60">Estimated price / pack</span>
                      <span className="font-semibold text-black">
                        {formatMoney(item.pricePerPack, item.currency)}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[28px] border border-dashed border-black/10 px-6 py-16 text-center text-black/60">
                Your swag pack is empty.
              </div>
            )}

            <div className="space-y-3 pt-2">
              <Button
                variant="bordered"
                className="w-full"
                onPress={() => setPackagingDrawerOpen(true)}
                isDisabled={!summary.swagPackItems.length}
                isLoading={selectingPackaging}
              >
                {summary.swagPackPackaging ? "Change packaging" : "Add packaging"}
              </Button>

              <Link href="/shop">
                <Button
                  color="primary"
                  className="w-full text-white"
                  style={{ backgroundImage: "var(--primary-gradient)" }}
                >
                  Add more products
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>

        <Card className="border border-black/10 bg-white shadow-sm">
          <CardBody className="flex min-h-[760px] items-center justify-center p-6">
            {summary.swagPackItems.length ? (
              <div className="grid w-full gap-6 sm:grid-cols-2">
                {summary.swagPackItems.slice(0, 4).map((item) => (
                  <div
                    key={`${getCartItemKey(item)}-preview`}
                    className="flex min-h-[280px] items-center justify-center rounded-[28px] bg-[#f5f0e7] p-6"
                  >
                    {item.imageUrl ? (
                      <Image removeWrapper src={item.imageUrl} alt={item.name} className="max-h-[240px] w-full object-contain" />
                    ) : (
                      <div className="text-lg font-semibold text-black/35">{item.name}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4 text-center text-black/55">
                <p>Add products to preview your swag pack composition.</p>
                <Link href="/shop">
                  <Button
                    color="primary"
                    className="text-white"
                    style={{ backgroundImage: "var(--primary-gradient)" }}
                  >
                    Browse products
                  </Button>
                </Link>
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="border border-black/10 bg-white shadow-sm">
          <CardBody className="space-y-5 p-6">
            <Input
              label="Add a Swag Pack name"
              value={summary.swagPackName}
              onValueChange={setSwagPackName}
              placeholder="My Swag Pack"
            />

            <QuantityStepper
              label="Number of Swag Packs"
              value={summary.packQuantity}
              minValue={25}
              onChange={setSwagPackQuantity}
            />

            <button
              type="button"
              className="w-fit text-sm font-semibold text-primary underline"
              onClick={() => setPriceBreaksOpen(true)}
            >
              See per pack price options
            </button>

            <div className="space-y-2 rounded-[28px] bg-zinc-50 p-5">
              <div className="text-sm text-black/60">Estimated price per Swag Pack</div>
              <div className="text-5xl font-semibold tracking-tight text-black">
                {formatMoney(
                  summary.packQuantity > 0 ? summary.swagPackTotal / summary.packQuantity : 0
                )}
                <span className="text-lg font-normal text-black/55"> / pack</span>
              </div>
              <div className="text-sm text-black/55">
                Price is based on {summary.packQuantity} units and includes the selected products and packaging.
              </div>
            </div>

            <div className="rounded-[28px] border border-black/10 p-4">
              <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-base font-semibold text-black">Packaging</div>
                  <div className="text-sm text-black/55">
                    Add one packaging product for each swag pack.
                  </div>
                </div>

                <Button
                  variant="bordered"
                  onPress={() => setPackagingDrawerOpen(true)}
                  isDisabled={!summary.swagPackItems.length}
                  isLoading={selectingPackaging}
                >
                  {summary.swagPackPackaging ? "Change" : "Add packaging"}
                </Button>
              </div>

              {summary.swagPackPackaging ? (
                <div className="flex items-center gap-3 rounded-[22px] bg-zinc-50 p-3">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white">
                    {summary.swagPackPackaging.imageUrl ? (
                      <Image
                        removeWrapper
                        src={summary.swagPackPackaging.imageUrl}
                        alt={summary.swagPackPackaging.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-xs font-semibold text-black/35">
                        {summary.swagPackPackaging.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-black">{summary.swagPackPackaging.name}</div>
                    <div className="text-sm text-black/55">
                      1 / pack · {formatMoney(summary.swagPackPackaging.pricePerPack, summary.swagPackPackaging.currency)} / pack
                    </div>
                  </div>
                  <Button variant="light" color="danger" onPress={() => setSwagPackPackaging(null)}>
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="rounded-[22px] border border-dashed border-black/10 px-4 py-5 text-sm text-black/60">
                  No packaging selected yet.
                </div>
              )}
            </div>

            <Link href="/cart">
              <Button
                color="primary"
                className="h-12 w-full text-white"
                style={{ backgroundImage: "var(--primary-gradient)" }}
                isDisabled={!summary.swagPackItems.length}
              >
                View cart
              </Button>
            </Link>

            <Link href="/shop">
              <Button variant="bordered" className="h-12 w-full">
                Continue shopping
              </Button>
            </Link>
          </CardBody>
        </Card>
      </div>

      <PackagingProductDrawer
        isOpen={packagingDrawerOpen}
        onOpenChange={setPackagingDrawerOpen}
        selectedProductId={summary.swagPackPackaging?.productId ?? null}
        onSelect={(product) => {
          void handlePackagingSelect(product);
        }}
      />

      <SwagPackPriceBreaksDrawer
        isOpen={priceBreaksOpen}
        onOpenChange={setPriceBreaksOpen}
        currency={summary.swagPackItems[0]?.currency ?? summary.swagPackPackaging?.currency ?? "USD"}
        rows={priceBreakRows}
      />
    </div>
  );
}
