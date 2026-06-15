
import {
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  CreateCollectionDto,
  ListCollectionsQuery,
  UpdateCollectionDto
} from "../dto/collection.dto";
import { EmailService } from "../../email/email.service";
import { PrismaService } from "../../prisma/prisma.service";
import { StorageService } from "../../storage/storage.service";
import { CatalogSharedService } from "../common/catalog-shared.service";

@Injectable()
export class CatalogCollectionsService extends CatalogSharedService {
  constructor(
    prisma: PrismaService,
    storage: StorageService,
    emailService: EmailService
  ) {
    super(prisma, storage, emailService);
  }

  async listCollections(query: ListCollectionsQuery) {
    const where = query.search
      ? {
          name: {
            contains: query.search,
            mode: "insensitive" as const
          }
        }
      : undefined;

    const [total, collections] = await this.prisma.$transaction([
      this.prisma.catalogCollection.count({ where }),
      this.prisma.catalogCollection.findMany({
        where,
        orderBy: [{ name: "asc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      })
    ]);

    return {
      items: collections.map((item) => this.serializeSimpleEntity(item)),
      pagination: this.makePagination(query.page, query.pageSize, total)
    };
  }


  async getCollectionById(id: string) {
    const collection = await this.prisma.catalogCollection.findUnique({ where: { id } });
    if (!collection) throw new NotFoundException("Collection not found");
    return this.serializeSimpleEntity(collection);
  }


  async createCollection(input: CreateCollectionDto) {
    const slug = await this.ensureUniqueSlug("catalogCollection", input.name);

    const collection = await this.prisma.catalogCollection.create({
      data: {
        name: input.name.trim(),
        slug,
        description: this.toNullableString(input.description),
        imageUrl: this.toNullableString(input.imageUrl),
        imageKey: this.toNullableString(input.imageKey)
      }
    });

    return this.serializeSimpleEntity(collection);
  }


  async updateCollection(id: string, input: UpdateCollectionDto) {
    const existing = await this.prisma.catalogCollection.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Collection not found");

    const data: Prisma.CatalogCollectionUpdateInput = {};
    if (input.name !== undefined) {
      data.name = input.name.trim();
      data.slug = await this.ensureUniqueSlug("catalogCollection", input.name, id);
    }
    if (input.description !== undefined) data.description = this.toNullableString(input.description);
    if (input.removeImage) {
      data.imageUrl = null;
      data.imageKey = null;
    } else {
      if (input.imageUrl !== undefined) data.imageUrl = this.toNullableString(input.imageUrl);
      if (input.imageKey !== undefined) data.imageKey = this.toNullableString(input.imageKey);
    }

    const updated = await this.prisma.catalogCollection.update({
      where: { id },
      data
    });

    if (existing.imageKey && input.removeImage) {
      await this.storage.deleteObjectQuietly(existing.imageKey);
    }

    return this.serializeSimpleEntity(updated);
  }


  async deleteCollection(id: string) {
    const existing = await this.prisma.catalogCollection.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Collection not found");
    await this.prisma.catalogCollection.delete({ where: { id } });
    if (existing.imageKey) {
      await this.storage.deleteObjectQuietly(existing.imageKey);
    }
    return { ok: true };
  }

}
