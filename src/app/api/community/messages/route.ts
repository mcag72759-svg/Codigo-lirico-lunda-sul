import { createHash } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  artistApplications, communityConversationMembers, communityConversations, communityMessages,
} from "@/lib/db/schema";
import { hasCommunityBlock } from "@/lib/community/access";
import { getArtistSession } from "@/lib/security/artist-session";
import { requestOriginIsSame } from "@/lib/security/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureConversation(first: string, second: string) {
  const [firstRows,secondRows] = await Promise.all([
    db.select({ conversationId: communityConversationMembers.conversationId })
      .from(communityConversationMembers).where(eq(communityConversationMembers.memberId,first)),
    db.select({ conversationId: communityConversationMembers.conversationId })
      .from(communityConversationMembers).where(eq(communityConversationMembers.memberId,second)),
  ]);
  const secondIds = new Set(secondRows.map(row=>row.conversationId));
  const existingId = firstRows.find(row=>secondIds.has(row.conversationId))?.conversationId;
  if(existingId){
    const [conversation]=await db.select().from(communityConversations)
      .where(eq(communityConversations.id,existingId)).limit(1);
    if(conversation)return conversation;
  }

  const [a,b]=[first,second].sort();
  const id=createHash("sha256").update(a+":"+b).digest("hex");
  const now=new Date();
  await db.insert(communityConversations).values({
    id,createdBy:first,createdAt:now,lastMessageAt:now,
  }).onConflictDoNothing();
  await db.insert(communityConversationMembers).values([
    {conversationId:id,memberId:first,joinedAt:now},
    {conversationId:id,memberId:second,joinedAt:now},
  ]).onConflictDoNothing();
  const [conversation]=await db.select().from(communityConversations)
    .where(eq(communityConversations.id,id)).limit(1);
  return conversation;
}

async function getThread(conversationId:string,currentArtistId:string,otherArtistId:string){
  const [membership]=await db.select({conversationId:communityConversationMembers.conversationId})
    .from(communityConversationMembers)
    .where(and(
      eq(communityConversationMembers.conversationId,conversationId),
      eq(communityConversationMembers.memberId,currentArtistId),
    )).limit(1);
  if(!membership)return null;

  const messages=await db.select({
    id:communityMessages.id,
    body:communityMessages.body,
    createdAt:communityMessages.createdAt,
    senderId:communityMessages.senderId,
    readAt:communityMessages.readAt,
    sender:artistApplications.stageName,
  }).from(communityMessages)
    .innerJoin(artistApplications,eq(communityMessages.senderId,artistApplications.id))
    .where(eq(communityMessages.conversationId,conversationId))
    .orderBy(asc(communityMessages.createdAt)).limit(200);

  await db.update(communityMessages).set({readAt:new Date()})
    .where(and(
      eq(communityMessages.conversationId,conversationId),
      eq(communityMessages.senderId,otherArtistId),
      isNull(communityMessages.readAt),
    ));

  return messages.map(item=>({...item,isMine:item.senderId===currentArtistId}));
}

export async function GET(request:Request){
  const artist=await getArtistSession();
  if(!artist)return NextResponse.json({error:"Entra como artista aprovado para consultar mensagens."},{status:401});

  const url=new URL(request.url);
  const otherId=url.searchParams.get("artistId")?.trim().slice(0,80)??"";

  if(otherId){
    if(otherId===artist.applicationId||await hasCommunityBlock(artist.applicationId,otherId)){
      return NextResponse.json({error:"Esta conversa não está disponível."},{status:403});
    }
    const [other]=await db.select({
      id:artistApplications.id,
      stageName:artistApplications.stageName,
      municipality:artistApplications.municipality,
      photoUrl:artistApplications.photoUrl,
    }).from(artistApplications)
      .where(and(eq(artistApplications.id,otherId),eq(artistApplications.status,"approved"))).limit(1);
    if(!other)return NextResponse.json({error:"Artista não encontrado."},{status:404});

    const conversation=await ensureConversation(artist.applicationId,otherId);
    if(!conversation)return NextResponse.json({error:"Não foi possível abrir a conversa."},{status:500});
    const messages=await getThread(conversation.id,artist.applicationId,otherId);
    if(!messages)return NextResponse.json({error:"Esta conversa não está disponível."},{status:403});
    return NextResponse.json({conversation:{id:conversation.id,artist:other},messages});
  }

  const memberships=await db.select({
    conversationId:communityConversationMembers.conversationId,
  }).from(communityConversationMembers)
    .where(eq(communityConversationMembers.memberId,artist.applicationId));
  const ids=[...new Set(memberships.map(row=>row.conversationId))];
  if(!ids.length)return NextResponse.json({conversations:[]});

  const [conversations,members,messages]=await Promise.all([
    db.select().from(communityConversations).where(inArray(communityConversations.id,ids))
      .orderBy(desc(communityConversations.lastMessageAt)),
    db.select({
      conversationId:communityConversationMembers.conversationId,
      memberId:communityConversationMembers.memberId,
    }).from(communityConversationMembers).where(inArray(communityConversationMembers.conversationId,ids)),
    db.select({
      id:communityMessages.id,
      conversationId:communityMessages.conversationId,
      body:communityMessages.body,
      createdAt:communityMessages.createdAt,
      senderId:communityMessages.senderId,
      readAt:communityMessages.readAt,
    }).from(communityMessages)
      .where(inArray(communityMessages.conversationId,ids))
      .orderBy(desc(communityMessages.createdAt)).limit(1000),
  ]);

  const otherIds=members.filter(row=>row.memberId!==artist.applicationId).map(row=>row.memberId);
  const otherArtists=otherIds.length?await db.select({
    id:artistApplications.id,
    stageName:artistApplications.stageName,
    municipality:artistApplications.municipality,
    photoUrl:artistApplications.photoUrl,
  }).from(artistApplications).where(inArray(artistApplications.id,otherIds)):[];
  const artistMap=new Map(otherArtists.map(person=>[person.id,person]));
  const latestMap=new Map<string,typeof messages[number]>();
  const unreadMap=new Map<string,number>();
  for(const message of messages){
    if(!latestMap.has(message.conversationId))latestMap.set(message.conversationId,message);
    if(message.senderId!==artist.applicationId&&!message.readAt){
      unreadMap.set(message.conversationId,(unreadMap.get(message.conversationId)??0)+1);
    }
  }
  const memberMap=new Map<string,string>();
  for(const member of members){if(member.memberId!==artist.applicationId)memberMap.set(member.conversationId,member.memberId);}

  return NextResponse.json({
    conversations:conversations.map(conversation=>{
      const otherId=memberMap.get(conversation.id)??"";
      const latest=latestMap.get(conversation.id);
      return {
        id:conversation.id,
        artist:artistMap.get(otherId)??{id:otherId,stageName:"Artista"},
        updatedAt:conversation.lastMessageAt,
        latestMessage:latest?{
          body:latest.body,createdAt:latest.createdAt,senderId:latest.senderId,
          isMine:latest.senderId===artist.applicationId,
        }:null,
        unreadCount:unreadMap.get(conversation.id)??0,
      };
    }),
  });
}

export async function POST(request:Request){
  if(!requestOriginIsSame(request))return NextResponse.json({error:"Origem não permitida."},{status:403});
  const artist=await getArtistSession();
  if(!artist)return NextResponse.json({error:"Entra como artista aprovado para enviar mensagens."},{status:401});

  let input:unknown;
  try{input=await request.json();}catch{return NextResponse.json({error:"Pedido inválido."},{status:400});}
  const body=input&&typeof input==="object"?input as Record<string,unknown>:{};
  const otherId=typeof body.artistId==="string"?body.artistId.trim().slice(0,80):"";
  const text=typeof body.body==="string"?body.body.trim().slice(0,2000):"";
  if(!otherId||otherId===artist.applicationId||!text){
    return NextResponse.json({error:"Selecciona um artista e escreve uma mensagem."},{status:400});
  }
  if(await hasCommunityBlock(artist.applicationId,otherId)){
    return NextResponse.json({error:"A conversa não está disponível."},{status:403});
  }
  const [other]=await db.select({id:artistApplications.id}).from(artistApplications)
    .where(and(eq(artistApplications.id,otherId),eq(artistApplications.status,"approved"))).limit(1);
  if(!other)return NextResponse.json({error:"Artista não encontrado."},{status:404});

  const conversation=await ensureConversation(artist.applicationId,otherId);
  if(!conversation)return NextResponse.json({error:"Não foi possível abrir a conversa."},{status:500});
  const now=new Date();
  const [created]=await db.insert(communityMessages).values({
    conversationId:conversation.id,senderId:artist.applicationId,body:text,createdAt:now,readAt:null,
  }).returning({id:communityMessages.id});
  await db.update(communityConversations).set({lastMessageAt:now})
    .where(eq(communityConversations.id,conversation.id));
  return NextResponse.json({ok:true,conversationId:conversation.id,messageId:created.id},{status:201});
}
