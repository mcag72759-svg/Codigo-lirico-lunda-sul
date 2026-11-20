import { and, count, desc, eq, inArray, isNull, lte, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  artistApplications, artistMedia, communityComments, communityFollows, communityPosts,
  communityReactions, platformPublications, publishedContent,
} from "@/lib/db/schema";
import { getArtistSession } from "@/lib/security/artist-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const artist = await getArtistSession();
  const [legacy, current, artistUploads, community, approvedArtists] = await Promise.all([
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
      id: artistMedia.id, authorId: artistMedia.applicationId, type: artistMedia.kind, title: artistMedia.title,
      artist: artistApplications.stageName, genre: artistMedia.genre, description: artistMedia.description,
      link: artistApplications.link, audioUrl: artistMedia.mediaUrl, imageUrl: artistApplications.photoUrl,
      featured: artistMedia.downloadAllowed, createdAt: artistMedia.createdAt,
    }).from(artistMedia)
      .innerJoin(artistApplications, eq(artistMedia.applicationId, artistApplications.id))
      .where(and(eq(artistMedia.status, "approved"), eq(artistMedia.downloadAllowed, true), eq(artistApplications.status, "approved")))
      .orderBy(desc(artistMedia.createdAt)).limit(30),
    db.select({
      id: communityPosts.id, authorId: communityPosts.authorId, visibility: communityPosts.visibility,
      type: communityPosts.contentType, title: communityPosts.title,
      artist: artistApplications.stageName, genre: artistApplications.genre,
      description: communityPosts.body, mediaUrl: communityPosts.mediaUrl, mediaType: communityPosts.mediaType,
      location: communityPosts.location, organizer: communityPosts.organizer,
      eventStartsAt: communityPosts.eventStartsAt, ticketPrice: communityPosts.ticketPrice,
      ticketUrl: communityPosts.ticketUrl, createdAt: communityPosts.createdAt,
    }).from(communityPosts)
      .innerJoin(artistApplications, eq(communityPosts.authorId, artistApplications.id))
      .where(and(
        eq(communityPosts.status, "approved"),
        eq(communityPosts.visibility, "public"),
        eq(artistApplications.status, "approved"),
        or(isNull(communityPosts.scheduledAt), lte(communityPosts.scheduledAt, now)),
      ))
      .orderBy(desc(communityPosts.createdAt)).limit(40),
    db.select({ id: artistApplications.id, stageName: artistApplications.stageName })
      .from(artistApplications).where(eq(artistApplications.status, "approved")).limit(5000),
  ]);

  const approvedArtistUploads = artistUploads.map(item => ({
    ...item, type: item.type === "audio" ? "music" : "video", featured: false,
  }));
  const artistPosts = community.map(item => ({
    id: item.id,
    authorId: item.authorId,
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

  const artistByName = new Map(
    approvedArtists.map(profile => [profile.stageName.trim().toLocaleLowerCase("pt-AO"), profile.id]),
  );
  const candidates = [
    ...legacy.map(item => ({ ...item, authorId: null as string | null })),
    ...current.map(item => ({ ...item, authorId: null as string | null })),
    ...approvedArtistUploads,
    ...artistPosts,
  ];
  const items = candidates.map(item => ({
    ...item,
    authorId: item.authorId ?? artistByName.get(item.artist.trim().toLocaleLowerCase("pt-AO")) ?? null,
  })).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 40);

  const ids = items.map(item => item.id);
  if (!ids.length) {
    return NextResponse.json([], {
      headers: { "Cache-Control": artist ? "private, no-store" : "public, s-maxage=20, stale-while-revalidate=60" },
    });
  }

  const [reactionCounts, commentCounts] = await Promise.all([
    db.select({ contentId: communityReactions.contentId, total: count() })
      .from(communityReactions).where(inArray(communityReactions.contentId, ids)).groupBy(communityReactions.contentId),
    db.select({ postId: communityComments.postId, total: count() })
      .from(communityComments).where(inArray(communityComments.postId, ids)).groupBy(communityComments.postId),
  ]);
  const myReactions = artist
    ? await db.select({ contentId: communityReactions.contentId, reaction: communityReactions.reaction })
        .from(communityReactions)
        .where(and(eq(communityReactions.actorId, artist.applicationId), inArray(communityReactions.contentId, ids)))
    : [];
  const authorIds = [...new Set(items.map(item => item.authorId).filter((id): id is string => Boolean(id) && id !== artist?.applicationId))];
  const followingRows = artist && authorIds.length
    ? await db.select({ followedId: communityFollows.followedId }).from(communityFollows)
        .where(and(eq(communityFollows.followerId, artist.applicationId), inArray(communityFollows.followedId, authorIds)))
    : [];

  const reactions = new Map(reactionCounts.map(row => [row.contentId, Number(row.total)]));
  const comments = new Map(commentCounts.map(row => [row.postId, Number(row.total)]));
  const mine = new Map(myReactions.map(row => [row.contentId, row.reaction]));
  const followed = new Set(followingRows.map(row => row.followedId));

  return NextResponse.json(items.map(item => ({
    ...item,
    reactionCount: reactions.get(item.id) ?? 0,
    commentCount: comments.get(item.id) ?? 0,
    myReaction: mine.get(item.id) ?? null,
    isFollowing: item.authorId ? followed.has(item.authorId) : false,
    isMine: item.authorId === artist?.applicationId,
    isAuthenticated: Boolean(artist),
  })), {
    headers: { "Cache-Control": artist ? "private, no-store" : "public, s-maxage=20, stale-while-revalidate=60" },
  });
}
