import { z } from "zod";

// The known platform-wide settings and their default (string) values. Only keys
// listed here can be written through the API.
export const SETTING_DEFAULTS = {
  // When "true", sellers are allowed to add their own products (future feature).
  // OFF by default — sellers only resell Swaggeroo's catalog for now.
  sellers_can_add_products: "false"
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type SettingsMap = Record<SettingKey, string>;

export const updateSettingSchema = z.object({
  key: z.enum(Object.keys(SETTING_DEFAULTS) as [SettingKey, ...SettingKey[]]),
  value: z.string().max(2000)
});

export type UpdateSettingInput = z.infer<typeof updateSettingSchema>;
