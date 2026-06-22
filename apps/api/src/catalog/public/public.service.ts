import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { CreatePublicOrderDto, ListPublicProductsQuery } from "../dto/public.dto";
import { EmailService } from "../../email/email.service";
import { PrismaService } from "../../prisma/prisma.service";
import { StorageService } from "../../storage/storage.service";
import { CatalogSharedService } from "../common/catalog-shared.service";

type ResolvedCheckoutItem = {
  itemType: "BULK" | "SWAG_PACK" | "PACKAGING";
  productId: string;
  productCatalogVariantId: string | null;
  productName: string;
  variantName: string | null;
  quantity: number;
  quantityPerPack: number | null;
  unitPrice: number;
  totalPrice: number;
  imageUrl: string | null;
};

@Injectable()
export class CatalogPublicService extends CatalogSharedService {
  constructor(
    prisma: PrismaService,
    storage: StorageService,
    emailService: EmailService
  ) {
    super(prisma, storage, emailService);
  }

  async listPublicCategories() {
    const items = await this.prisma.catalogCategory.findMany({
      where: {
        products: {
          some: {
            status: "ACTIVE",
            isPackaging: false
          }
        }
      },
      orderBy: { name: "asc" }
    });

    return items.map((item) => this.serializeSimpleEntity(item));
  }

  async listPublicCollections() {
    const items = await this.prisma.catalogCollection.findMany({
      where: {
        products: {
          some: {
            product: {
              status: "ACTIVE",
              isPackaging: false
            }
          }
        }
      },
      orderBy: { name: "asc" }
    });

    return items.map((item) => this.serializeSimpleEntity(item));
  }

  async listPublicProducts(query: ListPublicProductsQuery) {
    const where: Prisma.CatalogProductWhereInput = {
      status: "ACTIVE",
      isPackaging: query.isPackaging ?? false,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { shortDescription: { contains: query.search, mode: "insensitive" } }
            ]
          }
        : {}),
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.collection
        ? { collections: { some: { collection: { slug: query.collection } } } }
        : {})
    };

    const [total, products] = await this.prisma.$transaction([
      this.prisma.catalogProduct.count({ where }),
      this.prisma.catalogProduct.findMany({
        where,
        // Lean include for the storefront grid — only what the cards/filters need
        // (category, image, price-from, swatches). Collections + shippingProfile
        // are omitted here to cut Azure round-trips (they're heavy and unused by cards).
        include: {
          category: true,
          images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], take: 1 },
          productCatalogVariants: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
          variants: { include: { options: { orderBy: [{ sortOrder: "asc" }] } }, orderBy: [{ sortOrder: "asc" }] },
          pricingOptions: {
            where: { productCatalogVariantId: null },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
          }
        },
        orderBy: [{ updatedAt: "desc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      })
    ]);

    return {
      items: products.map((product) => this.serializePublicProductListItem(product)),
      pagination: this.makePagination(query.page, query.pageSize, total)
    };
  }

  async getPublicProductBySlug(slug: string) {
    const product = await this.prisma.catalogProduct.findUnique({
      where: { slug },
      include: this.buildProductDetailInclude()
    });

    if (!product || product.status !== "ACTIVE") {
      throw new NotFoundException("Product not found");
    }

    return this.serializeProductDetail(product);
  }

  async createPublicOrder(input: CreatePublicOrderDto, userId: string | null) {
    const bulkItemsPayload = input.bulkItems.filter((item) => item.quantity > 0);
    const swagPackInput = input.swagPack?.items.length ? input.swagPack : null;
    const swagPackItemsPayload = swagPackInput?.items.filter((item) => item.quantityPerPack > 0) ?? [];

    if (!bulkItemsPayload.length && !swagPackItemsPayload.length) {
      throw new BadRequestException("At least one cart item is required");
    }

    if (swagPackItemsPayload.length && !swagPackInput?.packaging) {
      throw new BadRequestException("Packaging is required for swag pack checkout");
    }

    const productIds = [
      ...new Set([
        ...bulkItemsPayload.map((item) => item.productId),
        ...swagPackItemsPayload.map((item) => item.productId),
        ...(swagPackInput?.packaging ? [swagPackInput.packaging.productId] : [])
      ])
    ];

    const catalogVariantIds = [
      ...new Set(
        [
          ...bulkItemsPayload.map((item) => item.productCatalogVariantId),
          ...swagPackItemsPayload.map((item) => item.productCatalogVariantId),
          swagPackInput?.packaging?.productCatalogVariantId ?? null
        ].filter(Boolean)
      )
    ] as string[];

    const products = await this.prisma.catalogProduct.findMany({
      where: { id: { in: productIds }, status: "ACTIVE" },
      include: {
        images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        pricingOptions: {
          where: { productCatalogVariantId: null },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
        }
      }
    });

    const catalogVariants = catalogVariantIds.length
      ? await this.prisma.catalogVariant.findMany({
          where: { id: { in: catalogVariantIds } },
          include: {
            images: { include: { image: true }, orderBy: { createdAt: "asc" } },
            pricingOptions: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
            selectedOptions: {
              include: {
                variantOption: {
                  include: {
                    variant: true
                  }
                }
              },
              orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
            },
            product: {
              include: {
                images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }
              }
            }
          }
        })
      : [];

    const productById = new Map(products.map((item) => [item.id, item]));
    const catalogVariantById = new Map(catalogVariants.map((item) => [item.id, item]));

    const bulkOrderItems = bulkItemsPayload.map((item) =>
      this.resolveCheckoutItem({
        item,
        itemType: "BULK",
        pricingQuantity: item.quantity,
        requestedQuantity: item.quantity,
        quantityPerPack: null,
        enforceMinQty: true,
        requirePackagingProduct: false,
        productById,
        catalogVariantById
      })
    );

    const swagPackQuantity = swagPackInput?.packQuantity ?? 25;

    const swagPackOrderItems = swagPackItemsPayload.map((item) =>
      this.resolveCheckoutItem({
        item,
        itemType: "SWAG_PACK",
        pricingQuantity: swagPackQuantity,
        requestedQuantity: swagPackQuantity * item.quantityPerPack,
        quantityPerPack: item.quantityPerPack,
        enforceMinQty: false,
        requirePackagingProduct: false,
        productById,
        catalogVariantById
      })
    );

    const packagingOrderItem = swagPackInput?.packaging
      ? this.resolveCheckoutItem({
          item: {
            ...swagPackInput.packaging,
            quantityPerPack: 1
          },
          itemType: "PACKAGING",
          pricingQuantity: swagPackQuantity,
          requestedQuantity: swagPackQuantity,
          quantityPerPack: 1,
          enforceMinQty: false,
          requirePackagingProduct: true,
          productById,
          catalogVariantById
        })
      : null;

    const orderItems = [
      ...bulkOrderItems,
      ...swagPackOrderItems,
      ...(packagingOrderItem ? [packagingOrderItem] : [])
    ];

    const totalPrice = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const orderType =
      bulkOrderItems.length && (swagPackOrderItems.length || packagingOrderItem)
        ? "COMBINED"
        : swagPackOrderItems.length || packagingOrderItem
          ? "SWAG_PACK"
          : "BULK";

    const projectName =
      this.toNullableString(swagPackInput?.name) ??
      `${input.name.trim()} catalog order`;

    const project = await this.prisma.project.create({
      data: {
        userId,
        type: orderType,
        name: projectName,
        email: input.email.trim().toLowerCase(),
        companyName: this.toNullableString(input.companyName),
        phone: this.toNullableString(input.phone),
        notes: this.toNullableString(input.notes),
        logoUrl: this.toNullableString(input.logoUrl),
        logoKey: this.toNullableString(input.logoKey),
        swagPackName: this.toNullableString(swagPackInput?.name),
        budgetPerPerson:
          input.budgetPerPerson != null ? new Prisma.Decimal(input.budgetPerPerson) : null,
        neededByDate: input.neededByDate ?? null,
        packQuantity: swagPackOrderItems.length || packagingOrderItem ? swagPackQuantity : 1,
        items: {
          create: orderItems.map((item) => ({
            productId: item.productId,
            productCatalogVariantId: item.productCatalogVariantId,
            productName: item.productName,
            variantName: item.variantName,
            itemType: item.itemType,
            quantity: item.quantity,
            quantityPerPack: item.quantityPerPack,
            unitPrice: new Prisma.Decimal(item.unitPrice),
            totalPrice: new Prisma.Decimal(item.totalPrice),
            imageUrl: item.imageUrl
          }))
        }
      }
    });

    const order = await this.prisma.$transaction(async (tx) => {
      for (const item of orderItems) {
        if (item.productCatalogVariantId) {
          await tx.catalogVariant.update({
            where: { id: item.productCatalogVariantId },
            data: {
              stock: {
                decrement: item.quantity
              }
            }
          });
        } else {
          await tx.catalogProduct.update({
            where: { id: item.productId },
            data: {
              baseStock: {
                decrement: item.quantity
              }
            }
          });
        }
      }

      return tx.catalogOrder.create({
        data: {
        userId,
        projectId: project.id,
        type: orderType,
        status: "PENDING_REVIEW",
        email: input.email.trim().toLowerCase(),
        name: input.name.trim(),
        companyName: this.toNullableString(input.companyName),
        phone: this.toNullableString(input.phone),
        notes: this.toNullableString(input.notes),
        logoUrl: this.toNullableString(input.logoUrl),
        logoKey: this.toNullableString(input.logoKey),
        packQuantity: swagPackOrderItems.length || packagingOrderItem ? swagPackQuantity : 1,
        totalPrice: new Prisma.Decimal(totalPrice),
        currency: "USD",
        items: {
          create: orderItems.map((item, index) => ({
            product: {
              connect: {
                id: item.productId
              }
            },
            ...(item.productCatalogVariantId
              ? {
                  productCatalogVariant: {
                    connect: {
                      id: item.productCatalogVariantId
                    }
                  }
                }
              : {}),
            productName: item.productName,
            variantName: item.variantName,
            itemType: item.itemType,
            quantity: item.quantity,
            quantityPerPack: item.quantityPerPack,
            unitPrice: new Prisma.Decimal(item.unitPrice),
            totalPrice: new Prisma.Decimal(item.totalPrice),
            imageUrl: item.imageUrl,
            sortOrder: index
          }))
        },
        stockReserved: true
        },
        include: {
          items: true,
          project: true
        }
      });
    });

    try {
      await this.emailService.sendCatalogOrderAdminEmail({
        id: order.id,
        type: order.type,
        name: order.name,
        email: order.email,
        companyName: order.companyName,
        phone: order.phone,
        notes: order.notes,
        totalPrice: this.requireNumber(
          this.decimalToNumber(order.totalPrice),
          "Order total price is missing"
        ),
        packQuantity: order.packQuantity,
        items: order.items.map((item) => ({
          productName: item.productName,
          variantName: item.variantName ?? null,
          quantity: item.quantity,
          quantityPerPack: item.quantityPerPack ?? null,
          unitPrice: this.requireNumber(
            this.decimalToNumber(item.unitPrice),
            `Unit price is missing for product "${item.productName}"`
          ),
          totalPrice: this.requireNumber(
            this.decimalToNumber(item.totalPrice),
            `Total price is missing for product "${item.productName}"`
          )
        }))
      });
      await this.emailService.sendCatalogOrderUserAckEmail(order.email, order.name);
    } catch {}

    return this.serializeOrderDetail(order);
  }

  private resolveCheckoutItem(params: {
    item: {
      productId: string;
      productCatalogVariantId?: string | null;
      quantity?: number;
      quantityPerPack?: number;
    };
    itemType: "BULK" | "SWAG_PACK" | "PACKAGING";
    pricingQuantity: number;
    requestedQuantity: number;
    quantityPerPack: number | null;
    enforceMinQty: boolean;
    requirePackagingProduct: boolean;
    productById: Map<string, any>;
    catalogVariantById: Map<string, any>;
  }): ResolvedCheckoutItem {
    const {
      item,
      itemType,
      pricingQuantity,
      requestedQuantity,
      quantityPerPack,
      enforceMinQty,
      requirePackagingProduct,
      productById,
      catalogVariantById
    } = params;

    const product = productById.get(item.productId);
    if (!product) {
      throw new BadRequestException("Some products are unavailable");
    }

    if (requirePackagingProduct && !product.isPackaging) {
      throw new BadRequestException(`${product.name} is not a packaging product`);
    }

    const productCatalogVariant = item.productCatalogVariantId
      ? catalogVariantById.get(item.productCatalogVariantId)
      : null;

    if (
      item.productCatalogVariantId &&
      (!productCatalogVariant || productCatalogVariant.productId !== product.id)
    ) {
      throw new BadRequestException("Some selected variants are invalid");
    }

    const minQty = productCatalogVariant?.minQty ?? product.minQty;
    if (enforceMinQty && requestedQuantity < minQty) {
      throw new BadRequestException(`Minimum quantity for ${product.name} is ${minQty}`);
    }

    const stock = productCatalogVariant?.stock ?? product.baseStock;
    if (stock <= 0) {
      throw new BadRequestException(`${product.name} is currently out of stock`);
    }

    if (requestedQuantity > stock) {
      throw new BadRequestException(`${product.name} does not have enough stock for the requested quantity`);
    }

    const basePrice = this.decimalToNumber(productCatalogVariant?.price ?? product.basePrice);
    const pricingOptions = productCatalogVariant?.pricingOptions?.length
      ? productCatalogVariant.pricingOptions
      : product.pricingOptions;
    const unitPrice = this.requireNumber(
      this.resolveUnitPrice(basePrice, pricingOptions, pricingQuantity),
      "Unable to resolve unit price for the selected product/variant"
    );
    const variantName = productCatalogVariant
      ? this.buildCatalogVariantDisplayName(productCatalogVariant)
      : null;
    const imageUrl =
      productCatalogVariant?.images?.[0]?.image?.url ??
      product.images?.[0]?.url ??
      null;

    return {
      itemType,
      productId: product.id,
      productCatalogVariantId: productCatalogVariant?.id ?? null,
      productName: product.name,
      variantName,
      quantity: requestedQuantity,
      quantityPerPack,
      unitPrice,
      totalPrice: unitPrice * requestedQuantity,
      imageUrl
    };
  }
}
