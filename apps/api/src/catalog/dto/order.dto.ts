import { z } from "zod";

const catalogOrderStatusSchema = z.enum([
  "PENDING_REVIEW",
  "IN_REVIEW",
  "APPROVED",
  "REJECTED",
  "CANCELLED"
]);

const catalogOrderDesignPhaseSchema = z.enum([
  "MOCKUP_IN_PROGRESS",
  "REVIEW_MOCKUP_DESIGN",
  "REVISION_REQUESTED",
  "FINALIZING_PROOF_DESIGN",
  "REVIEW_FINAL_DESIGN",
  "READY_TO_ORDER"
]);

export const listOrdersQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: catalogOrderStatusSchema.optional(),
  assignedEmployeeId: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(15)
});

export const updateOrderStatusSchema = z.object({
  status: catalogOrderStatusSchema
});

export const assignOrderEmployeeSchema = z.object({
  assignedEmployeeId: z.string().trim().nullable()
});

export const createOrderDesignUploadSchema = z.object({
  filename: z.string().trim().min(1).max(200),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  type: z.enum(["mockups", "proofs", "revisions"]).default("mockups")
});

export const updateOrderItemDesignSchema = z.object({
  designPhase: catalogOrderDesignPhaseSchema.optional(),
  mockupImageUrl: z.string().trim().url().optional().nullable(),
  mockupImageKey: z.string().trim().optional().nullable(),
  proofImageUrl: z.string().trim().url().optional().nullable(),
  proofImageKey: z.string().trim().optional().nullable(),
  adminNotes: z.string().trim().max(5000).optional().nullable(),
  resolveOpenRevision: z.boolean().optional().default(false)
});

export const requestOrderItemRevisionSchema = z.object({
  notes: z.string().trim().min(1, "Revision notes are required").max(5000),
  logoUrl: z.string().trim().url().optional().nullable(),
  logoKey: z.string().trim().optional().nullable()
});

export const approveOrderItemSchema = z.object({
  stage: z.enum(["MOCKUP", "FINAL"]).default("MOCKUP")
});

export const createOrderPaymentSchema = z.object({
  sourceId: z.string().trim().min(1).max(255)
});

export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type UpdateOrderStatusDto = z.infer<typeof updateOrderStatusSchema>;
export type AssignOrderEmployeeDto = z.infer<typeof assignOrderEmployeeSchema>;
export type CreateOrderDesignUploadDto = z.infer<typeof createOrderDesignUploadSchema>;
export type UpdateOrderItemDesignDto = z.infer<typeof updateOrderItemDesignSchema>;
export type RequestOrderItemRevisionDto = z.infer<typeof requestOrderItemRevisionSchema>;
export type ApproveOrderItemDto = z.infer<typeof approveOrderItemSchema>;
export type CreateOrderPaymentDto = z.infer<typeof createOrderPaymentSchema>;
