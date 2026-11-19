import { createHash, randomBytes, randomUUID, scryptSync } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artistAccounts, artistApplications, artistSessions } from "@/lib/db/schema";
import { ARTIST_SESSION_COOKIE } from "@/lib/security/artist-session";
import { requestOriginIsSame } from "@/lib/security/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

export async function POST(request: Request) {
  if (!requestOriginIsSame(request)) return NextResponse.json({ error: "Origem do pedido não permitida." }, { status: 403 });

  let input: unknown;
  try { input = await request.json(); }
  catch { return NextResponse.json({ error: "Preenche o e-mail, o código e a palavra-passe." }, { status: 400 }); }
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const activationCode = typeof body.activationCode === "string" ? body.activationCode.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !/^[a-f0-9]{48}$/.test(activationCode) ||
      password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: "Confirma o e-mail, o código de activação e uma palavra-passe com 8 a 128 caracteres." }, { status: 400 });
  }

  const codeHash = createHash("sha256").update(activationCode).digest("hex");
  const [application] = await db.select({
    id: artistApplications.id,
    status: artistApplications.status,
    stageName: artistApplications.stageName,
    email: artistApplications.email,
    municipality: artistApplications.municipality,
    genre: artistApplications.genre,
    bio: artistApplications.bio,
    photoUrl: artistApplications.photoUrl,
  }).from(artistApplications)
    .where(and(eq(artistApplications.email, email), eq(artistApplications.code, codeHash)))
    .limit(1);

  if (!application) return NextResponse.json({ error: "O e-mail ou o código de activação não corresponde a uma candidatura válida." }, { status: 400 });
  if (application.status === "pending") return NextResponse.json({ error: "A tua candidatura ainda aguarda aprovação. Depois da aprovação, volta aqui para criares a palavra-passe." }, { status: 409 });
  if (application.status !== "approved") return NextResponse.json({ error: "Esta candidatura não foi aprovada. Contacta a equipa da plataforma para esclarecer a decisão." }, { status: 403 });

  const accountId = randomUUID();
  const passwordSalt = randomBytes(16).toString("hex");
  const passwordHash = scryptSync(password, passwordSalt, 64).toString("hex");
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const now = new Date();

  try {
    await db.transaction(async (tx) => {
      const [current] = await tx.select({ id: artistApplications.id })
        .from(artistApplications)
        .where(and(
          eq(artistApplications.id, application.id),
          eq(artistApplications.code, codeHash),
          eq(artistApplications.status, "approved"),
        ))
        .limit(1);
      if (!current) throw new Error("APPLICATION_NOT_READY");

      const [created] = await tx.insert(artistAccounts).values({
        id: accountId,
        applicationId: application.id,
        passwordSalt,
        passwordHash,
        createdAt: now,
        updatedAt: now,
      }).onConflictDoNothing().returning({ id: artistAccounts.id });
      if (!created) throw new Error("ACCOUNT_ALREADY_EXISTS");

      const consumedCode = createHash("sha256").update(randomBytes(32)).digest("hex");
      await tx.update(artistApplications)
        .set({ code: consumedCode, updatedAt: now })
        .where(eq(artistApplications.id, application.id));

      await tx.insert(artistSessions).values({
        id: randomUUID(),
        accountId,
        tokenHash,
        expiresAt: new Date(now.getTime() + SESSION_SECONDS * 1000),
        createdAt: now,
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ACCOUNT_ALREADY_EXISTS") {
      return NextResponse.json({ error: "Esta candidatura já tem uma conta. Entra no estúdio com o teu e-mail e palavra-passe." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "APPLICATION_NOT_READY") {
      return NextResponse.json({ error: "A candidatura já não está disponível para activação. Actualiza o estado e tenta novamente." }, { status: 409 });
    }
    return NextResponse.json({ error: "Não foi possível criar a conta neste momento. Tenta novamente." }, { status: 500 });
  }

  const response = NextResponse.json({
    ok: true,
    artist: {
      stageName: application.stageName,
      email: application.email,
      municipality: application.municipality,
      genre: application.genre,
      bio: application.bio,
      photoUrl: application.photoUrl,
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
