import { apiFetch } from "@/lib/api";
import { buildQuery } from "../shared";
import type { CatalogCategory } from "../categories/types";
import type { CatalogCollection } from "../collections/types";
import type {
  CatalogProductListItem,
  CatalogProductDetail,
  ListPublicProductsParams
} from "../products/types";
import type { PaginationMeta } from "../shared";
import type { CatalogOrder } from "../orders/types";
import type { PublicCatalogCheckoutInput } from "./types";

export async function listPublicCategories() {
  return apiFetch<{ items: CatalogCategory[] }>(`/catalog/public/categories`, { method: "GET" });
}

export async function listPublicCollections() {
  return apiFetch<{ items: CatalogCollection[] }>(`/catalog/public/collections`, { method: "GET" });
}

export async function listPublicProducts(params: ListPublicProductsParams = {}) {
  return apiFetch<{ items: CatalogProductListItem[]; pagination: PaginationMeta }>(
    `/catalog/public/products${buildQuery(params as any)}`,
    { method: "GET" }
  );
}

export async function getPublicProduct(slug: string) {
  return apiFetch<{ product: CatalogProductDetail }>(`/catalog/public/products/${slug}`, {
    method: "GET"
  });
}

export async function createCatalogImageUpload(
  path: "categories" | "collections" | "products" | "projects",
  input: {
    filename: string;
    contentType: "image/jpeg" | "image/png" | "image/webp";
  }
) {
  const endpoint =
    path === "projects" ? `/catalog/public/projects/upload-url` : `/catalog/${path}/upload-url`;

  return apiFetch<{
    uploadUrl: string;
    key: string;
    publicUrl: string;
    expiresIn: number;
  }>(endpoint, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function uploadFileToPresignedUrl(uploadUrl: string, file: File) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type
    },
    body: file
  });

  if (!response.ok) {
    throw new Error("Image upload failed");
  }
}

export async function submitPublicOrder(input: PublicCatalogCheckoutInput) {
  return apiFetch<{ order: CatalogOrder }>(`/catalog/public/orders`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export type PublicOrderTracking = {
  orderNumber: number;
  status: string;
  productionStage: string | null;
  paymentStatus: string;
  type: "BULK" | "SWAG_PACK" | "COMBINED";
  projectName: string | null;
  createdAt: string;
  items: { productName: string; designPhase: string; quantity: number }[];
  shipments: {
    status: string;
    carrier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    destinationCountryName: string;
  }[];
};

// Account-free tracking lookup by order number (SW-044 / 44) + email.
export async function trackPublicOrder(orderNumber: string, email: string) {
  return apiFetch<{ tracking: PublicOrderTracking }>(
    `/catalog/public/track${buildQuery({ orderNumber, email })}`,
    { method: "GET" }
  );
}
