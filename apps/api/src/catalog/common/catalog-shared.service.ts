import {
  BadRequestException,
  NotFoundException
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { CreateCatalogImageUploadDto } from "../dto/category.dto";
import type { CreateProductDto, UpdateProductDto } from "../dto/product.dto";
import { slugify } from "../../common/utils/slug";
import { EmailService } from "../../email/email.service";
import { PrismaService } from "../../prisma/prisma.service";
import { StorageService } from "../../storage/storage.service";

export abstract class CatalogSharedService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly storage: StorageService,
    protected readonly emailService: EmailService
  ) {}

  createCatalogImageUpload(input: CreateCatalogImageUploadDto, prefix: string) {
    return this.storage.createImageUploadUrl({
      filename: input.filename,
      contentType: input.contentType,
      prefix
    });
  }

  protected buildProductDetailInclude(): Prisma.CatalogProductInclude {
    return {
      category: true,
      collections: {
        include: {
          collection: true
        }
      },
      images: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      },
      variants: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          options: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
          }
        }
      },
      productCatalogVariants: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          selectedOptions: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            include: {
              variantOption: {
                include: {
                  variant: true
                }
              }
            }
          },
          images: {
            include: {
              image: true
            },
            orderBy: [{ createdAt: "asc" }]
          },
          pricingOptions: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
          }
        }
      },
      pricingOptions: {
        where: {
          productCatalogVariantId: null
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      },
      shippingProfile: {
        include: {
          countryRules: {
            orderBy: [{ countryCode: "asc" }]
          }
        }
      }
    };
  }

  protected serializeShippingSummary(product: any) {
    const profile = product.shippingProfile ?? null;
    const weightOz = this.decimalToNumber(product.weightOz);
    const lengthIn = this.decimalToNumber(product.lengthIn);
    const widthIn = this.decimalToNumber(product.widthIn);
    const heightIn = this.decimalToNumber(product.heightIn);
    const badges: string[] = [];

    if (profile?.shippingScope === "DOMESTIC_ONLY") {
      badges.push("US Shipping Only");
    }

    if (profile?.shippingScope === "INTERNATIONAL_REVIEW_REQUIRED") {
      badges.push("International Review Required");
    }

    if (profile?.isHazmat) {
      badges.push("Hazmat");
    }

    if (profile?.containsBattery) {
      badges.push("Battery Restricted");
    }

    if (profile?.containsFood) {
      badges.push("Food Restricted");
    }

    if (profile?.containsCosmetic) {
      badges.push("Cosmetic Restricted");
    }

    if (profile?.containsLiquid) {
      badges.push("Liquid Restricted");
    }

    if (profile?.containsWood) {
      badges.push("Wood Restricted");
    }

    if (profile?.isOversized) {
      badges.push("Oversized");
    }

    const countryRules = Array.isArray(profile?.countryRules) ? profile.countryRules : [];
    const allowCountries = countryRules
      .filter((rule: any) => rule.ruleType === "ALLOW")
      .map((rule: any) => ({ code: rule.countryCode, name: rule.countryName }));
    const blockCountries = countryRules
      .filter((rule: any) => rule.ruleType === "BLOCK")
      .map((rule: any) => ({ code: rule.countryCode, name: rule.countryName }));

    return {
      shippingProfileId: profile?.id ?? null,
      profileName: profile?.name ?? null,
      packageType: profile?.packageType ?? null,
      shippingScope: profile?.shippingScope ?? null,
      weightOz,
      dimensions:
        lengthIn != null || widthIn != null || heightIn != null
          ? {
              lengthIn,
              widthIn,
              heightIn
            }
          : null,
      requiresPhoneForInternational: Boolean(profile?.requiresPhoneForInternational),
      requiresEmailForInternational: Boolean(profile?.requiresEmailForInternational),
      maxUnitsPerPackage: profile?.maxUnitsPerPackage ?? null,
      allowCountries,
      blockCountries,
      badges
    };
  }

  protected async replaceProductRelations(
    tx: Prisma.TransactionClient,
    productId: string,
    input: CreateProductDto | UpdateProductDto,
    keepExistingWhenUndefined = false
  ) {
    if (!keepExistingWhenUndefined || input.collectionIds !== undefined) {
      await tx.catalogProductCollection.deleteMany({ where: { productId } });

      if (input.collectionIds?.length) {
        await tx.catalogProductCollection.createMany({
          data: input.collectionIds.map((collectionId) => ({ productId, collectionId }))
        });
      }
    }

    const shouldReplaceStructure =
      !keepExistingWhenUndefined ||
      input.images !== undefined ||
      input.variantGroups !== undefined ||
      input.productCatalogVariants !== undefined ||
      input.pricingOptions !== undefined;

    if (!shouldReplaceStructure) {
      return;
    }

    await tx.catalogPricingOption.deleteMany({
      where: {
        OR: [{ productId }, { productCatalogVariant: { productId } }]
      }
    });
    await tx.catalogVariantSelectedOption.deleteMany({
      where: {
        catalogVariant: {
          productId
        }
      }
    });
    await tx.catalogVariantImage.deleteMany({
      where: {
        catalogVariant: {
          productId
        }
      }
    });
    await tx.catalogVariant.deleteMany({ where: { productId } });
    await tx.variantOption.deleteMany({
      where: {
        variant: {
          productId
        }
      }
    });
    await tx.variant.deleteMany({ where: { productId } });
    await tx.catalogImage.deleteMany({ where: { productId } });

    const imageInput = input.images ?? [];
    const createdImages: Array<{
      id: string;
      url: string;
      sourceId: string | null;
    }> = [];

    for (let index = 0; index < imageInput.length; index += 1) {
      const image = imageInput[index];
      const created = await tx.catalogImage.create({
        data: {
          productId,
          url: image.url,
          key: this.toNullableString(image.key),
          alt: this.toNullableString(image.alt),
          sortOrder: image.sortOrder ?? index
        }
      });

      createdImages.push({
        id: created.id,
        url: created.url,
        sourceId: image.id ?? null
      });
    }

    const optionIdLookup = new Map<string, string>();
    const optionKeyLookup = new Map<string, string>();

    for (let variantIndex = 0; variantIndex < (input.variantGroups ?? []).length; variantIndex += 1) {
      const variantGroup = input.variantGroups?.[variantIndex];
      if (!variantGroup) continue;

      const createdVariantGroup = await tx.variant.create({
        data: {
          productId,
          name: variantGroup.name.trim(),
          type: variantGroup.type,
          sortOrder: variantGroup.sortOrder ?? variantIndex
        }
      });

      for (let optionIndex = 0; optionIndex < variantGroup.options.length; optionIndex += 1) {
        const option = variantGroup.options[optionIndex];
        const createdOption = await tx.variantOption.create({
          data: {
            variantId: createdVariantGroup.id,
            code: option.code.trim(),
            label: option.label.trim(),
            colorHex: this.toNullableString(option.colorHex),
            sortOrder: option.sortOrder ?? optionIndex
          }
        });

        if (option.id) {
          optionIdLookup.set(option.id, createdOption.id);
        }

        optionKeyLookup.set(
          this.makeVariantOptionLookupKey(variantGroup.name, option.code),
          createdOption.id
        );
        optionKeyLookup.set(
          this.makeVariantOptionLookupKey(variantGroup.name, option.label),
          createdOption.id
        );
      }
    }

    const productCatalogVariants = input.productCatalogVariants ?? [];
    const hasExplicitDefault = productCatalogVariants.some((item) => item.isDefault);

    for (let index = 0; index < productCatalogVariants.length; index += 1) {
      const productCatalogVariant = productCatalogVariants[index];
      const createdVariant = await tx.catalogVariant.create({
        data: {
          productId,
          title: this.toNullableString(productCatalogVariant.title),
          price: new Prisma.Decimal(productCatalogVariant.price),
          stock: productCatalogVariant.stock,
          minQty: productCatalogVariant.minQty ?? 1,
          currency: "USD",
          isDefault: hasExplicitDefault ? productCatalogVariant.isDefault === true : index === 0,
          sortOrder: productCatalogVariant.sortOrder ?? index
        }
      });

      const selectedOptionRows = productCatalogVariant.selectedOptions
        .map((selectedOption, selectedIndex) => {
          const mappedOptionId =
            (selectedOption.optionId ? optionIdLookup.get(selectedOption.optionId) : undefined) ??
            optionKeyLookup.get(this.makeVariantOptionLookupKey(selectedOption.variantName, selectedOption.code)) ??
            optionKeyLookup.get(this.makeVariantOptionLookupKey(selectedOption.variantName, selectedOption.label));

          if (!mappedOptionId) {
            return null;
          }

          return {
            catalogVariantId: createdVariant.id,
            variantOptionId: mappedOptionId,
            sortOrder: selectedOption.sortOrder ?? selectedIndex
          };
        })
        .filter(Boolean) as Prisma.CatalogVariantSelectedOptionCreateManyInput[];

      if (selectedOptionRows.length) {
        await tx.catalogVariantSelectedOption.createMany({
          data: selectedOptionRows
        });
      }

      const variantImageRows = (productCatalogVariant.imageIds ?? [])
        .map((imageId) => this.resolveCreatedImageId(imageId, createdImages))
        .filter(Boolean)
        .map((resolvedImageId) => ({
          catalogVariantId: createdVariant.id,
          imageId: resolvedImageId as string
        }));

      if (variantImageRows.length) {
        await tx.catalogVariantImage.createMany({
          data: variantImageRows
        });
      }

      if (productCatalogVariant.pricingOptions.length) {
        await tx.catalogPricingOption.createMany({
          data: productCatalogVariant.pricingOptions.map((pricing, pricingIndex) => ({
            productCatalogVariantId: createdVariant.id,
            qtyFrom: pricing.qtyFrom,
            qtyTo: pricing.isOnward ? null : pricing.qtyTo ?? null,
            price: new Prisma.Decimal(pricing.price),
            isOnward: pricing.isOnward,
            sortOrder: pricing.sortOrder ?? pricingIndex
          }))
        });
      }
    }

    if (input.pricingOptions?.length) {
      await tx.catalogPricingOption.createMany({
        data: input.pricingOptions.map((pricing, index) => ({
          productId,
          qtyFrom: pricing.qtyFrom,
          qtyTo: pricing.isOnward ? null : pricing.qtyTo ?? null,
          price: new Prisma.Decimal(pricing.price),
          isOnward: pricing.isOnward,
          sortOrder: pricing.sortOrder ?? index
        }))
      });
    }
  }

  protected async getProductByIdWithTx(tx: Prisma.TransactionClient, id: string) {
    const product = await tx.catalogProduct.findUnique({
      where: { id },
      include: this.buildProductDetailInclude()
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    return this.serializeProductDetail(product);
  }

  protected serializeSimpleEntity(item: { createdAt: Date; updatedAt: Date } & Record<string, unknown>) {
    return {
      ...item,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    };
  }

  protected serializeProductListItem(product: any) {
    const hasVariants = product.productCatalogVariants.length > 0;
    const variantPrices = product.productCatalogVariants.map((variant: any) => this.decimalToNumber(variant.price));
    const lowestPrice = hasVariants
      ? Math.min(...variantPrices)
      : this.decimalToNumber(product.basePrice);
    const highestPrice = hasVariants
      ? Math.max(...variantPrices)
      : this.decimalToNumber(product.basePrice);
    const basePrice = this.decimalToNumber(product.basePrice);
    const compareAtPrice = this.decimalToNumber(product.compareAtPrice);

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      shortDescription: product.shortDescription,
      status: product.status,
      isPackaging: Boolean(product.isPackaging),
      bulkPricingEnabled: product.bulkPricingEnabled !== false,
      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name
          }
        : null,
      collections: (product.collections ?? []).map((entry: any) => ({
        id: entry.collection.id,
        name: entry.collection.name
      })),
      imageUrl: product.images[0]?.url ?? null,
      variantCount: product.productCatalogVariants.length,
      hasVariants,
      basePrice,
      basePriceCents: basePrice,
      compareAtPrice,
      compareAtPriceCents: compareAtPrice,
      lowestPrice,
      highestPrice,
      minPrice: lowestPrice,
      minPriceCents: lowestPrice,
      maxPrice: highestPrice,
      baseStock: product.baseStock,
      minQty: product.minQty,
      currency: product.currency,
      commissionType: product.commissionType ?? "PERCENT",
      commissionValue:
        product.commissionValue != null ? this.decimalToNumber(product.commissionValue) : null,
      shipping: this.serializeShippingSummary(product),
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString()
    };
  }

  protected serializePublicProductListItem(product: any) {
    const item = this.serializeProductListItem(product);

    // Distinct color swatches from the product's COLOR variant group (for shop
    // filters + card swatches). Read-only, additive.
    const colorGroup = (product.variants ?? []).find((v: any) => v.type === "COLOR");
    const swatches = colorGroup
      ? (colorGroup.options ?? []).map((o: any) => ({ name: o.label, hex: o.colorHex ?? null }))
      : [];

    // True "from" price = cheapest across base, variants and product pricing tiers.
    const pricingPrices = (product.pricingOptions ?? [])
      .map((p: any) => this.decimalToNumber(p.price))
      .filter((n: number) => Number.isFinite(n) && n > 0);
    const candidates = [item.lowestPrice, item.basePrice, ...pricingPrices].filter(
      (n: number) => typeof n === "number" && Number.isFinite(n) && n > 0
    );
    const floorPrice = candidates.length ? Math.min(...candidates) : item.lowestPrice;

    // Expose the product-level tier ladder so the shop card can surface volume
    // savings ("Buy 25+ and save X%"). Only when bulk pricing is enabled.
    const pricingOptions =
      item.bulkPricingEnabled
        ? (product.pricingOptions ?? [])
            .filter((p: any) => p.productCatalogVariantId == null)
            .map((p: any) => this.serializePricingOption(p))
        : [];

    return {
      swatches,
      floorPrice,
      bulkPricingEnabled: item.bulkPricingEnabled,
      pricingOptions,
      id: item.id,
      slug: item.slug,
      name: item.name,
      shortDescription: item.shortDescription,
      category: product.category
        ? { id: product.category.id, name: product.category.name, slug: product.category.slug }
        : null,
      collections: (product.collections ?? []).map((entry: any) => ({
        id: entry.collection.id,
        name: entry.collection.name,
        slug: entry.collection.slug
      })),
      imageUrl: item.imageUrl,
      hasVariants: item.hasVariants,
      isPackaging: item.isPackaging,
      basePrice: item.basePrice,
      compareAtPrice: item.compareAtPrice,
      lowestPrice: item.lowestPrice,
      highestPrice: item.highestPrice,
      minPrice: item.minPrice,
      price: item.minPrice,
      priceCents: item.minPrice,
      minQty: item.minQty,
      currency: item.currency,
      commissionType: item.commissionType,
      commissionValue: item.commissionValue,
      shipping: item.shipping,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };
  }

  protected serializeProductDetail(product: any) {
    const basePrice = this.decimalToNumber(product.basePrice);
    const compareAtPrice = this.decimalToNumber(product.compareAtPrice);
    const variantGroups = product.variants.map((variant: any) => ({
      id: variant.id,
      name: variant.name,
      type: variant.type,
      sortOrder: variant.sortOrder,
      options: variant.options.map((option: any) => ({
        id: option.id,
        code: option.code,
        label: option.label,
        colorHex: option.colorHex,
        sortOrder: option.sortOrder
      }))
    }));

    const productCatalogVariants = product.productCatalogVariants.map((variant: any) =>
      this.serializeCatalogVariantDetail(variant)
    );
    const hasVariants = productCatalogVariants.length > 0;
    const variantPrices = productCatalogVariants.map((variant: any) => variant.price);
    const lowestPrice = hasVariants
      ? Math.min(...variantPrices)
      : basePrice;
    const highestPrice = hasVariants
      ? Math.max(...variantPrices)
      : basePrice;

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      shortDescription: product.shortDescription,
      description: product.description,
      status: product.status,
      isPackaging: Boolean(product.isPackaging),
      bulkPricingEnabled: product.bulkPricingEnabled !== false,
      basePrice,
      basePriceCents: basePrice,
      compareAtPrice,
      compareAtPriceCents: compareAtPrice,
      minQty: product.minQty,
      baseStock: product.baseStock,
      currency: product.currency,
      commissionType: product.commissionType ?? "PERCENT",
      commissionValue:
        product.commissionValue != null ? this.decimalToNumber(product.commissionValue) : null,
      hasVariants,
      lowestPrice,
      highestPrice,
      minPrice: lowestPrice,
      minPriceCents: lowestPrice,
      maxPrice: highestPrice,
      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
            slug: product.category.slug
          }
        : null,
      collections: (product.collections ?? []).map((entry: any) => ({
        id: entry.collection.id,
        name: entry.collection.name,
        slug: entry.collection.slug
      })),
      images: product.images.map((image: any) => ({
        id: image.id,
        url: image.url,
        key: image.key,
        alt: image.alt,
        sortOrder: image.sortOrder
      })),
      variantDefinitions: variantGroups,
      variantGroups,
      groupedOptions: variantGroups.map((group: any) => ({
        name: group.name,
        type: group.type,
        values: group.options.map((option: any) => option.label)
      })),
      productCatalogVariants,
      pricingOptions: product.pricingOptions.map((pricing: any) => this.serializePricingOption(pricing)),
      shipping: this.serializeShippingSummary(product),
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString()
    };
  }

  protected serializeCatalogVariantDetail(variant: any) {
    return {
      id: variant.id,
      title: variant.title,
      price: this.decimalToNumber(variant.price),
      priceCents: this.decimalToNumber(variant.price),
      stock: variant.stock,
      minQty: variant.minQty,
      isDefault: variant.isDefault,
      sortOrder: variant.sortOrder,
      imageIds: variant.images.map((entry: any) => entry.imageId),
      selectedOptions: variant.selectedOptions.map((entry: any) => ({
        variantId: entry.variantOption.variant.id,
        variantName: entry.variantOption.variant.name,
        variantType: entry.variantOption.variant.type,
        optionId: entry.variantOption.id,
        code: entry.variantOption.code,
        label: entry.variantOption.label,
        colorHex: entry.variantOption.colorHex,
        sortOrder: entry.sortOrder
      })),
      pricingOptions: variant.pricingOptions.map((pricing: any) => this.serializePricingOption(pricing))
    };
  }

  protected serializePricingOption(pricing: any) {
    const price = this.decimalToNumber(pricing.price);

    return {
      id: pricing.id,
      qtyFrom: pricing.qtyFrom,
      qtyTo: pricing.qtyTo,
      price,
      priceCents: price,
      isOnward: pricing.isOnward,
      sortOrder: pricing.sortOrder,
      minQty: pricing.qtyFrom
    };
  }

  protected serializeOrderDetail(order: any) {
    const subtotal = this.decimalToNumber(order.totalPrice) ?? 0;
    const warehouseQuantity = (order.items ?? []).reduce(
      (sum: number, item: any) => sum + (item.quantity ?? 0),
      0
    );
    const storageCost = warehouseQuantity;
    const shippingCost = (order.shipments ?? [])
      .filter((shipment: any) => shipment.status !== "CANCELLED")
      .reduce((sum: number, shipment: any) => sum + (this.decimalToNumber(shipment.totalCost) ?? 0), 0);
    const taxesAndFees = 0;
    const totalDue = subtotal + storageCost + shippingCost + taxesAndFees;
    const allItemsReadyToOrder =
      (order.items ?? []).length > 0 &&
      (order.items ?? []).every((item: any) => item.designPhase === "READY_TO_ORDER");
    const shipmentCount = (order.shipments ?? []).filter((shipment: any) => shipment.status !== "CANCELLED").length;

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      type: order.type,
      status: order.status,
      paymentStatus: order.paymentStatus ?? "UNPAID",
      email: order.email,
      name: order.name,
      companyName: order.companyName,
      phone: order.phone,
      notes: order.notes,
      logoUrl: order.logoUrl,
      logoKey: order.logoKey,
      packQuantity: order.packQuantity,
      totalPrice: subtotal,
      totalCents: subtotal,
      currency: order.currency,
      itemCount: order.items?.length ?? 0,
      warehouseQuantity,
      storageCost,
      shippingCost,
      shipmentCount,
      taxesAndFees,
      totalDue,
      allItemsReadyToOrder,
      paidAt: order.paidAt ? order.paidAt.toISOString() : null,
      assignedEmployee: order.assignedEmployee
        ? {
            id: order.assignedEmployee.id,
            email: order.assignedEmployee.email,
            firstName: order.assignedEmployee.firstName ?? null,
            lastName: order.assignedEmployee.lastName ?? null
          }
        : null,
      customer: order.user
        ? {
            id: order.user.id,
            email: order.user.email,
            firstName: order.user.firstName ?? null,
            lastName: order.user.lastName ?? null
          }
        : null,
      items: (order.items ?? []).map((item: any) => {
        const unitPrice = this.decimalToNumber(item.unitPrice) ?? 0;
        const lineTotal = this.decimalToNumber(item.totalPrice) ?? 0;

        return {
          id: item.id,
          itemType: item.itemType,
          designPhase: item.designPhase ?? "MOCKUP_IN_PROGRESS",
          productName: item.productName,
          variantName: item.variantName,
          quantity: item.quantity,
          quantityPerPack: item.quantityPerPack,
          unitPrice,
          unitPriceCents: unitPrice,
          totalPrice: lineTotal,
          totalCents: lineTotal,
          imageUrl: item.imageUrl,
          mockupImageUrl: item.mockupImageUrl ?? null,
          proofImageUrl: item.proofImageUrl ?? null,
          adminNotes: item.adminNotes ?? null,
          hasOpenRevision: (item.revisions ?? []).some((revision: any) => revision.status === "OPEN"),
          revisions: (item.revisions ?? []).map((revision: any) => ({
            id: revision.id,
            status: revision.status,
            notes: revision.notes,
            logoUrl: revision.logoUrl ?? null,
            logoKey: revision.logoKey ?? null,
            resolvedAt: revision.resolvedAt ? revision.resolvedAt.toISOString() : null,
            createdAt: revision.createdAt.toISOString(),
            requestedByUser: revision.requestedByUser
              ? {
                  id: revision.requestedByUser.id,
                  email: revision.requestedByUser.email,
                  firstName: revision.requestedByUser.firstName ?? null,
                  lastName: revision.requestedByUser.lastName ?? null
                }
              : null
          })),
          customerApprovedMockupAt: item.customerApprovedMockupAt
            ? item.customerApprovedMockupAt.toISOString()
            : null,
          customerApprovedFinalAt: item.customerApprovedFinalAt
            ? item.customerApprovedFinalAt.toISOString()
            : null
        };
      }),
      project: order.project
        ? {
            id: order.project.id,
            name: order.project.name,
            swagPackName: order.project.swagPackName ?? null,
            budgetPerPerson: this.decimalToNumber(order.project.budgetPerPerson),
            neededByDate: order.project.neededByDate ? order.project.neededByDate.toISOString() : null,
            createdAt: order.project.createdAt.toISOString(),
            updatedAt: order.project.updatedAt.toISOString()
          }
        : null,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString()
    };
  }

  protected buildCatalogVariantDisplayName(variant: any) {
    if (variant.title) {
      return variant.title;
    }

    return variant.selectedOptions
      .map((entry: any) => entry.variantOption?.label ?? entry.variantOption?.code)
      .filter(Boolean)
      .join(" / ");
  }

  protected resolveUnitPrice(basePrice: number | null, pricingOptions: any[], quantity: number) {
    const fallback = basePrice ?? 0;

    const matchedPricing = pricingOptions.find((pricing: any) => {
      const from = pricing.qtyFrom;
      const to = pricing.qtyTo;
      const isOnward = pricing.isOnward === true;

      if (quantity < from) {
        return false;
      }

      if (isOnward || to == null) {
        return quantity >= from;
      }

      return quantity >= from && quantity <= to;
    });

    return matchedPricing ? this.decimalToNumber(matchedPricing.price) : fallback;
  }

  protected resolveCreatedImageId(
    imageId: string,
    createdImages: Array<{ id: string; url: string; sourceId: string | null }>
  ) {
    const match = createdImages.find(
      (image) => image.id === imageId || image.sourceId === imageId || image.url === imageId
    );
    return match?.id ?? null;
  }

  protected makeVariantOptionLookupKey(variantName: string, value: string) {
    return `${variantName.trim().toLowerCase()}::${value.trim().toLowerCase()}`;
  }

  protected requireNumber(value: number | null | undefined, message: string): number {
    if (value === null || value === undefined || Number.isNaN(value)) {
      throw new BadRequestException(message);
    }

    return value;
  }

  protected decimalToNumber(
    value: Prisma.Decimal | number | string | null | undefined
  ): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return Number(value.toString());
  }

  protected makePagination(page: number, pageSize: number, total: number) {
    return {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    };
  }

  protected toNullableString(value?: string | null) {
    if (value === undefined || value === null) return value ?? null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  protected async ensureUniqueSlug(
    model: "catalogCategory" | "catalogCollection" | "catalogProduct",
    value: string,
    excludeId?: string,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? this.prisma;
    const baseSlug = slugify(value);

    if (!baseSlug) {
      throw new BadRequestException("Name is invalid");
    }

    let slug = baseSlug;
    let counter = 2;
    const prismaModel = (client as any)[model];

    while (true) {
      const existing = await prismaModel.findUnique({ where: { slug } });

      if (!existing || existing.id === excludeId) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter += 1;
    }
  }
}
