"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody, Image, Spinner } from "@heroui/react";
import { addToast } from "@heroui/toast";
import { QuantityStepper } from "@/app/components/catalog/QuantityStepper";
import { getCartItemKey, useCatalogCartStore } from "@/lib/cart-store";
import { calculateCatalogCartSummary } from "@/lib/catalog-cart";
import { formatMoney } from "@/lib/money";
import { useMe } from "@/queries/auth";

export default function CartPage() {
  const router = useRouter();
  const { data: user } = useMe();

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const bulkItems = useCatalogCartStore((state) => state.bulkItems);
  const swagPackItems = useCatalogCartStore((state) => state.swagPackItems);
  const swagPackPackaging = useCatalogCartStore((state) => state.swagPackPackaging);
  const swagPackQuantity = useCatalogCartStore((state) => state.swagPackQuantity);
  const swagPackName = useCatalogCartStore((state) => state.swagPackName);

  const updateBulkQuantity = useCatalogCartStore((state) => state.updateBulkQuantity);
  const removeBulkItem = useCatalogCartStore((state) => state.removeBulkItem);
  const clearBulkItems = useCatalogCartStore((state) => state.clearBulkItems);
  const clearSwagPack = useCatalogCartStore((state) => state.clearSwagPack);

  const summary = useMemo(
    () =>
      calculateCatalogCartSummary({
        bulkItems,
        swagPackItems,
        swagPackPackaging,
        swagPackQuantity,
        swagPackName
      }),
    [bulkItems, swagPackItems, swagPackPackaging, swagPackQuantity, swagPackName]
  );

  const totalLabel = [
    summary.bulkItemCount ? `${summary.bulkItemCount} product${summary.bulkItemCount === 1 ? "" : "s"}` : null,
    summary.hasSwagPack ? "1 Swag Pack" : null
  ]
    .filter(Boolean)
    .join(", ");

  const goToProjectDetails = () => {
    if (!summary.hasItems) {
      addToast({
        title: "Your cart is empty",
        description: "Add products before continuing.",
        color: "warning"
      });
      return;
    }

    if (summary.hasMissingPackaging) {
      addToast({
        title: "Packaging required",
        description: "Add one packaging product to your swag pack before checkout.",
        color: "warning"
      });
      router.push("/swag-pack");
      return;
    }

    if (summary.hasInvalidBulkQuantities || summary.hasInvalidSwagPackQuantities) {
      addToast({
        title: "Review your cart",
        description: "One or more items exceed stock limits or need quantity updates.",
        color: "warning"
      });
      return;
    }

    // Project details + design approval require a customer account, so sign-in is mandatory.
    if (!user) {
      addToast({
        title: "Sign in to continue",
        description: "Create an account or log in to submit your project request.",
        color: "primary"
      });
      router.push(`/login?next=${encodeURIComponent("/project-submittion")}`);
      return;
    }

    router.push("/project-submittion");
  };

  if (!hydrated) {
    return (
      <div className="container flex min-h-[40vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="container">
        <div className="mb-6 space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight text-black">Your cart</h1>
          <p className="text-black/60">Total ({totalLabel || "0 items"})</p>
        </div>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.5fr)_520px]">
          <div className="space-y-6">
            {summary.hasBulkItems ? (
              <Card className="border border-black/10 bg-white shadow-sm">
                <CardBody className="p-0">
                  <div className="flex items-center justify-between border-b border-black/10 bg-[#f3f6fb] px-5 py-4">
                    <div className="text-2xl font-semibold text-black">
                      Bulk Products ({summary.bulkItemCount})
                    </div>
                    <Button
                      variant="light"
                      color="danger"
                      isDisabled={!summary.bulkItems.length}
                      onPress={clearBulkItems}
                    >
                      Remove all
                    </Button>
                  </div>

                  <div className="divide-y divide-black/10">
                    {summary.bulkItems.map((item) => (
                      <div
                        key={getCartItemKey(item)}
                        className="grid gap-4 px-5 py-6 lg:grid-cols-[140px_minmax(0,1fr)_160px]"
                      >
                        <div className="flex h-32 items-center justify-center overflow-hidden rounded-2xl bg-zinc-50">
                          {item.imageUrl ? (
                            <Image removeWrapper src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="text-lg font-semibold text-black/35">{item.name.slice(0, 2).toUpperCase()}</div>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div className="text-2xl font-semibold text-black">{item.name}</div>
                          <div className="text-sm text-black/55">
                            Color: {item.variantName || "Standard"}
                          </div>
                          <div className="text-sm text-black/55">Quantity</div>
                          <QuantityStepper
                            label="Quantity"
                            value={item.quantity}
                            minValue={item.minQty}
                            maxValue={item.stock}
                            onChange={(nextValue) => updateBulkQuantity(getCartItemKey(item), nextValue)}
                            helperText={`Available stock: ${item.stock}`}
                          />
                        </div>

                        <div className="space-y-4 text-right">
                          <div>
                            <div className="text-3xl font-semibold text-black">
                              {formatMoney(item.unitPrice, item.currency)}
                            </div>
                            <div className="text-sm text-black/55">/ item</div>
                          </div>

                          <Button
                            variant="light"
                            color="danger"
                            onPress={() => removeBulkItem(getCartItemKey(item))}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            ) : null}

            {summary.hasSwagPack ? (
              <Card className="border border-black/10 bg-white shadow-sm">
                <CardBody className="p-0">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 bg-[#f3f6fb] px-5 py-4">
                    <div>
                      <div className="text-sm text-black/60">Swag Pack</div>
                      <div className="text-2xl font-semibold text-black">{summary.swagPackName}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="light"
                        color="danger"
                        onPress={clearSwagPack}
                      >
                        Remove
                      </Button>
                      <Link href="/swag-pack">
                        <Button
                          color="primary"
                          className="text-white"
                          style={{ backgroundImage: "var(--primary-gradient)" }}
                        >
                          Edit Swag Pack
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <div className="space-y-5 px-5 py-5">
                    {summary.hasMissingPackaging ? (
                      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-warning/60 bg-warning-50 px-4 py-4">
                        <div>
                          <div className="font-semibold text-black">
                            You haven&apos;t added a packaging option to your Swag Pack
                          </div>
                          <div className="text-sm text-black/65">
                            Select one packaging product to complete your project.
                          </div>
                        </div>
                        <Link href="/swag-pack">
                          <Button color="warning" variant="flat">
                            Add packaging
                          </Button>
                        </Link>
                      </div>
                    ) : null}

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xl font-semibold text-black">
                          Items ({summary.swagPackItems.length})
                        </div>
                        <Link href="/swag-pack" className="text-sm text-primary underline">
                          Show details
                        </Link>
                      </div>

                      <div className="flex flex-wrap gap-4">
                        {summary.swagPackItems.map((item) => (
                          <div
                            key={`swag-${getCartItemKey(item)}`}
                            className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-zinc-50"
                          >
                            {item.imageUrl ? (
                              <Image removeWrapper src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="text-sm font-semibold text-black/35">
                                {item.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4 border-t border-black/10 pt-5 sm:grid-cols-2">
                      <div>
                        <div className="text-sm text-black/60">Packaging ({summary.swagPackPackaging ? 1 : 0})</div>
                        {summary.swagPackPackaging ? (
                          <div className="mt-3 flex items-center gap-3 rounded-[20px] border border-black/10 p-3">
                            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-zinc-50">
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
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-black">
                                {summary.swagPackPackaging.name}
                              </div>
                              <div className="text-sm text-black/55">
                                1 / pack · {formatMoney(summary.swagPackPackaging.pricePerPack, summary.swagPackPackaging.currency)} / pack
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 text-sm text-black/55">No packaging selected.</div>
                        )}
                      </div>

                      <div className="space-y-4 rounded-[22px] bg-zinc-50 p-4">
                        <div className="flex items-center justify-between text-sm text-black/60">
                          <span>Number of Swag Packs (Min 25)</span>
                          <span className="font-semibold text-black">{summary.packQuantity}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-black/60">
                          <span>Price per Swag Pack</span>
                          <span className="text-2xl font-semibold text-black">
                            {formatMoney(summary.swagPackTotal / summary.packQuantity)}
                            <span className="text-sm font-normal text-black/55"> / pack</span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-black/60">
                          <span>Swag Pack total</span>
                          <span className="font-semibold text-black">
                            {formatMoney(summary.swagPackTotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ) : null}

            {!summary.hasItems ? (
              <Card className="border border-black/10 bg-white shadow-sm">
                <CardBody className="space-y-4 px-6 py-16 text-center">
                  <div className="text-2xl font-semibold text-black">Your cart is empty</div>
                  <p className="text-black/60">Browse the catalog and add products to continue.</p>
                  <div className="flex justify-center">
                    <Link href="/shop">
                      <Button
                        color="primary"
                        className="text-white"
                        style={{ backgroundImage: "var(--primary-gradient)" }}
                      >
                        Continue shopping
                      </Button>
                    </Link>
                  </div>
                </CardBody>
              </Card>
            ) : null}
          </div>

          <Card className="border border-black/10 bg-white shadow-sm">
            <CardBody className="space-y-6 p-6">
              <div className="space-y-5">
                <div className="text-4xl font-semibold tracking-tight text-black">Project summary</div>

                <div className="space-y-4">
                  {summary.bulkItems.map((item) => (
                    <div key={`summary-bulk-${getCartItemKey(item)}`} className="flex items-start justify-between gap-4 text-sm">
                      <div className="min-w-0">
                        <div className="text-black">{item.name}</div>
                        {item.variantName ? (
                          <div className="text-black/50">{item.variantName}</div>
                        ) : null}
                      </div>
                      <div className="whitespace-nowrap font-semibold text-black">
                        {formatMoney(item.totalPrice, item.currency)}
                      </div>
                    </div>
                  ))}

                  {summary.hasSwagPack ? (
                    <div className="flex items-start justify-between gap-4 text-sm">
                      <div className="min-w-0">
                        <div className="text-black">{summary.swagPackName}</div>
                        <div className="text-black/50">
                          {summary.packQuantity} packs · {summary.swagPackItemCount} item{summary.swagPackItemCount === 1 ? "" : "s"}
                        </div>
                      </div>
                      <div className="whitespace-nowrap font-semibold text-black">
                        {formatMoney(summary.swagPackTotal)}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="border-t border-black/10 pt-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-2xl font-semibold text-black">Total Estimate</div>
                      <div className="text-sm text-black/55">(Not including taxes and fees)</div>
                    </div>
                    <div className="text-4xl font-semibold text-black">{formatMoney(summary.total)}</div>
                  </div>
                </div>
              </div>

              <Button
                color="primary"
                className="h-12 w-full text-white"
                style={{ backgroundImage: "var(--primary-gradient)" }}
                onPress={goToProjectDetails}
                isDisabled={!summary.hasItems}
              >
                Next: Add project details
              </Button>

              <Link href="/shop">
                <Button variant="bordered" className="h-12 w-full">
                  Continue shopping
                </Button>
              </Link>

              <div className="text-center text-sm text-black/55">No credit card info required</div>
            </CardBody>
          </Card>
        </div>
    </div>
  );
}
