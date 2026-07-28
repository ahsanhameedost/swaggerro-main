import { z } from "zod";

// The known platform-wide settings and their default (string) values. Only keys
// listed here can be written through the API.
export const SETTING_DEFAULTS = {
  // When "true", sellers are allowed to add their own products (future feature).
  // OFF by default — sellers only resell Swaggeroo's catalog for now.
  sellers_can_add_products: "false",
  // B2C gate: when "true", the "Preview your logo" option on a product page is
  // disabled until the quantity exceeds PREVIEW_LOGO_GATE_THRESHOLD (5). At or
  // below the threshold shoppers get a direct pay-now checkout; above it they
  // unlock the logo-preview + quote flow. When "false" there is no gate — logo
  // preview is always available and the effective minimum is 1.
  preview_logo_gate: "true",
  // How many products the public shop page shows per page before you have to
  // page forward. Stored as a string like every setting; parsed to a number
  // on read.
  shop_products_per_page: "12"
} as const;

// Keys safe to expose to unauthenticated shoppers via GET /settings/public.
export const PUBLIC_SETTING_KEYS = ["preview_logo_gate", "shop_products_per_page"] as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type SettingsMap = Record<SettingKey, string>;
export type PublicSettingKey = (typeof PUBLIC_SETTING_KEYS)[number];
export type PublicSettingsMap = Record<PublicSettingKey, string>;

export const updateSettingSchema = z
  .object({
    key: z.enum(Object.keys(SETTING_DEFAULTS) as [SettingKey, ...SettingKey[]]),
    value: z.string().max(2000)
  })
  .superRefine((input, ctx) => {
    if (input.key === "shop_products_per_page") {
      const n = Number(input.value);
      if (!Number.isInteger(n) || n < 1 || n > 200) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["value"],
          message: "Products per page must be a whole number between 1 and 200"
        });
      }
    }
  });

export type UpdateSettingInput = z.infer<typeof updateSettingSchema>;
