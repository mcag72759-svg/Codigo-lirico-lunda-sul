import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { platformAuditLog, platformPublications } from "@/lib/db/schema";
import { getAdminSession, requestOriginIsSame } from "@/lib/security/admin-session";
import { hasPermission } from "@/lib/security/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTENT_TYPES = new Set([
  "article", "music", "podcast", "video", "announcement", "poetry", "event", "opportunity", "gallery",
]);

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function safeUrl(value: unknown): string {
  const raw = cleanText(value, 2048);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export async function GET() {
  const admin = await getAdminSession();
  if (!admin || !hasPermission(admin, "content.manage")) {
    return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  }

  const items = await db
    .select()
    .from(platformPublications)
    .orderBy(desc(platformPublications.createdAt))
    .limit(100);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  if (!requestOriginIsSame(request)) {
    return NextResponse.json({ error: "Pedido de origem não permitida." }, { status: 403 });
  }

  const admin = await getAdminSession();
  if (!admin || !hasPermission(admin, "content.publish")) {
    return NextResponse.json({ error: "Não tens permissão para publicar conteúdo." }, { status: 403 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "O conteúdo enviado não é válido." }, { status: 400 });
  }
  if (!input || typeof input !== "object") {
    return NextResponse.json({ error: "Preenche os dados da publicação." }, { status: 400 });
  }

  const body = input as Record<string, unknown>;
  const type = cleanText(body.type, 32);
  const title = cleanText(body.title, 160);
  const author = cleanText(body.artist ?? body.author, 120) || admin.displayName;
  const category = cleanText(body.genre ?? body.category, 80) || "Geral";
  const description = cleanText(body.description, 12000);
  if (!CONTENT_TYPES.has(type) || !title || !description) {
    return NextResponse.json(
      { error: "Escolhe um tipo válido e preenche o título e a descrição." },
      { status: 400 },
    );
  }

  const externalUrl = safeUrl(body.link ?? body.externalUrl);
  const mediaUrl = safeUrl(body.mediaUrl ?? body.audioUrl ?? body.videoUrl);
  const imageUrl = safeUrl(body.imageUrl);
  const id = randomUUID();
  const now = new Date();

  await db.insert(platformPublications).values({
    id,
    type,
    title,
    author,
    category,
    description,
    externalUrl,
    mediaUrl,
    imageUrl,
    featured: body.featured === true,
    status: body.status === "draft" ? "draft" : "published",
    createdBy: admin.id,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(platformAuditLog).values({
    actorAdminId: admin.id,
    action: "content.publish",
    entityType: "platform_publications",
    entityId: id,
    details: { type, title },
    createdAt: now,
  });

  revalidatePath("/");
  return NextResponse.json({ ok: true, id }, { status: 201 });
}

export async function DELETE(request: Request) {
  if (!requestOriginIsSame(request)) {
    return NextResponse.json({ error: "Pedido de origem não permitida." }, { status: 403 });
  }

  const admin = await getAdminSession();
  if (!admin || !hasPermission(admin, "content.manage")) {
    return NextResponse.json({ error: "Não tens permissão para gerir publicações." }, { status: 403 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const id = input && typeof input === "object" ? cleanText((input as Record<string, unknown>).id, 80) : "";
  if (!id) return NextResponse.json({ error: "Identificador de publicação inválido." }, { status: 400 });

  const [removed] = await db
    .delete(platformPublications)
    .where(eq(platformPublications.id, id))
    .returning({ id: platformPublications.id, title: platformPublications.title });

  if (!removed) return NextResponse.json({ error: "Publicação não encontrada." }, { status: 404 });

  await db.insert(platformAuditLog).values({
    actorAdminId: admin.id,
    action: "content.delete",
    entityType: "platform_publications",
    entityId: removed.id,
    details: { title: removed.title },
    createdAt: new Date(),
  });
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
