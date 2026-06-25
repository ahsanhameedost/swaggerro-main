import { z } from "zod";

export const signupSchema = z
  .object({
    email: z.string().trim().email("Enter a valid email address"),
    password: z.string().min(6),
    confirmPassword: z.string().min(6),
    firstName: z.string().trim().max(80).optional().or(z.literal("")),
    lastName: z.string().trim().max(80).optional().or(z.literal("")),
    phone: z.string().trim().max(30).optional().or(z.literal(""))
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

export type SignupDto = z.infer<typeof signupSchema>;
