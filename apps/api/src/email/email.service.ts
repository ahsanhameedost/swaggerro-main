import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import type { SentMessageInfo, Transporter } from "nodemailer";
import { env } from "../env";

export type CatalogOrderAdminEmailPayload = {
  id: string;
  type: "BULK" | "SWAG_PACK" | "COMBINED";
  name: string;
  email: string;
  companyName?: string | null;
  phone?: string | null;
  notes?: string | null;
  packQuantity: number;
  totalPrice: number;
  items: Array<{
    productName: string;
    variantName?: string | null;
    quantity: number;
    quantityPerPack?: number | null;
    unitPrice: number;
    totalPrice: number;
  }>;
};

export type ContactEmailPayload = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  shippingAddress: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  eventName: string | null;
  inHandDate: Date | null;
  budget: string | null;
  artworkReady: string | null;
  additionalNotes: string | null;
  createdAt: Date;
  products: Array<{
    productCategory: string;
    totalQuantity: number;
    productDescription: string | null;
    colors: string | null;
    targetUnitPrice: number | null;
    decorationMethod: string | null;
    decorationNotes: string | null;
  }>;
};

function mask(value?: string) {
  if (!value) return "";
  if (value.length <= 4) return "****";
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

function mailInfoSummary(info: SentMessageInfo) {
  return JSON.stringify({
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    pending: (info as any).pending,
    response: info.response
  });
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS ?? "" } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000
    });

    this.logger.log(
      `SMTP init host=${env.SMTP_HOST} port=${env.SMTP_PORT} secure=${env.SMTP_SECURE} user=${mask(env.SMTP_USER)} from=${env.EMAIL_FROM} admin=${env.ADMIN_EMAIL}`
    );
  }

  async onModuleInit() {
    try {
      await this.transporter.verify();
      this.logger.log("SMTP verify success");
    } catch (error) {
      this.logger.error(
        `SMTP verify failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  async sendAdminContactEmail(payload: ContactEmailPayload) {
    this.logger.log(
      `sendAdminContactEmail start from=${env.EMAIL_FROM} to=${env.ADMIN_EMAIL} replyTo=${payload.email}`
    );

    const lines: string[] = [
      "New contact submission",
      "",
      `Company: ${payload.companyName}`,
      `Contact: ${payload.contactName}`,
      `Email: ${payload.email}`,
      `Phone: ${payload.phone}`,
      `Shipping Address: ${payload.shippingAddress ?? "-"}`,
      `City: ${payload.city ?? "-"}`,
      `State: ${payload.state ?? "-"}`,
      `Zip: ${payload.zip ?? "-"}`,
      `Event: ${payload.eventName ?? "-"}`,
      `In-Hand Date: ${payload.inHandDate ? payload.inHandDate.toISOString() : "-"}`,
      `Budget: ${payload.budget ?? "-"}`,
      `Artwork Ready: ${payload.artworkReady ?? "-"}`,
      `Additional Notes: ${payload.additionalNotes ?? "-"}`,
      "",
      "Products:"
    ];

    payload.products.forEach((product, index) => {
      lines.push(
        `#${index + 1} ${product.productCategory}`,
        `  Quantity: ${product.totalQuantity}`,
        `  Description: ${product.productDescription ?? "-"}`,
        `  Colors: ${product.colors ?? "-"}`,
        `  Target Unit Price: ${product.targetUnitPrice ?? "-"}`,
        `  Decoration Method: ${product.decorationMethod ?? "-"}`,
        `  Decoration Notes: ${product.decorationNotes ?? "-"}`,
        ""
      );
    });

    lines.push(`Submitted At: ${payload.createdAt.toISOString()}`);

    const summaryRow = (label: string, value: string | null | undefined) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #eef0f3;font-weight:600;color:#111827;width:180px;">${escapeHtml(label)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eef0f3;color:#374151;">${value ? escapeHtml(value) : "-"}</td>
      </tr>
    `;

    const productsRows = payload.products.length
      ? payload.products
          .map(
            (product, index) => `
              <tr>
                <td style="padding:12px;border-bottom:1px solid #eef0f3;color:#111827;">${index + 1}</td>
                <td style="padding:12px;border-bottom:1px solid #eef0f3;color:#111827;">${escapeHtml(product.productCategory)}</td>
                <td style="padding:12px;border-bottom:1px solid #eef0f3;color:#111827;">${product.totalQuantity}</td>
                <td style="padding:12px;border-bottom:1px solid #eef0f3;color:#111827;">${product.productDescription ? escapeHtml(product.productDescription) : "-"}</td>
                <td style="padding:12px;border-bottom:1px solid #eef0f3;color:#111827;">${product.colors ? escapeHtml(product.colors) : "-"}</td>
                <td style="padding:12px;border-bottom:1px solid #eef0f3;color:#111827;">${product.targetUnitPrice != null ? `$${product.targetUnitPrice}` : "-"}</td>
                <td style="padding:12px;border-bottom:1px solid #eef0f3;color:#111827;">${product.decorationMethod ? escapeHtml(product.decorationMethod) : "-"}</td>
                <td style="padding:12px;border-bottom:1px solid #eef0f3;color:#111827;">${product.decorationNotes ? escapeHtml(product.decorationNotes) : "-"}</td>
              </tr>
            `
          )
          .join("")
      : `
        <tr>
          <td colspan="8" style="padding:16px;text-align:center;color:#6b7280;">No product items submitted</td>
        </tr>
      `;

    const info = await this.transporter.sendMail({
      from: env.EMAIL_FROM,
      to: env.ADMIN_EMAIL,
      replyTo: payload.email,
      subject: `New Order Request — ${payload.companyName} / ${payload.contactName}`,
      text: lines.join("\n"),
      html: `
        <div style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#111827;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:980px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:0;">
                <div style="background:linear-gradient(90deg,#C41E3A 0%,#FD0000 100%);padding:28px 32px;color:#ffffff;">
                  <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">SOA Order Request</div>
                  <h1 style="margin:10px 0 6px;font-size:28px;line-height:1.2;font-weight:700;">New Contact Submission</h1>
                  <p style="margin:0;font-size:14px;opacity:.92;">A new promotional products request has been submitted from the website.</p>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:28px 32px 12px;">
                <h2 style="margin:0 0 14px;font-size:18px;color:#111827;">Customer & Project Details</h2>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border:1px solid #eef0f3;border-radius:12px;overflow:hidden;background:#fafafa;">
                  ${summaryRow("Company", payload.companyName)}
                  ${summaryRow("Contact Name", payload.contactName)}
                  ${summaryRow("Email", payload.email)}
                  ${summaryRow("Phone", payload.phone)}
                  ${summaryRow("Shipping Address", payload.shippingAddress)}
                  ${summaryRow("City", payload.city)}
                  ${summaryRow("State", payload.state)}
                  ${summaryRow("ZIP", payload.zip)}
                  ${summaryRow("Event / Project", payload.eventName)}
                  ${summaryRow("In-Hand Date", payload.inHandDate?.toISOString())}
                  ${summaryRow("Budget", payload.budget)}
                  ${summaryRow("Artwork Ready", payload.artworkReady)}
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:8px 32px 12px;">
                <h2 style="margin:0 0 14px;font-size:18px;color:#111827;">Additional Notes</h2>
                <div style="border:1px solid #eef0f3;background:#fafafa;border-radius:12px;padding:16px;color:#374151;white-space:pre-wrap;line-height:1.6;">
                  ${payload.additionalNotes ? escapeHtml(payload.additionalNotes) : "No additional notes provided."}
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:8px 32px 28px;">
                <h2 style="margin:0 0 14px;font-size:18px;color:#111827;">Requested Products</h2>
                <div style="border:1px solid #eef0f3;border-radius:12px;overflow:hidden;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;background:#ffffff;">
                    <thead>
                      <tr style="background:#111111;">
                        <th align="left" style="padding:12px;color:#ffffff;font-size:12px;">#</th>
                        <th align="left" style="padding:12px;color:#ffffff;font-size:12px;">Category</th>
                        <th align="left" style="padding:12px;color:#ffffff;font-size:12px;">Qty</th>
                        <th align="left" style="padding:12px;color:#ffffff;font-size:12px;">Description</th>
                        <th align="left" style="padding:12px;color:#ffffff;font-size:12px;">Colors</th>
                        <th align="left" style="padding:12px;color:#ffffff;font-size:12px;">Target Price</th>
                        <th align="left" style="padding:12px;color:#ffffff;font-size:12px;">Decoration</th>
                        <th align="left" style="padding:12px;color:#ffffff;font-size:12px;">Notes</th>
                      </tr>
                    </thead>
                    <tbody>${productsRows}</tbody>
                  </table>
                </div>
                <p style="margin:14px 0 0;color:#6b7280;font-size:12px;">Submitted at ${payload.createdAt.toISOString()}</p>
              </td>
            </tr>
          </table>
        </div>
      `
    });

    this.logger.log(`sendAdminContactEmail success ${mailInfoSummary(info)}`);
  }

  async sendUserAckEmail(to: string, contactName: string) {
    this.logger.log(`sendUserAckEmail start to=${to}`);

    const info = await this.transporter.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject: "We received your request",
      text: `Hi ${contactName},

Thanks for contacting SOA. Your order request has been received successfully.

Our team is reviewing your submission and will follow up soon.

SOA Team`,
      html: `
        <div style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#111827;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td>
                <div style="background:linear-gradient(90deg,#C41E3A 0%,#FD0000 100%);padding:28px 32px;color:#ffffff;">
                  <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">SOA</div>
                  <h1 style="margin:10px 0 0;font-size:26px;line-height:1.2;font-weight:700;">We received your request</h1>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;color:#374151;line-height:1.7;">
                <p style="margin:0 0 14px;">Hi ${escapeHtml(contactName)},</p>
                <p style="margin:0 0 14px;">Thanks for contacting SOA. Your order request has been received successfully.</p>
                <p style="margin:0 0 14px;">Our team is reviewing your submission and will follow up soon.</p>
                <p style="margin:24px 0 0;font-weight:600;color:#111827;">SOA Team</p>
              </td>
            </tr>
          </table>
        </div>
      `
    });

    this.logger.log(`sendUserAckEmail success ${mailInfoSummary(info)}`);
  }

  async sendSignupWelcomeEmail(to: string, firstName?: string | null) {
    const name = firstName?.trim() || "there";
    this.logger.log(`sendSignupWelcomeEmail start to=${to}`);

    const info = await this.transporter.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject: "Thanks for joining SOASWAG",
      text: `Hi ${name},

Thanks for joining SOASWAG.

Your account has been created successfully and you can now continue from your dashboard.

SOASWAG Team`,
      html: `
        <div style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#111827;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td>
                <div style="background:linear-gradient(90deg,#C41E3A 0%,#FD0000 100%);padding:28px 32px;color:#ffffff;">
                  <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">SOASWAG</div>
                  <h1 style="margin:10px 0 0;font-size:26px;line-height:1.2;font-weight:700;">Thanks for joining SOASWAG</h1>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;color:#374151;line-height:1.7;">
                <p style="margin:0 0 14px;">Hi ${escapeHtml(name)},</p>
                <p style="margin:0 0 14px;">Thanks for joining SOASWAG. Your account has been created successfully.</p>
                <p style="margin:0 0 14px;">You can now continue from your dashboard and start building your swag catalog.</p>
                <p style="margin:24px 0 0;font-weight:600;color:#111827;">SOASWAG Team</p>
              </td>
            </tr>
          </table>
        </div>
      `
    });

    this.logger.log(`sendSignupWelcomeEmail success ${mailInfoSummary(info)}`);
  }



  async sendCatalogOrderAdminEmail(payload: CatalogOrderAdminEmailPayload) {
    const total = `$${payload.totalPrice.toFixed(2)}`;
    const lines = [
      "New catalog order",
      "",
      `Order ID: ${payload.id}`,
      `Type: ${payload.type}`,
      `Contact: ${payload.name}`,
      `Email: ${payload.email}`,
      `Company: ${payload.companyName ?? "-"}`,
      `Phone: ${payload.phone ?? "-"}`,
      `Pack Quantity: ${payload.packQuantity}`,
      `Notes: ${payload.notes ?? "-"}`,
      `Total: ${total}`,
      "",
      "Items:"
    ];

    payload.items.forEach((item, index) => {
      lines.push(
        `${index + 1}. ${item.productName}${item.variantName ? ` (${item.variantName})` : ""}`,
        `   Qty: ${item.quantity}`,
        `   Qty / Pack: ${item.quantityPerPack ?? "-"}`,
        `   Unit Price: $${item.unitPrice.toFixed(2)}`,
        `   Line Total: $${item.totalPrice.toFixed(2)}`
      );
    });

    const info = await this.transporter.sendMail({
      from: env.EMAIL_FROM,
      to: env.ADMIN_EMAIL,
      replyTo: payload.email,
      subject: `New catalog order • ${payload.type === "COMBINED" ? "Combined" : payload.type === "SWAG_PACK" ? "Swag Pack" : "Bulk"}`,
      text: lines.join("\n"),
      html: `
        <div style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#111827;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td>
                <div style="background:linear-gradient(90deg,#C41E3A 0%,#FD0000 100%);padding:28px 32px;color:#ffffff;">
                  <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">SOASWAG</div>
                  <h1 style="margin:10px 0 0;font-size:26px;line-height:1.2;font-weight:700;">New catalog order</h1>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;color:#374151;line-height:1.7;">
                <p style="margin:0 0 10px;"><strong>Order ID:</strong> ${escapeHtml(payload.id)}</p>
                <p style="margin:0 0 10px;"><strong>Type:</strong> ${escapeHtml(payload.type)}</p>
                <p style="margin:0 0 10px;"><strong>Contact:</strong> ${escapeHtml(payload.name)} (${escapeHtml(payload.email)})</p>
                <p style="margin:0 0 10px;"><strong>Company:</strong> ${escapeHtml(payload.companyName ?? "-")}</p>
                <p style="margin:0 0 10px;"><strong>Phone:</strong> ${escapeHtml(payload.phone ?? "-")}</p>
                <p style="margin:0 0 10px;"><strong>Pack Quantity:</strong> ${payload.packQuantity}</p>
                <p style="margin:0 0 10px;"><strong>Notes:</strong> ${escapeHtml(payload.notes ?? "-")}</p>
                <p style="margin:0 0 18px;"><strong>Total:</strong> ${escapeHtml(total)}</p>
                <table role="presentation" cellspacing="0" cellpadding="8" border="0" width="100%" style="border-collapse:collapse;border:1px solid #e5e7eb;">
                  <thead>
                    <tr style="background:#f9fafb;">
                      <th align="left" style="border-bottom:1px solid #e5e7eb;">Item</th>
                      <th align="left" style="border-bottom:1px solid #e5e7eb;">Qty</th>
                      <th align="left" style="border-bottom:1px solid #e5e7eb;">Qty / Pack</th>
                      <th align="left" style="border-bottom:1px solid #e5e7eb;">Unit</th>
                      <th align="left" style="border-bottom:1px solid #e5e7eb;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${payload.items
                      .map(
                        (item) => `
                          <tr>
                            <td style="border-bottom:1px solid #f3f4f6;">${escapeHtml(item.productName)}${item.variantName ? ` <div style="font-size:12px;color:#6b7280;">${escapeHtml(item.variantName)}</div>` : ""}</td>
                            <td style="border-bottom:1px solid #f3f4f6;">${item.quantity}</td>
                            <td style="border-bottom:1px solid #f3f4f6;">${item.quantityPerPack ?? "-"}</td>
                            <td style="border-bottom:1px solid #f3f4f6;">$${item.unitPrice.toFixed(2)}</td>
                            <td style="border-bottom:1px solid #f3f4f6;">$${item.totalPrice.toFixed(2)}</td>
                          </tr>
                        `
                      )
                      .join("")}
                  </tbody>
                </table>
              </td>
            </tr>
          </table>
        </div>
      `
    });

    this.logger.log(`sendCatalogOrderAdminEmail success ${mailInfoSummary(info)}`);
  }

  async sendCatalogOrderUserAckEmail(to: string, name: string) {
    const info = await this.transporter.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject: "We received your SOASWAG order request",
      text: `Hi ${name},

Thanks for submitting your SOASWAG order request.

Our team received it successfully and will review your project details shortly.

SOASWAG Team`,
      html: `
        <div style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#111827;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td>
                <div style="background:linear-gradient(90deg,#C41E3A 0%,#FD0000 100%);padding:28px 32px;color:#ffffff;">
                  <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">SOASWAG</div>
                  <h1 style="margin:10px 0 0;font-size:26px;line-height:1.2;font-weight:700;">We received your order request</h1>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;color:#374151;line-height:1.7;">
                <p style="margin:0 0 14px;">Hi ${escapeHtml(name)},</p>
                <p style="margin:0 0 14px;">Thanks for submitting your SOASWAG order request.</p>
                <p style="margin:0 0 14px;">Our team received it successfully and will review your project details shortly.</p>
                <p style="margin:24px 0 0;font-weight:600;color:#111827;">SOASWAG Team</p>
              </td>
            </tr>
          </table>
        </div>
      `
    });

    this.logger.log(`sendCatalogOrderUserAckEmail success ${mailInfoSummary(info)}`);
  }

  async sendPasswordResetCodeEmail(to: string, firstName?: string | null, code?: string) {
    const name = firstName?.trim() || "there";
    const safeCode = (code ?? "").trim();
    this.logger.log(`sendPasswordResetCodeEmail start to=${to}`);

    const info = await this.transporter.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject: "Your SOASWAG password reset code",
      text: `Hi ${name},

We received a request to reset your SOASWAG password.

Your verification code is: ${safeCode}

This code expires in 10 minutes.

If you did not request this, you can ignore this email.

SOASWAG Team`,
      html: `
        <div style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#111827;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td>
                <div style="background:linear-gradient(90deg,#C41E3A 0%,#FD0000 100%);padding:28px 32px;color:#ffffff;">
                  <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">SOASWAG</div>
                  <h1 style="margin:10px 0 0;font-size:26px;line-height:1.2;font-weight:700;">Password reset code</h1>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;color:#374151;line-height:1.7;">
                <p style="margin:0 0 14px;">Hi ${escapeHtml(name)},</p>
                <p style="margin:0 0 14px;">We received a request to reset your SOASWAG password.</p>
                <p style="margin:0 0 18px;">Use the verification code below to continue:</p>

                <div style="margin:0 0 18px;padding:18px 20px;border:1px solid #e5e7eb;border-radius:16px;background:#fafafa;text-align:center;">
                  <div style="font-size:30px;line-height:1;font-weight:800;letter-spacing:0.35em;color:#111827;">${escapeHtml(safeCode)}</div>
                </div>

                <p style="margin:0 0 14px;">This code expires in <strong>10 minutes</strong>.</p>
                <p style="margin:0;">If you did not request this, you can ignore this email.</p>

                <p style="margin:24px 0 0;font-weight:600;color:#111827;">SOASWAG Team</p>
              </td>
            </tr>
          </table>
        </div>
      `
    });

    this.logger.log(`sendPasswordResetCodeEmail success ${mailInfoSummary(info)}`);
  }

  async sendPasswordUpdatedEmail(to: string, firstName?: string | null) {
    const name = firstName?.trim() || "there";
    this.logger.log(`sendPasswordUpdatedEmail start to=${to}`);

    const info = await this.transporter.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject: "Your SOASWAG password was updated",
      text: `Hi ${name},

Your SOASWAG password has been updated successfully.

You can now sign in with your new password.

If you did not make this change, please contact support immediately.

SOASWAG Team`,
      html: `
        <div style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#111827;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td>
                <div style="background:linear-gradient(90deg,#C41E3A 0%,#FD0000 100%);padding:28px 32px;color:#ffffff;">
                  <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">SOASWAG</div>
                  <h1 style="margin:10px 0 0;font-size:26px;line-height:1.2;font-weight:700;">Password updated</h1>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;color:#374151;line-height:1.7;">
                <p style="margin:0 0 14px;">Hi ${escapeHtml(name)},</p>
                <p style="margin:0 0 14px;">Your SOASWAG password has been updated successfully.</p>
                <p style="margin:0 0 14px;">You can now sign in with your new password.</p>
                <p style="margin:0;">If you did not make this change, please contact support immediately.</p>
                <p style="margin:24px 0 0;font-weight:600;color:#111827;">SOASWAG Team</p>
              </td>
            </tr>
          </table>
        </div>
      `
    });

    this.logger.log(`sendPasswordUpdatedEmail success ${mailInfoSummary(info)}`);
  }
  async sendEmployeeAssignedOrderEmail(payload: {
    to: string;
    employeeName: string;
    orderId: string;
    customerName: string;
  }) {
    const info = await this.transporter.sendMail({
      from: env.EMAIL_FROM,
      to: payload.to,
      subject: `New order assigned: ${payload.orderId}`,
      text: `Hi ${payload.employeeName},

A new order has been assigned to you.

Order: ${payload.orderId}
Customer: ${payload.customerName}

Please sign in to your dashboard to review the request and start the design process.

SOASWAG Team`,
      html: `
        <div style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#111827;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td>
                <div style="background:linear-gradient(90deg,#C41E3A 0%,#FD0000 100%);padding:28px 32px;color:#ffffff;">
                  <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">SOASWAG</div>
                  <h1 style="margin:10px 0 0;font-size:26px;line-height:1.2;font-weight:700;">New order assigned</h1>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;color:#374151;line-height:1.7;">
                <p style="margin:0 0 14px;">Hi ${escapeHtml(payload.employeeName)},</p>
                <p style="margin:0 0 14px;">A new order has been assigned to you.</p>
                <p style="margin:0 0 8px;"><strong>Order:</strong> ${escapeHtml(payload.orderId)}</p>
                <p style="margin:0 0 14px;"><strong>Customer:</strong> ${escapeHtml(payload.customerName)}</p>
                <p style="margin:0;">Please sign in to your dashboard to review the request and continue the design flow.</p>
              </td>
            </tr>
          </table>
        </div>
      `
    });

    this.logger.log(`sendEmployeeAssignedOrderEmail success ${mailInfoSummary(info)}`);
  }

  async sendDesignRevisionRequestedEmail(payload: {
    to: string;
    recipientName: string;
    orderId: string;
    productName: string;
    requestedByName: string;
    notes: string;
  }) {
    const info = await this.transporter.sendMail({
      from: env.EMAIL_FROM,
      to: payload.to,
      subject: `Revision requested for order ${payload.orderId}`,
      text: `Hi ${payload.recipientName},

A customer requested changes for one of the mockups on order ${payload.orderId}.

Product: ${payload.productName}
Requested by: ${payload.requestedByName}

Notes:
${payload.notes}

Please review the revision request in the dashboard.

SOASWAG Team`,
      html: `
        <div style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#111827;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td>
                <div style="background:linear-gradient(90deg,#C41E3A 0%,#FD0000 100%);padding:28px 32px;color:#ffffff;">
                  <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">SOASWAG</div>
                  <h1 style="margin:10px 0 0;font-size:26px;line-height:1.2;font-weight:700;">Revision requested</h1>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;color:#374151;line-height:1.7;">
                <p style="margin:0 0 14px;">Hi ${escapeHtml(payload.recipientName)},</p>
                <p style="margin:0 0 14px;">A customer requested changes for an item on order <strong>${escapeHtml(payload.orderId)}</strong>.</p>
                <p style="margin:0 0 8px;"><strong>Product:</strong> ${escapeHtml(payload.productName)}</p>
                <p style="margin:0 0 8px;"><strong>Requested by:</strong> ${escapeHtml(payload.requestedByName)}</p>
                <p style="margin:0 0 8px;"><strong>Notes:</strong></p>
                <div style="padding:14px 16px;border:1px solid #e5e7eb;border-radius:14px;background:#fafafa;">${escapeHtml(payload.notes)}</div>
              </td>
            </tr>
          </table>
        </div>
      `
    });

    this.logger.log(`sendDesignRevisionRequestedEmail success ${mailInfoSummary(info)}`);
  }

}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
