import { apiFetch } from "@/lib/api";

// Platform-wide settings (super-admin managed). Values are strings; booleans are
// "true"/"false".
export type SettingsMap = {
  sellers_can_add_products: string;
};

export type SettingKey = keyof SettingsMap;

export async function getSettings() {
  return apiFetch<{ settings: SettingsMap }>("/settings", { method: "GET" });
}

export async function updateSetting(key: SettingKey, value: string) {
  return apiFetch<{ settings: SettingsMap }>("/settings", {
    method: "PATCH",
    body: JSON.stringify({ key, value }),
  });
}
