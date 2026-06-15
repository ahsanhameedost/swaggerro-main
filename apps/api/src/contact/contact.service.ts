import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { EMAIL_QUEUE, JOB_CONTACT_EMAIL } from "../email/email.constants";
import type { ContactCreateInput, ContactMessagesQuery } from "./contact.dto";

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue
  ) {}

  async createAndEnqueue(input: ContactCreateInput): Promise<{ id: string }> {
    this.logger.log(`createAndEnqueue start email=${input.email} company=${input.companyName}`);

    const record = await this.prisma.contactMessage.create({
      data: {
        companyName: input.companyName.trim(),
        contactName: input.contactName.trim(),
        email: input.email.trim().toLowerCase(),
        phone: input.phone.trim(),
        shippingAddress: input.shippingAddress?.trim(),
        city: input.city?.trim(),
        state: input.state?.trim(),
        zip: input.zip?.trim(),
        eventName: input.eventName?.trim(),
        inHandDate: input.inHandDate,
        budget: input.budget?.trim(),
        artworkReady: input.artworkReady?.trim(),
        additionalNotes: input.additionalNotes?.trim(),
        products: input.products?.length
          ? {
              create: input.products.map((product) => ({
                productCategory: product.productCategory.trim(),
                totalQuantity: product.totalQuantity,
                productDescription: product.productDescription?.trim(),
                colors: product.colors?.trim(),
                targetUnitPrice: product.targetUnitPrice,
                decorationMethod: product.decorationMethod?.trim(),
                decorationNotes: product.decorationNotes?.trim()
              }))
            }
          : undefined
      },
      select: { id: true }
    });

    const job = await this.emailQueue.add(
      JOB_CONTACT_EMAIL,
      { contactMessageId: record.id },
      {
        attempts: 5,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false
      }
    );

    this.logger.log(`email job queued jobId=${job.id} contactMessageId=${record.id}`);
    return record;
  }

  async listMessages(query: ContactMessagesQuery) {
    const where = query.search
      ? {
          OR: [
            { companyName: { contains: query.search, mode: "insensitive" as const } },
            { contactName: { contains: query.search, mode: "insensitive" as const } },
            { email: { contains: query.search, mode: "insensitive" as const } }
          ]
        }
      : undefined;

    const skip = (query.page - 1) * query.pageSize;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.contactMessage.count({ where }),
      this.prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: query.pageSize,
        include: {
          products: {
            select: { id: true }
          }
        }
      })
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        companyName: item.companyName,
        contactName: item.contactName,
        email: item.email,
        phone: item.phone,
        eventName: item.eventName,
        createdAt: item.createdAt.toISOString(),
        productsCount: item.products.length
      })),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize))
      }
    };
  }

  async getMessageById(id: string) {
    const message = await this.prisma.contactMessage.findUnique({
      where: { id },
      include: {
        products: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!message) {
      throw new NotFoundException("Contact message not found");
    }

    return {
      ...message,
      createdAt: message.createdAt.toISOString(),
      emailedAt: message.emailedAt?.toISOString() ?? null,
      inHandDate: message.inHandDate?.toISOString() ?? null,
      products: message.products.map((product) => ({
        ...product,
        createdAt: product.createdAt.toISOString()
      }))
    };
  }

  async deleteMessage(id: string) {
    const existing = await this.prisma.contactMessage.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existing) {
      throw new NotFoundException("Contact message not found");
    }

    await this.prisma.contactMessage.delete({
      where: { id }
    });

    return { ok: true };
  }
}
