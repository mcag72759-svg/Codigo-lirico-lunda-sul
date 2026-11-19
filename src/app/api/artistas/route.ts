import { desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artistApplications, communityFollows } from "@/lib/db/schema";
export const runtime="nodejs";
export async function GET(){
 const rows=await db.select({id:artistApplications.id,stageName:artistApplications.stageName,municipality:artistApplications.municipality,genre:artistApplications.genre,bio:artistApplications.bio,photoUrl:artistApplications.photoUrl,followers:sql<number>`(select count(*)::int from community_follows where followed_id = ${artistApplications.id})`})
 .from(artistApplications).where(eq(artistApplications.status,"approved")).orderBy(desc(artistApplications.createdAt)).limit(100);
 return NextResponse.json({artists:rows});
}
