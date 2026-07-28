import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPublicSettings,
  getSettings,
  updateSetting,
  type SettingKey,
} from "@/modules/settings/api";

const settingsKeys = {
  all: ["settings"] as const,
  public: ["settings", "public"] as const,
};

export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: getSettings,
  });
}

// Public storefront flags — readable by anonymous shoppers.
export function usePublicSettings() {
  return useQuery({
    queryKey: settingsKeys.public,
    queryFn: getPublicSettings,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: SettingKey; value: string }) => updateSetting(key, value),
    onSuccess: (data) => {
      queryClient.setQueryData(settingsKeys.all, data);
      // Public flags (e.g. shop_products_per_page) are cached separately with a
      // 5-minute staleTime — invalidate so a change is reflected immediately
      // rather than waiting out the cache.
      queryClient.invalidateQueries({ queryKey: settingsKeys.public });
    },
  });
}
