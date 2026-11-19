// Pure permission rule. Call only on the server after loading the administrator
// from a verified session; never accept an admin identity supplied by the browser.
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

  return admin.permissions.includes("*") || admin.permissions.includes(requiredPermission);
}
