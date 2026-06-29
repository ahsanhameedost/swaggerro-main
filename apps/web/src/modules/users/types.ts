export type AppUserRole = string;

export type UserRoleSummary = {
  id: string;
  name: AppUserRole;
};

export type AssignableRole = {
  id: string;
  name: string;
  description?: string | null;
};

export type AppUserListItem = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  createdAt: string;
  role: UserRoleSummary;
  // Super-admin-only sensitive fields (omitted for everyone else by the API).
  username?: string | null;
  passwordHash?: string | null;
  emailVerifiedAt?: string | null;
  mustSetPassword?: boolean;
};

export type CreateEmployeeInput = {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  password: string;
  roleId: string;
};

export type UpdateEmployeeInput = {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  password?: string | null;
  roleId: string;
};
