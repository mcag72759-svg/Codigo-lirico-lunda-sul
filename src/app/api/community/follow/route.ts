import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artistApplications, communityFollows } from "@/lib/db/schema";
import { getArtistSession } from "@/lib/security/artist-session";
import { requestOriginIsSame } from "@/lib/security/admin-session";
import { hasCommunityBlock } from "@/lib/community/access";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!requestOriginIsSame(request)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  const artist = await getArtistSession();
  if (!artist) return NextResponse.json({ error: "Entra como artista aprovado para seguir outros artistas." }, { status: 401 });
  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Pedido inválido." }, { status: 400 }); }
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const targetId = typeof body.artistId === "string" ? body.artistId.trim().slice(0, 80) : "";
  if (!targetId || targetId === artist.applicationId) return NextResponse.json({ error: "Artista inválido." }, { status: 400 });
  const [target] = await db.select({ id: artistApplications.id }).from(artistApplications)
    .where(and(eq(artistApplications.id, targetId), eq(artistApplications.status, "approved"))).limit(1);
  if (!target || await hasCommunityBlock(artist.applicationId, targetId)) return NextResponse.json({ error: "Este perfil não está disponível." }, { status: 404 });

  const [existing] = await db.select({ id: communityFollows.id }).from(communityFollows)
    .where(and(eq(communityFollows.followerId, artist.applicationId), eq(communityFollows.followedId, targetId)))
    .limit(1);
  if (existing) {
    await db.delete(communityFollows).where(eq(communityFollows.id, existing.id));
    return NextResponse.json({ ok: true, following: false });
  }
  await db.insert(communityFollows).values({
    followerId: artist.applicationId, followedId: targetId, createdAt: new Date(),
  });
  return NextResponse.json({ ok: true, following: true });
}
