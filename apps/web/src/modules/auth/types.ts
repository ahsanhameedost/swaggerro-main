export type RoleName = string;

export type User = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  role: RoleName;
  permissions: string[];
};
