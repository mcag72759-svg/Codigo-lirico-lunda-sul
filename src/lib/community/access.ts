import "server-only";

import { and, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  artistMedia, communityBlocks, communityFollows, communityPosts, platformPublications, publishedContent,
} from "@/lib/db/schema";

type ReadablePost = {
  id: string;
  authorId: string | null;
  visibility: string;
  status: string;
  scheduledAt: Date | null;
};

export async function hasCommunityBlock(firstId: string, secondId: string): Promise<boolean> {
  const [row] = await db.select({ blockerId: communityBlocks.blockerId })
    .from(communityBlocks)
    .where(or(
      and(eq(communityBlocks.blockerId, firstId), eq(communityBlocks.blockedId, secondId)),
      and(eq(communityBlocks.blockerId, secondId), eq(communityBlocks.blockedId, firstId)),
    )).limit(1);
  return !!row;
}

export async function canReadCommunityPost(postId: string, viewerId?: string): Promise<ReadablePost | null> {
  const [post] = await db.select({
    id: communityPosts.id,
    authorId: communityPosts.authorId,
    visibility: communityPosts.visibility,
    status: communityPosts.status,
    scheduledAt: communityPosts.scheduledAt,
  }).from(communityPosts).where(eq(communityPosts.id, postId)).limit(1);

  if (post) {
    if (post.status !== "approved") return null;
    if (viewerId && post.authorId === viewerId) return post;
    if (post.scheduledAt && post.scheduledAt.getTime() > Date.now()) return null;
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

  const [legacy] = await db.select({ id: publishedContent.id })
    .from(publishedContent).where(eq(publishedContent.id, postId)).limit(1);
  if (legacy) return { id: legacy.id, authorId: null, visibility: "public", status: "approved", scheduledAt: null };

  const [current] = await db.select({
    id: platformPublications.id,
    authorId: platformPublications.createdBy,
    status: platformPublications.status,
    scheduledAt: platformPublications.scheduledAt,
  }).from(platformPublications).where(eq(platformPublications.id, postId)).limit(1);
  if (current) {
    const visible = current.status === "published" ||
      (current.status === "scheduled" && !!current.scheduledAt && current.scheduledAt.getTime() <= Date.now());
    if (!visible) return null;
    return { id: current.id, authorId: null, visibility: "public", status: "approved", scheduledAt: current.scheduledAt };
  }

  const [media] = await db.select({
    id: artistMedia.id,
    authorId: artistMedia.applicationId,
  }).from(artistMedia).where(and(
    eq(artistMedia.id, postId),
    eq(artistMedia.status, "approved"),
    eq(artistMedia.downloadAllowed, true),
  )).limit(1);
  if (media) {
    if (viewerId && await hasCommunityBlock(viewerId, media.authorId)) return null;
    return { id: media.id, authorId: media.authorId, visibility: "public", status: "approved", scheduledAt: null };
  }

  return null;
}
