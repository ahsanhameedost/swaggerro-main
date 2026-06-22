"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Accordion,
  AccordionItem,
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Image,
  Spinner
} from "@heroui/react";
import { addToast } from "@heroui/toast";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { PricingOptionsDrawer } from "@/app/components/catalog/PricingOptionsDrawer";
import { QuantityStepper } from "@/app/components/catalog/QuantityStepper";
import { usePublicProduct } from "@/lib/queries.catalog";
import { useCatalogCartStore } from "@/lib/cart-store";
import { resolveUnitPrice } from "@/lib/catalog-pricing";
import { formatMoney, formatMoneyRange } from "@/lib/money";

type PurchaseMode = "BULK" | "SWAG_PACK";

function buildVariantTitle(
  title: string | null | undefined,
  selectedOptions: Array<{ label: string; code: string }>
) {
  if (title?.trim()) {
    return title.trim();
  }

  return selectedOptions.map((option) => option.label || option.code).join(" / ");
}

function formatShippingPackageLabel(value?: "BULK_ITEM" | "PACK" | "MAILER_PACK" | null) {
  if (!value) {
    return null;
  }

  if (value === "MAILER_PACK") {
    return "Mailer Pack";
  }

  if (value === "BULK_ITEM") {
    return "Bulk Item";
  }

  return "Pack";
}

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
  const { data, isLoading, isError, error } = usePublicProduct(slug ?? "", !!slug);
  const product = data?.product;

  const addBulkItem = useCatalogCartStore((state) => state.addBulkItem);
  const addSwagPackItem = useCatalogCartStore((state) => state.addSwagPackItem);
  const swagPackQuantity = useCatalogCartStore((state) => state.swagPackQuantity);

  const [purchaseMode, setPurchaseMode] = useState<PurchaseMode>("BULK");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [pricingDrawerOpen, setPricingDrawerOpen] = useState(false);

  const thumbnailRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const variantGroups = product?.variantGroups ?? [];
  const hasVariants = (product?.productCatalogVariants.length ?? 0) > 0;

  const filteredVariants = useMemo(() => {
    if (!product) return [];

    return product.productCatalogVariants.filter((variant) =>
      Object.entries(selectedOptions).every(([groupName, optionId]) =>
        variant.selectedOptions.some(
          (selectedOption) =>
            selectedOption.variantName === groupName &&
            selectedOption.optionId === optionId
        )
      )
    );
  }, [product, selectedOptions]);

  const matchedVariant = useMemo(() => {
    if (!product || !hasVariants) {
      return null;
    }

    if (Object.keys(selectedOptions).length !== variantGroups.length) {
      return null;
    }

    return (
      filteredVariants.find(
        (variant) => variant.selectedOptions.length === variantGroups.length
      ) ?? null
    );
  }, [filteredVariants, hasVariants, product, selectedOptions, variantGroups.length]);

  const activePricingOptions = useMemo(() => {
    if (!product) return [];
    return matchedVariant?.pricingOptions.length ? matchedVariant.pricingOptions : product.pricingOptions;
  }, [matchedVariant, product]);

  const activeBasePrice = matchedVariant?.price ?? product?.basePrice ?? 0;
  const activeMinQty = matchedVariant?.minQty ?? product?.minQty ?? 1;
  const activeStock = matchedVariant?.stock ?? product?.baseStock ?? 0;
  const pricingQuantity = purchaseMode === "SWAG_PACK" ? swagPackQuantity : quantity;
  const currentUnitPrice = resolveUnitPrice(activeBasePrice, pricingQuantity, activePricingOptions);
  const currentTotalPrice = currentUnitPrice * quantity;
  const swagPackMaxQuantityPerPack = activeStock > 0 ? Math.floor(activeStock / Math.max(swagPackQuantity, 1)) : 0;

  const gallery = useMemo(() => {
    if (!product) return [];

    if (matchedVariant?.imageIds.length) {
      const matchedImages = product.images.filter(
        (image) => image.id && matchedVariant.imageIds.includes(image.id)
      );

      if (matchedImages.length) {
        return matchedImages;
      }
    }

    return product.images;
  }, [matchedVariant, product]);

  const activeImage = gallery[selectedImageIndex] ?? gallery[0] ?? product?.images[0];
  const hasMultipleImages = gallery.length > 1;

  useEffect(() => {
    if (!product) return;
    setQuantity((currentQuantity) => Math.max(currentQuantity, activeMinQty));
  }, [activeMinQty, product]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [matchedVariant?.id]);

  useEffect(() => {
    if (!product) return;
    setSelectedOptions({});
    setQuantity(product.minQty);
  }, [product?.id]);

  useEffect(() => {
    if (selectedImageIndex <= Math.max(gallery.length - 1, 0)) return;
    setSelectedImageIndex(0);
  }, [gallery.length, selectedImageIndex]);

  useEffect(() => {
    const activeThumb = thumbnailRefs.current[selectedImageIndex];
    activeThumb?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest"
    });
  }, [selectedImageIndex]);

  const stockMessage = useMemo(() => {
    if (activeStock <= 0) {
      return "Out of stock";
    }

    if (quantity > activeStock) {
      return `Only ${activeStock} available`;
    }

    if (activeStock <= 25) {
      return `Low stock · ${activeStock} available`;
    }

    return "In stock";
  }, [activeStock, quantity]);

  const canAddToCart =
    !!product &&
    (!hasVariants || !!matchedVariant) &&
    activeStock > 0 &&
    (purchaseMode === "BULK"
      ? quantity >= activeMinQty && quantity <= activeStock
      : quantity >= 1 && swagPackMaxQuantityPerPack >= 1 && quantity <= swagPackMaxQuantityPerPack);

  const activeVariantTitle = matchedVariant
    ? buildVariantTitle(matchedVariant.title, matchedVariant.selectedOptions)
    : null;

  const priceMarkup = (() => {
    if (!product) return null;

    if (!hasVariants) {
      return (
        <div className="flex flex-wrap items-end gap-3">
          <div className="text-4xl font-semibold tracking-tight text-black">
            {formatMoney(currentUnitPrice, product.currency)}
          </div>

          {product.compareAtPrice && product.compareAtPrice > currentUnitPrice ? (
            <div className="pb-1 text-lg text-black/35 line-through">
              {formatMoney(product.compareAtPrice, product.currency)}
            </div>
          ) : null}
        </div>
      );
    }

    if (!matchedVariant) {
      return (
        <div className="text-4xl font-semibold tracking-tight text-black">
          {formatMoneyRange(product.lowestPrice, product.highestPrice, product.currency)}
        </div>
      );
    }

    return (
      <div className="text-4xl font-semibold tracking-tight text-black">
        {formatMoney(currentUnitPrice, product.currency)}
      </div>
    );
  })();

  const handleAddToCart = () => {
    if (!product || !canAddToCart) {
      addToast({
        title: hasVariants && !matchedVariant ? "Select all variant options" : "Cannot add this item",
        color: "warning"
      });
      return;
    }

    const sharedPayload = {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      imageUrl: activeImage?.url ?? product.images[0]?.url ?? null,
      productCatalogVariantId: matchedVariant?.id ?? null,
      variantName: activeVariantTitle,
      basePrice: activeBasePrice,
      compareAtPrice: product.compareAtPrice ?? null,
      stock: activeStock,
      minQty: activeMinQty,
      currency: product.currency,
      pricingOptions: activePricingOptions
    };

    if (purchaseMode === "BULK") {
      addBulkItem({
        ...sharedPayload,
        quantity
      });

      addToast({
        title: "Added to bulk cart",
        description: `${product.name} is ready in your bulk cart.`,
        color: "success"
      });
      router.push("/cart");
      return;
    }

    addSwagPackItem({
      ...sharedPayload,
      quantityPerPack: quantity
    });

    addToast({
      title: "Added to swag pack",
      description: `${product.name} was added to your swag pack builder.`,
      color: "success"
    });
    router.push("/swag-pack");
  };

  const isOptionAvailable = (groupName: string, optionId?: string | null) => {
    if (!optionId || !product) return false;

    return product.productCatalogVariants.some((variant) => {
      const hasCurrentOption = variant.selectedOptions.some(
        (selectedOption) =>
          selectedOption.variantName === groupName && selectedOption.optionId === optionId
      );

      if (!hasCurrentOption) {
        return false;
      }

      return Object.entries(selectedOptions).every(([selectedGroupName, selectedOptionId]) => {
        if (selectedGroupName === groupName) {
          return true;
        }

        return variant.selectedOptions.some(
          (selectedOption) =>
            selectedOption.variantName === selectedGroupName &&
            selectedOption.optionId === selectedOptionId
        );
      });
    });
  };

  const goToPrevImage = () => {
    if (!gallery.length) return;
    setSelectedImageIndex((current) => (current === 0 ? gallery.length - 1 : current - 1));
  };

  const goToNextImage = () => {
    if (!gallery.length) return;
    setSelectedImageIndex((current) => (current === gallery.length - 1 ? 0 : current + 1));
  };

  return (
    <div className="container">
      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-black/55">
        <Link href="/shop" className="inline-flex items-center gap-2 font-medium text-black">
          <ArrowLeft className="size-4" />
          Shop
        </Link>
        {product ? (
          <>
            <span>/</span>
            <span className="truncate text-black/45">{product.name}</span>
          </>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex min-h-[420px] items-center justify-center">
          <Spinner label="Loading product..." />
        </div>
      ) : isError || !product ? (
        <Card className="border border-black/10 shadow-sm">
          <CardBody>{error instanceof Error ? error.message : "Product not found."}</CardBody>
        </Card>
      ) : (
        <>
          <div className="grid gap-10 xl:grid-cols-[minmax(0,1.15fr)_minmax(380px,520px)]">
            <div className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-[92px_minmax(0,1fr)]">
                <div className="order-2 lg:order-1">
                  <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2 lg:max-h-[720px] lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:pr-2">
                    {gallery.map((image, index) => (
                      <button
                        key={image.id ?? image.url}
                        ref={(element) => {
                          thumbnailRefs.current[index] = element;
                        }}
                        type="button"
                        className={`shrink-0 overflow-hidden rounded-[22px] border bg-white transition ${selectedImageIndex === index
                          ? "border-black shadow-sm"
                          : "border-black/10 hover:border-black/25"
                          }`}
                        onClick={() => setSelectedImageIndex(index)}
                      >
                        <div className="flex h-20 w-20 items-center justify-center bg-zinc-50">
                          <Image
                            removeWrapper
                            src={image.url}
                            alt={image.alt ?? product.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="order-1 lg:order-2">
                  <div className="relative overflow-hidden rounded-[36px] border border-black/10 bg-white shadow-sm">
                    <div className="relative h-[480px] bg-[#f7f7f7] sm:h-[560px] lg:h-[620px] xl:h-[720px]">
                      {gallery.length ? (
                        <div
                          className="flex h-full transition-transform duration-300 ease-out"
                          style={{ transform: `translateX(-${selectedImageIndex * 100}%)` }}
                        >
                          {gallery.map((image) => (
                            <div
                              key={image.id ?? image.url}
                              className="flex h-full min-w-full items-center justify-center p-6 sm:p-8 xl:p-10"
                            >
                              <Image
                                removeWrapper
                                src={image.url}
                                alt={image.alt ?? product.name}
                                className="h-full w-full object-contain"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center p-8">
                          <div className="text-3xl font-semibold text-black/25">
                            {product.name.slice(0, 2).toUpperCase()}
                          </div>
                        </div>
                      )}

                      {hasMultipleImages ? (
                        <div className="absolute bottom-5 right-5 flex items-center gap-3">
                          <Button
                            isIconOnly
                            radius="full"
                            variant="flat"
                            className="h-11 w-11 min-w-0 bg-white/90 text-black shadow-sm backdrop-blur"
                            onPress={goToPrevImage}
                            aria-label="Previous image"
                          >
                            <ChevronLeft className="size-5" />
                          </Button>

                          <Button
                            isIconOnly
                            radius="full"
                            variant="flat"
                            className="h-11 w-11 min-w-0 bg-white/90 text-black shadow-sm backdrop-blur"
                            onPress={goToNextImage}
                            aria-label="Next image"
                          >
                            <ChevronRight className="size-5" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <Accordion>
                <AccordionItem key="description" aria-label="Description" title="Description">
                  <div>{product.shortDescription}</div>
                </AccordionItem>

                <AccordionItem key="details" aria-label="Details" title="Details">
                  {product.description ? (
                    <div
                      className="prose max-w-none prose-p:my-0 prose-li:my-0"
                      dangerouslySetInnerHTML={{ __html: product.description }}
                    />
                  ) : (
                    <p>Product description will be shared by our team during final review.</p>
                  )}
                </AccordionItem>
              </Accordion>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                  {product.category ? (
                    <Chip variant="flat" className="bg-primary/8 text-primary">
                      {product.category.name}
                    </Chip>
                  ) : null}

                  {product.collections.map((collection) => (
                    <Chip key={collection.id} variant="flat" className="bg-black/5 text-black/70">
                      {collection.name}
                    </Chip>
                  ))}

                  {formatShippingPackageLabel(product.shipping.packageType) ? (
                    <Chip variant="flat" className="bg-black/5 text-black/70">
                      {formatShippingPackageLabel(product.shipping.packageType)}
                    </Chip>
                  ) : null}

                  {product.shipping.badges.map((badge) => (
                    <Chip key={`${product.id}-${badge}`} variant="flat" className="bg-amber-50 text-amber-700">
                      {badge}
                    </Chip>
                  ))}
                </div>
                {(!hasVariants || matchedVariant) &&
                  <div
                    className={`text-sm font-medium ${stockMessage === "Out of stock" || quantity > activeStock
                      ? "text-danger"
                      : "text-primary"
                      }`}
                  >
                    {stockMessage}
                  </div>}
              </div>

              <div className="space-y-3">
                <h1 className="text-4xl font-semibold tracking-tight text-black xl:text-[48px]">
                  {matchedVariant ? `${product.name} - ${activeVariantTitle}` : product.name}
                </h1>
              </div>

              <div className="space-y-2">
                {priceMarkup}

                {activePricingOptions.length ? (
                  <button
                    type="button"
                    className="text-sm font-medium text-primary underline underline-offset-4"
                    onClick={() => setPricingDrawerOpen(true)}
                  >
                    See per item price options
                  </button>
                ) : null}

                {(matchedVariant || !hasVariants) ? (
                  <div className="text-sm text-black/55">
                    Estimated {purchaseMode === "SWAG_PACK" ? "per pack" : "line"} total:{" "}
                    <span className="font-semibold text-black">
                      {formatMoney(currentTotalPrice, product.currency)}
                    </span>
                  </div>
                ) : (
                  <div className="text-sm text-black/50">
                    Select all variant options to view the exact price.
                  </div>
                )}
              </div>

              {variantGroups.length ? (
                <div className="space-y-5">
                  {variantGroups.map((group) => (
                    <div key={group.id ?? group.name} className="space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-sm font-semibold text-black">{group.name}</div>
                        <div className="text-xs text-black/45">
                          {group.type === "COLOR" ? "Choose a color" : "Choose an option"}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {group.options.map((option) => {
                          const isSelected = selectedOptions[group.name] === option.id;
                          const isAvailable = isOptionAvailable(group.name, option.id);

                          if (group.type === "COLOR") {
                            return (
                              <button
                                key={option.id ?? option.code}
                                type="button"
                                disabled={!isAvailable}
                                className={`relative rounded-full border p-[3px] transition ${isSelected
                                  ? "border-black shadow-sm"
                                  : "border-black/15 hover:border-black/35"
                                  } ${!isAvailable ? "cursor-not-allowed opacity-35" : ""}`}
                                onClick={() =>
                                  setSelectedOptions((current) => ({
                                    ...current,
                                    [group.name]: option.id ?? ""
                                  }))
                                }
                                title={option.label}
                              >
                                <span
                                  className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10"
                                  style={{ backgroundColor: option.colorHex ?? "#111111" }}
                                >
                                  {isSelected ? <Check className="size-4 text-white" /> : null}
                                </span>
                              </button>
                            );
                          }

                          return (
                            <Button
                              key={option.id ?? option.code}
                              radius="full"
                              variant={isSelected ? "solid" : "bordered"}
                              className={`h-11 border-black/15 px-5 text-sm font-medium ${isSelected ? "text-white" : "text-black"
                                }`}
                              isDisabled={!isAvailable}
                              style={isSelected ? { backgroundImage: "var(--primary-gradient)" } : undefined}
                              onPress={() =>
                                setSelectedOptions((current) => ({
                                  ...current,
                                  [group.name]: option.id ?? ""
                                }))
                              }
                            >
                              {option.code}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {(product.shipping.weightOz != null || product.shipping.badges.length) ? (
                <Card className="border border-black/10 bg-white shadow-sm">
                  <CardHeader className="flex flex-col items-start gap-1 border-b border-black/10 px-6 py-5">
                    <div className="text-sm font-semibold text-black">Shipping details</div>
                    <div className="text-sm text-black/55">
                      Country restrictions and shipping package details for this product.
                    </div>
                  </CardHeader>
                  <CardBody className="grid gap-4 px-6 py-5 sm:grid-cols-2">
                    <div className="space-y-1">
                      <div className="text-xs uppercase tracking-wide text-black/40">Package type</div>
                      <div className="font-medium text-black">
                        {formatShippingPackageLabel(product.shipping.packageType) ?? "Standard"}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs uppercase tracking-wide text-black/40">Unit weight</div>
                      <div className="font-medium text-black">
                        {product.shipping.weightOz != null ? `${product.shipping.weightOz} oz` : "Not set"}
                      </div>
                    </div>

                    {product.shipping.dimensions ? (
                      <div className="space-y-1">
                        <div className="text-xs uppercase tracking-wide text-black/40">Dimensions</div>
                        <div className="font-medium text-black">
                          {product.shipping.dimensions.lengthIn ?? "-"} × {product.shipping.dimensions.widthIn ?? "-"} × {product.shipping.dimensions.heightIn ?? "-"} in
                        </div>
                      </div>
                    ) : null}

                    {product.shipping.badges.length ? (
                      <div className="space-y-2">
                        <div className="text-xs uppercase tracking-wide text-black/40">Restrictions</div>
                        <div className="flex flex-wrap gap-2">
                          {product.shipping.badges.map((badge) => (
                            <Chip key={`detail-${badge}`} size="sm" variant="flat" className="bg-amber-50 text-amber-700">
                              {badge}
                            </Chip>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </CardBody>
                </Card>
              ) : null}

              <Card className="border border-black/10 bg-white shadow-sm">
                <CardHeader className="flex flex-col items-start gap-4 border-b border-black/10 px-6 py-5">
                  <div>
                    <div className="text-sm font-semibold text-black">Purchase options</div>
                    <div className="mt-1 text-sm text-black/55">
                      Buy in bulk or add this product into a swag pack project.
                    </div>
                  </div>

                  <div className="grid w-full gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      className={`rounded-[24px] border px-5 py-4 text-left transition ${purchaseMode === "BULK"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-black/10 hover:border-black/20"
                        }`}
                      onClick={() => setPurchaseMode("BULK")}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`size-4 rounded-full border-2 ${purchaseMode === "BULK" ? "border-primary" : "border-black/25"
                            }`}
                        >
                          <div
                            className={`m-[2px] size-2 rounded-full ${purchaseMode === "BULK" ? "bg-primary" : "bg-transparent"
                              }`}
                          />
                        </div>
                        <div>
                          <div className="font-semibold text-black">Buy in bulk</div>
                          <div className="text-sm text-black/55">
                            Best for one product ordered in volume.
                          </div>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`rounded-[24px] border px-5 py-4 text-left transition ${purchaseMode === "SWAG_PACK"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-black/10 hover:border-black/20"
                        }`}
                      onClick={() => setPurchaseMode("SWAG_PACK")}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`size-4 rounded-full border-2 ${purchaseMode === "SWAG_PACK" ? "border-primary" : "border-black/25"
                            }`}
                        >
                          <div
                            className={`m-[2px] size-2 rounded-full ${purchaseMode === "SWAG_PACK" ? "bg-primary" : "bg-transparent"
                              }`}
                          />
                        </div>
                        <div>
                          <div className="font-semibold text-black">Add to a swag pack</div>
                          <div className="text-sm text-black/55">
                            Combine multiple products into one curated pack.
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                </CardHeader>

                <CardBody className="space-y-5 p-6">
                  <QuantityStepper
                    label={purchaseMode === "BULK" ? `Quantity (min ${activeMinQty})` : "Quantity per pack (min 1)"}
                    value={quantity}
                    minValue={purchaseMode === "BULK" ? activeMinQty : 1}
                    maxValue={
                      purchaseMode === "BULK"
                        ? activeStock > 0
                          ? activeStock
                          : undefined
                        : swagPackMaxQuantityPerPack > 0
                          ? swagPackMaxQuantityPerPack
                          : undefined
                    }
                    onChange={setQuantity}
                    helperText={purchaseMode === "SWAG_PACK" ? `Based on ${swagPackQuantity} swag packs` : ""}
                  />

                  {quantity > activeStock && activeStock > 0 ? (
                    <div className="rounded-[22px] border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
                      Requested quantity is higher than available stock.
                    </div>
                  ) : null}

                  <Button
                    className="h-14 w-full text-base font-semibold"
                    color="primary"
                    style={{ backgroundImage: "var(--primary-gradient)" }}
                    isDisabled={!canAddToCart}
                    onPress={handleAddToCart}
                  >
                    {purchaseMode === "BULK" ? "Add to cart" : "Add to swag pack"}
                  </Button>

                  {!canAddToCart ? (
                    <div className="flex items-start gap-2 text-sm text-black/55">
                      <Info className="mt-0.5 size-4 shrink-0" />
                      <span>
                        {hasVariants && !matchedVariant
                          ? "Choose all required variant options before adding this product."
                          : activeStock <= 0
                            ? "This product is currently out of stock."
                            : purchaseMode === "SWAG_PACK"
                              ? swagPackMaxQuantityPerPack < 1
                                ? `This product does not have enough stock for ${swagPackQuantity} swag packs.`
                                : `You can add up to ${swagPackMaxQuantityPerPack} per pack for ${swagPackQuantity} swag packs.`
                              : `You can add up to ${activeStock} units right now.`}
                      </span>
                    </div>
                  ) : null}
                </CardBody>
              </Card>
            </div>
          </div>

          <PricingOptionsDrawer
            isOpen={pricingDrawerOpen}
            onOpenChange={setPricingDrawerOpen}
            title={matchedVariant ? `${product.name} - ${activeVariantTitle}` : product.name}
            options={activePricingOptions}
            quantity={quantity}
            unitPrice={currentUnitPrice}
            totalPrice={currentTotalPrice}
            currency={product.currency}
            minQty={activeMinQty}
            maxQty={activeStock > 0 ? activeStock : undefined}
            onQuantityChange={setQuantity}
          />
        </>
      )}
    </div>
  );
}
