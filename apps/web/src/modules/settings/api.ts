import { apiFetch } from "@/lib/api";

// Platform-wide settings (super-admin managed). Values are strings; booleans are
// "true"/"false".
export type SettingsMap = {
  sellers_can_add_products: string;
  preview_logo_gate: string;
};

export type SettingKey = keyof SettingsMap;

// Flags safe to read without auth (served by GET /settings/public).
export type PublicSettingsMap = {
  preview_logo_gate: string;
};

export async function getSettings() {
  return apiFetch<{ settings: SettingsMap }>("/settings", { method: "GET" });
}

export async function getPublicSettings() {
  return apiFetch<{ settings: PublicSettingsMap }>("/settings/public", { method: "GET" });
}

export async function updateSetting(key: SettingKey, value: string) {
  return apiFetch<{ settings: SettingsMap }>("/settings", {
    method: "PATCH",
    body: JSON.stringify({ key, value }),
  });
}
