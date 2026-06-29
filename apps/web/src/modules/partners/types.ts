export type SellerApplicationStatus = "NEW" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";

export type SellerApplication = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  companyAddress: string;
  businessDescription: string;
  industry: string;
  country: string;
  state: string | null;
  desiredSlug: string | null;
  logoUrl: string | null;
  logoKey: string | null;
  website: string | null;
  additionalInfo: string | null;
  status: SellerApplicationStatus;
  adminNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateSellerApplicationInput = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  companyAddress: string;
  businessDescription: string;
  industry: string;
  country: string;
  state?: string;
  desiredSlug?: string;
  website?: string;
  additionalInfo?: string;
  logoUrl?: string | null;
  logoKey?: string | null;
};

export type AvailabilityResult = {
  slug?: string;
  slugTaken?: boolean;
  email?: string;
  emailTaken?: boolean;
};

export type ListSellerApplicationsParams = {
  search?: string;
  status?: SellerApplicationStatus;
  page?: number;
  pageSize?: number;
};

export type SellerApplicationsResponse = {
  items: SellerApplication[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
