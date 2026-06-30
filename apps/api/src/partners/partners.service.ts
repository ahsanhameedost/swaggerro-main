import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { EMAIL_QUEUE, JOB_PARTNER_APPLICATION_EMAIL } from "../email/email.constants";
import { StoresService } from "../stores/stores.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  SELLER_AGREEMENT_VERSION,
  type CheckAvailabilityQuery,
  type CreateSellerApplicationInput,
  type ListSellerApplicationsQuery,
  type UpdateSellerApplicationStatusInput
} from "./dto/partner.dto";

// Shared slug normalization — keep in sync with the store slug format
// (lowercase alphanumerics + dashes, see stores.service slugify).
export function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

@Injectable()
export class PartnersService {
  private readonly logger = new Logger(PartnersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storesService: StoresService,
    private readonly notifications: NotificationsService,
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
        state: input.state?.trim() || null,
        desiredSlug: input.desiredSlug ? normalizeSlug(input.desiredSlug) || null : null,
        website: input.website?.trim() || null,
        additionalInfo: input.additionalInfo?.trim() || null,
        logoUrl: input.logoUrl || null,
        logoKey: input.logoKey || null,
        termsAgreedAt: new Date(),
        termsVersion: input.termsVersion?.trim() || SELLER_AGREEMENT_VERSION
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

    // In-app notification to every admin (separate from the email above).
    await this.notifications.notifyAdmins({
      type: "seller.application.new",
      title: "New seller application",
      body: `${input.companyName.trim()} applied to become a seller.`,
      link: "/dashboard/partners"
    });

    this.logger.log(`seller application created id=${record.id}`);
    return record;
  }

  // Public duplicate check used by the multi-step signup form. A slug is taken
  // if any store uses it or any non-rejected application already requested it.
  // An email is taken if a user already exists or a non-rejected application
  // already used that business email.
  async checkAvailability(query: CheckAvailabilityQuery) {
    const result: { slug?: string; slugTaken?: boolean; email?: string; emailTaken?: boolean } = {};

    if (query.slug) {
      const slug = normalizeSlug(query.slug);
      result.slug = slug;
      if (!slug) {
        result.slugTaken = false;
      } else {
        const [storeHit, appHit] = await this.prisma.$transaction([
          this.prisma.store.findUnique({ where: { slug }, select: { id: true } }),
          this.prisma.sellerApplication.findFirst({
            where: { desiredSlug: slug, status: { not: "REJECTED" } },
            select: { id: true }
          })
        ]);
        result.slugTaken = Boolean(storeHit || appHit);
      }
    }

    if (query.email) {
      const email = query.email.trim().toLowerCase();
      result.email = email;
      const [userHit, appHit] = await this.prisma.$transaction([
        this.prisma.user.findUnique({ where: { email }, select: { id: true } }),
        this.prisma.sellerApplication.findFirst({
          where: { email, status: { not: "REJECTED" } },
          select: { id: true }
        })
      ]);
      result.emailTaken = Boolean(userHit || appHit);
    }

    return result;
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
        // Notify the newly-provisioned seller (they'll see it once they finish
        // account setup and sign in).
        if (store && (store as { ownerUserId?: string | null }).ownerUserId) {
          await this.notifications.notify({
            userId: (store as { ownerUserId: string }).ownerUserId,
            type: "seller.application.approved",
            title: "Your seller application was approved 🎉",
            body: `Your store "${store.name}" is ready. Set up your account to start selling.`,
            link: "/seller"
          });
        }
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
    state?: string | null;
    desiredSlug?: string | null;
    logoUrl: string | null;
    logoKey: string | null;
    website: string | null;
    additionalInfo: string | null;
    status: string;
    adminNotes: string | null;
    reviewedAt: Date | null;
    termsAgreedAt?: Date | null;
    termsVersion?: string | null;
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
      state: item.state ?? null,
      desiredSlug: item.desiredSlug ?? null,
      logoUrl: item.logoUrl,
      logoKey: item.logoKey,
      website: item.website,
      additionalInfo: item.additionalInfo,
      status: item.status,
      adminNotes: item.adminNotes,
      reviewedAt: item.reviewedAt ? item.reviewedAt.toISOString() : null,
      termsAgreedAt: item.termsAgreedAt ? item.termsAgreedAt.toISOString() : null,
      termsVersion: item.termsVersion ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    };
  }
}
