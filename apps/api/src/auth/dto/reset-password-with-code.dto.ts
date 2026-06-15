import { z } from "zod";

export const resetPasswordWithCodeSchema = z
  .object({
    email: z.string().trim().email("Enter a valid email address"),
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "Enter the 6-digit code"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm your password")
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

export type ResetPasswordWithCodeDto = z.infer<typeof resetPasswordWithCodeSchema>;
