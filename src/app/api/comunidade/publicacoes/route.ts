import { randomUUID } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artistApplications, communityComments, communityPosts, communityReactions } from "@/lib/db/schema";
import { getArtistSession } from "@/lib/security/artist-session";
export const runtime = "nodejs";
export async function GET() {
  const rows = await db.select({
    id: communityPosts.id, body: communityPosts.body, mediaUrl: communityPosts.mediaUrl,
    mediaType: communityPosts.mediaType, createdAt: communityPosts.createdAt,
    authorId: artistApplications.id, author: artistApplications.stageName,
    municipality: artistApplications.municipality, genre: artistApplications.genre,
    likes: sql<number>`(select count(*)::int from community_reactions where content_id = ${communityPosts.id} and reaction = 'like')`,
    comments: sql<number>`(select count(*)::int from community_comments where post_id = ${communityPosts.id})`,
  }).from(communityPosts).innerJoin(artistApplications, eq(communityPosts.authorId, artistApplications.id))
    .where(eq(communityPosts.status, "approved")).orderBy(desc(communityPosts.createdAt)).limit(50);
  return NextResponse.json({ posts: rows });
}
export async function POST(request: Request) {
  const artist = await getArtistSession();
  if (!artist) return NextResponse.json({ error: "Inicia sessão para publicar." }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Pedido inválido." }, { status: 400 }); }
  const text = typeof body.body === "string" ? body.body.trim() : "";
  const mediaUrl = typeof body.mediaUrl === "string" ? body.mediaUrl.trim() : "";
  const mediaType = typeof body.mediaType === "string" ? body.mediaType : "none";
  if ((!text && !mediaUrl) || text.length > 5000 || !["none","image","audio","video"].includes(mediaType) ||
      (mediaUrl && (!mediaUrl.startsWith("https://") || mediaUrl.length > 2048))) {
    return NextResponse.json({ error: "Publicação inválida. Verifica o texto e o ficheiro." }, { status: 400 });
  }
  const id = randomUUID(), now = new Date();
  await db.insert(communityPosts).values({ id, authorId: artist.applicationId, body: text, mediaUrl, mediaType, visibility: "public", status: "pending", createdAt: now, updatedAt: now });
  return NextResponse.json({ ok: true, id, status: "pending", message: "Publicação enviada para revisão." }, { status: 201 });
}
