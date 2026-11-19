import { count, eq } from "drizzle-orm";
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
  const [artists,posts,pending,likes,comments,views,follows] = await Promise.all([
    db.select({total:count()}).from(artistApplications),
    db.select({total:count()}).from(communityPosts),
    db.select({total:count()}).from(communityPosts).where(eq(communityPosts.status,"pending")),
    db.select({total:count()}).from(communityReactions),
    db.select({total:count()}).from(communityComments),
    db.select({total:count()}).from(communityPostViews),
    db.select({total:count()}).from(communityFollows),
  ]);
  return NextResponse.json({
    artists:Number(artists[0]?.total??0),
    publications:Number(posts[0]?.total??0),
    pending:Number(pending[0]?.total??0),
    likes:Number(likes[0]?.total??0),
    comments:Number(comments[0]?.total??0),
    views:Number(views[0]?.total??0),
    follows:Number(follows[0]?.total??0),
  });
}
