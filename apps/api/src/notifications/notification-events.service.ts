import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "./notifications.service";
import { EMAIL_QUEUE, JOB_GENERIC_EMAIL } from "../email/email.constants";
import { renderBrandedEmail, toWebUrl, type EmailCta } from "../email/email-layout";

// Retry policy shared with the other queued emails: keep failed jobs for audit.
const EMAIL_JOB_OPTS = {
  attempts: 5,
  backoff: { type: "exponential" as const, delay: 1000 },
  removeOnComplete: true,
  removeOnFail: false
};

// The email half of an event. When omitted/false, only the in-app notification
// is written (e.g. low-signal events that shouldn't hit the inbox).
export type EventEmail = {
  subject: string;
  heading: string;
  paragraphs?: string[];
  // Relative path (e.g. "/dashboard/orders/x") — resolved to an absolute web URL.
  ctaPath?: string | null;
  ctaLabel?: string;
  footerNote?: string;
};

/**
 * Central event dispatcher: one call fans a domain event out to both the in-app
 * notification store and a queued, retried, branded email. This is the single
 * seam every major action should use so channels never drift apart.
 */
@Injectable()
export class NotificationEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue
  ) {}

  async dispatchToUser(input: {
    userId: string;
    type: string;
    title: string;
    body: string;
    link?: string | null;
    email?: EventEmail | false;
  }) {
    await this.notifications.notify({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link ?? null
    });

    if (!input.email) return;
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true, firstName: true }
    });
    if (user?.email) await this.enqueueEmail(user.email, user.firstName, input.email);
  }

  async dispatchToAdmins(input: {
    type: string;
    title: string;
    body: string;
    link?: string | null;
    email?: EventEmail | false;
  }) {
    await this.notifications.notifyAdmins({
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link ?? null
    });

    if (!input.email) return;
    const admins = await this.prisma.user.findMany({
      where: { role: { name: "SUPER_ADMIN" } },
      select: { email: true, firstName: true }
    });
    for (const admin of admins) {
      if (admin.email) await this.enqueueEmail(admin.email, admin.firstName, input.email);
    }
  }

  // Send a branded email to an explicit address (recipient may not be a user,
  // e.g. a guest checkout email or the configured admin inbox).
  async dispatchEmail(to: string, firstName: string | null, email: EventEmail) {
    if (to) await this.enqueueEmail(to, firstName, email);
  }

  private async enqueueEmail(to: string, firstName: string | null, email: EventEmail) {
    const cta: EmailCta | null =
      email.ctaPath && email.ctaLabel
        ? { label: email.ctaLabel, url: toWebUrl(email.ctaPath) ?? email.ctaPath }
        : null;

    const { html, text } = renderBrandedEmail({
      heading: email.heading,
      greeting: firstName ? `Hi ${firstName},` : undefined,
      paragraphs: email.paragraphs,
      cta,
      footerNote: email.footerNote
    });

    await this.emailQueue.add(
      JOB_GENERIC_EMAIL,
      { to, subject: email.subject, html, text },
      EMAIL_JOB_OPTS
    );
  }
}
