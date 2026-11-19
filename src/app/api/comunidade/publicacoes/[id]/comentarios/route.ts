import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artistApplications, communityComments, communityPosts } from "@/lib/db/schema";
import { getArtistSession } from "@/lib/security/artist-session";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{id:string}> }) {
 const {id}=await params;
 const rows=await db.select({id:communityComments.id,body:communityComments.body,createdAt:communityComments.createdAt,author:artistApplications.stageName})
 .from(communityComments).innerJoin(artistApplications,eq(communityComments.authorId,artistApplications.id))
 .innerJoin(communityPosts,eq(communityComments.postId,communityPosts.id))
 .where(eq(communityComments.postId,id)).orderBy(asc(communityComments.createdAt)).limit(100);
 return NextResponse.json({comments:rows});
}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
 const artist=await getArtistSession(); if(!artist)return NextResponse.json({error:"Inicia sessão para comentar."},{status:401});
 const {id}=await params; let body:Record<string,unknown>; try{body=await request.json()}catch{return NextResponse.json({error:"Pedido inválido."},{status:400})}
 const value=typeof body.body==="string"?body.body.trim():"";
 if(value.length<1||value.length>2000)return NextResponse.json({error:"O comentário deve ter entre 1 e 2000 caracteres."},{status:400});
 const [post]=await db.select({id:communityPosts.id}).from(communityPosts).where(eq(communityPosts.id,id)).limit(1);
 if(!post)return NextResponse.json({error:"Publicação não encontrada."},{status:404});
 await db.insert(communityComments).values({id:randomUUID(),postId:id,authorId:artist.applicationId,body:value,createdAt:new Date()});
 return NextResponse.json({ok:true},{status:201});
}
