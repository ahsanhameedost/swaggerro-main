import { z } from "zod";

const optionalString = (max: number) =>
  z.string().trim().max(max).optional().nullable().or(z.literal("")).transform((v) => (v ? v : null));

// Seller-managed payout/bank details (where their earnings get sent).
export const updatePayoutDetailsSchema = z.object({
  payoutMethod: optionalString(40),
  payoutBankName: optionalString(160),
  payoutAccountName: optionalString(160),
  payoutAccountNumber: optionalString(80),
  payoutRoutingNumber: optionalString(80),
  payoutDetails: optionalString(2000)
});

// Admin sets the platform commission for a store.
export const setCommissionSchema = z.object({
  commissionPercent: z.number().min(0).max(100)
});

// Admin records a payout (settlement) to a seller. Defaults to the full balance.
export const createPayoutSchema = z.object({
  amountCents: z.number().int().positive().optional(),
  note: z.string().trim().max(500).optional().nullable()
});

export type UpdatePayoutDetailsInput = z.infer<typeof updatePayoutDetailsSchema>;
export type SetCommissionInput = z.infer<typeof setCommissionSchema>;
export type CreatePayoutInput = z.infer<typeof createPayoutSchema>;
