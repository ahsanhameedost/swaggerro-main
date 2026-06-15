
import {
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  CreateCategoryDto,
  ListCategoriesQuery,
  UpdateCategoryDto
} from "../dto/category.dto";
import { EmailService } from "../../email/email.service";
import { PrismaService } from "../../prisma/prisma.service";
import { StorageService } from "../../storage/storage.service";
import { CatalogSharedService } from "../common/catalog-shared.service";

@Injectable()
export class CatalogCategoriesService extends CatalogSharedService {
  constructor(
    prisma: PrismaService,
    storage: StorageService,
    emailService: EmailService
  ) {
    super(prisma, storage, emailService);
  }

  async listCategories(query: ListCategoriesQuery) {
    const where = query.search
      ? {
          name: {
            contains: query.search,
            mode: "insensitive" as const
          }
        }
      : undefined;

    const [total, categories] = await this.prisma.$transaction([
      this.prisma.catalogCategory.count({ where }),
      this.prisma.catalogCategory.findMany({
        where,
        orderBy: [{ name: "asc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      })
    ]);

    return {
      items: categories.map((item) => this.serializeSimpleEntity(item)),
      pagination: this.makePagination(query.page, query.pageSize, total)
    };
  }


  async getCategoryById(id: string) {
    const category = await this.prisma.catalogCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException("Category not found");
    return this.serializeSimpleEntity(category);
  }


  async createCategory(input: CreateCategoryDto) {
    const slug = await this.ensureUniqueSlug("catalogCategory", input.name);

    const category = await this.prisma.catalogCategory.create({
      data: {
        name: input.name.trim(),
        slug,
        description: this.toNullableString(input.description),
        imageUrl: this.toNullableString(input.imageUrl),
        imageKey: this.toNullableString(input.imageKey)
      }
    });

    return this.serializeSimpleEntity(category);
  }


  async updateCategory(id: string, input: UpdateCategoryDto) {
    const existing = await this.prisma.catalogCategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Category not found");

    const data: Prisma.CatalogCategoryUpdateInput = {};
    if (input.name !== undefined) {
      data.name = input.name.trim();
      data.slug = await this.ensureUniqueSlug("catalogCategory", input.name, id);
    }
    if (input.description !== undefined) data.description = this.toNullableString(input.description);
    if (input.removeImage) {
      data.imageUrl = null;
      data.imageKey = null;
    } else {
      if (input.imageUrl !== undefined) data.imageUrl = this.toNullableString(input.imageUrl);
      if (input.imageKey !== undefined) data.imageKey = this.toNullableString(input.imageKey);
    }

    const updated = await this.prisma.catalogCategory.update({
      where: { id },
      data
    });

    if (existing.imageKey && input.removeImage) {
      await this.storage.deleteObjectQuietly(existing.imageKey);
    }

    return this.serializeSimpleEntity(updated);
  }


  async deleteCategory(id: string) {
    const existing = await this.prisma.catalogCategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Category not found");
    await this.prisma.catalogCategory.delete({ where: { id } });
    if (existing.imageKey) {
      await this.storage.deleteObjectQuietly(existing.imageKey);
    }
    return { ok: true };
  }

}
