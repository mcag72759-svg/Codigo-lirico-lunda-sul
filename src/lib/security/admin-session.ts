import "server-only";

import { createHash } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { platformAdmins, platformAdminSessions } from "@/lib/db/schema";

export const ADMIN_SESSION_COOKIE = "cl_admin_session";

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token || token.length !== 64) return null;

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const [admin] = await db
    .select({
      id: platformAdmins.id,
      displayName: platformAdmins.displayName,
      email: platformAdmins.email,
      role: platformAdmins.role,
      active: platformAdmins.active,
      permissions: platformAdmins.permissions,
    })
    .from(platformAdminSessions)
    .innerJoin(platformAdmins, eq(platformAdminSessions.adminId, platformAdmins.id))
    .where(
      and(
        eq(platformAdminSessions.tokenHash, tokenHash),
        gt(platformAdminSessions.expiresAt, new Date()),
        eq(platformAdmins.active, true),
      ),
    )
    .limit(1);

  return admin ?? null;
}

export function requestOriginIsSame(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
