import { env } from "../env";

// Shared brand chrome for every transactional email — mirrors the reference
// design at /emails: a rounded card with a two-tone (blue + yellow) top accent,
// a dark-navy header with the Swaggeroo wordmark, a white body, a blue pill CTA,
// and a footer. Table-based + inline styles for Gmail / Apple Mail / Outlook.
const BG = "#eef1f6";
const NAVY = "#0d1b3d"; // header + headings
const BLUE = "#0c63d4"; // eyebrow, CTA, links
const SKY = "#2196FF"; // top-bar + wordmark accent
const YELLOW = "#FFC428"; // top-bar accent
const BODY = "#3a4152"; // body copy
const MUTED = "#8b93a1"; // footer / secondary
const BORDER = "#e2e6ee";
const SUMMARY_BG = "#f8fafc";
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

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

// The Swaggeroo logo (white + blue on a dark outline — built for dark headers).
// Emails render in external clients, so a localhost base is unreachable — fall
// back to the public production asset in dev. Overridable via EMAIL_LOGO_URL.
export function emailLogoUrl() {
  const explicit = (env as { EMAIL_LOGO_URL?: string }).EMAIL_LOGO_URL;
  if (explicit) return explicit;
  const base = webBaseUrl();
  if (/localhost|127\.0\.0\.1/.test(base)) {
    return "https://swaggeroo.osdevlabs.com/swaggeroo-logo.png";
  }
  return `${base}/swaggeroo-logo.png`;
}

export type EmailCta = { label: string; url: string };

/**
 * The single branded shell every transactional email uses. `bodyHtml` is the
 * caller-provided (already-escaped) inner HTML placed in the white body.
 */
export function renderEmailShell(opts: {
  eyebrow?: string;
  heading: string;
  subheading?: string;
  bodyHtml: string;
  cta?: EmailCta | null;
  secondaryCta?: EmailCta | null;
  /** Up to 4 product image URLs — shown as a thumbnail strip under the heading. */
  thumbnails?: string[];
  thumbnailsLabel?: string;
  trackUrl?: string | null;
  maxWidth?: number;
}): string {
  const width = opts.maxWidth ?? 600;

  const eyebrowHtml = opts.eyebrow
    ? `<p style="margin:0;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${BLUE};">${escapeHtml(opts.eyebrow)}</p>`
    : "";

  const subheadingHtml = opts.subheading
    ? `<p style="margin:14px 0 0;font-family:${FONT};font-size:15px;line-height:1.65;color:${BODY};">${escapeHtml(opts.subheading)}</p>`
    : "";

  // Product thumbnail strip (like the reference "In this kit" row).
  const thumbs = (opts.thumbnails ?? []).filter(Boolean).slice(0, 4);
  const thumbnailsHtml = thumbs.length
    ? `<tr><td style="background-color:#ffffff;padding:26px 40px 0;">
         <p style="margin:0 0 12px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};">${escapeHtml(opts.thumbnailsLabel ?? "In your order")}</p>
         <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
           ${thumbs
             .map(
               (src) =>
                 `<td width="25%" style="padding:0 4px;"><img src="${escapeHtml(src)}" width="120" height="120" alt="" style="display:block;width:100%;max-width:120px;height:auto;border-radius:12px;border:1px solid ${BORDER};" /></td>`
             )
             .join("")}
           ${Array.from({ length: 4 - thumbs.length }, () => `<td width="25%" style="padding:0 4px;">&nbsp;</td>`).join("")}
         </tr></table>
       </td></tr>`
    : "";

  const pillBtn = (cta: EmailCta) =>
    `<td style="border-radius:999px;background-color:${BLUE};box-shadow:0 3px 8px -2px rgba(12,99,212,0.5);">
       <a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:15px 34px;font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${escapeHtml(cta.label)}</a>
     </td>`;
  const outlineBtn = (cta: EmailCta) =>
    `<td style="border-radius:999px;border:1.5px solid ${BORDER};background-color:#ffffff;">
       <a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:13.5px 30px;font-family:${FONT};font-size:15px;font-weight:700;color:${NAVY};text-decoration:none;">${escapeHtml(cta.label)}</a>
     </td>`;

  const ctaHtml =
    opts.cta || opts.secondaryCta
      ? `<tr><td align="center" style="background-color:#ffffff;padding:28px 40px 4px;">
           <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
             ${opts.cta ? pillBtn(opts.cta) : ""}
             ${opts.cta && opts.secondaryCta ? `<td style="width:10px;">&nbsp;</td>` : ""}
             ${opts.secondaryCta ? outlineBtn(opts.secondaryCta) : ""}
           </tr></table>
         </td></tr>`
      : "";

  const trackHtml = opts.trackUrl
    ? `<a href="${escapeHtml(opts.trackUrl)}" style="color:${BLUE};text-decoration:underline;">Track your order</a>&nbsp;&nbsp;&middot;&nbsp;&nbsp;`
    : "";

  return `
  <div style="margin:0;padding:0;background-color:${BG};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BG};">
      <tr><td align="center" style="padding:40px 16px;">

        <table role="presentation" width="${width}" cellpadding="0" cellspacing="0" border="0" style="width:${width}px;max-width:${width}px;box-shadow:0 6px 28px -10px rgba(13,27,61,0.16);border-radius:16px;">
          <tr><td style="padding:0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
              <td width="50%" style="background-color:${SKY};height:5px;line-height:5px;font-size:0;border-radius:16px 0 0 0;">&nbsp;</td>
              <td width="50%" style="background-color:${YELLOW};height:5px;line-height:5px;font-size:0;border-radius:0 16px 0 0;">&nbsp;</td>
            </tr></table>
          </td></tr>

          <tr><td align="center" style="background-color:${NAVY};padding:26px 40px;">
            <img src="${emailLogoUrl()}" width="164" height="36" alt="Swaggeroo" style="display:block;margin:0 auto;border:0;outline:none;text-decoration:none;width:164px;height:36px;" />
          </td></tr>

          <tr><td style="background-color:#ffffff;padding:36px 40px 0;">
            ${eyebrowHtml}
            <h1 style="margin:10px 0 0;font-family:${FONT};font-size:27px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:${NAVY};">${escapeHtml(opts.heading)}</h1>
            ${subheadingHtml}
          </td></tr>

          ${thumbnailsHtml}

          <tr><td style="background-color:#ffffff;padding:22px 40px 0;font-family:${FONT};font-size:15px;line-height:1.65;color:${BODY};">
            ${opts.bodyHtml}
          </td></tr>

          ${ctaHtml}

          <tr><td style="background-color:#ffffff;padding:14px 40px 34px;border-radius:0 0 16px 16px;font-size:0;line-height:0;">&nbsp;</td></tr>
        </table>

        <table role="presentation" width="${width}" cellpadding="0" cellspacing="0" border="0" style="width:${width}px;max-width:${width}px;">
          <tr><td align="center" style="padding:26px 24px 0;">
            <img src="${emailLogoUrl()}" width="132" height="29" alt="Swaggeroo" style="display:block;margin:0 auto 10px;border:0;outline:none;text-decoration:none;width:132px;height:29px;" />
            <p style="margin:0 0 6px;font-family:${FONT};font-size:12px;color:${MUTED};">Swaggeroo, Inc. · Custom swag your team will actually wear.</p>
            <p style="margin:0;font-family:${FONT};font-size:12px;color:${MUTED};">${trackHtml}<a href="${escapeHtml(webBaseUrl())}" style="color:${MUTED};text-decoration:underline;">swaggeroo.com</a></p>
          </td></tr>
        </table>

      </td></tr>
    </table>
  </div>`;
}

// A WooCommerce-style order breakdown: item rows + a totals block. Injected into
// order emails via renderBrandedEmail's `extraHtml`.
export function renderOrderSummaryHtml(opts: {
  currency?: string;
  items: { name: string; variant?: string | null; quantity: number; lineTotal: number; image?: string | null }[];
  rows: { label: string; value: number; strong?: boolean }[];
}): string {
  const money = (n: number) => `$${n.toFixed(2)}`;
  const itemRows = opts.items
    .map((item) => {
      // Product cell = optional thumbnail on the left + name/variant on the right.
      const productCell = `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          ${
            item.image
              ? `<td valign="top" style="padding-right:12px;"><img src="${escapeHtml(item.image)}" width="46" height="46" alt="" style="display:block;width:46px;height:46px;border-radius:8px;border:1px solid ${BORDER};object-fit:cover;" /></td>`
              : ""
          }
          <td valign="top" style="font-family:${FONT};font-size:13.5px;color:${NAVY};font-weight:600;">
            ${escapeHtml(item.name)}${item.variant ? `<div style="font-size:12px;color:${MUTED};font-weight:400;margin-top:2px;">${escapeHtml(item.variant)}</div>` : ""}
          </td>
        </tr></table>`;
      return `
        <tr>
          <td style="padding:12px 16px;border-top:1px solid #e8ecf3;">${productCell}</td>
          <td align="center" valign="middle" style="padding:12px 16px;border-top:1px solid #e8ecf3;font-family:${FONT};font-size:13.5px;color:${BODY};white-space:nowrap;">&times; ${item.quantity}</td>
          <td align="right" valign="middle" style="padding:12px 16px;border-top:1px solid #e8ecf3;font-family:${FONT};font-size:13.5px;color:${NAVY};white-space:nowrap;font-weight:700;">${money(item.lineTotal)}</td>
        </tr>`;
    })
    .join("");
  const totalRows = opts.rows
    .map(
      (row) => `
        <tr>
          <td style="padding:${row.strong ? "12px" : "6px"} 16px 6px;border-top:1px solid #e8ecf3;font-family:${FONT};font-size:${row.strong ? "14px" : "13.5px"};color:${row.strong ? NAVY : MUTED};font-weight:${row.strong ? "700" : "400"};">${escapeHtml(row.label)}</td>
          <td align="right" style="padding:${row.strong ? "12px" : "6px"} 16px 6px;border-top:1px solid #e8ecf3;font-family:${FONT};font-size:${row.strong ? "17px" : "13.5px"};color:${NAVY};font-weight:${row.strong ? "800" : "700"};white-space:nowrap;">${money(row.value)}</td>
        </tr>`
    )
    .join("");
  return `
    <p style="margin:0 0 12px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};">Order summary</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${SUMMARY_BG};border:1px solid ${BORDER};border-radius:14px;">
      <tr>
        <th align="left" style="padding:12px 16px;font-family:${FONT};font-size:11px;color:${MUTED};text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Product</th>
        <th align="center" style="padding:12px 16px;font-family:${FONT};font-size:11px;color:${MUTED};text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Qty</th>
        <th align="right" style="padding:12px 16px;font-family:${FONT};font-size:11px;color:${MUTED};text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Total</th>
      </tr>
      ${itemRows}
      ${totalRows}
    </table>
  `;
}

// Resolve a stored asset (seller logo, product image) to an absolute URL usable
// from an external email client. Mirrors the web `resolveStorageUrl`: rebuilds
// local-storage refs against this API's public base (local + live share one DB,
// so a URL baked on localhost must be healed to the current host), and passes
// through any other absolute URL (S3/CDN) unchanged.
export function emailAssetUrl(url?: string | null, key?: string | null): string | null {
  const base = (env.API_PUBLIC_URL || "").replace(/\/+$/, "");
  if (key) return `${base}/storage/local/${key.replace(/^\/+/, "")}`;
  if (!url) return null;
  const marker = "/storage/local/";
  const i = url.indexOf(marker);
  if (i !== -1 && base) return `${base}${url.slice(i)}`;
  return url;
}

// Guard a DB-sourced color before dropping it into an inline style. Seller theme
// colors come from a color picker, but validate anyway so a bad value can never
// break the email's CSS. Accepts #rgb / #rrggbb / #rrggbbaa.
export function safeColor(value: string | null | undefined, fallback: string): string {
  return value && /^#[0-9a-fA-F]{3,8}$/.test(value.trim()) ? value.trim() : fallback;
}

/**
 * Seller-branded email shell — used ONLY for orders placed through a white-label
 * store, so the logo, accent colors and company name are the SELLER's, not
 * Swaggeroo's. Same table-based structure as {@link renderEmailShell} (the two-
 * tone accent bar, dark header, thumbnail row, highlight box, pill CTA), but the
 * chrome is themed from the store and the footer reads "provided by <store> ·
 * fulfilled & shipped by Swaggeroo".
 */
export function renderStoreBrandedEmail(opts: {
  store: {
    name: string;
    companyName?: string | null;
    logoUrl?: string | null;
    logoKey?: string | null;
    primary: string;
    primarySoft?: string | null;
    primaryForeground?: string | null;
    secondary: string;
  };
  greeting?: string;
  eyebrow?: string;
  heading: string;
  subheading?: string;
  /** Product images (url + optional storage key) shown as a "What's inside" row. */
  thumbnails?: { url?: string | null; key?: string | null }[];
  thumbnailsLabel?: string;
  /** Highlighted box, e.g. the order number (like the reference "claim code"). */
  highlight?: { label: string; value: string } | null;
  /** Raw HTML placed in the white body (e.g. an order-summary table). */
  bodyHtml?: string;
  cta?: EmailCta | null;
  footerNote?: string;
}): { html: string; text: string } {
  const width = 600;
  const primary = safeColor(opts.store.primary, BLUE);
  const secondary = safeColor(opts.store.secondary, NAVY);
  const primarySoft = safeColor(opts.store.primarySoft, "#f4f6fb");
  const onPrimary = safeColor(opts.store.primaryForeground, "#ffffff");
  const brandName = opts.store.companyName?.trim() || opts.store.name;
  const logo = emailAssetUrl(opts.store.logoUrl, opts.store.logoKey);

  // Header brand mark: the seller's logo inside a white chip, or their name.
  const headerMark = logo
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:12px;"><tr>
         <td style="padding:11px 18px;"><img src="${escapeHtml(logo)}" height="34" alt="${escapeHtml(brandName)}" style="display:block;border:0;outline:none;text-decoration:none;height:34px;max-height:34px;width:auto;" /></td>
       </tr></table>`
    : `<p style="margin:0;font-family:${FONT};font-size:20px;font-weight:800;letter-spacing:-0.01em;color:#ffffff;">${escapeHtml(brandName)}</p>`;

  const eyebrowHtml = opts.eyebrow
    ? `<p style="margin:0;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${primary};">${escapeHtml(opts.eyebrow)}</p>`
    : "";
  const greetingHtml = opts.greeting
    ? `<p style="margin:0 0 14px;font-family:${FONT};font-size:15px;line-height:1.65;color:${BODY};">${escapeHtml(opts.greeting)}</p>`
    : "";
  const subheadingHtml = opts.subheading
    ? `<p style="margin:14px 0 0;font-family:${FONT};font-size:15px;line-height:1.65;color:${BODY};">${escapeHtml(opts.subheading)}</p>`
    : "";

  const thumbs = (opts.thumbnails ?? [])
    .map((t) => emailAssetUrl(t.url, t.key))
    .filter((s): s is string => !!s)
    .slice(0, 4);
  const thumbnailsHtml = thumbs.length
    ? `<tr><td style="background-color:#ffffff;padding:26px 40px 0;">
         <p style="margin:0 0 12px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};">${escapeHtml(opts.thumbnailsLabel ?? "What's inside")}</p>
         <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
           ${thumbs
             .map(
               (src) =>
                 `<td width="25%" style="padding:0 4px;"><img src="${escapeHtml(src)}" width="120" height="120" alt="" style="display:block;width:100%;max-width:120px;height:auto;border-radius:12px;border:1px solid ${BORDER};" /></td>`
             )
             .join("")}
           ${Array.from({ length: 4 - thumbs.length }, () => `<td width="25%" style="padding:0 4px;">&nbsp;</td>`).join("")}
         </tr></table>
       </td></tr>`
    : "";

  const highlightHtml = opts.highlight
    ? `<tr><td align="center" style="background-color:#ffffff;padding:26px 40px 0;">
         <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background-color:${primarySoft};border:1px dashed ${primary};border-radius:12px;"><tr>
           <td align="center" style="padding:16px 32px;">
             <p style="margin:0 0 5px;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${primary};">${escapeHtml(opts.highlight.label)}</p>
             <p style="margin:0;font-family:'SF Mono',SFMono-Regular,Menlo,Consolas,monospace;font-size:22px;font-weight:700;letter-spacing:0.06em;color:${NAVY};">${escapeHtml(opts.highlight.value)}</p>
           </td>
         </tr></table>
       </td></tr>`
    : "";

  const bodyBlockHtml = opts.bodyHtml
    ? `<tr><td style="background-color:#ffffff;padding:24px 40px 0;font-family:${FONT};font-size:15px;line-height:1.65;color:${BODY};">${opts.bodyHtml}</td></tr>`
    : "";

  const ctaHtml = opts.cta
    ? `<tr><td align="center" style="background-color:#ffffff;padding:26px 40px 4px;">
         <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
           <td style="border-radius:999px;background-color:${primary};">
             <a href="${escapeHtml(opts.cta.url)}" style="display:inline-block;padding:15px 40px;font-family:${FONT};font-size:15px;font-weight:700;color:${onPrimary};text-decoration:none;">${escapeHtml(opts.cta.label)}</a>
           </td>
         </tr></table>
       </td></tr>`
    : "";

  const footerNoteHtml = opts.footerNote
    ? `<tr><td align="center" style="background-color:#ffffff;padding:12px 40px 34px;border-radius:0 0 16px 16px;">
         <p style="margin:0;font-family:${FONT};font-size:13px;line-height:1.6;color:#5b6472;">${escapeHtml(opts.footerNote)}</p>
       </td></tr>`
    : `<tr><td style="background-color:#ffffff;padding:14px 40px 34px;border-radius:0 0 16px 16px;font-size:0;line-height:0;">&nbsp;</td></tr>`;

  const html = `
  <div style="margin:0;padding:0;background-color:${BG};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BG};">
      <tr><td align="center" style="padding:40px 16px;">

        <table role="presentation" width="${width}" cellpadding="0" cellspacing="0" border="0" style="width:${width}px;max-width:${width}px;box-shadow:0 6px 28px -10px rgba(13,27,61,0.16);border-radius:16px;">
          <tr><td style="padding:0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
              <td width="50%" style="background-color:${primary};height:5px;line-height:5px;font-size:0;border-radius:16px 0 0 0;">&nbsp;</td>
              <td width="50%" style="background-color:${secondary};height:5px;line-height:5px;font-size:0;border-radius:0 16px 0 0;">&nbsp;</td>
            </tr></table>
          </td></tr>

          <tr><td align="center" style="background-color:${secondary};padding:24px 40px;">
            ${headerMark}
          </td></tr>

          <tr><td style="background-color:#ffffff;padding:34px 40px 0;">
            ${eyebrowHtml}
            <h1 style="margin:10px 0 0;font-family:${FONT};font-size:27px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:${NAVY};">${escapeHtml(opts.heading)}</h1>
            ${subheadingHtml}
          </td></tr>

          ${greetingHtml ? `<tr><td style="background-color:#ffffff;padding:14px 40px 0;">${greetingHtml}</td></tr>` : ""}
          ${thumbnailsHtml}
          ${highlightHtml}
          ${bodyBlockHtml}
          ${ctaHtml}
          ${footerNoteHtml}
        </table>

        <table role="presentation" width="${width}" cellpadding="0" cellspacing="0" border="0" style="width:${width}px;max-width:${width}px;">
          <tr><td align="center" style="padding:26px 24px 0;">
            <p style="margin:0 0 6px;font-family:${FONT};font-size:12px;color:${MUTED};">Your order is provided by <strong style="color:${NAVY};">${escapeHtml(brandName)}</strong></p>
            <p style="margin:0;font-family:${FONT};font-size:11.5px;color:#a2a9b6;">Fulfilled &amp; shipped by <strong style="color:${NAVY};">swag<span style="color:${SKY};">geroo</span></strong></p>
          </td></tr>
        </table>

      </td></tr>
    </table>
  </div>`;

  const text = [
    opts.eyebrow ? opts.eyebrow : "",
    opts.heading,
    "",
    ...(opts.greeting ? [opts.greeting, ""] : []),
    ...(opts.subheading ? [opts.subheading, ""] : []),
    ...(opts.highlight ? [`${opts.highlight.label}: ${opts.highlight.value}`, ""] : []),
    ...(opts.cta ? [`${opts.cta.label}: ${opts.cta.url}`, ""] : []),
    ...(opts.footerNote ? [opts.footerNote, ""] : []),
    `Provided by ${brandName} · Fulfilled & shipped by Swaggeroo`
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  return { html, text };
}

export function renderBrandedEmail(opts: {
  heading: string;
  greeting?: string;
  paragraphs?: string[];
  /** Raw HTML appended after the paragraphs (caller-escaped), e.g. an order table. */
  extraHtml?: string;
  cta?: EmailCta | null;
  secondaryCta?: EmailCta | null;
  thumbnails?: string[];
  thumbnailsLabel?: string;
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
      ? `<p style="margin:16px 0 0;font-size:13px;color:${MUTED};">${escapeHtml(opts.footerNote)}</p>`
      : "");

  const requestedTrackUrl = opts.trackUrl === undefined ? `${webBaseUrl()}/track` : opts.trackUrl;
  // Don't repeat a track link in the footer when the email already has a CTA
  // (order/notification CTAs are the primary action — avoids "Track your order" twice).
  const trackUrl = opts.cta || opts.secondaryCta ? null : requestedTrackUrl;

  const html = renderEmailShell({
    eyebrow: opts.eyebrow ?? "Swaggeroo",
    heading: opts.heading,
    bodyHtml,
    cta: opts.cta,
    secondaryCta: opts.secondaryCta,
    thumbnails: opts.thumbnails,
    thumbnailsLabel: opts.thumbnailsLabel,
    trackUrl
  });

  const text = [
    opts.heading,
    "",
    ...bodyParas,
    ...(opts.cta ? ["", `${opts.cta.label}: ${opts.cta.url}`] : []),
    ...(opts.secondaryCta ? [`${opts.secondaryCta.label}: ${opts.secondaryCta.url}`] : []),
    ...(trackUrl ? ["", `Track your order: ${trackUrl}`] : []),
    ...(opts.footerNote ? ["", opts.footerNote] : []),
    "",
    "Swaggeroo Team"
  ].join("\n");

  return { html, text };
}
