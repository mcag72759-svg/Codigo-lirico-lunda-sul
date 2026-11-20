import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { and, count, eq, gt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  platformAdminLoginAttempts,
  platformAdmins,
  platformAdminSessions,
} from "@/lib/db/schema";
import { ADMIN_SESSION_COOKIE } from "@/lib/security/admin-session";

export const runtime = "nodejs";

const SESSION_SECONDS = 60 * 60 * 24 * 7;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function getIpHash(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = request.headers.get("x-real-ip")?.trim() || forwarded || "unknown";
  return createHash("sha256").update(ip).digest("hex");
}

function safeEqualText(left: string, right: string): boolean {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

function verifyPassword(email: string, password: string, salt: string, expectedHex: string): boolean {
  const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const configuredPassword = process.env.ADMIN_PASSWORD;
  const environmentMatch =
    !!configuredEmail &&
    email === configuredEmail &&
    !!configuredPassword &&
    safeEqualText(password, configuredPassword);

  if (environmentMatch) return true;
  if (!/^[a-f0-9]{32}$/i.test(salt) || !/^[a-f0-9]{128}$/i.test(expectedHex)) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  if (!input || typeof input !== "object") {
    return NextResponse.json({ error: "Preenche o e-mail e a palavra-passe." }, { status: 400 });
  }

  const body = input as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || email.length > 254 || password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: "Credenciais inválidas." }, { status: 400 });
  }

  const ipHash = getIpHash(request);
  const windowStart = new Date(Date.now() - WINDOW_MS);
  const [attempts] = await db
    .select({ total: count() })
    .from(platformAdminLoginAttempts)
    .where(and(eq(platformAdminLoginAttempts.ipHash, ipHash), gt(platformAdminLoginAttempts.attemptedAt, windowStart)));

  if (Number(attempts?.total ?? 0) >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Demasiadas tentativas. Aguarda 15 minutos antes de tentar novamente." },
      { status: 429 },
    );
  }

  const [admin] = await db
    .select({
      id: platformAdmins.id,
      displayName: platformAdmins.displayName,
      email: platformAdmins.email,
      role: platformAdmins.role,
      active: platformAdmins.active,
      passwordSalt: platformAdmins.passwordSalt,
      passwordHash: platformAdmins.passwordHash,
      permissions: platformAdmins.permissions,
    })
    .from(platformAdmins)
    .where(eq(platformAdmins.email, email))
    .limit(1);

  const valid = !!admin && admin.active && verifyPassword(email, password, admin.passwordSalt, admin.passwordHash);
  if (!valid || !admin) {
    await db.insert(platformAdminLoginAttempts).values({ ipHash, attemptedAt: new Date() });
    return NextResponse.json({ error: "E-mail ou palavra-passe incorrectos." }, { status: 401 });
  }

  await db.delete(platformAdminLoginAttempts).where(eq(platformAdminLoginAttempts.ipHash, ipHash));

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);

  await db.insert(platformAdminSessions).values({
    tokenHash,
    adminId: admin.id,
    expiresAt,
    createdAt: new Date(),
  });

  const response = NextResponse.json({
    ok: true,
    admin: { displayName: admin.displayName, email: admin.email, role: admin.role, id: admin.id, permissions: admin.permissions },
  });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
  return response;
}
