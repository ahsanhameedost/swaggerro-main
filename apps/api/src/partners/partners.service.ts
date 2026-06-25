import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { EMAIL_QUEUE, JOB_PARTNER_APPLICATION_EMAIL } from "../email/email.constants";
import { StoresService } from "../stores/stores.service";
import type {
  CreateSellerApplicationInput,
  ListSellerApplicationsQuery,
  UpdateSellerApplicationStatusInput
} from "./dto/partner.dto";

@Injectable()
export class PartnersService {
  private readonly logger = new Logger(PartnersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storesService: StoresService,
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue
  ) {}

  async createApplication(input: CreateSellerApplicationInput): Promise<{ id: string }> {
    const record = await this.prisma.sellerApplication.create({
      data: {
        companyName: input.companyName.trim(),
        contactName: input.contactName.trim(),
        email: input.email.trim().toLowerCase(),
        phone: input.phone.trim(),
        companyAddress: input.companyAddress.trim(),
        businessDescription: input.businessDescription.trim(),
        industry: input.industry.trim(),
        country: input.country.trim(),
        website: input.website?.trim() || null,
        additionalInfo: input.additionalInfo?.trim() || null,
        logoUrl: input.logoUrl || null,
        logoKey: input.logoKey || null
      },
      select: { id: true }
    });

    // Optional admin notification — enqueue so a failed/slow SMTP never blocks
    // or fails the applicant's submission.
    try {
      await this.emailQueue.add(
        JOB_PARTNER_APPLICATION_EMAIL,
        { sellerApplicationId: record.id },
        {
          attempts: 5,
          backoff: { type: "exponential", delay: 1000 },
          removeOnComplete: true,
          removeOnFail: false
        }
      );
    } catch (error) {
      this.logger.error(
        `failed to enqueue partner application email id=${record.id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    this.logger.log(`seller application created id=${record.id}`);
    return record;
  }

  async listApplications(query: ListSellerApplicationsQuery) {
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { companyName: { contains: query.search, mode: "insensitive" as const } },
              { contactName: { contains: query.search, mode: "insensitive" as const } },
              { email: { contains: query.search, mode: "insensitive" as const } },
              { industry: { contains: query.search, mode: "insensitive" as const } },
              { country: { contains: query.search, mode: "insensitive" as const } }
            ]
          }
        : {})
    };

    const skip = (query.page - 1) * query.pageSize;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.sellerApplication.count({ where }),
      this.prisma.sellerApplication.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: query.pageSize
      })
    ]);

    return {
      items: items.map((item) => this.serialize(item)),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize))
      }
    };
  }

  async listAllForExport(query: Pick<ListSellerApplicationsQuery, "search" | "status">) {
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { companyName: { contains: query.search, mode: "insensitive" as const } },
              { contactName: { contains: query.search, mode: "insensitive" as const } },
              { email: { contains: query.search, mode: "insensitive" as const } }
            ]
          }
        : {})
    };

    const items = await this.prisma.sellerApplication.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });

    return items.map((item) => this.serialize(item));
  }

  async getApplicationById(id: string) {
    const application = await this.prisma.sellerApplication.findUnique({ where: { id } });
    if (!application) {
      throw new NotFoundException("Seller application not found");
    }
    return this.serialize(application);
  }

  async updateStatus(id: string, input: UpdateSellerApplicationStatusInput) {
    const existing = await this.prisma.sellerApplication.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!existing) {
      throw new NotFoundException("Seller application not found");
    }

    const updated = await this.prisma.sellerApplication.update({
      where: { id },
      data: {
        status: input.status,
        adminNotes: input.adminNotes === undefined ? undefined : input.adminNotes?.trim() || null,
        reviewedAt: new Date()
      }
    });

    // Automatic onboarding: approving an application provisions the seller's
    // white-label store + login (idempotent). A failure here must not roll back
    // the status change — surface it to the admin instead.
    let storeSlug: string | null = null;
    let onboardingError: string | null = null;
    if (input.status === "APPROVED") {
      try {
        const store = await this.storesService.onboardSellerFromApplication(id);
        storeSlug = store?.slug ?? null;
      } catch (error) {
        onboardingError = error instanceof Error ? error.message : "Onboarding failed";
        this.logger.error(`onboarding failed for application=${id}: ${onboardingError}`);
      }
    }

    return { ...this.serialize(updated), storeSlug, onboardingError };
  }

  private serialize(item: {
    id: string;
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
    companyAddress: string;
    businessDescription: string;
    industry: string;
    country: string;
    logoUrl: string | null;
    logoKey: string | null;
    website: string | null;
    additionalInfo: string | null;
    status: string;
    adminNotes: string | null;
    reviewedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: item.id,
      companyName: item.companyName,
      contactName: item.contactName,
      email: item.email,
      phone: item.phone,
      companyAddress: item.companyAddress,
      businessDescription: item.businessDescription,
      industry: item.industry,
      country: item.country,
      logoUrl: item.logoUrl,
      logoKey: item.logoKey,
      website: item.website,
      additionalInfo: item.additionalInfo,
      status: item.status,
      adminNotes: item.adminNotes,
      reviewedAt: item.reviewedAt ? item.reviewedAt.toISOString() : null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    };
  }
}
