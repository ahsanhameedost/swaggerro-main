import { z } from "zod";

export const verifyPasswordResetCodeSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code")
});

export type VerifyPasswordResetCodeDto = z.infer<typeof verifyPasswordResetCodeSchema>;
