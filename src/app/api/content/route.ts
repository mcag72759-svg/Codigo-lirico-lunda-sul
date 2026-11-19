import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artistApplications, artistMedia, platformPublications, publishedContent } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [legacy, current, artistUploads] = await Promise.all([
    db.select({
      id: publishedContent.id, type: publishedContent.type, title: publishedContent.title,
      artist: publishedContent.artist, genre: publishedContent.genre, description: publishedContent.description,
      link: publishedContent.link, audioUrl: publishedContent.audioUrl, imageUrl: publishedContent.imageUrl,
      featured: publishedContent.featured, createdAt: publishedContent.createdAt,
    }).from(publishedContent).orderBy(desc(publishedContent.createdAt)).limit(30),
    db.select({
      id: platformPublications.id, type: platformPublications.type, title: platformPublications.title,
      artist: platformPublications.author, genre: platformPublications.category, description: platformPublications.description,
      link: platformPublications.externalUrl, audioUrl: platformPublications.mediaUrl, imageUrl: platformPublications.imageUrl,
      featured: platformPublications.featured, createdAt: platformPublications.createdAt,
    }).from(platformPublications)
      .where(eq(platformPublications.status, "published"))
      .orderBy(desc(platformPublications.createdAt)).limit(30),
    db.select({
      id: artistMedia.id, type: artistMedia.kind, title: artistMedia.title,
      artist: artistApplications.stageName, genre: artistMedia.genre, description: artistMedia.description,
      link: artistApplications.link, audioUrl: artistMedia.mediaUrl, imageUrl: artistApplications.photoUrl,
      featured: artistMedia.downloadAllowed, createdAt: artistMedia.createdAt,
    }).from(artistMedia)
      .innerJoin(artistApplications, eq(artistMedia.applicationId, artistApplications.id))
      .where(and(eq(artistMedia.status, "approved"), eq(artistMedia.downloadAllowed, true)))
      .orderBy(desc(artistMedia.createdAt)).limit(30),
  ]);

  const approvedArtistUploads = artistUploads.map((item) => ({
    ...item, type: item.type === "audio" ? "music" : "video", featured: false,
  }));
  const items = [...legacy, ...current, ...approvedArtistUploads]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 24);

  return NextResponse.json(items, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
