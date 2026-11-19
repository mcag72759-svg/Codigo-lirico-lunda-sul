import { desc,eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artistApplications,communityConversationMembers,communityConversations,communityMessages } from "@/lib/db/schema";
import { getArtistSession } from "@/lib/security/artist-session";
export const runtime="nodejs";
export async function GET(){
 const artist=await getArtistSession();if(!artist)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const rows=await db.select({id:communityConversations.id,lastMessageAt:communityConversations.lastMessageAt,otherId:artistApplications.id,otherName:artistApplications.stageName})
 .from(communityConversationMembers).innerJoin(communityConversations,eq(communityConversationMembers.conversationId,communityConversations.id))
 .innerJoin(communityConversationMembers.as("other_member"),eq(communityConversationMembers.conversationId,communityConversationMembers.as("other_member").conversationId))
 .innerJoin(artistApplications,eq(communityConversationMembers.as("other_member").memberId,artistApplications.id))
 .where(eq(communityConversationMembers.memberId,artist.applicationId)).orderBy(desc(communityConversations.lastMessageAt)).limit(50);
 return NextResponse.json({conversations:rows});
}
export async function POST(request:Request){
 const artist=await getArtistSession();if(!artist)return NextResponse.json({error:"Inicia sessão para enviar mensagens."},{status:401});
 let body:Record<string,unknown>;try{body=await request.json()}catch{return NextResponse.json({error:"Pedido inválido."},{status:400})}
 const targetId=typeof body.targetId==="string"?body.targetId:"",message=typeof body.body==="string"?body.body.trim():"";
 if(!targetId||targetId===artist.applicationId||message.length<1||message.length>4000)return NextResponse.json({error:"Destinatário ou mensagem inválidos."},{status:400});
 const [target]=await db.select({id:artistApplications.id}).from(artistApplications).where(eq(artistApplications.id,targetId)).limit(1);
 if(!target)return NextResponse.json({error:"Artista não encontrado."},{status:404});
 const id=randomUUID(),now=new Date();
 await db.transaction(async tx=>{
  await tx.insert(communityConversations).values({id,createdBy:artist.applicationId,createdAt:now,lastMessageAt:now});
  await tx.insert(communityConversationMembers).values([{conversationId:id,memberId:artist.applicationId,joinedAt:now},{conversationId:id,memberId:targetId,joinedAt:now}]);
  await tx.insert(communityMessages).values({conversationId:id,senderId:artist.applicationId,body:message,createdAt:now,readAt:null});
 });
 return NextResponse.json({ok:true,id},{status:201});
}
