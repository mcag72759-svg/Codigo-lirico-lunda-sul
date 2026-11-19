import { createHash, randomBytes, randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artistApplications } from "@/lib/db/schema";
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
  if (!requestOriginIsSame(request)) return NextResponse.json({ error: "Origem do pedido não permitida." }, { status: 403 });

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

  if (!stageName || !fullName || !municipality || !genre || !phone || bio.length < 20 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || (rawLink && !link)) {
    return NextResponse.json({
      error: "Confirma o nome artístico, nome completo, município, género, e-mail, telefone e uma apresentação com pelo menos 20 caracteres. O portefólio deve usar HTTPS.",
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
        ? "Já existe uma candidatura aprovada com este e-mail. Usa o código privado para activar a tua conta."
        : "Já existe uma candidatura pendente com este e-mail. Aguarda a revisão da equipa.",
    }, { status: 409 });
  }

  const activationCode = randomBytes(24).toString("hex");
  const codeHash = createHash("sha256").update(activationCode).digest("hex");
  const now = new Date();

  await db.insert(artistApplications).values({
    id: randomUUID(),
    code: codeHash,
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

  return NextResponse.json({
    ok: true,
    email,
    activationCode,
    message: "Candidatura recebida. Guarda o código privado; poderás criar a tua palavra-passe depois da aprovação.",
  }, { status: 201 });
}
