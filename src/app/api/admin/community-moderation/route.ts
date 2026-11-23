import { and, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  artistApplications, communityComments, communityPostViews, communityPosts,
  communityReactions, communityReports, platformAuditLog,
} from "@/lib/db/schema";
import { getAdminSession, requestOriginIsSame } from "@/lib/security/admin-session";
import { hasAnyPermission } from "@/lib/security/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin || !hasAnyPermission(admin, ["community.moderate", "content.manage"])) {
    return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  }
  const [posts, recentPosts, reports] = await Promise.all([
    db.select({
      id: communityPosts.id, title: communityPosts.title, contentType: communityPosts.contentType,
      body: communityPosts.body, mediaUrl: communityPosts.mediaUrl, mediaType: communityPosts.mediaType,
      visibility: communityPosts.visibility, location: communityPosts.location, organizer: communityPosts.organizer,
      eventStartsAt: communityPosts.eventStartsAt, ticketPrice: communityPosts.ticketPrice,
      ticketUrl: communityPosts.ticketUrl, scheduledAt: communityPosts.scheduledAt, createdAt: communityPosts.createdAt,
      authorId: communityPosts.authorId, status: communityPosts.status,
      artist: artistApplications.stageName, municipality: artistApplications.municipality,
    }).from(communityPosts).innerJoin(artistApplications, eq(communityPosts.authorId, artistApplications.id))
      .where(eq(communityPosts.status, "pending")).orderBy(desc(communityPosts.createdAt)).limit(100),
    db.select({
      id: communityPosts.id, title: communityPosts.title, contentType: communityPosts.contentType,
      body: communityPosts.body, mediaUrl: communityPosts.mediaUrl, mediaType: communityPosts.mediaType,
      visibility: communityPosts.visibility, createdAt: communityPosts.createdAt, authorId: communityPosts.authorId,
      status: communityPosts.status, artist: artistApplications.stageName, municipality: artistApplications.municipality,
    }).from(communityPosts).innerJoin(artistApplications, eq(communityPosts.authorId, artistApplications.id))
      .orderBy(desc(communityPosts.createdAt)).limit(60),
    db.select({
      id: communityReports.id, reporterId: communityReports.reporterId, targetType: communityReports.targetType,
      targetId: communityReports.targetId, reason: communityReports.reason, status: communityReports.status,
      createdAt: communityReports.createdAt, reporter: artistApplications.stageName,
    }).from(communityReports).innerJoin(artistApplications, eq(communityReports.reporterId, artistApplications.id))
      .where(eq(communityReports.status, "pending")).orderBy(desc(communityReports.createdAt)).limit(100),
  ]);
  return NextResponse.json({ posts, recentPosts, reports });
}

export async function PATCH(request: Request) {
  if (!requestOriginIsSame(request)) return NextResponse.json({ error: "Origem do pedido não permitida." }, { status: 403 });
  const admin = await getAdminSession();
  if (!admin || !hasAnyPermission(admin, ["community.moderate", "content.manage"])) {
    return NextResponse.json({ error: "Não tens permissão para moderar a comunidade." }, { status: 403 });
  }
  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Pedido inválido." }, { status: 400 }); }
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const type = body.type === "report" ? "report" : "post";
  const id = typeof body.id === "string" ? body.id.trim().slice(0, 80) : "";
  const decision = typeof body.status === "string" ? body.status : "";
  if (!id) return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  const now = new Date();

  if (type === "post") {
    if (decision !== "approved" && decision !== "rejected") return NextResponse.json({ error: "Decisão de publicação inválida." }, { status: 400 });
    const [updated] = await db.update(communityPosts).set({ status: decision, updatedAt: now })
      .where(eq(communityPosts.id, id))
      .returning({ id: communityPosts.id, authorId: communityPosts.authorId });
    if (!updated) return NextResponse.json({ error: "Publicação não encontrada." }, { status: 404 });
    await db.insert(platformAuditLog).values({
      actorAdminId: admin.id, action: "community.post." + decision, entityType: "community_posts",
      entityId: id, details: { authorId: updated.authorId }, createdAt: now,
    });
  } else {
    if (!["reviewing", "resolved", "dismissed"].includes(decision)) return NextResponse.json({ error: "Estado de denúncia inválido." }, { status: 400 });
    const [updated] = await db.update(communityReports).set({ status: decision })
      .where(eq(communityReports.id, Number(id)))
      .returning({ id: communityReports.id, targetType: communityReports.targetType, targetId: communityReports.targetId });
    if (!updated) return NextResponse.json({ error: "Denúncia não encontrada." }, { status: 404 });
    await db.insert(platformAuditLog).values({
      actorAdminId: admin.id, action: "community.report." + decision, entityType: "community_reports",
      entityId: String(updated.id), details: { targetType: updated.targetType, targetId: updated.targetId }, createdAt: now,
    });
  }
  revalidatePath("/comunidade");
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!requestOriginIsSame(request)) return NextResponse.json({ error: "Origem do pedido não permitida." }, { status: 403 });
  const admin = await getAdminSession();
  if (!admin || !hasAnyPermission(admin, ["community.moderate", "content.manage"])) {
    return NextResponse.json({ error: "Não tens permissão para remover publicações." }, { status: 403 });
  }
  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Pedido inválido." }, { status: 400 }); }
  const id = input && typeof input === "object" && typeof (input as Record<string, unknown>).id === "string"
    ? String((input as Record<string, unknown>).id).trim().slice(0, 80) : "";
  if (!id) return NextResponse.json({ error: "Identificador de publicação inválido." }, { status: 400 });
  const removed = await db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: communityPosts.id, title: communityPosts.title })
      .from(communityPosts).where(eq(communityPosts.id, id)).limit(1);
    if (!existing) return null;
    const comments = await tx.select({ id: communityComments.id })
      .from(communityComments).where(eq(communityComments.postId, id));
    const commentIds = comments.map(comment => comment.id);
    await tx.delete(communityPostViews).where(eq(communityPostViews.postId, id));
    await tx.delete(communityComments).where(eq(communityComments.postId, id));
    await tx.delete(communityReactions).where(eq(communityReactions.contentId, id));
    await tx.delete(communityReports).where(or(
      and(eq(communityReports.targetType, "post"), eq(communityReports.targetId, id)),
      ...(commentIds.length ? [and(eq(communityReports.targetType, "comment"), inArray(communityReports.targetId, commentIds))] : []),
    ));
    await tx.delete(communityPosts).where(eq(communityPosts.id, id));
    return existing;
  });
  if (!removed) return NextResponse.json({ error: "Publicação não encontrada." }, { status: 404 });
  await db.insert(platformAuditLog).values({
    actorAdminId: admin.id, action: "community.post.delete", entityType: "community_posts",
    entityId: id, details: { title: removed.title }, createdAt: new Date(),
  });
  revalidatePath("/comunidade");
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
