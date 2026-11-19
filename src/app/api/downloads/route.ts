import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artistApplications, artistMedia } from "@/lib/db/schema";
export const runtime="nodejs";
export async function GET(){
 const items=await db.select({id:artistMedia.id,title:artistMedia.title,kind:artistMedia.kind,mimeType:artistMedia.mimeType,createdAt:artistMedia.createdAt,artist:artistApplications.stageName,genre:artistApplications.genre,municipality:artistApplications.municipality})
 .from(artistMedia).innerJoin(artistApplications,eq(artistMedia.applicationId,artistApplications.id))
 .where(eq(artistMedia.status,"approved")).orderBy(desc(artistMedia.createdAt)).limit(100);
 return NextResponse.json({items});
}
