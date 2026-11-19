import "server-only";

import { and, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { communityBlocks, communityFollows, communityPosts } from "@/lib/db/schema";

export async function hasCommunityBlock(firstId: string, secondId: string): Promise<boolean> {
  const [row] = await db.select({ blockerId: communityBlocks.blockerId })
    .from(communityBlocks)
    .where(or(
      and(eq(communityBlocks.blockerId, firstId), eq(communityBlocks.blockedId, secondId)),
      and(eq(communityBlocks.blockerId, secondId), eq(communityBlocks.blockedId, firstId)),
    )).limit(1);
  return !!row;
}

export async function canReadCommunityPost(postId: string, viewerId?: string) {
  const [post] = await db.select({
    id: communityPosts.id,
    authorId: communityPosts.authorId,
    visibility: communityPosts.visibility,
    status: communityPosts.status,
  }).from(communityPosts).where(eq(communityPosts.id, postId)).limit(1);

  if (!post || post.status !== "approved") return null;
  if (viewerId && post.authorId === viewerId) return post;
  if (viewerId && await hasCommunityBlock(viewerId, post.authorId)) return null;
  if (post.visibility === "public") return post;
  if (!viewerId || post.visibility !== "followers") return null;

  const [follow] = await db.select({ id: communityFollows.id })
    .from(communityFollows)
    .where(and(
      eq(communityFollows.followerId, viewerId),
      eq(communityFollows.followedId, post.authorId),
    )).limit(1);
  return follow ? post : null;
}
