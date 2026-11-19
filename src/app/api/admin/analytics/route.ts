import { count, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  artistApplications, communityComments, communityFollows, communityPostViews,
  communityPosts, communityReactions,
} from "@/lib/db/schema";
import { getAdminSession } from "@/lib/security/admin-session";
import { hasPermission } from "@/lib/security/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin || !hasPermission(admin,"content.manage")) {
    return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  }
  const [artists,posts,pending,likes,comments,views,follows,latestPosts] = await Promise.all([
    db.select({total:count()}).from(artistApplications).where(eq(artistApplications.status,"approved")),
    db.select({total:count()}).from(communityPosts),
    db.select({total:count()}).from(communityPosts).where(eq(communityPosts.status,"pending")),
    db.select({total:count()}).from(communityReactions),
    db.select({total:count()}).from(communityComments),
    db.select({total:count()}).from(communityPostViews),
    db.select({total:count()}).from(communityFollows),
    db.select({
      id:communityPosts.id,
      title:communityPosts.title,
      contentType:communityPosts.contentType,
      status:communityPosts.status,
      createdAt:communityPosts.createdAt,
      author:artistApplications.stageName,
    }).from(communityPosts)
      .innerJoin(artistApplications,eq(communityPosts.authorId,artistApplications.id))
      .orderBy(desc(communityPosts.createdAt)).limit(100),
  ]);
  const ids=latestPosts.map(post=>post.id);
  const [postLikes,postComments,postViews]=ids.length?await Promise.all([
    db.select({id:communityReactions.contentId,total:count()})
      .from(communityReactions).where(inArray(communityReactions.contentId,ids)).groupBy(communityReactions.contentId),
    db.select({id:communityComments.postId,total:count()})
      .from(communityComments).where(inArray(communityComments.postId,ids)).groupBy(communityComments.postId),
    db.select({id:communityPostViews.postId,total:count()})
      .from(communityPostViews).where(inArray(communityPostViews.postId,ids)).groupBy(communityPostViews.postId),
  ]):[[],[],[]];
  const likesMap=new Map(postLikes.map(row=>[row.id,Number(row.total)]));
  const commentsMap=new Map(postComments.map(row=>[row.id,Number(row.total)]));
  const viewsMap=new Map(postViews.map(row=>[row.id,Number(row.total)]));
  return NextResponse.json({
    artists:Number(artists[0]?.total??0),
    publications:Number(posts[0]?.total??0),
    pending:Number(pending[0]?.total??0),
    likes:Number(likes[0]?.total??0),
    comments:Number(comments[0]?.total??0),
    views:Number(views[0]?.total??0),
    follows:Number(follows[0]?.total??0),
    topPosts:latestPosts.map(post=>({
      ...post,
      likes:likesMap.get(post.id)??0,
      comments:commentsMap.get(post.id)??0,
      views:viewsMap.get(post.id)??0,
    })),
  });
}
