export type Permission = {
  id: string;
  key: string;
  description?: string | null;
};

export type RoleWithPermissions = {
  id: string;
  name: string;
  description?: string | null;
  permissionKeys: string[];
  userCount: number;
  isSystem: boolean;
};
