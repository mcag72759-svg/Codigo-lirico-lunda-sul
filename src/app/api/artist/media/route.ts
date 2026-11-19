import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artistMedia } from "@/lib/db/schema";
import { getArtistSession } from "@/lib/security/artist-session";
export const runtime = "nodejs";
export async function GET() {
  const artist = await getArtistSession();
  if (!artist) return NextResponse.json({ error: "Inicia sessão." }, { status: 401 });
  const items = await db.select({ id: artistMedia.id, title: artistMedia.title, kind: artistMedia.kind, url: artistMedia.mediaUrl, status: artistMedia.status, createdAt: artistMedia.createdAt }).from(artistMedia).where(eq(artistMedia.applicationId, artist.applicationId)).orderBy(desc(artistMedia.createdAt)).limit(100);
  return NextResponse.json({ items });
}
