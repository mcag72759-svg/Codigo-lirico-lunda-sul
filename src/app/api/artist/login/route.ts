import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { and, count, eq, gt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artistAccounts, artistApplications, artistSessions } from "@/lib/db/schema";
import { ARTIST_SESSION_COOKIE } from "@/lib/security/artist-session";
export const runtime = "nodejs";
const SESSION_SECONDS = 60 * 60 * 24 * 30;
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Pedido inválido." }, { status: 400 }); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || password.length < 1 || password.length > 128) return NextResponse.json({ error: "Preenche o e-mail e a palavra-passe." }, { status: 400 });
  const [row] = await db.select({ id: artistAccounts.id, salt: artistAccounts.passwordSalt, hash: artistAccounts.passwordHash })
    .from(artistAccounts).innerJoin(artistApplications, eq(artistAccounts.applicationId, artistApplications.id))
    .where(and(eq(artistApplications.email, email), eq(artistApplications.status, "approved"))).limit(1);
  let valid = false;
  if (row && /^[a-f0-9]{32}$/i.test(row.salt) && /^[a-f0-9]{128}$/i.test(row.hash)) {
    const actual = scryptSync(password, row.salt, 64), expected = Buffer.from(row.hash, "hex");
    valid = expected.length === actual.length && timingSafeEqual(actual, expected);
  }
  if (!row || !valid) return NextResponse.json({ error: "E-mail ou palavra-passe incorrectos." }, { status: 401 });
  const token = randomBytes(32).toString("hex"), tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
  await db.insert(artistSessions).values({ id: randomBytes(16).toString("hex"), accountId: row.id, tokenHash, expiresAt, createdAt: new Date() });
  const response = NextResponse.json({ ok: true, redirectTo: "/artistas/painel" });
  response.cookies.set({ name: ARTIST_SESSION_COOKIE, value: token, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_SECONDS });
  return response;
}
