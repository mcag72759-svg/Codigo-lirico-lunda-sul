import { and, desc, eq, inArray, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  artistApplications, artistAccounts, artistMedia, artistSessions, communityBlocks,
  communityComments, communityConversationMembers, communityConversations, communityFollows,
  communityMessages, communityPostViews, communityPosts, communityReactions, communityReports,
  platformAuditLog,
} from "@/lib/db/schema";
import { getAdminSession, requestOriginIsSame } from "@/lib/security/admin-session";
import { hasAnyPermission, hasPermission } from "@/lib/security/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin || !hasAnyPermission(admin, ["artists.view", "artists.review", "artists.manage", "content.manage"])) {
    return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  }
  const items = await db.select({
    id: artistApplications.id,
    stageName: artistApplications.stageName,
    fullName: artistApplications.fullName,
    municipality: artistApplications.municipality,
    genre: artistApplications.genre,
    email: artistApplications.email,
    phone: artistApplications.phone,
    bio: artistApplications.bio,
    link: artistApplications.link,
    status: artistApplications.status,
    createdAt: artistApplications.createdAt,
  }).from(artistApplications).orderBy(desc(artistApplications.createdAt)).limit(100);
  return NextResponse.json({ items });
}

export async function PATCH(request: Request) {
  if (!requestOriginIsSame(request)) return NextResponse.json({ error: "Origem do pedido não permitida." }, { status: 403 });
  const admin = await getAdminSession();
  if (!admin || !hasAnyPermission(admin, ["artists.review", "artists.manage", "content.manage"])) {
    return NextResponse.json({ error: "Não tens permissão para rever contas de artistas." }, { status: 403 });
  }
  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Pedido inválido." }, { status: 400 }); }
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const id = typeof body.id === "string" ? body.id.trim().slice(0, 80) : "";
  const status = body.status === "approved" || body.status === "rejected" || body.status === "pending" ? body.status : "";
  if (!id || !status) return NextResponse.json({ error: "Selecciona uma conta e um estado válido." }, { status: 400 });

  const now = new Date();
  const [updated] = await db.update(artistApplications).set({
    status,
    reviewedAt: now,
    reviewedBy: admin.id,
    decisionNote: status === "approved" ? "Conta aprovada pela administração."
      : status === "pending" ? "Conta devolvida para revisão."
      : "Conta suspensa/rejeitada pela administração.",
    updatedAt: now,
  }).where(eq(artistApplications.id, id)).returning({
    id: artistApplications.id, stageName: artistApplications.stageName, status: artistApplications.status,
  });
  if (!updated) return NextResponse.json({ error: "Conta de artista não encontrada." }, { status: 404 });
  if (status !== "approved") {
    const [account] = await db.select({ id: artistAccounts.id }).from(artistAccounts)
      .where(eq(artistAccounts.applicationId, id)).limit(1);
    if (account) await db.delete(artistSessions).where(eq(artistSessions.accountId, account.id));
  }
  await db.insert(platformAuditLog).values({
    actorAdminId: admin.id,
    action: "artist_account." + status,
    entityType: "artist_application",
    entityId: updated.id,
    details: { stageName: updated.stageName },
    createdAt: now,
  });
  revalidatePath("/");
  revalidatePath("/comunidade");
  return NextResponse.json({ ok: true, status: updated.status });
}

export async function DELETE(request: Request) {
  if (!requestOriginIsSame(request)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  const admin = await getAdminSession();
  if (!admin || !hasPermission(admin, "artists.manage")) {
    return NextResponse.json({ error: "Não tens permissão para remover contas de artistas." }, { status: 403 });
  }
  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Pedido inválido." }, { status: 400 }); }
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const id = typeof body.id === "string" ? body.id.trim().slice(0, 80) : "";
  if (!id) return NextResponse.json({ error: "Identificador de conta inválido." }, { status: 400 });

  const [target] = await db.select({
    id: artistApplications.id, stageName: artistApplications.stageName,
  }).from(artistApplications).where(eq(artistApplications.id, id)).limit(1);
  if (!target) return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });

  await db.transaction(async tx => {
    const authoredPosts = await tx.select({ id: communityPosts.id }).from(communityPosts).where(eq(communityPosts.authorId, id));
    const postIds = authoredPosts.map(post => post.id);
    if (postIds.length) {
      await tx.delete(communityPostViews).where(inArray(communityPostViews.postId, postIds));
      await tx.delete(communityComments).where(inArray(communityComments.postId, postIds));
      await tx.delete(communityReactions).where(inArray(communityReactions.contentId, postIds));
      await tx.delete(communityReports).where(and(eq(communityReports.targetType, "post"), inArray(communityReports.targetId, postIds)));
      await tx.delete(communityPosts).where(inArray(communityPosts.id, postIds));
    }

    const memberships = await tx.select({ conversationId: communityConversationMembers.conversationId })
      .from(communityConversationMembers).where(eq(communityConversationMembers.memberId, id));
    const conversationIds = [...new Set(memberships.map(row => row.conversationId))];
    if (conversationIds.length) {
      await tx.delete(communityMessages).where(inArray(communityMessages.conversationId, conversationIds));
      await tx.delete(communityConversationMembers).where(inArray(communityConversationMembers.conversationId, conversationIds));
      await tx.delete(communityConversations).where(inArray(communityConversations.id, conversationIds));
    }
    await tx.delete(communityComments).where(eq(communityComments.authorId, id));
    await tx.delete(communityReactions).where(eq(communityReactions.actorId, id));
    await tx.delete(communityFollows).where(or(eq(communityFollows.followerId, id), eq(communityFollows.followedId, id)));
    await tx.delete(communityBlocks).where(or(eq(communityBlocks.blockerId, id), eq(communityBlocks.blockedId, id)));
    await tx.delete(communityReports).where(eq(communityReports.reporterId, id));
    await tx.delete(artistMedia).where(eq(artistMedia.applicationId, id));
    const accountRows = await tx.select({ id: artistAccounts.id }).from(artistAccounts).where(eq(artistAccounts.applicationId, id));
    const accountIds = accountRows.map(row => row.id);
    if (accountIds.length) await tx.delete(artistSessions).where(inArray(artistSessions.accountId, accountIds));
    await tx.delete(artistAccounts).where(eq(artistAccounts.applicationId, id));
    await tx.delete(artistApplications).where(eq(artistApplications.id, id));
    await tx.insert(platformAuditLog).values({
      actorAdminId: admin.id,
      action: "artist_account.delete",
      entityType: "artist_application",
      entityId: id,
      details: { stageName: target.stageName },
      createdAt: new Date(),
    });
  });
  revalidatePath("/");
  revalidatePath("/comunidade");
  return NextResponse.json({ ok: true });
}
