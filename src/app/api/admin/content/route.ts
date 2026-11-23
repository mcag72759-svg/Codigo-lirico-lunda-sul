import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { communityComments, communityPostViews, communityReactions, communityReports, platformAuditLog, platformPublications } from "@/lib/db/schema";
import { getAdminSession, requestOriginIsSame } from "@/lib/security/admin-session";
import { hasAnyPermission, hasPermission } from "@/lib/security/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const CONTENT_TYPES = new Set(["text","article","news","music","video","podcast","announcement","poetry","event","opportunity","gallery","organization","partnership","ticket","document","course","livestream","press_release","call_for_artists","resource"]);
const STATUSES = new Set(["draft","published","scheduled","archived"]);
const STORAGE_TYPE_MAP: Record<string,string> = {
  text: "announcement",
  news: "article",
  podcast: "music",
  document: "article",
  course: "article",
  livestream: "video",
  press_release: "article",
  call_for_artists: "opportunity",
  resource: "article",
};

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}
function safeUrl(value: unknown): string {
  const raw = cleanText(value, 2048);
  if (!raw) return "";
  try { const url = new URL(raw); return url.protocol === "https:" ? url.toString() : ""; }
  catch { return ""; }
}
function parseDate(value: unknown): Date | null | false {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : false;
}
function parsePublication(body: Record<string, unknown>, fallbackAuthor: string) {
  const type = cleanText(body.type, 32);
  const author = cleanText(body.artist ?? body.author, 120) || fallbackAuthor;
  const category = cleanText(body.genre ?? body.category, 80) || "Geral";
  const description = cleanText(body.description, 12000);
  const rawTitle = cleanText(body.title, 160);
  const title = rawTitle || (type === "text" ? description.slice(0, 80) || "Texto simples" : "");
  const statusValue = cleanText(body.status, 20);
  const status = STATUSES.has(statusValue) ? statusValue : "published";
  const scheduledAt = parseDate(body.scheduledAt);
  const eventStartsAt = parseDate(body.eventStartsAt);
  const rawTicketUrl = cleanText(body.ticketUrl,2048);
  const ticketUrl = safeUrl(rawTicketUrl);
  if (!CONTENT_TYPES.has(type) || !title || !description || scheduledAt === false || eventStartsAt === false) return null;
  if (status === "scheduled" && (!scheduledAt || scheduledAt.getTime() <= Date.now())) return null;
  if (rawTicketUrl && !ticketUrl) return null;
  const storedType = STORAGE_TYPE_MAP[type] ?? type;
  return {
    type: storedType, title, author, category, description,
    externalUrl: safeUrl(body.link ?? body.externalUrl),
    mediaUrl: safeUrl(body.mediaUrl ?? body.audioUrl ?? body.videoUrl),
    imageUrl: safeUrl(body.imageUrl),
    featured: body.featured === true,
    status,
    scheduledAt,
    eventStartsAt,
    location: cleanText(body.location,180),
    organizer: cleanText(body.organizer,160),
    ticketPrice: cleanText(body.ticketPrice,60),
    ticketUrl,
  };
}
async function audit(adminId: string, action: string, id: string, title: string) {
  await db.insert(platformAuditLog).values({
    actorAdminId: adminId, action, entityType: "platform_publications",
    entityId: id, details: { title }, createdAt: new Date(),
  });
  revalidatePath("/");
  revalidatePath("/downloads");
}

export async function GET() {
  const admin = await getAdminSession();
  if (!admin || !hasAnyPermission(admin, ["content.view", "content.manage"])) {
    return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  }
  const items = await db.select().from(platformPublications)
    .orderBy(desc(platformPublications.createdAt)).limit(100);
  return NextResponse.json({ items });
}
export async function POST(request: Request) {
  if (!requestOriginIsSame(request)) return NextResponse.json({ error: "Pedido de origem não permitida." }, { status: 403 });
  const admin = await getAdminSession();
  if (!admin || !hasAnyPermission(admin, ["content.publish", "content.manage"])) {
    return NextResponse.json({ error: "Não tens permissão para publicar conteúdo." }, { status: 403 });
  }
  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "O conteúdo enviado não é válido." }, { status: 400 }); }
  if (!input || typeof input !== "object") return NextResponse.json({ error: "Preenche os dados da publicação." }, { status: 400 });
  const parsed = parsePublication(input as Record<string, unknown>, admin.displayName);
  if (!parsed) return NextResponse.json({ error: "Confirma o tipo, título, descrição, ligação e data futura de agendamento." }, { status: 400 });
  const id = randomUUID();
  const now = new Date();
  await db.insert(platformPublications).values({ id, ...parsed, createdBy: admin.id, createdAt: now, updatedAt: now });
  await audit(admin.id, "content.publish", id, parsed.title);
  return NextResponse.json({ ok: true, id, status: parsed.status }, { status: 201 });
}
export async function PUT(request: Request) {
  if (!requestOriginIsSame(request)) return NextResponse.json({ error: "Pedido de origem não permitida." }, { status: 403 });
  const admin = await getAdminSession();
  if (!admin || !hasPermission(admin, "content.manage")) {
    return NextResponse.json({ error: "Não tens permissão para editar publicações." }, { status: 403 });
  }
  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Pedido inválido." }, { status: 400 }); }
  if (!input || typeof input !== "object") return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const body = input as Record<string, unknown>;
  const id = cleanText(body.id, 80);
  const parsed = parsePublication(body, admin.displayName);
  if (!id || !parsed) return NextResponse.json({ error: "Confirma o identificador, tipo, título, descrição e agendamento." }, { status: 400 });
  const [updated] = await db.update(platformPublications)
    .set({ ...parsed, updatedAt: new Date() })
    .where(eq(platformPublications.id, id))
    .returning({ id: platformPublications.id, title: platformPublications.title });
  if (!updated) return NextResponse.json({ error: "Publicação não encontrada." }, { status: 404 });
  await audit(admin.id, "content.update", id, updated.title);
  return NextResponse.json({ ok: true });
}
export async function DELETE(request: Request) {
  if (!requestOriginIsSame(request)) return NextResponse.json({ error: "Origem de pedido não permitida." }, { status: 403 });
  const admin = await getAdminSession();
  if (!admin || !hasPermission(admin, "content.manage")) {
    return NextResponse.json({ error: "Não tens permissão para gerir publicações." }, { status: 403 });
  }
  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Pedido inválido." }, { status: 400 }); }
  const id = input && typeof input === "object" ? cleanText((input as Record<string, unknown>).id, 80) : "";
  if (!id) return NextResponse.json({ error: "Identificador de publicação inválido." }, { status: 400 });

  const removed = await db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: platformPublications.id, title: platformPublications.title })
      .from(platformPublications).where(eq(platformPublications.id, id)).limit(1);
    if (!existing) return null;
    const comments = await tx.select({ id: communityComments.id })
      .from(communityComments).where(eq(communityComments.postId, id));
    const commentIds = comments.map(comment => comment.id);
    await tx.delete(communityComments).where(eq(communityComments.postId, id));
    await tx.delete(communityPostViews).where(eq(communityPostViews.postId, id));
    await tx.delete(communityReactions).where(eq(communityReactions.contentId, id));
    await tx.delete(communityReports).where(or(
      and(eq(communityReports.targetType, "post"), eq(communityReports.targetId, id)),
      ...(commentIds.length ? [and(eq(communityReports.targetType, "comment"), inArray(communityReports.targetId, commentIds))] : []),
    ));
    await tx.delete(platformPublications).where(eq(platformPublications.id, id));
    return existing;
  });
  if (!removed) return NextResponse.json({ error: "Publicação não encontrada." }, { status: 404 });
  await audit(admin.id, "content.delete", removed.id, removed.title);
  return NextResponse.json({ ok: true });
}
