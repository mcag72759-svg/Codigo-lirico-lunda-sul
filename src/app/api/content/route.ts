import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publishedContent } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const posts = await db
    .select({
      id: publishedContent.id,
      type: publishedContent.type,
      title: publishedContent.title,
      artist: publishedContent.artist,
      genre: publishedContent.genre,
      description: publishedContent.description,
      link: publishedContent.link,
      audioUrl: publishedContent.audioUrl,
      imageUrl: publishedContent.imageUrl,
      featured: publishedContent.featured,
      createdAt: publishedContent.createdAt,
    })
    .from(publishedContent)
    .orderBy(desc(publishedContent.createdAt))
    .limit(12);

  return NextResponse.json(posts, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
