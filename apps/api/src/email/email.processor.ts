import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "./email.service";
import {
  EMAIL_QUEUE,
  JOB_CONTACT_EMAIL,
  JOB_PASSWORD_RESET_CODE_EMAIL,
  JOB_PASSWORD_RESET_SUCCESS_EMAIL,
  JOB_SIGNUP_WELCOME_EMAIL
} from "./email.constants";

type ContactEmailJobData = { contactMessageId: string };
type SignupWelcomeEmailJobData = { userId: string };
type PasswordResetCodeJobData = { userId: string; code: string };
type PasswordResetSuccessJobData = { userId: string };

function stringifyError(error: unknown) {
  if (error instanceof Error) {
    const extra = error as Error & { code?: string; response?: string; command?: string };
    return JSON.stringify({
      name: extra.name,
      message: extra.message,
      code: extra.code,
      response: extra.response,
      command: extra.command
    });
  }

  return String(error);
}

@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService
  ) {
    super();
  }

  @OnWorkerEvent("active")
  onActive(job: Job) {
    this.logger.log(`job active id=${job.id} name=${job.name}`);
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job) {
    this.logger.log(`job completed id=${job.id} name=${job.name}`);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job | undefined, error: Error) {
    this.logger.error(`job failed id=${job?.id} name=${job?.name} error=${error.message}`, error.stack);
  }

  async process(
    job: Job<
      | ContactEmailJobData
      | SignupWelcomeEmailJobData
      | PasswordResetCodeJobData
      | PasswordResetSuccessJobData
    >
  ) {
    if (job.name === JOB_CONTACT_EMAIL) {
      await this.processContactEmail(job as Job<ContactEmailJobData>);
      return;
    }

    if (job.name === JOB_SIGNUP_WELCOME_EMAIL) {
      await this.processSignupWelcomeEmail(job as Job<SignupWelcomeEmailJobData>);
      return;
    }

    if (job.name === JOB_PASSWORD_RESET_CODE_EMAIL) {
      await this.processPasswordResetCodeEmail(job as Job<PasswordResetCodeJobData>);
      return;
    }

    if (job.name === JOB_PASSWORD_RESET_SUCCESS_EMAIL) {
      await this.processPasswordResetSuccessEmail(job as Job<PasswordResetSuccessJobData>);
      return;
    }

    this.logger.warn(`ignored unexpected job name=${job.name}`);
  }

  private async processContactEmail(job: Job<ContactEmailJobData>) {
    this.logger.log(`processing contact email jobId=${job.id} contactMessageId=${job.data.contactMessageId}`);

    const message = await this.prisma.contactMessage.findUnique({
      where: { id: job.data.contactMessageId },
      include: {
        products: {
          select: {
            productCategory: true,
            totalQuantity: true,
            productDescription: true,
            colors: true,
            targetUnitPrice: true,
            decorationMethod: true,
            decorationNotes: true
          }
        }
      }
    });

    if (!message) {
      this.logger.warn(`contact message not found id=${job.data.contactMessageId}`);
      return;
    }

    try {
      await this.emailService.sendAdminContactEmail({
        companyName: message.companyName,
        contactName: message.contactName,
        email: message.email,
        phone: message.phone,
        shippingAddress: message.shippingAddress,
        city: message.city,
        state: message.state,
        zip: message.zip,
        eventName: message.eventName,
        inHandDate: message.inHandDate,
        budget: message.budget,
        artworkReady: message.artworkReady,
        additionalNotes: message.additionalNotes,
        createdAt: message.createdAt,
        products: message.products
      });

      await this.emailService.sendUserAckEmail(message.email, message.contactName);

      await this.prisma.contactMessage.update({
        where: { id: message.id },
        data: {
          emailedAt: new Date(),
          emailError: null
        }
      });
    } catch (error) {
      const detail = stringifyError(error);

      await this.prisma.contactMessage.update({
        where: { id: message.id },
        data: { emailError: detail }
      });

      this.logger.error(
        `email processing failed contactMessageId=${message.id} detail=${detail}`,
        error instanceof Error ? error.stack : undefined
      );

      throw error;
    }
  }

  private async processSignupWelcomeEmail(job: Job<SignupWelcomeEmailJobData>) {
    this.logger.log(`processing signup welcome email jobId=${job.id} userId=${job.data.userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: job.data.userId },
      select: {
        id: true,
        email: true,
        firstName: true
      }
    });

    if (!user) {
      this.logger.warn(`signup email user not found id=${job.data.userId}`);
      return;
    }

    await this.emailService.sendSignupWelcomeEmail(user.email, user.firstName);
  }

  private async processPasswordResetCodeEmail(job: Job<PasswordResetCodeJobData>) {
    const user = await this.prisma.user.findUnique({
      where: { id: job.data.userId },
      select: { id: true, email: true, firstName: true }
    });

    if (!user) {
      this.logger.warn(`password reset email user not found id=${job.data.userId}`);
      return;
    }

    await this.emailService.sendPasswordResetCodeEmail(user.email, user.firstName, job.data.code);
  }

  private async processPasswordResetSuccessEmail(job: Job<PasswordResetSuccessJobData>) {
    const user = await this.prisma.user.findUnique({
      where: { id: job.data.userId },
      select: { id: true, email: true, firstName: true }
    });

    if (!user) {
      this.logger.warn(`password reset success user not found id=${job.data.userId}`);
      return;
    }

    await this.emailService.sendPasswordUpdatedEmail(user.email, user.firstName);
  }
}
