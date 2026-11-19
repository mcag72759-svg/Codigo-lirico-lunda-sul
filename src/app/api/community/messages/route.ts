import { createHash, randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artistApplications, communityConversations, communityMessages } from "@/lib/db/schema";
import { hasCommunityBlock } from "@/lib/community/access";
import { getArtistSession } from "@/lib/security/artist-session";
import { requestOriginIsSame } from "@/lib/security/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function conversationKey(first: string, second: string) {
  const [a,b] = [first,second].sort();
  return { id: createHash("sha256").update(a + ":" + b).digest("hex"), participantA: a, participantB: b };
}

async function ensureConversation(first: string, second: string) {
  const key = conversationKey(first, second);
  const now = new Date();
  await db.insert(communityConversations).values({
    ...key,
    createdAt: now,
    updatedAt: now,
  }).onConflictDoNothing();
  const [conversation] = await db.select().from(communityConversations)
    .where(eq(communityConversations.id, key.id)).limit(1);
  return conversation;
}

async function getThread(conversationId: string, currentArtistId: string, otherArtistId: string) {
  const messages = await db.select({
    id: communityMessages.id,
    body: communityMessages.body,
    createdAt: communityMessages.createdAt,
    senderId: communityMessages.senderId,
    readAt: communityMessages.readAt,
    sender: artistApplications.stageName,
  }).from(communityMessages)
    .innerJoin(artistApplications, eq(communityMessages.senderId, artistApplications.id))
    .where(eq(communityMessages.conversationId, conversationId))
    .orderBy(asc(communityMessages.createdAt)).limit(200);

  await db.update(communityMessages).set({ readAt: new Date() })
    .where(and(
      eq(communityMessages.conversationId, conversationId),
      eq(communityMessages.senderId, otherArtistId),
      isNull(communityMessages.readAt),
    ));

  return messages.map(message => ({
    ...message,
    isMine: message.senderId === currentArtistId,
  }));
}

export async function GET(request: Request) {
  const artist = await getArtistSession();
  if (!artist) return NextResponse.json({ error: "Entra como artista aprovado para consultar mensagens." }, { status: 401 });

  const url = new URL(request.url);
  const otherId = url.searchParams.get("artistId")?.trim().slice(0, 80) ?? "";

  if (otherId) {
    if (otherId === artist.applicationId || await hasCommunityBlock(artist.applicationId, otherId)) {
      return NextResponse.json({ error: "Esta conversa não está disponível." }, { status: 403 });
    }
    const [other] = await db.select({
      id: artistApplications.id,
      stageName: artistApplications.stageName,
      municipality: artistApplications.municipality,
      photoUrl: artistApplications.photoUrl,
    }).from(artistApplications)
      .where(and(eq(artistApplications.id, otherId), eq(artistApplications.status, "approved"))).limit(1);
    if (!other) return NextResponse.json({ error: "Artista não encontrado." }, { status: 404 });

    const conversation = await ensureConversation(artist.applicationId, otherId);
    const messages = await getThread(conversation.id, artist.applicationId, otherId);
    return NextResponse.json({ conversation: { id: conversation.id, artist: other }, messages });
  }

  const conversations = await db.select().from(communityConversations)
    .where(or(
      eq(communityConversations.participantA, artist.applicationId),
      eq(communityConversations.participantB, artist.applicationId),
    ))
    .orderBy(desc(communityConversations.updatedAt)).limit(60);

  if (!conversations.length) return NextResponse.json({ conversations: [] });

  const ids = conversations.map(conversation => conversation.id);
  const otherIds = conversations.map(conversation =>
    conversation.participantA === artist.applicationId ? conversation.participantB : conversation.participantA
  );
  const [otherArtists, messages] = await Promise.all([
    db.select({
      id: artistApplications.id,
      stageName: artistApplications.stageName,
      municipality: artistApplications.municipality,
      photoUrl: artistApplications.photoUrl,
    }).from(artistApplications).where(inArray(artistApplications.id, otherIds)),
    db.select({
      id: communityMessages.id,
      conversationId: communityMessages.conversationId,
      body: communityMessages.body,
      createdAt: communityMessages.createdAt,
      senderId: communityMessages.senderId,
      readAt: communityMessages.readAt,
    }).from(communityMessages)
      .where(inArray(communityMessages.conversationId, ids))
      .orderBy(desc(communityMessages.createdAt)).limit(1000),
  ]);
  const artistMap = new Map(otherArtists.map(person => [person.id,person]));
  const latestMap = new Map<string,typeof messages[number]>();
  const unreadMap = new Map<string,number>();
  for (const message of messages) {
    if (!latestMap.has(message.conversationId)) latestMap.set(message.conversationId,message);
    if (message.senderId !== artist.applicationId && !message.readAt) {
      unreadMap.set(message.conversationId,(unreadMap.get(message.conversationId)??0)+1);
    }
  }

  return NextResponse.json({
    conversations: conversations.map(conversation => {
      const otherId = conversation.participantA === artist.applicationId ? conversation.participantB : conversation.participantA;
      const latest = latestMap.get(conversation.id);
      return {
        id: conversation.id,
        artist: artistMap.get(otherId) ?? { id: otherId, stageName: "Artista" },
        updatedAt: conversation.updatedAt,
        latestMessage: latest ? {
          body: latest.body,
          createdAt: latest.createdAt,
          senderId: latest.senderId,
          isMine: latest.senderId === artist.applicationId,
        } : null,
        unreadCount: unreadMap.get(conversation.id)??0,
      };
    }),
  });
}

export async function POST(request: Request) {
  if (!requestOriginIsSame(request)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  const artist = await getArtistSession();
  if (!artist) return NextResponse.json({ error: "Entra como artista aprovado para enviar mensagens." }, { status: 401 });

  let input: unknown;
  try { input = await request.json(); }
  catch { return NextResponse.json({ error: "Pedido inválido." }, { status: 400 }); }
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const otherId = typeof body.artistId === "string" ? body.artistId.trim().slice(0, 80) : "";
  const text = typeof body.body === "string" ? body.body.trim().slice(0, 2000) : "";
  if (!otherId || otherId === artist.applicationId || !text) {
    return NextResponse.json({ error: "Selecciona um artista e escreve uma mensagem." }, { status: 400 });
  }
  if (await hasCommunityBlock(artist.applicationId, otherId)) {
    return NextResponse.json({ error: "A conversa não está disponível." }, { status: 403 });
  }
  const [other] = await db.select({ id: artistApplications.id }).from(artistApplications)
    .where(and(eq(artistApplications.id, otherId), eq(artistApplications.status, "approved"))).limit(1);
  if (!other) return NextResponse.json({ error: "Artista não encontrado." }, { status: 404 });

  const conversation = await ensureConversation(artist.applicationId, otherId);
  const now = new Date();
  const [message] = await db.insert(communityMessages).values({
    id: 0,
    conversationId: conversation.id,
    senderId: artist.applicationId,
    body: text,
    createdAt: now,
    readAt: null,
  }).returning({ id: communityMessages.id });
  await db.update(communityConversations).set({ updatedAt: now })
    .where(eq(communityConversations.id, conversation.id));

  return NextResponse.json({ ok: true, conversationId: conversation.id, messageId: message.id }, { status: 201 });
}
