import { env } from "../env";

// Shared brand chrome for all transactional emails — one place to change the
// header/footer/button styling instead of the copy-pasted table in each method.
const BRAND_GRADIENT = "linear-gradient(90deg,#C41E3A 0%,#FD0000 100%)";

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function webBaseUrl() {
  return (env.CORS_ORIGIN || "http://localhost:3000").split(",")[0].trim().replace(/\/$/, "");
}

// Absolute web URL from a relative path (pass-through if already absolute).
export function toWebUrl(pathOrUrl?: string | null) {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${webBaseUrl()}/${pathOrUrl.replace(/^\//, "")}`;
}

export type EmailCta = { label: string; url: string };

export function renderBrandedEmail(opts: {
  heading: string;
  greeting?: string;
  paragraphs?: string[];
  cta?: EmailCta | null;
  footerNote?: string;
}): { html: string; text: string } {
  const bodyParas = [...(opts.greeting ? [opts.greeting] : []), ...(opts.paragraphs ?? [])];
  const htmlParas = bodyParas
    .map((p) => `<p style="margin:0 0 14px;">${escapeHtml(p)}</p>`)
    .join("");
  const ctaHtml = opts.cta
    ? `<p style="margin:22px 0 0;"><a href="${escapeHtml(opts.cta.url)}" style="display:inline-block;background:${BRAND_GRADIENT};color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:12px;">${escapeHtml(opts.cta.label)}</a></p>`
    : "";
  const footer = opts.footerNote
    ? `<p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">${escapeHtml(opts.footerNote)}</p>`
    : "";

  const html = `
    <div style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#111827;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr><td>
          <div style="background:${BRAND_GRADIENT};padding:28px 32px;color:#ffffff;">
            <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">Swaggeroo</div>
            <h1 style="margin:10px 0 0;font-size:26px;line-height:1.2;font-weight:700;">${escapeHtml(opts.heading)}</h1>
          </div>
        </td></tr>
        <tr><td style="padding:28px 32px;color:#374151;line-height:1.7;">
          ${htmlParas}
          ${ctaHtml}
          ${footer}
        </td></tr>
      </table>
    </div>
  `;

  const text = [
    opts.heading,
    "",
    ...bodyParas,
    ...(opts.cta ? ["", `${opts.cta.label}: ${opts.cta.url}`] : []),
    ...(opts.footerNote ? ["", opts.footerNote] : []),
    "",
    "Swaggeroo Team"
  ].join("\n");

  return { html, text };
}
