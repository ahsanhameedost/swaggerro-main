export type Recipient = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state?: string | null;
  postalCode: string;
  countryCode: string;
  countryName: string;
  notes?: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ListRecipientsParams = {
  search?: string;
  countryCode?: string;
  userId?: string;
};

export type CreateRecipientInput = Omit<Recipient, "id" | "userId" | "createdAt" | "updatedAt">;
export type UpdateRecipientInput = Partial<CreateRecipientInput>;
