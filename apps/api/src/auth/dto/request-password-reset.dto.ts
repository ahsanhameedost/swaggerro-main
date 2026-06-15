import { z } from "zod";

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().email("Enter a valid email address")
});

export type RequestPasswordResetDto = z.infer<typeof requestPasswordResetSchema>;
