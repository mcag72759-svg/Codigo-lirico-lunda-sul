import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { artistApplications, communityPosts, communityReports, platformAuditLog } from "@/lib/db/schema";
import { getAdminSession, requestOriginIsSame } from "@/lib/security/admin-session";
import { hasPermission } from "@/lib/security/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin || !hasPermission(admin, "content.manage")) {
    return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  }
  const [posts, reports] = await Promise.all([
    db.select({
      id: communityPosts.id, title:communityPosts.title, contentType:communityPosts.contentType,
      body: communityPosts.body, mediaUrl: communityPosts.mediaUrl,
      mediaType: communityPosts.mediaType, visibility: communityPosts.visibility,
      location:communityPosts.location, organizer:communityPosts.organizer,
      eventStartsAt:communityPosts.eventStartsAt, ticketPrice:communityPosts.ticketPrice,
      ticketUrl:communityPosts.ticketUrl, scheduledAt:communityPosts.scheduledAt,
      createdAt: communityPosts.createdAt, authorId: communityPosts.authorId,
      artist: artistApplications.stageName, municipality: artistApplications.municipality,
    }).from(communityPosts)
      .innerJoin(artistApplications, eq(communityPosts.authorId, artistApplications.id))
      .where(eq(communityPosts.status, "pending"))
      .orderBy(desc(communityPosts.createdAt)).limit(100),
    db.select({
      id: communityReports.id, reporterId: communityReports.reporterId,
      targetType: communityReports.targetType, targetId: communityReports.targetId,
      reason: communityReports.reason, status: communityReports.status,
      createdAt: communityReports.createdAt,
      reporter: artistApplications.stageName,
    }).from(communityReports)
      .innerJoin(artistApplications, eq(communityReports.reporterId, artistApplications.id))
      .where(eq(communityReports.status, "pending"))
      .orderBy(desc(communityReports.createdAt)).limit(100),
  ]);
  return NextResponse.json({ posts, reports });
}

export async function PATCH(request: Request) {
  if (!requestOriginIsSame(request)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  const admin = await getAdminSession();
  if (!admin || !hasPermission(admin, "content.manage")) {
    return NextResponse.json({ error: "Não tens permissão para moderar a comunidade." }, { status: 403 });
  }
  let input: unknown;
  try { input = await request.json(); } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const type = body.type === "report" ? "report" : "post";
  const id = typeof body.id === "string" ? body.id.trim().slice(0, 80) : "";
  const decision = typeof body.status === "string" ? body.status : "";
  if (!id) return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  const now = new Date();

  if (type === "post") {
    if (decision !== "approved" && decision !== "rejected") {
      return NextResponse.json({ error: "Decisão de publicação inválida." }, { status: 400 });
    }
    const [updated] = await db.update(communityPosts)
      .set({ status: decision, updatedAt: now })
      .where(and(eq(communityPosts.id, id), eq(communityPosts.status, "pending")))
      .returning({ id: communityPosts.id, authorId: communityPosts.authorId });
    if (!updated) return NextResponse.json({ error: "Publicação pendente não encontrada." }, { status: 404 });
    await db.insert(platformAuditLog).values({
      actorAdminId: admin.id,
      action: decision === "approved" ? "community.post.approve" : "community.post.reject",
      entityType: "community_posts", entityId: id,
      details: { authorId: updated.authorId }, createdAt: now,
    });
  } else {
    if (!["reviewing", "resolved", "dismissed"].includes(decision)) {
      return NextResponse.json({ error: "Estado de denúncia inválido." }, { status: 400 });
    }
    const [updated] = await db.update(communityReports)
      .set({ status: decision })
      .where(eq(communityReports.id, Number(id)))
      .returning({ id: communityReports.id, targetType: communityReports.targetType, targetId: communityReports.targetId });
    if (!updated) return NextResponse.json({ error: "Denúncia não encontrada." }, { status: 404 });
    await db.insert(platformAuditLog).values({
      actorAdminId: admin.id,
      action: "community.report." + decision,
      entityType: "community_reports", entityId: String(updated.id),
      details: { targetType: updated.targetType, targetId: updated.targetId }, createdAt: now,
    });
  }

  revalidatePath("/comunidade");
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
