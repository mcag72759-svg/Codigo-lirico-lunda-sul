import { randomBytes, scryptSync } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artistAccounts, artistApplications, artistSessions } from "@/lib/db/schema";
import { ARTIST_SESSION_COOKIE } from "@/lib/security/artist-session";

export const runtime = "nodejs";
const SESSION_SECONDS = 60 * 60 * 24 * 30;
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Pedido inválido." }, { status: 400 }); }
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!/^CL-[A-Z0-9]{8}$/.test(code) || !email || password.length < 10 || password.length > 128) {
    return NextResponse.json({ error: "Introduz o código de artista, o e-mail aprovado e uma palavra-passe com pelo menos 10 caracteres." }, { status: 400 });
  }
  const [application] = await db.select({ id: artistApplications.id, status: artistApplications.status })
    .from(artistApplications)
    .where(and(eq(artistApplications.code, code), eq(artistApplications.email, email)))
    .limit(1);
  if (!application || application.status !== "approved") {
    return NextResponse.json({ error: "Não encontrámos uma candidatura aprovada com estes dados. Confirma o código e o e-mail." }, { status: 403 });
  }
  const [existing] = await db.select({ id: artistAccounts.id }).from(artistAccounts).where(eq(artistAccounts.applicationId, application.id)).limit(1);
  if (existing) {
    return NextResponse.json({ error: "Esta conta já foi criada. Entra com o teu e-mail e palavra-passe." }, { status: 409 });
  }
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  const accountId = randomBytes(16).toString("hex");
  await db.insert(artistAccounts).values({ id: accountId, applicationId: application.id, passwordSalt: salt, passwordHash: hash, createdAt: new Date(), updatedAt: new Date() });
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
  await db.insert(artistSessions).values({ id: randomBytes(16).toString("hex"), accountId, tokenHash: (await import("node:crypto")).createHash("sha256").update(token).digest("hex"), expiresAt, createdAt: new Date() });
  const response = NextResponse.json({ ok: true, redirectTo: "/artistas/painel" }, { status: 201 });
  response.cookies.set({ name: ARTIST_SESSION_COOKIE, value: token, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_SECONDS });
  return response;
}
