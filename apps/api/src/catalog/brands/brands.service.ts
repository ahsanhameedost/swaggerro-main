
import {
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  CreateBrandDto,
  ListBrandsQuery,
  UpdateBrandDto
} from "../dto/brand.dto";
import { EmailService } from "../../email/email.service";
import { PrismaService } from "../../prisma/prisma.service";
import { StorageService } from "../../storage/storage.service";
import { CatalogSharedService } from "../common/catalog-shared.service";

@Injectable()
export class CatalogBrandsService extends CatalogSharedService {
  constructor(
    prisma: PrismaService,
    storage: StorageService,
    emailService: EmailService
  ) {
    super(prisma, storage, emailService);
  }

  async listBrands(query: ListBrandsQuery) {
    const where = query.search
      ? {
          name: {
            contains: query.search,
            mode: "insensitive" as const
          }
        }
      : undefined;

    const [total, brands] = await this.prisma.$transaction([
      this.prisma.catalogBrand.count({ where }),
      this.prisma.catalogBrand.findMany({
        where,
        orderBy: [{ name: "asc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      })
    ]);

    return {
      items: brands.map((item) => this.serializeSimpleEntity(item)),
      pagination: this.makePagination(query.page, query.pageSize, total)
    };
  }

  async getBrandById(id: string) {
    const brand = await this.prisma.catalogBrand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException("Brand not found");
    return this.serializeSimpleEntity(brand);
  }

  async createBrand(input: CreateBrandDto) {
    const slug = await this.ensureUniqueSlug("catalogBrand", input.name);

    const brand = await this.prisma.catalogBrand.create({
      data: {
        name: input.name.trim(),
        slug,
        description: this.toNullableString(input.description),
        imageUrl: this.toNullableString(input.imageUrl),
        imageKey: this.toNullableString(input.imageKey)
      }
    });

    return this.serializeSimpleEntity(brand);
  }

  async updateBrand(id: string, input: UpdateBrandDto) {
    const existing = await this.prisma.catalogBrand.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Brand not found");

    const data: Prisma.CatalogBrandUpdateInput = {};
    if (input.name !== undefined) {
      data.name = input.name.trim();
      data.slug = await this.ensureUniqueSlug("catalogBrand", input.name, id);
    }
    if (input.description !== undefined) data.description = this.toNullableString(input.description);
    if (input.removeImage) {
      data.imageUrl = null;
      data.imageKey = null;
    } else {
      if (input.imageUrl !== undefined) data.imageUrl = this.toNullableString(input.imageUrl);
      if (input.imageKey !== undefined) data.imageKey = this.toNullableString(input.imageKey);
    }

    const updated = await this.prisma.catalogBrand.update({
      where: { id },
      data
    });

    if (existing.imageKey && input.removeImage) {
      await this.storage.deleteObjectQuietly(existing.imageKey);
    }

    return this.serializeSimpleEntity(updated);
  }

  async deleteBrand(id: string) {
    const existing = await this.prisma.catalogBrand.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Brand not found");
    await this.prisma.catalogBrand.delete({ where: { id } });
    if (existing.imageKey) {
      await this.storage.deleteObjectQuietly(existing.imageKey);
    }
    return { ok: true };
  }
}
