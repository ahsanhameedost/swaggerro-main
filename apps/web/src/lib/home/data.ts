import "server-only";
import type { CatalogProductListItem } from "@/modules/catalog/products/types";

// Home page reads the public catalog API server-side (no auth needed). Base URL
// comes from the same env var the client uses.
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export type HomeCategory = { id: string; name: string; slug: string; description: string | null };
export type ShowcaseProduct = {
  slug: string;
  name: string;
  imageUrl: string | null;
  categorySlug: string | null;
};

async function getJson(path: string): Promise<any | null> {
  try {
    const res = await fetch(`${API}${path}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getHomeProducts(): Promise<CatalogProductListItem[]> {
  const data = await getJson(`/catalog/public/products?page=1&pageSize=100`);
  return (data?.items ?? []) as CatalogProductListItem[];
}

export async function getHomeCategories(): Promise<HomeCategory[]> {
  const data = await getJson(`/catalog/public/categories`);
  return ((data?.items ?? []) as any[]).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description ?? null,
  }));
}

export function toShowcaseProducts(products: CatalogProductListItem[]): ShowcaseProduct[] {
  return products.map((p) => ({
    slug: p.slug,
    name: p.name,
    imageUrl: p.imageUrl ?? null,
    categorySlug: p.category?.slug ?? null,
  }));
}
