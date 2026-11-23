import { createHash, randomBytes, randomUUID, scryptSync } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artistAccounts, artistApplications, artistSessions } from "@/lib/db/schema";
import { normalizePhone, phoneDigits } from "@/lib/phone";
import { ARTIST_SESSION_COOKIE } from "@/lib/security/artist-session";
import { requestOriginIsSame } from "@/lib/security/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const SESSION_SECONDS = 60 * 60 * 24 * 30;

export async function POST(request: Request) {
  if (!requestOriginIsSame(request)) {
    return NextResponse.json({ error: "Origem do pedido não permitida." }, { status: 403 });
  }

  let input: unknown;
  try { input = await request.json(); }
  catch { return NextResponse.json({ error: "Preenche o telefone, o código e a nova palavra-passe." }, { status: 400 }); }

  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const phone = typeof body.phone === "string" ? normalizePhone(body.phone.trim()) : "";
  const digits = phoneDigits(phone);
  const activationCode = typeof body.activationCode === "string" ? body.activationCode.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!phone || !/^[a-f0-9]{48}$/.test(activationCode) ||
      password.length < 8 || password.length > 128) {
    return NextResponse.json({
      error: "Confirma o número de telefone, o código de acesso e uma palavra-passe com 8 a 128 caracteres.",
    }, { status: 400 });
  }

  const codeHash = createHash("sha256").update(activationCode).digest("hex");
  const [application] = await db.select({
    id: artistApplications.id,
    status: artistApplications.status,
    stageName: artistApplications.stageName,
    phone: artistApplications.phone,
    email: artistApplications.email,
    municipality: artistApplications.municipality,
    genre: artistApplications.genre,
    bio: artistApplications.bio,
    photoUrl: artistApplications.photoUrl,
  }).from(artistApplications)
    .where(and(
      sql`regexp_replace(${artistApplications.phone}, '[^0-9]', '', 'g') = ${digits}`,
      eq(artistApplications.code, codeHash),
    ))
    .limit(1);

  if (!application) {
    return NextResponse.json({ error: "O telefone ou o código não corresponde a um código válido." }, { status: 400 });
  }
  if (application.status === "pending") {
    return NextResponse.json({ error: "A tua candidatura ainda aguarda aprovação. Depois da aprovação, volta aqui para criares a palavra-passe." }, { status: 409 });
  }
  if (application.status !== "approved") {
    return NextResponse.json({ error: "Esta conta não está aprovada. Contacta a equipa da plataforma." }, { status: 403 });
  }

  const passwordSalt = randomBytes(16).toString("hex");
  const passwordHash = scryptSync(password, passwordSalt, 64).toString("hex");
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const now = new Date();
  const consumedCodeHash = createHash("sha256").update(randomBytes(24)).digest("hex");

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

      const [existing] = await tx.select({ id: artistAccounts.id })
        .from(artistAccounts)
        .where(eq(artistAccounts.applicationId, application.id))
        .limit(1);

      let accountId: string;
      if (existing) {
        accountId = existing.id;
        await tx.update(artistAccounts).set({
          passwordSalt,
          passwordHash,
          updatedAt: now,
        }).where(eq(artistAccounts.id, accountId));
        await tx.delete(artistSessions).where(eq(artistSessions.accountId, accountId));
      } else {
        accountId = randomUUID();
        await tx.insert(artistAccounts).values({
          id: accountId,
          applicationId: application.id,
          passwordSalt,
          passwordHash,
          createdAt: now,
          updatedAt: now,
        });
      }

      await tx.update(artistApplications)
        .set({ code: consumedCodeHash, updatedAt: now })
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
    if (error instanceof Error && error.message === "APPLICATION_NOT_READY") {
      return NextResponse.json({ error: "O código já foi utilizado ou a candidatura deixou de estar aprovada. Pede um novo código à administração." }, { status: 409 });
    }
    return NextResponse.json({ error: "Não foi possível activar ou recuperar a conta neste momento. Tenta novamente." }, { status: 500 });
  }

  const response = NextResponse.json({
    ok: true,
    artist: {
      stageName: application.stageName,
      phone: application.phone,
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
