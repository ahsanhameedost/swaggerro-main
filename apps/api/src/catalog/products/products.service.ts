import {
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  CreateProductDto,
  ListProductsQuery,
  UpdateProductDto
} from "../dto/product.dto";
import { EmailService } from "../../email/email.service";
import { PrismaService } from "../../prisma/prisma.service";
import { StorageService } from "../../storage/storage.service";
import { CatalogSharedService } from "../common/catalog-shared.service";
import { parseCsv, toCsv } from "../common/csv";

const IMPORT_HEADERS = [
  "name",
  "slug",
  "shortDescription",
  "description",
  "status",
  "category",
  "basePrice",
  "compareAtPrice",
  "minQty",
  "baseStock",
  "currency",
  "isPackaging",
  "bulkPricingEnabled",
  "imageUrl",
  "tiers"
];

function parseBool(value: string | undefined, fallback = false) {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "y"].includes(value.trim().toLowerCase());
}

function parseNum(value: string | undefined): number | null {
  if (value == null || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// "1-24:18 | 25-99:17 | 100+:16" -> pricingOptions[]
function parseTiers(value: string | undefined) {
  if (!value || !value.trim()) return [] as any[];
  return value
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part, index) => {
      const [range, priceStr] = part.split(":").map((s) => s.trim());
      const price = Number(priceStr);
      if (!range || !Number.isFinite(price)) return null;
      if (range.endsWith("+")) {
        const from = Number(range.slice(0, -1));
        return { qtyFrom: from, qtyTo: null, price, isOnward: true, sortOrder: index };
      }
      const [from, to] = range.split("-").map((s) => Number(s));
      if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
      return { qtyFrom: from, qtyTo: to, price, isOnward: false, sortOrder: index };
    })
    .filter(Boolean) as any[];
}

function formatTiers(options: Array<{ qtyFrom: number; qtyTo: number | null; price: any; isOnward: boolean }>) {
  return options
    .slice()
    .sort((a, b) => a.qtyFrom - b.qtyFrom)
    .map((o) => (o.isOnward || o.qtyTo == null ? `${o.qtyFrom}+:${o.price}` : `${o.qtyFrom}-${o.qtyTo}:${o.price}`))
    .join(" | ");
}

@Injectable()
export class CatalogProductsService extends CatalogSharedService {
  constructor(
    prisma: PrismaService,
    storage: StorageService,
    emailService: EmailService
  ) {
    super(prisma, storage, emailService);
  }

  async listProducts(query: ListProductsQuery) {
    const where: Prisma.CatalogProductWhereInput = {
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { slug: { contains: query.search, mode: "insensitive" } },
              { shortDescription: { contains: query.search, mode: "insensitive" } }
            ]
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.collectionId
        ? { collections: { some: { collectionId: query.collectionId } } }
        : {})
    };

    const [total, products] = await this.prisma.$transaction([
      this.prisma.catalogProduct.count({ where }),
      this.prisma.catalogProduct.findMany({
        where,
        include: {
          category: true,
          collections: { include: { collection: true } },
          images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], take: 1 },
          productCatalogVariants: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
          },
          shippingProfile: {
            include: {
              countryRules: {
                orderBy: [{ countryCode: "asc" }]
              }
            }
          }
        },
        orderBy: [{ updatedAt: "desc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      })
    ]);

    return {
      items: products.map((product) => this.serializeProductListItem(product)),
      pagination: this.makePagination(query.page, query.pageSize, total)
    };
  }

  async getProductById(id: string) {
    const product = await this.prisma.catalogProduct.findUnique({
      where: { id },
      include: this.buildProductDetailInclude()
    });

    if (!product) throw new NotFoundException("Product not found");
    return this.serializeProductDetail(product);
  }

  // ---- CSV export / import (WooCommerce-style) -----------------------------

  async exportProductsCsv(): Promise<string> {
    const products = await this.prisma.catalogProduct.findMany({
      include: {
        category: true,
        images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], take: 1 },
        pricingOptions: {
          where: { productCatalogVariantId: null },
          orderBy: [{ sortOrder: "asc" }, { qtyFrom: "asc" }]
        }
      },
      orderBy: [{ name: "asc" }]
    });

    const rows = products.map((p) => ({
      name: p.name,
      slug: p.slug,
      shortDescription: p.shortDescription,
      description: p.description ?? "",
      status: p.status,
      category: p.category?.name ?? "",
      basePrice: p.basePrice != null ? this.decimalToNumber(p.basePrice) : "",
      compareAtPrice: p.compareAtPrice != null ? this.decimalToNumber(p.compareAtPrice) : "",
      minQty: p.minQty,
      baseStock: p.baseStock,
      currency: p.currency,
      isPackaging: p.isPackaging ? "true" : "false",
      bulkPricingEnabled: p.bulkPricingEnabled ? "true" : "false",
      imageUrl: p.images[0]?.url ?? "",
      tiers: formatTiers(
        p.pricingOptions.map((o) => ({
          qtyFrom: o.qtyFrom,
          qtyTo: o.qtyTo,
          price: this.decimalToNumber(o.price),
          isOnward: o.isOnward
        }))
      )
    }));

    return toCsv(IMPORT_HEADERS, rows);
  }

  templateCsv(): string {
    return toCsv(IMPORT_HEADERS, [
      {
        name: "Sample Tee",
        slug: "",
        shortDescription: "Soft cotton tee",
        description: "Full description here",
        status: "ACTIVE",
        category: "Apparel",
        basePrice: "18",
        compareAtPrice: "24",
        minQty: "1",
        baseStock: "500",
        currency: "USD",
        isPackaging: "false",
        bulkPricingEnabled: "true",
        imageUrl: "",
        tiers: "1-24:18 | 25-99:17 | 100+:16"
      }
    ]);
  }

  private async findOrCreateCategoryByName(name: string): Promise<string> {
    const trimmed = name.trim();
    const existing = await this.prisma.catalogCategory.findFirst({
      where: { name: { equals: trimmed, mode: "insensitive" } },
      select: { id: true }
    });
    if (existing) return existing.id;
    const slug = await this.ensureUniqueSlug("catalogCategory", trimmed);
    const created = await this.prisma.catalogCategory.create({
      data: { name: trimmed, slug },
      select: { id: true }
    });
    return created.id;
  }

  async importProductsCsv(csv: string) {
    const rows = parseCsv(csv);
    const result = {
      total: rows.length,
      created: 0,
      updated: 0,
      errors: [] as Array<{ row: number; name: string; message: string }>
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // header is row 1
      const name = (row.name ?? "").trim();
      try {
        if (!name) throw new Error("name is required");
        const basePrice = parseNum(row.basePrice);
        if (basePrice == null) throw new Error("basePrice is required and must be a number");

        const categoryId = row.category?.trim()
          ? await this.findOrCreateCategoryByName(row.category)
          : null;

        const statusRaw = (row.status ?? "").trim().toUpperCase();
        const status = ["DRAFT", "ACTIVE", "ARCHIVED"].includes(statusRaw)
          ? (statusRaw as "DRAFT" | "ACTIVE" | "ARCHIVED")
          : "DRAFT";

        const input = {
          name,
          shortDescription: (row.shortDescription ?? "").trim() || name,
          description: (row.description ?? "").trim() || null,
          status,
          categoryId,
          collectionIds: [],
          isPackaging: parseBool(row.isPackaging),
          bulkPricingEnabled: parseBool(row.bulkPricingEnabled, true),
          shippingProfileId: null,
          weightOz: null,
          lengthIn: null,
          widthIn: null,
          heightIn: null,
          basePrice,
          compareAtPrice: parseNum(row.compareAtPrice),
          minQty: parseNum(row.minQty) ?? 1,
          baseStock: parseNum(row.baseStock) ?? 0,
          currency: (row.currency ?? "").trim() || "USD",
          images: row.imageUrl?.trim() ? [{ url: row.imageUrl.trim(), sortOrder: 0 }] : [],
          variantGroups: [],
          productCatalogVariants: [],
          pricingOptions: parseTiers(row.tiers)
        } as unknown as CreateProductDto;

        // Tier price must not exceed base price (matches DTO rule).
        for (const tier of input.pricingOptions) {
          if (tier.price > basePrice) {
            throw new Error(`tier price ${tier.price} exceeds basePrice ${basePrice}`);
          }
        }

        const slug = row.slug?.trim();
        const existing = slug
          ? await this.prisma.catalogProduct.findUnique({ where: { slug }, select: { id: true } })
          : await this.prisma.catalogProduct.findFirst({
              where: { name: { equals: name, mode: "insensitive" } },
              select: { id: true }
            });

        if (existing) {
          await this.updateProduct(existing.id, input as unknown as UpdateProductDto);
          result.updated++;
        } else {
          await this.createProduct(input);
          result.created++;
        }
      } catch (error) {
        result.errors.push({
          row: rowNumber,
          name,
          message: error instanceof Error ? error.message : "Import failed"
        });
      }
    }

    return result;
  }

  async createProduct(input: CreateProductDto) {
    return await this.prisma.$transaction(async (tx) => {
      const slug = await this.ensureUniqueSlug("catalogProduct", input.name, undefined, tx);

      const product = await tx.catalogProduct.create({
        data: {
          slug,
          name: input.name.trim(),
          shortDescription: input.shortDescription.trim(),
          description: this.toNullableString(input.description),
          status: input.status ?? "DRAFT",
          categoryId: input.categoryId || null,
          isPackaging: input.isPackaging === true,
          bulkPricingEnabled: input.bulkPricingEnabled ?? true,
          shippingProfileId: input.shippingProfileId || null,
          weightOz: input.weightOz != null ? new Prisma.Decimal(input.weightOz) : null,
          lengthIn: input.lengthIn != null ? new Prisma.Decimal(input.lengthIn) : null,
          widthIn: input.widthIn != null ? new Prisma.Decimal(input.widthIn) : null,
          heightIn: input.heightIn != null ? new Prisma.Decimal(input.heightIn) : null,
          basePrice: input.basePrice != null ? new Prisma.Decimal(input.basePrice) : null,
          compareAtPrice: input.compareAtPrice != null ? new Prisma.Decimal(input.compareAtPrice) : null,
          minQty: input.minQty ?? 1,
          baseStock: input.productCatalogVariants.length ? 0 : input.baseStock ?? 0,
          currency: input.currency || "USD"
        }
      });

      await this.replaceProductRelations(tx, product.id, input);
      return this.getProductByIdWithTx(tx, product.id);
    });
  }

  async updateProduct(id: string, input: UpdateProductDto) {
    return await this.prisma.$transaction(async (tx) => {
      const existing = await tx.catalogProduct.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException("Product not found");

      const data: Prisma.CatalogProductUpdateInput = {};

      if (input.name !== undefined) {
        data.name = input.name.trim();
        data.slug = await this.ensureUniqueSlug(
          "catalogProduct",
          input.name,
          existing.id,
          tx
        );
      }

      if (input.shortDescription !== undefined) {
        data.shortDescription = input.shortDescription.trim();
      }

      if (input.description !== undefined) {
        data.description = this.toNullableString(input.description);
      }

      if (input.status !== undefined) {
        data.status = input.status;
      }

if (input.categoryId !== undefined) data.category = input.categoryId ? { connect: { id: input.categoryId } } : { disconnect: true };

      if (input.isPackaging !== undefined) {
        data.isPackaging = input.isPackaging === true;
      }

      if (input.bulkPricingEnabled !== undefined) {
        data.bulkPricingEnabled = input.bulkPricingEnabled === true;
      }

      if (input.shippingProfileId !== undefined) {
        data.shippingProfile = input.shippingProfileId
          ? { connect: { id: input.shippingProfileId } }
          : { disconnect: true };
      }

      if (input.weightOz !== undefined) {
        data.weightOz = input.weightOz != null ? new Prisma.Decimal(input.weightOz) : null;
      }

      if (input.lengthIn !== undefined) {
        data.lengthIn = input.lengthIn != null ? new Prisma.Decimal(input.lengthIn) : null;
      }

      if (input.widthIn !== undefined) {
        data.widthIn = input.widthIn != null ? new Prisma.Decimal(input.widthIn) : null;
      }

      if (input.heightIn !== undefined) {
        data.heightIn = input.heightIn != null ? new Prisma.Decimal(input.heightIn) : null;
      }

      if (input.basePrice !== undefined) {
        data.basePrice =
          input.basePrice != null ? new Prisma.Decimal(input.basePrice) : null;
      }

      if (input.compareAtPrice !== undefined) {
        data.compareAtPrice =
          input.compareAtPrice != null ? new Prisma.Decimal(input.compareAtPrice) : null;
      }

      if (input.minQty !== undefined) {
        data.minQty = input.minQty;
      }

      if (input.baseStock !== undefined && !(input.productCatalogVariants?.length)) {
        data.baseStock = input.baseStock;
      }

      if (input.currency !== undefined) {
        data.currency = input.currency || "USD";
      }

      await tx.catalogProduct.update({
        where: { id },
        data
      });

      await this.replaceProductRelations(tx, id, input, true);
      return this.getProductByIdWithTx(tx, id);
    });
  }

  async deleteProduct(id: string) {
    await this.prisma.catalogProduct.delete({
      where: { id }
    });

    return { ok: true };
  }
}
