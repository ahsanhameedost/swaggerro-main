import { InjectQueue } from "@nestjs/bullmq";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException
} from "@nestjs/common";
import { Queue } from "bullmq";
import * as bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { EMAIL_QUEUE, JOB_SELLER_ONBOARDING_EMAIL } from "../email/email.constants";
import type {
  CreateStoreInput,
  ListStoresQuery,
  UpdateOwnStoreInput,
  UpdateStoreInput
} from "./dto/store.dto";

const SELLER_ROLE_NAME = "Seller";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function randomPassword() {
  // Avoids Math.random for nothing security-critical here, but keep it strong.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  const bytes = require("crypto").randomBytes(16) as Buffer;
  for (let i = 0; i < 14; i++) out += chars[bytes[i] % chars.length];
  return `${out}!9`;
}

@Injectable()
export class StoresService {
  private readonly logger = new Logger(StoresService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue
  ) {}

  private async ensureUniqueSlug(base: string, excludeId?: string) {
    const root = slugify(base) || "store";
    let candidate = root;
    let counter = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existing = await this.prisma.store.findUnique({ where: { slug: candidate } });
      if (!existing || existing.id === excludeId) return candidate;
      counter += 1;
      candidate = `${root}-${counter}`;
    }
  }

  private async resolveProductIds(productIds: string[]) {
    if (!productIds.length) return [] as string[];
    const unique = Array.from(new Set(productIds));
    const found = await this.prisma.catalogProduct.findMany({
      where: { id: { in: unique }, isPackaging: false },
      select: { id: true }
    });
    const foundIds = new Set(found.map((p) => p.id));
    // Preserve incoming order, drop any invalid ids.
    return unique.filter((id) => foundIds.has(id));
  }

  private async replaceStoreProducts(
    tx: Prisma.TransactionClient,
    storeId: string,
    productIds: string[]
  ) {
    await tx.storeProduct.deleteMany({ where: { storeId } });
    if (productIds.length) {
      await tx.storeProduct.createMany({
        data: productIds.map((productId, index) => ({ storeId, productId, sortOrder: index })),
        skipDuplicates: true
      });
    }
  }

  // ---- serialization -------------------------------------------------------

  private serializeProductCard(product: any) {
    const basePrice = product.basePrice != null ? Number(product.basePrice) : null;
    const variantPrices = (product.productCatalogVariants ?? []).map((v: any) => Number(v.price));
    const hasVariants = variantPrices.length > 0;
    const lowestPrice = hasVariants ? Math.min(...variantPrices) : basePrice ?? 0;
    const highestPrice = hasVariants ? Math.max(...variantPrices) : basePrice ?? 0;
    const tierPrices = (product.pricingOptions ?? []).map((p: any) => Number(p.price));
    const floorCandidates = [basePrice, lowestPrice, ...tierPrices].filter(
      (n): n is number => typeof n === "number" && Number.isFinite(n) && n > 0
    );
    const floorPrice = floorCandidates.length ? Math.min(...floorCandidates) : lowestPrice;

    const colorGroup = (product.variants ?? []).find((v: any) => v.type === "COLOR");
    const swatches = colorGroup
      ? (colorGroup.options ?? []).map((o: any) => ({ name: o.label, hex: o.colorHex ?? null }))
      : [];

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      shortDescription: product.shortDescription,
      status: "ACTIVE",
      imageUrl: product.images?.[0]?.url ?? null,
      category: product.category
        ? { id: product.category.id, name: product.category.name, slug: product.category.slug }
        : null,
      collections: [],
      variantCount: (product.productCatalogVariants ?? []).length,
      hasVariants,
      isPackaging: Boolean(product.isPackaging),
      bulkPricingEnabled: product.bulkPricingEnabled !== false,
      basePrice,
      compareAtPrice: product.compareAtPrice != null ? Number(product.compareAtPrice) : null,
      lowestPrice,
      highestPrice,
      minPrice: lowestPrice,
      floorPrice,
      baseStock: product.baseStock ?? 0,
      minQty: product.minQty,
      currency: product.currency,
      swatches,
      shipping: { badges: [] as string[] },
      pricingOptions: (product.pricingOptions ?? []).map((p: any) => ({
        qtyFrom: p.qtyFrom,
        qtyTo: p.qtyTo,
        price: Number(p.price),
        isOnward: p.isOnward,
        sortOrder: p.sortOrder
      })),
      createdAt:
        product.createdAt instanceof Date ? product.createdAt.toISOString() : product.createdAt ?? "",
      updatedAt:
        product.updatedAt instanceof Date ? product.updatedAt.toISOString() : product.updatedAt ?? ""
    };
  }

  private async loadProductCards(productIds: string[]) {
    if (!productIds.length) return [] as any[];
    const products = await this.prisma.catalogProduct.findMany({
      where: { id: { in: productIds } },
      include: {
        category: true,
        images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], take: 1 },
        productCatalogVariants: true,
        variants: { include: { options: { orderBy: [{ sortOrder: "asc" }] } } },
        pricingOptions: { where: { productCatalogVariantId: null }, orderBy: [{ sortOrder: "asc" }] }
      }
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    // Preserve the curated order.
    return productIds.map((id) => byId.get(id)).filter(Boolean).map((p) => this.serializeProductCard(p));
  }

  private serializeStore(store: any, productCards: any[] = []) {
    return {
      id: store.id,
      slug: store.slug,
      name: store.name,
      companyName: store.companyName,
      status: store.status,
      ownerUserId: store.ownerUserId,
      owner: store.owner
        ? { id: store.owner.id, email: store.owner.email, firstName: store.owner.firstName, lastName: store.owner.lastName }
        : null,
      applicationId: store.applicationId,
      heroHeadline: store.heroHeadline,
      heroSubcopy: store.heroSubcopy,
      logoUrl: store.logoUrl,
      logoKey: store.logoKey,
      theme: {
        primary: store.themePrimary,
        primarySoft: store.themePrimarySoft,
        primaryForeground: store.themePrimaryForeground
      },
      productCount: store._count?.products ?? store.products?.length ?? productCards.length,
      products: productCards,
      createdAt: store.createdAt instanceof Date ? store.createdAt.toISOString() : store.createdAt,
      updatedAt: store.updatedAt instanceof Date ? store.updatedAt.toISOString() : store.updatedAt
    };
  }

  private themeData(theme?: { primary?: string; primarySoft?: string; primaryForeground?: string }) {
    if (!theme) return {};
    return {
      ...(theme.primary ? { themePrimary: theme.primary } : {}),
      ...(theme.primarySoft ? { themePrimarySoft: theme.primarySoft } : {}),
      ...(theme.primaryForeground ? { themePrimaryForeground: theme.primaryForeground } : {})
    };
  }

  // ---- admin ---------------------------------------------------------------

  async listStores(query: ListStoresQuery) {
    const where: Prisma.StoreWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { slug: { contains: query.search, mode: "insensitive" } },
              { companyName: { contains: query.search, mode: "insensitive" } }
            ]
          }
        : {})
    };

    const skip = (query.page - 1) * query.pageSize;
    const [total, stores] = await this.prisma.$transaction([
      this.prisma.store.count({ where }),
      this.prisma.store.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: query.pageSize,
        include: { owner: true, _count: { select: { products: true } } }
      })
    ]);

    return {
      items: stores.map((store) => this.serializeStore(store)),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize))
      }
    };
  }

  async getStoreById(id: string) {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: {
        owner: true,
        products: { orderBy: { sortOrder: "asc" }, select: { productId: true } }
      }
    });
    if (!store) throw new NotFoundException("Store not found");
    const cards = await this.loadProductCards(store.products.map((p) => p.productId));
    return this.serializeStore(store, cards);
  }

  async createStore(input: CreateStoreInput) {
    const slug = await this.ensureUniqueSlug(input.slug || input.name);
    const productIds = await this.resolveProductIds(input.productIds ?? []);

    const store = await this.prisma.$transaction(async (tx) => {
      const created = await tx.store.create({
        data: {
          slug,
          name: input.name.trim(),
          companyName: input.companyName?.trim() || null,
          status: input.status ?? "ACTIVE",
          ownerUserId: input.ownerUserId || null,
          heroHeadline: input.heroHeadline?.trim() || null,
          heroSubcopy: input.heroSubcopy?.trim() || null,
          logoUrl: input.logoUrl || null,
          logoKey: input.logoKey || null,
          ...this.themeData(input.theme)
        }
      });
      await this.replaceStoreProducts(tx, created.id, productIds);
      return created;
    });

    return this.getStoreById(store.id);
  }

  async updateStore(id: string, input: UpdateStoreInput) {
    const existing = await this.prisma.store.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Store not found");

    const data: Prisma.StoreUpdateInput = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.slug !== undefined && input.slug) {
      data.slug = await this.ensureUniqueSlug(input.slug, id);
    }
    if (input.companyName !== undefined) data.companyName = input.companyName?.trim() || null;
    if (input.status !== undefined) data.status = input.status;
    if (input.ownerUserId !== undefined) {
      data.owner = input.ownerUserId ? { connect: { id: input.ownerUserId } } : { disconnect: true };
    }
    if (input.heroHeadline !== undefined) data.heroHeadline = input.heroHeadline?.trim() || null;
    if (input.heroSubcopy !== undefined) data.heroSubcopy = input.heroSubcopy?.trim() || null;
    if (input.logoUrl !== undefined) data.logoUrl = input.logoUrl || null;
    if (input.logoKey !== undefined) data.logoKey = input.logoKey || null;
    Object.assign(data, this.themeData(input.theme));

    await this.prisma.$transaction(async (tx) => {
      await tx.store.update({ where: { id }, data });
      if (input.productIds !== undefined) {
        const productIds = await this.resolveProductIds(input.productIds);
        await this.replaceStoreProducts(tx, id, productIds);
      }
    });

    return this.getStoreById(id);
  }

  async deleteStore(id: string) {
    const existing = await this.prisma.store.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException("Store not found");
    await this.prisma.store.delete({ where: { id } });
    return { ok: true };
  }

  // ---- seller self-service -------------------------------------------------

  async getOwnStore(userId: string) {
    const store = await this.prisma.store.findUnique({
      where: { ownerUserId: userId },
      include: { products: { orderBy: { sortOrder: "asc" }, select: { productId: true } } }
    });
    if (!store) throw new NotFoundException("You do not have a store yet");
    const cards = await this.loadProductCards(store.products.map((p) => p.productId));
    return this.serializeStore(store, cards);
  }

  async updateOwnStore(userId: string, input: UpdateOwnStoreInput) {
    const store = await this.prisma.store.findUnique({ where: { ownerUserId: userId } });
    if (!store) throw new NotFoundException("You do not have a store yet");

    const data: Prisma.StoreUpdateInput = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.companyName !== undefined) data.companyName = input.companyName?.trim() || null;
    if (input.heroHeadline !== undefined) data.heroHeadline = input.heroHeadline?.trim() || null;
    if (input.heroSubcopy !== undefined) data.heroSubcopy = input.heroSubcopy?.trim() || null;
    if (input.logoUrl !== undefined) data.logoUrl = input.logoUrl || null;
    if (input.logoKey !== undefined) data.logoKey = input.logoKey || null;
    Object.assign(data, this.themeData(input.theme));

    await this.prisma.$transaction(async (tx) => {
      await tx.store.update({ where: { id: store.id }, data });
      if (input.productIds !== undefined) {
        const productIds = await this.resolveProductIds(input.productIds);
        await this.replaceStoreProducts(tx, store.id, productIds);
      }
    });

    return this.getStoreById(store.id);
  }

  // ---- public storefront ---------------------------------------------------

  async getPublicStoreBySlug(slug: string) {
    const store = await this.prisma.store.findFirst({
      where: { slug, status: "ACTIVE" },
      include: { products: { orderBy: { sortOrder: "asc" }, select: { productId: true } } }
    });
    if (!store) throw new NotFoundException("Store not found");
    const cards = await this.loadProductCards(store.products.map((p) => p.productId));
    return this.serializeStore(store, cards);
  }

  // ---- automatic onboarding ------------------------------------------------

  async onboardSellerFromApplication(applicationId: string) {
    const application = await this.prisma.sellerApplication.findUnique({
      where: { id: applicationId },
      include: { store: true }
    });
    if (!application) throw new NotFoundException("Application not found");
    if (application.store) {
      // Already onboarded — idempotent.
      return application.store;
    }

    const sellerRole = await this.prisma.role.findUnique({ where: { name: SELLER_ROLE_NAME } });
    if (!sellerRole) {
      throw new BadRequestException("Seller role is not seeded. Run db:seed.");
    }

    const email = application.email.trim().toLowerCase();
    const [firstName, ...rest] = application.contactName.trim().split(/\s+/);
    const lastName = rest.join(" ") || null;

    let tempPassword: string | null = null;
    let user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true, ownedStore: true }
    });

    if (user) {
      if (user.ownedStore) {
        throw new ConflictException("This contact already owns a store");
      }
      // Promote to Seller unless they're a super admin.
      if (user.role?.name !== "SUPER_ADMIN") {
        await this.prisma.user.update({ where: { id: user.id }, data: { roleId: sellerRole.id } });
      }
    } else {
      tempPassword = randomPassword();
      user = await this.prisma.user.create({
        data: {
          email,
          passwordHash: bcrypt.hashSync(tempPassword, 12),
          firstName: firstName || null,
          lastName,
          phone: application.phone || null,
          roleId: sellerRole.id
        },
        include: { role: true, ownedStore: true }
      });
    }

    const slug = await this.ensureUniqueSlug(application.companyName);
    const store = await this.prisma.store.create({
      data: {
        slug,
        name: application.companyName.trim(),
        companyName: application.companyName.trim(),
        status: "ACTIVE",
        ownerUserId: user!.id,
        applicationId: application.id,
        logoUrl: application.logoUrl,
        logoKey: application.logoKey,
        heroHeadline: `${application.companyName.trim()} Swag Store`,
        heroSubcopy: application.businessDescription?.slice(0, 200) || null
      }
    });

    try {
      await this.emailQueue.add(
        JOB_SELLER_ONBOARDING_EMAIL,
        { storeId: store.id, tempPassword },
        { attempts: 5, backoff: { type: "exponential", delay: 1000 }, removeOnComplete: true, removeOnFail: false }
      );
    } catch (error) {
      this.logger.error(
        `failed to enqueue seller onboarding email store=${store.id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    this.logger.log(`onboarded seller store=${store.id} slug=${slug} user=${user!.id}`);
    return store;
  }
}
