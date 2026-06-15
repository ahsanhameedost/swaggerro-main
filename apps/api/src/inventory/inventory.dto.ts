import { z } from "zod";

export const listInventoryQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  userId: z.string().trim().optional(),
  orderId: z.string().trim().optional()
});

export const listInventoryLedgerQuerySchema = listInventoryQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(100).default(25)
});

export const inventoryReceiptItemSchema = z.object({
  orderItemId: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1)
});

export const receiveInventorySchema = z.object({
  orderId: z.string().trim().min(1),
  items: z.array(inventoryReceiptItemSchema).default([])
});

export const adjustInventorySchema = z.object({
  orderItemId: z.string().trim().min(1),
  quantityDelta: z.coerce.number().int().refine((value) => value !== 0, "Quantity delta cannot be zero"),
  note: z.string().trim().min(1).max(500).optional().nullable()
});

export type ListInventoryQueryDto = z.infer<typeof listInventoryQuerySchema>;
export type ListInventoryLedgerQueryDto = z.infer<typeof listInventoryLedgerQuerySchema>;
export type ReceiveInventoryDto = z.infer<typeof receiveInventorySchema>;
export type AdjustInventoryDto = z.infer<typeof adjustInventorySchema>;
