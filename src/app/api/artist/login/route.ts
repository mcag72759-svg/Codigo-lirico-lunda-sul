import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { and, sql, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artistAccounts, artistApplications, artistSessions } from "@/lib/db/schema";
import { normalizePhone, phoneDigits } from "@/lib/phone";
import { ARTIST_SESSION_COOKIE } from "@/lib/security/artist-session";
import { requestOriginIsSame } from "@/lib/security/admin-session";

export const runtime = "nodejs";
const SESSION_SECONDS = 60 * 60 * 24 * 30;

function verifyPassword(password: string, salt: string, expectedHex: string): boolean {
  if (!/^[a-f0-9]{32}$/i.test(salt) || !/^[a-f0-9]{128}$/i.test(expectedHex)) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}

export async function POST(request: Request) {
  if (!requestOriginIsSame(request)) {
    return NextResponse.json({ error: "Origem do pedido não permitida." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const phone = typeof input.phone === "string" ? normalizePhone(input.phone.trim()) : "";
  const digits = phoneDigits(phone);
  const password = typeof input.password === "string" ? input.password : "";
  if (!phone || password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: "Telefone ou palavra-passe incorrectos." }, { status: 401 });
  }

  const [record] = await db
    .select({
      accountId: artistAccounts.id,
      applicationId: artistApplications.id,
      stageName: artistApplications.stageName,
      phone: artistApplications.phone,
      email: artistApplications.email,
      municipality: artistApplications.municipality,
      genre: artistApplications.genre,
      bio: artistApplications.bio,
      photoUrl: artistApplications.photoUrl,
      passwordSalt: artistAccounts.passwordSalt,
      passwordHash: artistAccounts.passwordHash,
    })
    .from(artistAccounts)
    .innerJoin(artistApplications, eq(artistAccounts.applicationId, artistApplications.id))
    .where(and(
      sql`(CASE WHEN length(regexp_replace(${artistApplications.phone}, '[^0-9]', '', 'g')) = 9 AND regexp_replace(${artistApplications.phone}, '[^0-9]', '', 'g') LIKE '9%' THEN '244' || regexp_replace(${artistApplications.phone}, '[^0-9]', '', 'g') ELSE regexp_replace(${artistApplications.phone}, '[^0-9]', '', 'g') END) = ${digits}`,
      eq(artistApplications.status, "approved"),
    ))
    .limit(1);

  if (!record || !verifyPassword(password, record.passwordSalt, record.passwordHash)) {
    return NextResponse.json({ error: "Telefone ou palavra-passe incorrectos. Confirma os dados ou verifica se a conta já foi aprovada." }, { status: 401 });
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const now = new Date();
  await db.insert(artistSessions).values({
    id: randomUUID(),
    accountId: record.accountId,
    tokenHash,
    expiresAt: new Date(now.getTime() + SESSION_SECONDS * 1000),
    createdAt: now,
  });

  const response = NextResponse.json({
    ok: true,
    artist: {
      stageName: record.stageName,
      phone: record.phone,
      email: record.email,
      municipality: record.municipality,
      genre: record.genre,
      bio: record.bio,
      photoUrl: record.photoUrl,
    },
  });
  response.cookies.set({
    name: ARTIST_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
  return response;
}
