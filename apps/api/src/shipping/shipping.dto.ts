import { z } from "zod";

const moneySchema = z.coerce.number().min(0);
const countryCodeSchema = z
  .string()
  .trim()
  .length(2, "Country code must be a 2-letter ISO code")
  .transform((value) => value.toUpperCase());

const countryEntrySchema = z.object({
  code: countryCodeSchema,
  name: z.string().trim().min(1).max(120),
});

export const shippingScopeSchema = z.enum([
  "DOMESTIC_ONLY",
  "DOMESTIC_AND_INTERNATIONAL",
  "INTERNATIONAL_REVIEW_REQUIRED",
]);

export const shippingPackageTypeSchema = z.enum([
  "BULK_ITEM",
  "PACK",
  "MAILER_PACK",
]);

export const shippingPricingModelSchema = z.enum([
  "FLAT_PER_PACKAGE",
  "FLAT_PER_SHIPMENT",
  "WEIGHT_AND_QUANTITY",
]);

export const shippingServiceLevelSchema = z.enum(["STANDARD", "EXPRESS"]);

export const shippingShipmentStatusSchema = z.enum([
  "DRAFT",
  "ESTIMATED",
  "SCHEDULED",
  "IN_REVIEW",
  "ON_THE_WAY",
  "DELIVERED",
  "FAILURE",
  "RETURN_TO_SENDER",
  "AVAILABLE_FOR_PICKUP",
  "CANCELLED",
]);

export const listShippingRatesQuerySchema = z.object({
  zoneId: z.string().trim().optional(),
  serviceLevel: shippingServiceLevelSchema.optional(),
  packageType: shippingPackageTypeSchema.optional(),
});

export const listShipmentsQuerySchema = z.object({
  orderId: z.string().trim().optional(),
  status: shippingShipmentStatusSchema.optional(),
  recipientId: z.string().trim().optional(),
  search: z.string().trim().max(120).optional(),
  userId: z.string().trim().optional()
});

export const createShippingProfileSchema = z.object({
  name: z.string().trim().min(1).max(120),
  packageType: shippingPackageTypeSchema,
  shippingScope: shippingScopeSchema.default("DOMESTIC_AND_INTERNATIONAL"),
  isHazmat: z.boolean().default(false),
  containsBattery: z.boolean().default(false),
  containsFood: z.boolean().default(false),
  containsCosmetic: z.boolean().default(false),
  containsLiquid: z.boolean().default(false),
  containsWood: z.boolean().default(false),
  isOversized: z.boolean().default(false),
  requiresPhoneForInternational: z.boolean().default(true),
  requiresEmailForInternational: z.boolean().default(true),
  maxUnitsPerPackage: z.coerce.number().int().min(1).optional().nullable(),
  allowCountries: z.array(countryEntrySchema).default([]),
  blockCountries: z.array(countryEntrySchema).default([]),
});

export const updateShippingProfileSchema = createShippingProfileSchema.partial();

export const createShippingZoneSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  isDomestic: z.boolean().default(false),
  isActive: z.boolean().default(true),
  countries: z.array(countryEntrySchema).default([]),
});

export const updateShippingZoneSchema = createShippingZoneSchema.partial();

const shippingRateFieldsSchema = z.object({
  zoneId: z.string().trim().min(1),
  serviceLevel: shippingServiceLevelSchema,
  packageType: shippingPackageTypeSchema,
  pricingModel: shippingPricingModelSchema,
  weightFromOz: z.coerce.number().min(0),
  weightToOz: z.coerce.number().min(0).optional().nullable(),
  baseRate: moneySchema,
  perItemRate: moneySchema.optional().nullable(),
  perPoundRate: moneySchema.optional().nullable(),
  handlingFee: moneySchema.optional().nullable(),
  fuelSurcharge: moneySchema.optional().nullable(),
  currency: z.string().trim().min(3).max(8).default("USD"),
  isActive: z.boolean().default(true),
});

export const createShippingRateSchema = shippingRateFieldsSchema.superRefine(
  (value, ctx) => {
    if (value.weightToOz != null && value.weightToOz < value.weightFromOz) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["weightToOz"],
        message: "Weight to must be greater than or equal to weight from",
      });
    }
  }
);

export const updateShippingRateSchema = shippingRateFieldsSchema
  .partial()
  .superRefine((value, ctx) => {
    if (
      value.weightFromOz != null &&
      value.weightToOz != null &&
      value.weightToOz < value.weightFromOz
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["weightToOz"],
        message: "Weight to must be greater than or equal to weight from",
      });
    }
  });

export const shippingShipmentItemInputSchema = z.object({
  orderItemId: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1),
});

export const estimateOrderShipmentSchema = z.object({
  orderId: z.string().trim().min(1),
  recipientId: z.string().trim().optional().nullable(),
  destinationCountryCode: countryCodeSchema,
  destinationCountryName: z.string().trim().min(1).max(120).optional(),
  recipientName: z.string().trim().max(120).optional().nullable(),
  recipientEmail: z.string().trim().email().max(160).optional().nullable(),
  recipientPhone: z.string().trim().max(40).optional().nullable(),
  addressLine1: z.string().trim().max(160).optional().nullable(),
  addressLine2: z.string().trim().max(160).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  state: z.string().trim().max(120).optional().nullable(),
  postalCode: z.string().trim().max(40).optional().nullable(),
  serviceLevel: shippingServiceLevelSchema,
  notes: z.string().trim().max(2000).optional().nullable(),
  items: z.array(shippingShipmentItemInputSchema).min(1),
});

export const createShippingShipmentSchema = estimateOrderShipmentSchema;

export const createShipmentPaymentSchema = z.object({
  sourceId: z.string().trim().min(1)
});


export const updateShippingShipmentStatusSchema = z.object({
  status: shippingShipmentStatusSchema
});

export const updateShipmentTrackingSchema = z.object({
  carrier: z.string().trim().max(80).optional().nullable(),
  trackingNumber: z.string().trim().max(120).optional().nullable(),
  trackingUrl: z.string().trim().url().max(500).optional().nullable(),
  statusNotes: z.string().trim().max(2000).optional().nullable(),
  scheduledFor: z.coerce.date().optional().nullable(),
  shippedAt: z.coerce.date().optional().nullable(),
  deliveredAt: z.coerce.date().optional().nullable(),
  status: shippingShipmentStatusSchema.optional()
});

export type CreateShippingProfileDto = z.infer<typeof createShippingProfileSchema>;
export type UpdateShippingProfileDto = z.infer<typeof updateShippingProfileSchema>;
export type CreateShippingZoneDto = z.infer<typeof createShippingZoneSchema>;
export type UpdateShippingZoneDto = z.infer<typeof updateShippingZoneSchema>;
export type CreateShippingRateDto = z.infer<typeof createShippingRateSchema>;
export type UpdateShippingRateDto = z.infer<typeof updateShippingRateSchema>;
export type ListShippingRatesQuery = z.infer<typeof listShippingRatesQuerySchema>;
export type ListShipmentsQueryDto = z.infer<typeof listShipmentsQuerySchema>;
export type EstimateOrderShipmentDto = z.infer<typeof estimateOrderShipmentSchema>;
export type CreateShippingShipmentDto = z.infer<typeof createShippingShipmentSchema>;
export type CreateShipmentPaymentDto = z.infer<typeof createShipmentPaymentSchema>;
export type UpdateShippingShipmentStatusDto = z.infer<typeof updateShippingShipmentStatusSchema>;
export type UpdateShipmentTrackingDto = z.infer<typeof updateShipmentTrackingSchema>;
