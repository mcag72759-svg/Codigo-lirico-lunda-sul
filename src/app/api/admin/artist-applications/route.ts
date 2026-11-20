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

const ARTIST_VIEW_PERMISSIONS = ["artists.view", "artists.review", "artists.manage", "content.manage"] as const;
const ARTIST_REVIEW_PERMISSIONS = ["artists.review", "artists.manage", "content.manage"] as const;

export async function GET() {
  const admin = await getAdminSession();
  if (!admin || !hasAnyPermission(admin, ARTIST_VIEW_PERMISSIONS)) {
    return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  }

  const rows = await db.select({
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
    accountId: artistAccounts.id,
  }).from(artistApplications)
    .leftJoin(artistAccounts, eq(artistApplications.id, artistAccounts.applicationId))
    .orderBy(desc(artistApplications.createdAt))
    .limit(100);

  return NextResponse.json({
    items: rows.map(({ accountId, ...item }) => ({ ...item, hasAccount: Boolean(accountId) })),
  });
}

export async function PATCH(request: Request) {
  if (!requestOriginIsSame(request)) {
    return NextResponse.json({ error: "Origem do pedido não permitida." }, { status: 403 });
  }

  const admin = await getAdminSession();
  if (!admin || !hasAnyPermission(admin, ARTIST_REVIEW_PERMISSIONS)) {
    return NextResponse.json({ error: "Não tens permissão para gerir candidaturas de artistas." }, { status: 403 });
  }

  let input: unknown;
  try { input = await request.json(); }
  catch { return NextResponse.json({ error: "Pedido inválido." }, { status: 400 }); }

  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const id = typeof body.id === "string" ? body.id.trim().slice(0, 80) : "";
  const status = body.status;
  if (!id || !["approved", "rejected", "suspended", "pending"].includes(String(status))) {
    return NextResponse.json({ error: "Selecciona uma candidatura e uma acção válida." }, { status: 400 });
  }

  const now = new Date();
  const updated = await db.transaction(async (tx) => {
    const [current] = await tx.select({
      id: artistApplications.id,
      stageName: artistApplications.stageName,
      status: artistApplications.status,
    }).from(artistApplications)
      .where(eq(artistApplications.id, id))
      .limit(1);

    if (!current) return { error: "Candidatura não encontrada.", conflict: true } as const;

    const allowed =
      (status === "approved" && (current.status === "pending" || current.status === "suspended")) ||
      (status === "rejected" && current.status === "pending") ||
      (status === "suspended" && current.status === "approved") ||
      (status === "pending" && current.status === "rejected");

    if (!allowed) {
      return { error: "Esta acção não é válida para o estado actual da candidatura.", conflict: true } as const;
    }

    const decisionNote =
      status === "approved" ? "Candidatura aprovada/reactivada pela administração." :
      status === "rejected" ? "Candidatura rejeitada pela administração." :
      status === "suspended" ? "Conta suspensa pela administração." :
      "Candidatura reaberta para nova revisão.";

    await tx.update(artistApplications).set({
      status: String(status),
      reviewedAt: now,
      reviewedBy: admin.id,
      decisionNote,
      updatedAt: now,
    }).where(eq(artistApplications.id, id));

    if (status === "rejected" || status === "suspended") {
      const accountRows = await tx.select({ id: artistAccounts.id })
        .from(artistAccounts)
        .where(eq(artistAccounts.applicationId, id));
      const accountIds = accountRows.map(row => row.id);
      if (accountIds.length) {
        await tx.delete(artistSessions).where(inArray(artistSessions.accountId, accountIds));
      }
    }

    await tx.insert(platformAuditLog).values({
      actorAdminId: admin.id,
      action: "artist_application." + String(status),
      entityType: "artist_application",
      entityId: id,
      details: { stageName: current.stageName, previousStatus: current.status, newStatus: status },
      createdAt: now,
    });

    return { id, stageName: current.stageName, status: String(status) } as const;
  });

  if ("error" in updated) {
    return NextResponse.json({ error: updated.error }, { status: updated.conflict ? 409 : 404 });
  }

  revalidatePath("/");
  revalidatePath("/artista");
  revalidatePath("/comunidade");
  return NextResponse.json({ ok: true, status: updated.status });
}

export async function DELETE(request: Request) {
  if (!requestOriginIsSame(request)) {
    return NextResponse.json({ error: "Origem do pedido não permitida." }, { status: 403 });
  }

  const admin = await getAdminSession();
  if (!admin || !hasPermission(admin, "artists.manage")) {
    return NextResponse.json({ error: "Não tens permissão para remover contas de artistas." }, { status: 403 });
  }

  let input: unknown;
  try { input = await request.json(); }
  catch { return NextResponse.json({ error: "Pedido inválido." }, { status: 400 }); }

  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const id = typeof body.id === "string" ? body.id.trim().slice(0, 80) : "";
  if (!id) return NextResponse.json({ error: "Identificador de conta inválido." }, { status: 400 });

  const [target] = await db.select({
    id: artistApplications.id,
    stageName: artistApplications.stageName,
  }).from(artistApplications).where(eq(artistApplications.id, id)).limit(1);

  if (!target) return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });

  await db.transaction(async (tx) => {
    const authoredPosts = await tx.select({ id: communityPosts.id })
      .from(communityPosts).where(eq(communityPosts.authorId, id));
    const postIds = authoredPosts.map(post => post.id);

    const commentsOnPosts = postIds.length
      ? await tx.select({ id: communityComments.id }).from(communityComments)
          .where(inArray(communityComments.postId, postIds))
      : [];
    const authoredComments = await tx.select({ id: communityComments.id }).from(communityComments)
      .where(eq(communityComments.authorId, id));
    const commentIds = [...new Set([...commentsOnPosts, ...authoredComments].map(row => row.id))];

    if (postIds.length) {
      await tx.delete(communityPostViews).where(inArray(communityPostViews.postId, postIds));
    }
    if (postIds.length || commentIds.length) {
      const contentIds = [...new Set([...postIds, ...commentIds])];
      await tx.delete(communityReactions).where(inArray(communityReactions.contentId, contentIds));
      await tx.delete(communityReports).where(and(
        eq(communityReports.targetType, "post"),
        inArray(communityReports.targetId, postIds.length ? postIds : ["__none__"]),
      ));
      if (commentIds.length) {
        await tx.delete(communityReports).where(and(
          eq(communityReports.targetType, "comment"),
          inArray(communityReports.targetId, commentIds),
        ));
      }
    }

    await tx.delete(communityComments).where(or(
      eq(communityComments.authorId, id),
      ...(postIds.length ? [inArray(communityComments.postId, postIds)] : []),
    ));

    if (postIds.length) {
      await tx.delete(communityPosts).where(inArray(communityPosts.id, postIds));
    }

    const memberships = await tx.select({ conversationId: communityConversationMembers.conversationId })
      .from(communityConversationMembers).where(eq(communityConversationMembers.memberId, id));
    const conversationIds = [...new Set(memberships.map(row => row.conversationId))];
    if (conversationIds.length) {
      // Conversations involving the deleted artist are removed, including their messages and memberships.
      await tx.delete(communityMessages).where(inArray(communityMessages.conversationId, conversationIds));
      await tx.delete(communityConversationMembers).where(inArray(communityConversationMembers.conversationId, conversationIds));
      await tx.delete(communityConversations).where(inArray(communityConversations.id, conversationIds));
    }

    await tx.delete(communityReactions).where(eq(communityReactions.actorId, id));
    await tx.delete(communityFollows).where(or(
      eq(communityFollows.followerId, id),
      eq(communityFollows.followedId, id),
    ));
    await tx.delete(communityBlocks).where(or(
      eq(communityBlocks.blockerId, id),
      eq(communityBlocks.blockedId, id),
    ));
    await tx.delete(communityReports).where(eq(communityReports.reporterId, id));
    await tx.delete(artistMedia).where(eq(artistMedia.applicationId, id));

    const accountRows = await tx.select({ id: artistAccounts.id }).from(artistAccounts)
      .where(eq(artistAccounts.applicationId, id));
    const accountIds = accountRows.map(row => row.id);
    if (accountIds.length) {
      await tx.delete(artistSessions).where(inArray(artistSessions.accountId, accountIds));
    }
    await tx.delete(artistAccounts).where(eq(artistAccounts.applicationId, id));

    await tx.insert(platformAuditLog).values({
      actorAdminId: admin.id,
      action: "artist_account.delete",
      entityType: "artist_application",
      entityId: id,
      details: { stageName: target.stageName },
      createdAt: new Date(),
    });
    await tx.delete(artistApplications).where(eq(artistApplications.id, id));
  });

  revalidatePath("/");
  revalidatePath("/artista");
  revalidatePath("/comunidade");
  return NextResponse.json({ ok: true });
}
