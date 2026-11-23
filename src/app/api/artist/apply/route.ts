import { createHash, randomBytes, randomUUID, scryptSync } from "node:crypto";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artistAccounts, artistApplications } from "@/lib/db/schema";
import { normalizePhone, phoneDigits } from "@/lib/phone";
import { requestOriginIsSame } from "@/lib/security/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function field(body: Record<string, unknown>, key: string, max: number): string {
  return typeof body[key] === "string" ? (body[key] as string).trim().slice(0, max) : "";
}

function safeHttpsUrl(value: string): string {
  if (!value) return "";
  try { const url = new URL(value); return url.protocol === "https:" ? url.toString() : ""; }
  catch { return ""; }
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "23505");
}

export async function POST(request: Request) {
  if (!requestOriginIsSame(request)) {
    return NextResponse.json({ error: "Origem do pedido não permitida." }, { status: 403 });
  }

  let input: unknown;
  try { input = await request.json(); }
  catch { return NextResponse.json({ error: "Preenche o número de telefone e a palavra-passe." }, { status: 400 }); }

  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const phone = normalizePhone(field(body, "phone", 40));
  const digits = phoneDigits(phone);
  const password = typeof body.password === "string" ? body.password : "";

  const stageName = field(body, "stageName", 100) || "Artista " + digits.slice(-4);
  const fullName = field(body, "fullName", 140);
  const municipality = field(body, "municipality", 100);
  const genre = field(body, "genre", 80);
  const email = field(body, "email", 254).toLowerCase();
  const bio = field(body, "bio", 1800);
  const rawLink = field(body, "link", 2048);
  const link = safeHttpsUrl(rawLink);

  if (!phone) {
    return NextResponse.json({ error: "Indica um número de telefone válido, incluindo o indicativo do país quando necessário." }, { status: 400 });
  }
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: "A palavra-passe deve ter entre 8 e 128 caracteres." }, { status: 400 });
  }
  if (email && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
    return NextResponse.json({ error: "O e-mail opcional não parece válido. Corrige-o ou deixa o campo vazio." }, { status: 400 });
  }
  if (rawLink && !link) {
    return NextResponse.json({ error: "O portefólio deve usar uma ligação HTTPS válida." }, { status: 400 });
  }

  const existing = await db.select({
    id: artistApplications.id,
    status: artistApplications.status,
  }).from(artistApplications)
    .where(sql`regexp_replace(${artistApplications.phone}, '[^0-9]', '', 'g') = ${digits}`)
    .limit(1);

  if (existing.length) {
    const status = existing[0].status;
    const message = status === "approved"
      ? "Já existe uma conta com este número. Entra no estúdio com o teu telefone e a palavra-passe."
      : status === "suspended"
        ? "Esta conta está suspensa. Contacta a administração para recuperar o acesso."
        : status === "rejected"
          ? "Já existe uma candidatura associada a este número. Contacta a equipa para reabrir a candidatura."
          : "Já existe uma candidatura com este número e continua pendente. Aguarda a revisão da equipa.";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  const applicationId = randomUUID();
  const accountId = randomUUID();
  const now = new Date();
  const passwordSalt = randomBytes(16).toString("hex");
  const passwordHash = scryptSync(password, passwordSalt, 64).toString("hex");
  const unusedActivationCodeHash = createHash("sha256").update(randomBytes(24)).digest("hex");

  try {
    await db.transaction(async (tx) => {
      await tx.insert(artistApplications).values({
        id: applicationId,
        code: unusedActivationCodeHash,
        stageName,
        fullName,
        municipality,
        genre,
        email,
        phone,
        bio,
        link,
        photoUrl: "",
        status: "pending",
        createdAt: now,
        reviewedAt: null,
        requirements: "Cadastro criado com telefone e palavra-passe. Os restantes dados do perfil são opcionais.",
        deadline: null,
        decisionNote: "",
        reviewedBy: null,
        updatedAt: now,
      });

      await tx.insert(artistAccounts).values({
        id: accountId,
        applicationId,
        passwordSalt,
        passwordHash,
        createdAt: now,
        updatedAt: now,
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: "Este número já está associado a uma conta ou candidatura." }, { status: 409 });
    }
    return NextResponse.json({
      error: "Não foi possível guardar o cadastro. Os dados não foram apagados; tenta novamente.",
    }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    phone,
    message: "Cadastro guardado. A conta fica pendente até à aprovação da administração. Depois, entra com este número e a mesma palavra-passe.",
  }, { status: 201 });
}
