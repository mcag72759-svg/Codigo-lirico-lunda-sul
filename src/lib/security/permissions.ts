// Central catalogue for administrator capabilities. Every check is enforced on the server.
export const ADMIN_PERMISSIONS = [
  "content.view",
  "content.publish",
  "content.manage",
  "artists.view",
  "artists.review",
  "artists.manage",
  "community.moderate",
  "analytics.view",
  "administrators.manage",
] as const;

export type AdminPermission = typeof ADMIN_PERMISSIONS[number];

export type AdminIdentity = {
  id?: string;
  active: boolean;
  permissions: string[];
};

export function hasPermission(
  admin: AdminIdentity | null | undefined,
  requiredPermission: string,
): boolean {
  if (!admin || !admin.active || !requiredPermission.trim()) return false;
  return admin.permissions.includes("*") || admin.permissions.includes(requiredPermission);
}

export function hasAnyPermission(
  admin: AdminIdentity | null | undefined,
  requiredPermissions: readonly string[],
): boolean {
  if (!admin || !admin.active) return false;
  if (admin.permissions.includes("*")) return true;
  return requiredPermissions.some(permission => admin.permissions.includes(permission));
}
