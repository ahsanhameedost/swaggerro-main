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
