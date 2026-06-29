import { z } from "zod";

// Self-service password change for any logged-in user (requires current password).
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(200)
});

export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
