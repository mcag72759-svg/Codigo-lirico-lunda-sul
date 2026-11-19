export type AdminIdentity = {
  active: boolean;
  permissions: string[];
};

export function hasPermission(
  admin: AdminIdentity | null | undefined,
  requiredPermission: string,
): boolean {
  if (!admin || !admin.active || !requiredPermission.trim()) {
    return false;
  }

  return admin.permissions.includes(requiredPermission);
}
