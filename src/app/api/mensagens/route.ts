import { desc,eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artistApplications,communityConversationMembers,communityConversations,communityMessages } from "@/lib/db/schema";
import { getArtistSession } from "@/lib/security/artist-session";
export const runtime="nodejs";
export async function GET(){
 const artist=await getArtistSession();if(!artist)return NextResponse.json({error:"Inicia sessão."},{status:401});
 const memberships=await db.select({conversationId:communityConversationMembers.conversationId})
 .from(communityConversationMembers).where(eq(communityConversationMembers.memberId,artist.applicationId));
 const conversations=await Promise.all(memberships.map(async m=>{
  const [conversation]=await db.select({id:communityConversations.id,lastMessageAt:communityConversations.lastMessageAt})
   .from(communityConversations).where(eq(communityConversations.id,m.conversationId)).limit(1);
  const [other]=await db.select({id:artistApplications.id,stageName:artistApplications.stageName})
   .from(communityConversationMembers).innerJoin(artistApplications,eq(communityConversationMembers.memberId,artistApplications.id))
   .where(eq(communityConversationMembers.conversationId,m.conversationId))
   .then(rows=>rows.filter(row=>row.id!==artist.applicationId).slice(0,1));
  return conversation&&other?{...conversation,otherId:other.id,otherName:other.stageName}:null;
 }));
 return NextResponse.json({conversations:conversations.filter(Boolean).sort((a,b)=>b!.lastMessageAt.getTime()-a!.lastMessageAt.getTime()).slice(0,50)});
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
