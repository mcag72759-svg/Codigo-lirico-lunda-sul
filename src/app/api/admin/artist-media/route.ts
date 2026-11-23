import { and, desc, eq, inArray, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { artistApplications, artistMedia, communityComments, communityPostViews, communityReactions, communityReports, platformAuditLog } from "@/lib/db/schema";
import { getAdminSession, requestOriginIsSame } from "@/lib/security/admin-session";
import { hasAnyPermission } from "@/lib/security/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin || !hasAnyPermission(admin, ["artists.view", "artists.review", "artists.manage", "content.manage"])) {
    return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  }
  const items = await db.select({
    id: artistMedia.id,
    title: artistMedia.title,
    description: artistMedia.description,
    kind: artistMedia.kind,
    genre: artistMedia.genre,
    mediaUrl: artistMedia.mediaUrl,
    mimeType: artistMedia.mimeType,
    sizeBytes: artistMedia.sizeBytes,
    downloadAllowed: artistMedia.downloadAllowed,
    status: artistMedia.status,
    createdAt: artistMedia.createdAt,
    artist: artistApplications.stageName,
    applicationId: artistApplications.id,
  }).from(artistMedia)
    .innerJoin(artistApplications, eq(artistMedia.applicationId, artistApplications.id))
    .orderBy(desc(artistMedia.createdAt)).limit(100);
  return NextResponse.json({ items });
}

export async function PATCH(request: Request) {
  if (!requestOriginIsSame(request)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  const admin = await getAdminSession();
  if (!admin || !hasAnyPermission(admin, ["artists.review", "artists.manage", "content.manage"])) {
    return NextResponse.json({ error: "Não tens permissão para moderar ficheiros." }, { status: 403 });
  }

  let input: unknown;
  try { input = await request.json(); } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const id = typeof body.id === "string" ? body.id.trim().slice(0, 80) : "";
  const status = body.status === "approved" || body.status === "rejected" ? body.status : "";
  if (!id || !status) return NextResponse.json({ error: "Escolhe o ficheiro e uma decisão válida." }, { status: 400 });

  const now = new Date();
  const [updated] = await db.update(artistMedia)
    .set({ status, reviewedAt: now })
    .where(eq(artistMedia.id, id))
    .returning({ id: artistMedia.id, title: artistMedia.title, applicationId: artistMedia.applicationId });
  if (!updated) return NextResponse.json({ error: "Ficheiro não encontrado." }, { status: 404 });

  await db.insert(platformAuditLog).values({
    actorAdminId: admin.id,
    action: status === "approved" ? "artist_media.approve" : "artist_media.reject",
    entityType: "artist_media",
    entityId: updated.id,
    details: { title: updated.title, applicationId: updated.applicationId },
    createdAt: now,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!requestOriginIsSame(request)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  const admin = await getAdminSession();
  if (!admin || !hasAnyPermission(admin, ["artists.manage", "content.manage"])) {
    return NextResponse.json({ error: "Não tens permissão para remover ficheiros de artistas." }, { status: 403 });
  }
  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Pedido inválido." }, { status: 400 }); }
  const id = input && typeof input === "object" && typeof (input as Record<string, unknown>).id === "string"
    ? String((input as Record<string, unknown>).id).trim().slice(0, 80) : "";
  if (!id) return NextResponse.json({ error: "Identificador de ficheiro inválido." }, { status: 400 });

  const removed = await db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: artistMedia.id, title: artistMedia.title })
      .from(artistMedia).where(eq(artistMedia.id, id)).limit(1);
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
    await tx.delete(artistMedia).where(eq(artistMedia.id, id));
    return existing;
  });
  if (!removed) return NextResponse.json({ error: "Ficheiro não encontrado." }, { status: 404 });
  await db.insert(platformAuditLog).values({
    actorAdminId: admin.id, action: "artist_media.delete", entityType: "artist_media",
    entityId: id, details: { title: removed.title }, createdAt: new Date(),
  });
  revalidatePath("/");
  revalidatePath("/downloads");
  return NextResponse.json({ ok: true });
}
