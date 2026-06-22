/**
 * Imprint / decoration methods + setup fees. The backend has no decoration-method
 * model, so this is the canonical frontend config (fees in dollars). Methods are
 * offered per product category, matching the new-design seed.
 */
export type ImprintMethod = { key: string; name: string; setupFee: number };

const METHODS: Record<string, { name: string; setupFee: number }> = {
  screen_print: { name: "Screen Print", setupFee: 45 },
  embroidery: { name: "Embroidery", setupFee: 60 },
  full_color: { name: "Full-Color Print", setupFee: 50 },
  pad_print: { name: "Pad Print", setupFee: 40 },
  laser_engrave: { name: "Laser Engraving", setupFee: 75 },
  deboss: { name: "Deboss", setupFee: 65 },
};

const BY_CATEGORY: Record<string, string[]> = {
  apparel: ["screen_print", "embroidery", "full_color"],
  bags: ["screen_print", "embroidery", "full_color"],
  drinkware: ["pad_print", "laser_engrave", "full_color"],
  drinkbottles: ["laser_engrave", "pad_print"],
  tech: ["laser_engrave", "full_color", "pad_print"],
  notebooks: ["deboss", "screen_print", "laser_engrave"],
};

export function getImprintMethods(categorySlug?: string | null): ImprintMethod[] {
  const keys = BY_CATEGORY[categorySlug ?? ""] ?? ["screen_print", "full_color"];
  return keys.map((k) => ({ key: k, ...METHODS[k] }));
}
