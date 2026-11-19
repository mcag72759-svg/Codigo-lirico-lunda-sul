import { count, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  communityComments, communityFollows, communityPostViews, communityPosts, communityReactions,
} from "@/lib/db/schema";
import { getArtistSession } from "@/lib/security/artist-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const artist = await getArtistSession();
  if (!artist) return NextResponse.json({ error: "Entra como artista para consultar as tuas estatísticas." }, { status: 401 });

  const posts = await db.select({
    id: communityPosts.id,
    title: communityPosts.title,
    contentType: communityPosts.contentType,
    status: communityPosts.status,
    createdAt: communityPosts.createdAt,
    scheduledAt: communityPosts.scheduledAt,
  }).from(communityPosts)
    .where(eq(communityPosts.authorId, artist.applicationId))
    .orderBy(desc(communityPosts.createdAt)).limit(100);
  const ids = posts.map(post => post.id);
  const [followerCount] = await db.select({ total: count() }).from(communityFollows)
    .where(eq(communityFollows.followedId, artist.applicationId));

  if (!ids.length) return NextResponse.json({
    totals: { posts: 0, likes: 0, comments: 0, views: 0, followers: Number(followerCount.total) },
    posts: [],
  });

  const [likes, comments, views] = await Promise.all([
    db.select({ id: communityReactions.contentId, total: count() })
      .from(communityReactions).where(inArray(communityReactions.contentId, ids)).groupBy(communityReactions.contentId),
    db.select({ id: communityComments.postId, total: count() })
      .from(communityComments).where(inArray(communityComments.postId, ids)).groupBy(communityComments.postId),
    db.select({ id: communityPostViews.postId, total: count() })
      .from(communityPostViews).where(inArray(communityPostViews.postId, ids)).groupBy(communityPostViews.postId),
  ]);
  const likeMap = new Map(likes.map(row => [row.id,Number(row.total)]));
  const commentMap = new Map(comments.map(row => [row.id,Number(row.total)]));
  const viewMap = new Map(views.map(row => [row.id,Number(row.total)]));
  const entries = posts.map(post => ({
    ...post,
    likes: likeMap.get(post.id)??0,
    comments: commentMap.get(post.id)??0,
    views: viewMap.get(post.id)??0,
  }));
  return NextResponse.json({
    totals: {
      posts: posts.length,
      likes: entries.reduce((sum,post)=>sum+post.likes,0),
      comments: entries.reduce((sum,post)=>sum+post.comments,0),
      views: entries.reduce((sum,post)=>sum+post.views,0),
      followers: Number(followerCount.total),
    },
    posts: entries,
  });
}
