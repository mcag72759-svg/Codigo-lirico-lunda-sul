import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { platformAdminSessions } from "@/lib/db/schema";
import { ADMIN_SESSION_COOKIE, getAdminSession } from "@/lib/security/admin-session";

export const runtime = "nodejs";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ authenticated: false }, { status: 200 });
  return NextResponse.json({
    authenticated: true,
    admin: { displayName: admin.displayName, email: admin.email, role: admin.role },
  });
}

export async function DELETE() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (token && token.length === 64) {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await db.delete(platformAdminSessions).where(eq(platformAdminSessions.tokenHash, tokenHash));
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
