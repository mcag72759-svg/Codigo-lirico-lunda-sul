import { and, count, desc, eq, inArray, notInArray, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  artistApplications, communityBlocks, communityComments, communityFollows,
  communityPosts, communityReactions,
} from "@/lib/db/schema";
import { getArtistSession } from "@/lib/security/artist-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const artist = await getArtistSession();
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

  const filters = [
    eq(communityPosts.status, "approved"),
    visibility,
    ...(blockedIds.length ? [notInArray(communityPosts.authorId, blockedIds)] : []),
  ];
  const approved = await db.select({
    id: communityPosts.id,
    authorId: communityPosts.authorId,
    body: communityPosts.body,
    mediaUrl: communityPosts.mediaUrl,
    mediaType: communityPosts.mediaType,
    visibility: communityPosts.visibility,
    status: communityPosts.status,
    createdAt: communityPosts.createdAt,
    author: artistApplications.stageName,
    municipality: artistApplications.municipality,
    genre: artistApplications.genre,
    photoUrl: artistApplications.photoUrl,
  }).from(communityPosts)
    .innerJoin(artistApplications, eq(communityPosts.authorId, artistApplications.id))
    .where(and(...filters, eq(artistApplications.status, "approved")))
    .orderBy(desc(communityPosts.createdAt)).limit(40);

  const ownPending = artist
    ? await db.select({
        id: communityPosts.id,
        authorId: communityPosts.authorId,
        body: communityPosts.body,
        mediaUrl: communityPosts.mediaUrl,
        mediaType: communityPosts.mediaType,
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
          inArray(communityPosts.status, ["pending", "rejected"]),
        ))
        .orderBy(desc(communityPosts.createdAt)).limit(10)
    : [];

  const posts = [...ownPending, ...approved.filter(post => !ownPending.some(p => p.id === post.id))]
    .sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 45);
  const ids = posts.map(post => post.id);
  if (!ids.length) return NextResponse.json({ authenticated: !!artist, artist: artist ? { stageName: artist.stageName, applicationId: artist.applicationId } : null, posts: [] });

  const [reactionCounts, commentCounts, myReactions] = await Promise.all([
    db.select({ contentId: communityReactions.contentId, total: count() })
      .from(communityReactions).where(inArray(communityReactions.contentId, ids)).groupBy(communityReactions.contentId),
    db.select({ postId: communityComments.postId, total: count() })
      .from(communityComments).where(inArray(communityComments.postId, ids)).groupBy(communityComments.postId),
    artist
      ? db.select({ contentId: communityReactions.contentId, reaction: communityReactions.reaction })
          .from(communityReactions)
          .where(and(eq(communityReactions.actorId, artist.applicationId), inArray(communityReactions.contentId, ids)))
      : Promise.resolve([]),
  ]);
  const reactions = new Map(reactionCounts.map(row => [row.contentId, Number(row.total)]));
  const comments = new Map(commentCounts.map(row => [row.postId, Number(row.total)]));
  const mine = new Map(myReactions.map(row => [row.contentId, row.reaction]));

  return NextResponse.json({
    authenticated: !!artist,
    artist: artist ? { stageName: artist.stageName, applicationId: artist.applicationId } : null,
    posts: posts.map(post => ({
      ...post,
      reactionCount: reactions.get(post.id) ?? 0,
      commentCount: comments.get(post.id) ?? 0,
      myReaction: mine.get(post.id) ?? null,
      isMine: artist?.applicationId === post.authorId,
      isFollowing: followedIds.includes(post.authorId),
    })),
  }, { headers: { "Cache-Control": "private, no-store" } });
}
