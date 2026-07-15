import { env } from "../env";

// Shared brand chrome for all transactional emails — one place to change the
// header/footer/button styling instead of the copy-pasted table in each method.
// Swaggeroo brand blue. The email shell is intentionally a WHITE card with dark
// text (logo + blue accents), so it stays readable in every client / light mode.
const BRAND = "#005CFE";
const INK = "#0f172a";
const BODY = "#374151";
const MUTED = "#6b7280";
const BORDER = "#e5e7eb";

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

// The logo lives in the web app's public/ dir, served at the site root.
export function emailLogoUrl() {
  return `${webBaseUrl()}/swaggeroo-logo.png`;
}

export type EmailCta = { label: string; url: string };

/**
 * The single branded shell every transactional email uses: a white card with a
 * thin blue top accent, the Swaggeroo logo, an optional eyebrow + heading, the
 * body, an optional CTA button, and a footer (with an optional "Track your
 * order" link). `bodyHtml` is caller-provided, already-escaped inner HTML.
 */
export function renderEmailShell(opts: {
  eyebrow?: string;
  heading: string;
  subheading?: string;
  bodyHtml: string;
  cta?: EmailCta | null;
  trackUrl?: string | null;
  maxWidth?: number;
}): string {
  const width = opts.maxWidth ?? 600;

  const ctaHtml = opts.cta
    ? `<tr><td style="padding:6px 32px 30px;">
         <a href="${escapeHtml(opts.cta.url)}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 28px;border-radius:12px;">${escapeHtml(opts.cta.label)}</a>
       </td></tr>`
    : "";

  const trackHtml = opts.trackUrl
    ? `<a href="${escapeHtml(opts.trackUrl)}" style="color:${BRAND};text-decoration:none;font-weight:600;">Track your order</a> &nbsp;&middot;&nbsp; `
    : "";

  const eyebrowHtml = opts.eyebrow
    ? `<div style="font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:${BRAND};font-weight:700;">${escapeHtml(opts.eyebrow)}</div>`
    : "";

  const subheadingHtml = opts.subheading
    ? `<p style="margin:8px 0 0;font-size:14px;color:${MUTED};line-height:1.6;">${escapeHtml(opts.subheading)}</p>`
    : "";

  return `
    <div style="margin:0;padding:24px;background:#eef1f6;font-family:Arial,Helvetica,sans-serif;color:${INK};">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:${width}px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${BORDER};">
        <tr><td style="height:4px;background:${BRAND};font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:26px 32px 0;">
          <div style="font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:22px;letter-spacing:-0.5px;line-height:1;">
            <span style="color:${INK};">SWAGGE</span><span style="color:${BRAND};">ROO</span>
          </div>
        </td></tr>
        <tr><td style="padding:20px 32px 0;">
          ${eyebrowHtml}
          <h1 style="margin:6px 0 0;font-size:23px;line-height:1.3;font-weight:700;color:${INK};">${escapeHtml(opts.heading)}</h1>
          ${subheadingHtml}
        </td></tr>
        <tr><td style="padding:18px 32px 4px;color:${BODY};font-size:15px;line-height:1.7;">
          ${opts.bodyHtml}
        </td></tr>
        ${ctaHtml}
        <tr><td style="padding:22px 32px 26px;border-top:1px solid #eef0f3;color:${MUTED};font-size:12px;line-height:1.7;">
          ${trackHtml}<a href="${escapeHtml(webBaseUrl())}" style="color:${MUTED};text-decoration:none;">swaggeroo.com</a><br/>
          © ${new Date().getFullYear()} Swaggeroo · Custom swag your team will actually wear.
        </td></tr>
      </table>
    </div>
  `;
}

// A WooCommerce-style order breakdown: item rows + a totals block. `extraHtml`
// in renderBrandedEmail is where this goes, so order emails show what was bought.
export function renderOrderSummaryHtml(opts: {
  currency?: string;
  items: { name: string; variant?: string | null; quantity: number; lineTotal: number }[];
  rows: { label: string; value: number; strong?: boolean }[];
}): string {
  const money = (n: number) => `$${n.toFixed(2)}`;
  const itemRows = opts.items
    .map(
      (item) => `
        <tr>
          <td style="padding:12px 14px;border-bottom:1px solid #eef0f3;color:${INK};">
            ${escapeHtml(item.name)}${item.variant ? `<div style="font-size:12px;color:${MUTED};margin-top:2px;">${escapeHtml(item.variant)}</div>` : ""}
          </td>
          <td align="center" style="padding:12px 14px;border-bottom:1px solid #eef0f3;color:${BODY};white-space:nowrap;">× ${item.quantity}</td>
          <td align="right" style="padding:12px 14px;border-bottom:1px solid #eef0f3;color:${INK};white-space:nowrap;font-weight:600;">${money(item.lineTotal)}</td>
        </tr>`
    )
    .join("");
  const totalRows = opts.rows
    .map(
      (row) => `
        <tr>
          <td style="padding:6px 14px;color:${row.strong ? INK : MUTED};font-size:${row.strong ? "16px" : "14px"};font-weight:${row.strong ? "700" : "400"};">${escapeHtml(row.label)}</td>
          <td align="right" style="padding:6px 14px;color:${INK};font-size:${row.strong ? "16px" : "14px"};font-weight:${row.strong ? "700" : "600"};white-space:nowrap;">${money(row.value)}</td>
        </tr>`
    )
    .join("");
  return `
    <div style="margin:4px 0 8px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:${MUTED};">Order summary</div>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border:1px solid #eef0f3;border-radius:12px;overflow:hidden;background:#ffffff;">
      <thead><tr style="background:#f7f9fc;">
        <th align="left" style="padding:10px 14px;font-size:12px;color:${MUTED};text-transform:uppercase;letter-spacing:.04em;">Product</th>
        <th align="center" style="padding:10px 14px;font-size:12px;color:${MUTED};text-transform:uppercase;letter-spacing:.04em;">Qty</th>
        <th align="right" style="padding:10px 14px;font-size:12px;color:${MUTED};text-transform:uppercase;letter-spacing:.04em;">Total</th>
      </tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top:10px;">
      ${totalRows}
    </table>
  `;
}

export function renderBrandedEmail(opts: {
  heading: string;
  greeting?: string;
  paragraphs?: string[];
  /** Raw HTML appended after the paragraphs (caller-escaped), e.g. an order table. */
  extraHtml?: string;
  cta?: EmailCta | null;
  footerNote?: string;
  eyebrow?: string;
  /** Defaults to the public order-tracking page; pass null to hide it. */
  trackUrl?: string | null;
}): { html: string; text: string } {
  const bodyParas = [...(opts.greeting ? [opts.greeting] : []), ...(opts.paragraphs ?? [])];
  const bodyHtml =
    bodyParas.map((p) => `<p style="margin:0 0 14px;">${escapeHtml(p)}</p>`).join("") +
    (opts.extraHtml ? `<div style="margin:18px 0 4px;">${opts.extraHtml}</div>` : "") +
    (opts.footerNote
      ? `<p style="margin:16px 0 0;font-size:12px;color:${MUTED};">${escapeHtml(opts.footerNote)}</p>`
      : "");

  const requestedTrackUrl = opts.trackUrl === undefined ? `${webBaseUrl()}/track` : opts.trackUrl;
  // Don't repeat a track link in the footer when the email already has a CTA
  // (order/notification CTAs are the primary action — avoids "Track your order" twice).
  const trackUrl = opts.cta ? null : requestedTrackUrl;

  const html = renderEmailShell({
    eyebrow: opts.eyebrow ?? "Swaggeroo",
    heading: opts.heading,
    bodyHtml,
    cta: opts.cta,
    trackUrl
  });

  const text = [
    opts.heading,
    "",
    ...bodyParas,
    ...(opts.cta ? ["", `${opts.cta.label}: ${opts.cta.url}`] : []),
    ...(trackUrl ? ["", `Track your order: ${trackUrl}`] : []),
    ...(opts.footerNote ? ["", opts.footerNote] : []),
    "",
    "Swaggeroo Team"
  ].join("\n");

  return { html, text };
}
