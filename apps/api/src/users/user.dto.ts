import { z } from "zod";

export const listUsersQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  role: z.string().trim().min(1).max(80).optional()
});

const employeeBaseSchema = z.object({
  email: z.string().trim().email().max(160),
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  phone: z.string().trim().max(40).optional().nullable(),
  roleId: z.string().trim().min(1, "Role is required")
});

export const createEmployeeSchema = employeeBaseSchema.extend({
  password: z.string().min(8).max(100)
});

export const updateEmployeeSchema = employeeBaseSchema.extend({
  password: z.string().min(8).max(100).optional().nullable()
});

// Self-service profile edit (any authenticated user updating their own record).
// Unlike employees, customers are not restricted to business emails.
export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().max(40).optional().nullable(),
  avatarUrl: z.string().trim().url().max(2048).optional().nullable(),
  avatarKey: z.string().trim().max(512).optional().nullable()
});

// Admin reset of another user's password (no current password required).
export const resetUserPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(200)
});

export type ListUsersQueryDto = z.infer<typeof listUsersQuerySchema>;
export type ResetUserPasswordDto = z.infer<typeof resetUserPasswordSchema>;
export type CreateEmployeeDto = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeDto = z.infer<typeof updateEmployeeSchema>;
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
