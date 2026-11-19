import { and, count, desc, eq, gt, inArray, isNull, notInArray, or, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  artistApplications, communityBlocks, communityComments, communityFollows,
  communityPosts, communityPostViews, communityReactions,
} from "@/lib/db/schema";
import { getArtistSession } from "@/lib/security/artist-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const artist = await getArtistSession();
  const now = new Date();
  const followedRows = artist
    ? await db.select({ id: communityFollows.followedId }).from(communityFollows)
        .where(eq(communityFollows.followerId, artist.applicationId))
    : [];
  const followedIds = followedRows.map(row => row.id);

  const blockedRows = artist
    ? await db.select({ blockerId: communityBlocks.blockerId, blockedId: communityBlocks.blockedId })
        .from(communityBlocks)
        .where(or(
          eq(communityBlocks.blockerId, artist.applicationId),
          eq(communityBlocks.blockedId, artist.applicationId),
        ))
    : [];
  const blockedIds = blockedRows.map(row => row.blockerId === artist?.applicationId ? row.blockedId : row.blockerId);

  const visibility = artist
    ? or(
        eq(communityPosts.visibility, "public"),
        eq(communityPosts.authorId, artist.applicationId),
        ...(followedIds.length ? [and(eq(communityPosts.visibility, "followers"), inArray(communityPosts.authorId, followedIds))] : []),
      )
    : eq(communityPosts.visibility, "public");

  const approved = await db.select({
    id: communityPosts.id,
    authorId: communityPosts.authorId,
    title: communityPosts.title,
    contentType: communityPosts.contentType,
    body: communityPosts.body,
    mediaUrl: communityPosts.mediaUrl,
    mediaType: communityPosts.mediaType,
    location: communityPosts.location,
    organizer: communityPosts.organizer,
    eventStartsAt: communityPosts.eventStartsAt,
    ticketPrice: communityPosts.ticketPrice,
    ticketUrl: communityPosts.ticketUrl,
    scheduledAt: communityPosts.scheduledAt,
    visibility: communityPosts.visibility,
    status: communityPosts.status,
    createdAt: communityPosts.createdAt,
    author: artistApplications.stageName,
    municipality: artistApplications.municipality,
    genre: artistApplications.genre,
    photoUrl: artistApplications.photoUrl,
  }).from(communityPosts)
    .innerJoin(artistApplications, eq(communityPosts.authorId, artistApplications.id))
    .where(and(
      eq(communityPosts.status, "approved"),
      or(isNull(communityPosts.scheduledAt), lte(communityPosts.scheduledAt, now)),
      visibility,
      ...(blockedIds.length ? [notInArray(communityPosts.authorId, blockedIds)] : []),
      eq(artistApplications.status, "approved"),
    ))
    .orderBy(desc(communityPosts.createdAt)).limit(40);

  const ownScheduled = artist
    ? await db.select({
        id: communityPosts.id,
        authorId: communityPosts.authorId,
        title: communityPosts.title,
        contentType: communityPosts.contentType,
        body: communityPosts.body,
        mediaUrl: communityPosts.mediaUrl,
        mediaType: communityPosts.mediaType,
        location: communityPosts.location,
        organizer: communityPosts.organizer,
        eventStartsAt: communityPosts.eventStartsAt,
        ticketPrice: communityPosts.ticketPrice,
        ticketUrl: communityPosts.ticketUrl,
        scheduledAt: communityPosts.scheduledAt,
        visibility: communityPosts.visibility,
        status: communityPosts.status,
        createdAt: communityPosts.createdAt,
        author: artistApplications.stageName,
        municipality: artistApplications.municipality,
        genre: artistApplications.genre,
        photoUrl: artistApplications.photoUrl,
      }).from(communityPosts)
        .innerJoin(artistApplications, eq(communityPosts.authorId, artistApplications.id))
        .where(and(
          eq(communityPosts.authorId, artist.applicationId),
          or(
            inArray(communityPosts.status, ["pending", "rejected"]),
            and(eq(communityPosts.status, "approved"), gt(communityPosts.scheduledAt, now)),
          ),
        ))
        .orderBy(desc(communityPosts.createdAt)).limit(20)
    : [];

  const posts = [...ownScheduled, ...approved.filter(post => !ownScheduled.some(p => p.id === post.id))]
    .sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 45);
  const ids = posts.map(post => post.id);
  if (!ids.length) return NextResponse.json({
    authenticated: !!artist,
    artist: artist ? { stageName: artist.stageName, applicationId: artist.applicationId } : null,
    posts: [],
  });

  const [reactionCounts, commentCounts, viewCounts, myReactions] = await Promise.all([
    db.select({ contentId: communityReactions.contentId, total: count() })
      .from(communityReactions).where(inArray(communityReactions.contentId, ids)).groupBy(communityReactions.contentId),
    db.select({ postId: communityComments.postId, total: count() })
      .from(communityComments).where(inArray(communityComments.postId, ids)).groupBy(communityComments.postId),
    db.select({ postId: communityPostViews.postId, total: count() })
      .from(communityPostViews).where(inArray(communityPostViews.postId, ids)).groupBy(communityPostViews.postId),
    artist
      ? db.select({ contentId: communityReactions.contentId, reaction: communityReactions.reaction })
          .from(communityReactions)
          .where(and(eq(communityReactions.actorId, artist.applicationId), inArray(communityReactions.contentId, ids)))
      : Promise.resolve([]),
  ]);
  const reactions = new Map(reactionCounts.map(row => [row.contentId, Number(row.total)]));
  const comments = new Map(commentCounts.map(row => [row.postId, Number(row.total)]));
  const views = new Map(viewCounts.map(row => [row.postId, Number(row.total)]));
  const mine = new Map(myReactions.map(row => [row.contentId, row.reaction]));

  return NextResponse.json({
    authenticated: !!artist,
    artist: artist ? { stageName: artist.stageName, applicationId: artist.applicationId } : null,
    posts: posts.map(post => ({
      ...post,
      reactionCount: reactions.get(post.id) ?? 0,
      commentCount: comments.get(post.id) ?? 0,
      viewCount: views.get(post.id) ?? 0,
      myReaction: mine.get(post.id) ?? null,
      isMine: artist?.applicationId === post.authorId,
      isFollowing: followedIds.includes(post.authorId),
    })),
  }, { headers: { "Cache-Control": "private, no-store" } });
}
