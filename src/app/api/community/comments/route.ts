import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artistApplications, communityComments } from "@/lib/db/schema";
import { getArtistSession } from "@/lib/security/artist-session";
import { requestOriginIsSame } from "@/lib/security/admin-session";
import { canReadCommunityPost, hasCommunityBlock } from "@/lib/community/access";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const postId = new URL(request.url).searchParams.get("postId")?.slice(0, 80) ?? "";
  if (!postId) return NextResponse.json({ error: "Publicação inválida." }, { status: 400 });
  const artist = await getArtistSession();
  const post = await canReadCommunityPost(postId, artist?.applicationId);
  if (!post) return NextResponse.json({ error: "Esta publicação não está disponível." }, { status: 404 });
  const comments = await db.select({
    id: communityComments.id,
    body: communityComments.body,
    createdAt: communityComments.createdAt,
    authorId: communityComments.authorId,
    author: artistApplications.stageName,
    photoUrl: artistApplications.photoUrl,
  }).from(communityComments)
    .innerJoin(artistApplications, eq(communityComments.authorId, artistApplications.id))
    .where(eq(communityComments.postId, postId))
    .orderBy(asc(communityComments.createdAt)).limit(50);
  return NextResponse.json({ comments });
}

export async function POST(request: Request) {
  if (!requestOriginIsSame(request)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  const artist = await getArtistSession();
  if (!artist) return NextResponse.json({ error: "Entra como artista aprovado para comentar." }, { status: 401 });
  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Pedido inválido." }, { status: 400 }); }
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const postId = typeof body.postId === "string" ? body.postId.trim().slice(0, 80) : "";
  const text = typeof body.body === "string" ? body.body.trim().slice(0, 2000) : "";
  if (!postId || !text) return NextResponse.json({ error: "Escreve um comentário." }, { status: 400 });
  const post = await canReadCommunityPost(postId, artist.applicationId);
  if (!post) return NextResponse.json({ error: "Não podes comentar esta publicação." }, { status: 403 });
  if (await hasCommunityBlock(artist.applicationId, post.authorId)) return NextResponse.json({ error: "Esta interacção não está disponível." }, { status: 403 });
  const [comment] = await db.insert(communityComments).values({
    id: randomUUID(),
    postId,
    authorId: artist.applicationId,
    body: text,
    createdAt: new Date(),
  }).returning({ id: communityComments.id });
  return NextResponse.json({ ok: true, id: comment.id }, { status: 201 });
}
