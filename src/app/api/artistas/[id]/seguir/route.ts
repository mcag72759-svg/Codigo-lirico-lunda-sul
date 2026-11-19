import { and,eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communityFollows } from "@/lib/db/schema";
import { getArtistSession } from "@/lib/security/artist-session";
export const runtime="nodejs";
export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}){
 const artist=await getArtistSession();if(!artist)return NextResponse.json({error:"Inicia sessão para seguir artistas."},{status:401});
 const {id}=await params;if(id===artist.applicationId)return NextResponse.json({error:"Não podes seguir a tua própria conta."},{status:400});
 const where=and(eq(communityFollows.followerId,artist.applicationId),eq(communityFollows.followedId,id));
 const [existing]=await db.select({id:communityFollows.id}).from(communityFollows).where(where).limit(1);
 if(existing){await db.delete(communityFollows).where(where);return NextResponse.json({following:false})}
 await db.insert(communityFollows).values({followerId:artist.applicationId,followedId:id,createdAt:new Date()});
 return NextResponse.json({following:true});
}
