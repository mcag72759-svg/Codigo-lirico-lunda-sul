import { createHash, randomBytes, randomUUID, scryptSync } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artistAccounts, artistApplications } from "@/lib/db/schema";
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

export async function POST(request: Request) {
  if (!requestOriginIsSame(request)) {
    return NextResponse.json({ error: "Origem do pedido não permitida." }, { status: 403 });
  }

  let input: unknown;
  try { input = await request.json(); }
  catch { return NextResponse.json({ error: "Preenche os dados da candidatura." }, { status: 400 }); }

  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const stageName = field(body, "stageName", 100);
  const fullName = field(body, "fullName", 140);
  const municipality = field(body, "municipality", 100);
  const genre = field(body, "genre", 80);
  const email = field(body, "email", 254).toLowerCase();
  const phone = field(body, "phone", 40);
  const bio = field(body, "bio", 1800);
  const rawLink = field(body, "link", 2048);
  const link = safeHttpsUrl(rawLink);
  const password = typeof body.password === "string" ? body.password : "";
  const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";

  if (!stageName || !fullName || !municipality || !genre || !phone || bio.length < 20 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || (rawLink && !link)) {
    return NextResponse.json({
      error: "Confirma o nome artístico, nome completo, município, género, e-mail, telefone e uma apresentação com pelo menos 20 caracteres. O portefólio deve usar HTTPS.",
    }, { status: 400 });
  }
  if (password.length < 8 || password.length > 128 || password !== confirmPassword) {
    return NextResponse.json({
      error: password !== confirmPassword
        ? "As palavras-passe não coincidem."
        : "A palavra-passe deve ter entre 8 e 128 caracteres.",
    }, { status: 400 });
  }

  const [existing] = await db.select({
    id: artistApplications.id,
    status: artistApplications.status,
  }).from(artistApplications)
    .where(eq(artistApplications.email, email))
    .orderBy(desc(artistApplications.createdAt))
    .limit(1);

  if (existing && existing.status !== "rejected") {
    return NextResponse.json({
      error: existing.status === "approved"
        ? "Já existe uma candidatura aprovada com este e-mail. Entra no estúdio ou pede à administração um código de recuperação."
        : "Já existe uma candidatura pendente com este e-mail. Aguarda a revisão da equipa.",
    }, { status: 409 });
  }

  const applicationId = randomUUID();
  const accountId = randomUUID();
  const now = new Date();
  const passwordSalt = randomBytes(16).toString("hex");
  const passwordHash = scryptSync(password, passwordSalt, 64).toString("hex");
  // The schema retains a private one-time code for older applications; new accounts use the password chosen here.
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
        requirements: "Candidatura submetida através do formulário público de artistas.",
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
  } catch {
    return NextResponse.json({
      error: "Não foi possível guardar a candidatura e a conta. Confirma os dados e tenta novamente.",
    }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    email,
    message: "Candidatura recebida. O e-mail e a palavra-passe foram guardados com segurança. Depois da aprovação, poderás entrar no estúdio com estes mesmos dados.",
  }, { status: 201 });
}
