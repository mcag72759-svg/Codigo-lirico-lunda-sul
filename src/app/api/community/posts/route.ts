import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communityPosts } from "@/lib/db/schema";
import { getArtistSession } from "@/lib/security/artist-session";
import { requestOriginIsSame } from "@/lib/security/admin-session";

export const runtime = "nodejs";

const MAX_BODY = 3000;
const MAX_BYTES = 200 * 1024 * 1024;
const MEDIA_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp",
  "audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav",
  "video/mp4", "video/webm",
]);

function validBlobUrl(raw: string) {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" &&
      (url.hostname === "blob.vercel-storage.com" || url.hostname.endsWith(".blob.vercel-storage.com"));
  } catch { return false; }
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
  const text = typeof body.body === "string" ? body.body.trim().slice(0, MAX_BODY) : "";
  const mediaUrl = typeof body.mediaUrl === "string" ? body.mediaUrl.trim() : "";
  const mediaType = typeof body.mediaType === "string" ? body.mediaType : "none";
  const visibility = body.visibility === "followers" ? "followers" : "public";
  const sizeBytes = typeof body.sizeBytes === "number" ? body.sizeBytes : 0;

  if (!text && !mediaUrl) return NextResponse.json({ error: "Escreve uma mensagem ou anexa um ficheiro." }, { status: 400 });
  if (text.length > MAX_BODY || (mediaUrl && (!MEDIA_TYPES.has(mediaType) || !validBlobUrl(mediaUrl) || sizeBytes < 1 || sizeBytes > MAX_BYTES))) {
    return NextResponse.json({ error: "O conteúdo ou ficheiro não é válido. O limite é 200 MB." }, { status: 400 });
  }

  const now = new Date();
  const [post] = await db.insert(communityPosts).values({
    id: randomUUID(),
    authorId: artist.applicationId,
    body: text,
    mediaUrl,
    mediaType,
    visibility,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  }).returning({ id: communityPosts.id });

  return NextResponse.json({ ok: true, id: post.id, status: "pending" }, { status: 201 });
}
