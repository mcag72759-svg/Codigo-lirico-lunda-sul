import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artistMedia } from "@/lib/db/schema";
import { getArtistSession } from "@/lib/security/artist-session";
import { requestOriginIsSame } from "@/lib/security/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BYTES = 200 * 1024 * 1024;
const AUDIO_TYPES = new Set(["audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm"]);

export async function GET() {
  const artist = await getArtistSession();
  if (!artist) return NextResponse.json({ error: "Inicia sessão para ver os teus ficheiros." }, { status: 401 });
  const items = await db.select().from(artistMedia)
    .where(eq(artistMedia.applicationId, artist.applicationId))
    .orderBy(desc(artistMedia.createdAt)).limit(100);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  if (!requestOriginIsSame(request)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  const artist = await getArtistSession();
  if (!artist) return NextResponse.json({ error: "Inicia sessão como artista." }, { status: 401 });

  let input: unknown;
  try { input = await request.json(); } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 160) : "";
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 4000) : "";
  const genre = typeof body.genre === "string" ? body.genre.trim().slice(0, 80) : "";
  const mediaUrl = typeof body.mediaUrl === "string" ? body.mediaUrl.trim() : "";
  const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
  const sizeBytes = typeof body.sizeBytes === "number" ? body.sizeBytes : Number.NaN;
  const kind = AUDIO_TYPES.has(mimeType) ? "audio" : VIDEO_TYPES.has(mimeType) ? "video" : "";
  let validStorageUrl = false;
  try {
    const url = new URL(mediaUrl);
    validStorageUrl = url.protocol === "https:" &&
      (url.hostname === "blob.vercel-storage.com" || url.hostname.endsWith(".blob.vercel-storage.com"));
  } catch { validStorageUrl = false; }

  if (!title || !kind || !validStorageUrl || !Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_BYTES) {
    return NextResponse.json({ error: "Confirma o título e envia um áudio ou vídeo válido até 200 MB." }, { status: 400 });
  }

  const now = new Date();
  const [item] = await db.insert(artistMedia).values({
    id: randomUUID(),
    applicationId: artist.applicationId,
    title,
    description,
    kind,
    genre: genre || "Geral",
    mediaUrl,
    mimeType,
    sizeBytes,
    downloadAllowed: true,
    status: "pending",
    createdAt: now,
    reviewedAt: null,
  }).returning();

  return NextResponse.json({ ok: true, item }, { status: 201 });
}

export async function DELETE(request: Request) {
  if (!requestOriginIsSame(request)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  const artist = await getArtistSession();
  if (!artist) return NextResponse.json({ error: "Inicia sessão como artista." }, { status: 401 });
  let input: unknown;
  try { input = await request.json(); } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const id = input && typeof input === "object" && typeof (input as Record<string, unknown>).id === "string"
    ? ((input as Record<string, unknown>).id as string).slice(0, 80) : "";
  if (!id) return NextResponse.json({ error: "Ficheiro inválido." }, { status: 400 });
  const [removed] = await db.delete(artistMedia)
    .where(and(eq(artistMedia.id, id), eq(artistMedia.applicationId, artist.applicationId), eq(artistMedia.status, "pending")))
    .returning({ id: artistMedia.id });
  if (!removed) return NextResponse.json({ error: "Só podes cancelar ficheiros teus que ainda aguardam revisão." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
