import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communityReactions } from "@/lib/db/schema";
import { getArtistSession } from "@/lib/security/artist-session";
import { requestOriginIsSame } from "@/lib/security/admin-session";
import { canReadCommunityPost, hasCommunityBlock } from "@/lib/community/access";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!requestOriginIsSame(request)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  const artist = await getArtistSession();
  if (!artist) return NextResponse.json({ error: "Entra como artista aprovado para reagir." }, { status: 401 });
  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Pedido inválido." }, { status: 400 }); }
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const postId = typeof body.postId === "string" ? body.postId.trim().slice(0, 80) : "";
  const kind = body.reaction === "love" || body.reaction === "support" ? body.reaction : "like";
  if (!postId) return NextResponse.json({ error: "Publicação inválida." }, { status: 400 });
  const post = await canReadCommunityPost(postId, artist.applicationId);
  if (!post || (post.authorId && await hasCommunityBlock(artist.applicationId, post.authorId))) {
    return NextResponse.json({ error: "Esta publicação não está disponível para interacção." }, { status: 403 });
  }
  const [existing] = await db.select({ id: communityReactions.id, reaction: communityReactions.reaction })
    .from(communityReactions)
    .where(and(eq(communityReactions.actorId, artist.applicationId), eq(communityReactions.contentId, postId)))
    .limit(1);
  if (existing) {
    await db.delete(communityReactions).where(eq(communityReactions.id, existing.id));
    return NextResponse.json({ ok: true, active: false, reaction: null });
  }
  await db.insert(communityReactions).values({
    actorId: artist.applicationId, contentId: postId, reaction: kind, createdAt: new Date(),
  });
  return NextResponse.json({ ok: true, active: true, reaction: kind });
}
