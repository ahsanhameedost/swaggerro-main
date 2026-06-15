import { apiFetch } from "./api";

export type ProductItemInput = {
  productCategory: string;
  totalQuantity: number;
  productDescription?: string;
  colors?: string;
  targetUnitPrice?: number;
  decorationMethod?: string;
  decorationNotes?: string;
};

export type ContactInput = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  shippingAddress?: string;
  city?: string;
  state?: string;
  zip?: string;
  eventName?: string;
  inHandDate?: string;
  budget?: string;
  artworkReady?: string;
  additionalNotes?: string;
  products?: ProductItemInput[];
};

export type ContactMessageListItem = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  eventName?: string | null;
  createdAt: string;
  productsCount: number;
};

export type ContactMessageDetails = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  shippingAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  eventName?: string | null;
  inHandDate?: string | null;
  budget?: string | null;
  artworkReady?: string | null;
  additionalNotes?: string | null;
  createdAt: string;
  emailedAt?: string | null;
  emailError?: string | null;
  products: Array<{
    id: string;
    productCategory: string;
    totalQuantity: number;
    productDescription?: string | null;
    colors?: string | null;
    targetUnitPrice?: number | null;
    decorationMethod?: string | null;
    decorationNotes?: string | null;
    createdAt: string;
  }>;
};

export type ContactMessagesResponse = {
  items: ContactMessageListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export async function submitContact(input: ContactInput) {
  return apiFetch<{ ok: true; id: string }>("/contact", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function listContactMessages(params: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const search = params.search?.trim() ?? "";
  const query = new URLSearchParams();

  if (search) query.set("search", search);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  return apiFetch<ContactMessagesResponse>(`/contact/messages?${query.toString()}`, {
    method: "GET"
  });
}

export async function getContactMessage(id: string) {
  return apiFetch<{ message: ContactMessageDetails }>(`/contact/messages/${id}`, {
    method: "GET"
  });
}

export async function deleteContactMessage(id: string) {
  return apiFetch<{ ok: true }>(`/contact/messages/${id}`, {
    method: "DELETE"
  });
}
