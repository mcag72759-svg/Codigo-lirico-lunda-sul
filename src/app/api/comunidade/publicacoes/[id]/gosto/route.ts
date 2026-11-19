import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communityPosts, communityReactions } from "@/lib/db/schema";
import { getArtistSession } from "@/lib/security/artist-session";
export const runtime="nodejs";
export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}) {
 const artist=await getArtistSession(); if(!artist)return NextResponse.json({error:"Inicia sessão para gostar."},{status:401});
 const {id}=await params;
 const [post]=await db.select({id:communityPosts.id}).from(communityPosts).where(eq(communityPosts.id,id)).limit(1);
 if(!post)return NextResponse.json({error:"Publicação não encontrada."},{status:404});
 const [existing]=await db.select({id:communityReactions.id}).from(communityReactions).where(and(eq(communityReactions.actorId,artist.applicationId),eq(communityReactions.contentId,id))).limit(1);
 if(existing){await db.delete(communityReactions).where(eq(communityReactions.id,existing.id));return NextResponse.json({liked:false});}
 await db.insert(communityReactions).values({actorId:artist.applicationId,contentId:id,reaction:"like",createdAt:new Date()});
 return NextResponse.json({liked:true});
}
