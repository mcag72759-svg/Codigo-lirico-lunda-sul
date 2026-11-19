import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communityPosts } from "@/lib/db/schema";
import { getArtistSession } from "@/lib/security/artist-session";
import { requestOriginIsSame } from "@/lib/security/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 5000;
const MAX_BYTES = 200 * 1024 * 1024;
const CONTENT_TYPES = new Set([
  "general", "music", "video", "poetry", "event",
  "organization", "partnership", "announcement", "article", "gallery",
]);
const MEDIA_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp",
  "audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav", "audio/ogg",
  "video/mp4", "video/webm",
]);

function validBlobUrl(raw: string) {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" &&
      (url.hostname === "blob.vercel-storage.com" || url.hostname.endsWith(".blob.vercel-storage.com"));
  } catch { return false; }
}
function safeHttpsUrl(raw: string) {
  if (!raw) return "";
  try { const url = new URL(raw); return url.protocol === "https:" ? url.toString() : ""; }
  catch { return ""; }
}
function parseDate(value: unknown): Date | null | false {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : false;
}

export async function POST(request: Request) {
  if (!requestOriginIsSame(request)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  const artist = await getArtistSession();
  if (!artist) return NextResponse.json({ error: "Entra como artista aprovado para publicar." }, { status: 401 });

  let input: unknown;
  try { input = await request.json(); } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 160) : "";
  const text = typeof body.body === "string" ? body.body.trim().slice(0, MAX_BODY) : "";
  const contentType = typeof body.contentType === "string" && CONTENT_TYPES.has(body.contentType) ? body.contentType : "general";
  const mediaUrl = typeof body.mediaUrl === "string" ? body.mediaUrl.trim() : "";
  const mediaType = typeof body.mediaType === "string" ? body.mediaType : "none";
  const visibility = body.visibility === "followers" ? "followers" : "public";
  const sizeBytes = typeof body.sizeBytes === "number" ? body.sizeBytes : 0;
  const location = typeof body.location === "string" ? body.location.trim().slice(0, 180) : "";
  const organizer = typeof body.organizer === "string" ? body.organizer.trim().slice(0, 160) : "";
  const ticketPrice = typeof body.ticketPrice === "string" ? body.ticketPrice.trim().slice(0, 60) : "";
  const rawTicketUrl = typeof body.ticketUrl === "string" ? body.ticketUrl.trim().slice(0, 2048) : "";
  const ticketUrl = safeHttpsUrl(rawTicketUrl);
  const eventStartsAt = parseDate(body.eventStartsAt);
  const scheduledAt = parseDate(body.scheduledAt);

  if (!title) return NextResponse.json({ error: "Indica um título para a publicação." }, { status: 400 });
  if (!text && !mediaUrl) return NextResponse.json({ error: "Escreve uma descrição ou anexa um ficheiro." }, { status: 400 });
  if (text.length > MAX_BODY) return NextResponse.json({ error: "A descrição ultrapassa o limite permitido." }, { status: 400 });
  if (mediaUrl && (!MEDIA_TYPES.has(mediaType) || !validBlobUrl(mediaUrl) || !Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_BYTES)) {
    return NextResponse.json({ error: "O ficheiro não é válido. Usa imagem, áudio ou vídeo até 200 MB." }, { status: 400 });
  }
  if (contentType === "music" && (!mediaUrl || !mediaType.startsWith("audio/"))) {
    return NextResponse.json({ error: "Para publicar música, selecciona um ficheiro de áudio." }, { status: 400 });
  }
  if (contentType === "video" && (!mediaUrl || !mediaType.startsWith("video/"))) {
    return NextResponse.json({ error: "Para publicar um vídeo, selecciona um ficheiro de vídeo." }, { status: 400 });
  }
  if (rawTicketUrl && !ticketUrl) return NextResponse.json({ error: "A ligação de bilhetes deve começar por HTTPS." }, { status: 400 });
  if (eventStartsAt === false || scheduledAt === false) return NextResponse.json({ error: "Confirma a data do evento e a data de agendamento." }, { status: 400 });
  if (contentType === "event" && (!eventStartsAt || !location || !organizer)) {
    return NextResponse.json({ error: "Para anunciar um evento, indica data, local e organização responsável." }, { status: 400 });
  }
  if (scheduledAt && scheduledAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "A data de agendamento tem de estar no futuro." }, { status: 400 });
  }

  const now = new Date();
  const [post] = await db.insert(communityPosts).values({
    id: randomUUID(),
    authorId: artist.applicationId,
    title,
    contentType,
    body: text,
    mediaUrl,
    mediaType,
    visibility,
    location,
    organizer,
    eventStartsAt,
    ticketPrice,
    ticketUrl,
    scheduledAt,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  }).returning({ id: communityPosts.id });

  return NextResponse.json({
    ok: true,
    id: post.id,
    status: "pending",
    scheduledAt,
    message: "Conteúdo enviado para revisão. Se tiver uma data de agendamento, só será publicado depois da aprovação e quando chegar essa hora.",
  }, { status: 201 });
}
