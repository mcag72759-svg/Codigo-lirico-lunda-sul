import { and, desc, eq, isNull, lte, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  artistApplications, artistMedia, communityPosts, platformPublications, publishedContent,
} from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const [legacy, current, artistUploads, community] = await Promise.all([
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
      location: platformPublications.location, organizer: platformPublications.organizer,
      eventStartsAt: platformPublications.eventStartsAt, ticketPrice: platformPublications.ticketPrice,
      ticketUrl: platformPublications.ticketUrl,
    }).from(platformPublications)
      .where(or(
        eq(platformPublications.status, "published"),
        and(eq(platformPublications.status, "scheduled"), lte(platformPublications.scheduledAt, now)),
      ))
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
    db.select({
      id: communityPosts.id, type: communityPosts.contentType, title: communityPosts.title,
      artist: artistApplications.stageName, genre: artistApplications.genre,
      description: communityPosts.body, mediaUrl: communityPosts.mediaUrl, mediaType: communityPosts.mediaType,
      location: communityPosts.location, organizer: communityPosts.organizer,
      eventStartsAt: communityPosts.eventStartsAt, ticketPrice: communityPosts.ticketPrice,
      ticketUrl: communityPosts.ticketUrl, createdAt: communityPosts.createdAt,
    }).from(communityPosts)
      .innerJoin(artistApplications, eq(communityPosts.authorId, artistApplications.id))
      .where(and(
        eq(communityPosts.status, "approved"),
        eq(artistApplications.status, "approved"),
        or(isNull(communityPosts.scheduledAt), lte(communityPosts.scheduledAt, now)),
      ))
      .orderBy(desc(communityPosts.createdAt)).limit(40),
  ]);

  const approvedArtistUploads = artistUploads.map(item => ({
    ...item, type: item.type === "audio" ? "music" : "video", featured: false,
  }));
  const artistPosts = community.map(item => ({
    id: item.id,
    type: item.type,
    title: item.title,
    artist: item.artist,
    genre: item.genre,
    description: item.description,
    link: item.ticketUrl,
    ticketUrl: item.ticketUrl,
    ticketPrice: item.ticketPrice,
    location: item.location,
    organizer: item.organizer,
    eventStartsAt: item.eventStartsAt,
    audioUrl: item.mediaType.startsWith("image/") ? "" : item.mediaUrl,
    imageUrl: item.mediaType.startsWith("image/") ? item.mediaUrl : "",
    featured: false,
    createdAt: item.createdAt,
  }));
  const items = [...legacy, ...current, ...approvedArtistUploads, ...artistPosts]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 40);

  return NextResponse.json(items, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" },
  });
}
