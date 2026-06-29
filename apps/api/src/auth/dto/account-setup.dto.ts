import { z } from "zod";

// A seller, once their application is approved, receives a one-time setup link.
// They use it to verify their email and choose their username + password.
export const verifyAccountSetupSchema = z.object({
  token: z.string().trim().min(10, "Invalid setup link")
});

export const completeAccountSetupSchema = z.object({
  token: z.string().trim().min(10, "Invalid setup link"),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(40)
    .regex(/^[a-zA-Z0-9_.-]+$/, "Use letters, numbers, dot, dash or underscore"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200)
});

export type VerifyAccountSetupDto = z.infer<typeof verifyAccountSetupSchema>;
export type CompleteAccountSetupDto = z.infer<typeof completeAccountSetupSchema>;
