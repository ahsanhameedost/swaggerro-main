export type ShippingCountryOption = {
  code: string;
  name: string;
};

export type ShippingProfile = {
  id: string;
  slug: string;
  name: string;
  packageType: "BULK_ITEM" | "PACK" | "MAILER_PACK";
  shippingScope: "DOMESTIC_ONLY" | "DOMESTIC_AND_INTERNATIONAL" | "INTERNATIONAL_REVIEW_REQUIRED";
  isHazmat: boolean;
  containsBattery: boolean;
  containsFood: boolean;
  containsCosmetic: boolean;
  containsLiquid: boolean;
  containsWood: boolean;
  isOversized: boolean;
  requiresPhoneForInternational: boolean;
  requiresEmailForInternational: boolean;
  maxUnitsPerPackage?: number | null;
  allowCountries: ShippingCountryOption[];
  blockCountries: ShippingCountryOption[];
  productCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ShippingZone = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isDomestic: boolean;
  isActive: boolean;
  countries: ShippingCountryOption[];
  rateCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ShippingRate = {
  id: string;
  zoneId: string;
  zone?: { id: string; code: string; name: string } | null;
  serviceLevel: "STANDARD" | "EXPRESS";
  packageType: "BULK_ITEM" | "PACK" | "MAILER_PACK";
  pricingModel: "FLAT_PER_PACKAGE" | "FLAT_PER_SHIPMENT" | "WEIGHT_AND_QUANTITY";
  weightFromOz: number;
  weightToOz?: number | null;
  baseRate: number;
  perItemRate?: number | null;
  perPoundRate?: number | null;
  handlingFee?: number | null;
  fuelSurcharge?: number | null;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ShippingShipmentLine = {
  orderItemId: string;
  productId: string;
  productCatalogVariantId?: string | null;
  productName: string;
  variantName?: string | null;
  quantity: number;
  unitWeightOz: number;
  lineWeightOz: number;
  packageType: "BULK_ITEM" | "PACK" | "MAILER_PACK";
  shippingProfileName?: string | null;
  packageCount: number;
};

export type ShippingRateBreakdown = {
  packageType: "BULK_ITEM" | "PACK" | "MAILER_PACK";
  pricingModel: "FLAT_PER_PACKAGE" | "FLAT_PER_SHIPMENT" | "WEIGHT_AND_QUANTITY";
  zoneId: string;
  serviceLevel: "STANDARD" | "EXPRESS";
  currency: string;
  packageCount: number;
  totalQuantity: number;
  totalWeightOz: number;
  totalWeightLb: number;
  baseRate: number;
  perItemRate: number;
  perPoundRate: number;
  handlingFee: number;
  fuelSurcharge: number;
  subtotal: number;
  fuelSurchargeTotal: number;
  handlingFeeTotal: number;
  totalCost: number;
  lines: Array<{
    orderItemId: string;
    productName: string;
    variantName?: string | null;
    quantity: number;
    unitWeightOz: number;
    lineWeightOz: number;
    packageCount: number;
  }>;
};

export type ShipmentEstimate = {
  orderId: string;
  recipientId?: string | null;
  recipient?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state?: string | null;
    postalCode: string;
    countryCode: string;
    countryName: string;
  } | null;
  destinationCountryCode: string;
  destinationCountryName: string;
  recipientName?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  zone: {
    id: string;
    code: string;
    name: string;
    isDomestic: boolean;
  };
  serviceLevel: "STANDARD" | "EXPRESS";
  eligible: boolean;
  issues: string[];
  currency: string;
  isInternational: boolean;
  packageCount: number;
  totalWeightOz: number;
  totalWeightLb: number;
  subtotal: number;
  fuelSurchargeTotal: number;
  handlingFeeTotal: number;
  totalCost: number;
  lines: ShippingShipmentLine[];
  rateBreakdown: ShippingRateBreakdown[];
};

export type ShippingShipment = {
  id: string;
  orderId: string;
  order?: {
    id: string;
    userId?: string | null;
    assignedEmployeeId?: string | null;
    name?: string | null;
    email?: string | null;
  } | null;
  recipientId?: string | null;
  recipient?: {
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
  } | null;
  destinationCountryCode: string;
  destinationCountryName: string;
  recipientName?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  serviceLevel: "STANDARD" | "EXPRESS";
  billingType: "INCLUDED_IN_ORDER" | "SEPARATE_PAYMENT";
  paymentStatus: "UNPAID" | "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  paidAt?: string | null;
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  statusNotes?: string | null;
  scheduledFor?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  status:
    | "DRAFT"
    | "ESTIMATED"
    | "SCHEDULED"
    | "IN_REVIEW"
    | "ON_THE_WAY"
    | "DELIVERED"
    | "FAILURE"
    | "RETURN_TO_SENDER"
    | "AVAILABLE_FOR_PICKUP"
    | "CANCELLED";
  currency: string;
  totalWeightOz: number;
  totalWeightLb: number;
  subtotal: number;
  fuelSurchargeTotal: number;
  handlingFeeTotal: number;
  totalCost: number;
  packageCount: number;
  isInternational: boolean;
  notes?: string | null;
  estimateBreakdown: ShippingRateBreakdown[];
  items: Array<{
    id: string;
    orderItemId: string;
    productId: string;
    productCatalogVariantId?: string | null;
    productName: string;
    variantName?: string | null;
    quantity: number;
    unitWeightOz: number;
    lineWeightOz: number;
    packageType: "BULK_ITEM" | "PACK" | "MAILER_PACK";
    shippingProfileName?: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type ShippingPlanner = {
  order: {
    id: string;
    userId?: string | null;
    name: string;
    email: string;
    currency: string;
    paymentStatus: "UNPAID" | "PENDING" | "PAID" | "FAILED" | "REFUNDED";
    totalPrice: number;
    createdAt: string;
  };
  items: Array<{
    orderItemId: string;
    productId: string;
    productName: string;
    variantName?: string | null;
    quantity: number;
    allocatedQuantity: number;
    remainingQuantity: number;
    availableInventoryQuantity?: number;
    receivedInventoryQuantity?: number;
    pendingWarehouseQuantity?: number;
    inventoryStatus?: "PENDING_RECEIPT" | "PARTIALLY_RECEIVED" | "AVAILABLE";
    imageUrl?: string | null;
    weightOz: number;
    shipping: {
      shippingProfileId?: string | null;
      profileName?: string | null;
      packageType?: "BULK_ITEM" | "PACK" | "MAILER_PACK" | null;
      shippingScope?: "DOMESTIC_ONLY" | "DOMESTIC_AND_INTERNATIONAL" | "INTERNATIONAL_REVIEW_REQUIRED" | null;
      weightOz?: number | null;
      dimensions?: {
        lengthIn?: number | null;
        widthIn?: number | null;
        heightIn?: number | null;
      } | null;
      badges: string[];
    };
  }>;
  shipments: ShippingShipment[];
};

export type CreateShippingProfileInput = Omit<ShippingProfile, "id" | "slug" | "productCount" | "createdAt" | "updatedAt">;
export type UpdateShippingProfileInput = Partial<CreateShippingProfileInput>;

export type CreateShippingZoneInput = Omit<ShippingZone, "id" | "rateCount" | "createdAt" | "updatedAt">;
export type UpdateShippingZoneInput = Partial<CreateShippingZoneInput>;

export type CreateShippingRateInput = Omit<ShippingRate, "id" | "zone" | "createdAt" | "updatedAt">;
export type UpdateShippingRateInput = Partial<CreateShippingRateInput>;

export type EstimateShipmentInput = {
  orderId: string;
  recipientId?: string | null;
  destinationCountryCode: string;
  destinationCountryName?: string;
  recipientName?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  serviceLevel: "STANDARD" | "EXPRESS";
  notes?: string | null;
  items: Array<{
    orderItemId: string;
    quantity: number;
  }>;
};

export type CreateShippingShipmentInput = EstimateShipmentInput;


export type ListShipmentsParams = {
  orderId?: string;
  status?: ShippingShipment["status"];
  recipientId?: string;
  search?: string;
  userId?: string;
};

export type UpdateShipmentTrackingInput = {
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  statusNotes?: string | null;
  scheduledFor?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  status?: ShippingShipment["status"];
};


export type CreateShipmentPaymentInput = {
  sourceId: string;
};
