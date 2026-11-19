import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artistMedia } from "@/lib/db/schema";
import { getArtistSession } from "@/lib/security/artist-session";
export const runtime = "nodejs";
const allowed = ["audio/mpeg","audio/mp4","audio/wav","audio/x-wav","audio/ogg","audio/aac","video/mp4","video/webm","image/jpeg","image/png","image/webp","application/pdf"];
export async function POST(request: Request) {
  let body: HandleUploadBody;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Pedido de envio inválido." }, { status: 400 }); }
  try {
    const result = await handleUpload({
      body, request,
      onBeforeGenerateToken: async (pathname) => {
        const artist = await getArtistSession();
        if (!artist) throw new Error("Inicia sessão para enviar ficheiros.");
        return { allowedContentTypes: allowed, maximumSizeInBytes: 100 * 1024 * 1024, addRandomSuffix: true, tokenPayload: JSON.stringify({ applicationId: artist.applicationId, artistName: artist.stageName, pathname }) };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const data = JSON.parse(tokenPayload ?? "{}") as { applicationId?: string; artistName?: string };
        if (!data.applicationId) throw new Error("Artista inválido no envio.");
        const mime = blob.contentType || "application/octet-stream";
        const kind = mime.startsWith("audio/") ? "audio" : mime.startsWith("video/") ? "video" : mime.startsWith("image/") ? "image" : "document";
        await db.insert(artistMedia).values({ id: randomUUID(), applicationId: data.applicationId, title: blob.pathname.split("/").pop() || "Ficheiro", description: "", kind, genre: "", mediaUrl: blob.url, mimeType: mime, sizeBytes: blob.size, downloadAllowed: true, status: "pending", createdAt: new Date() });
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha no envio." }, { status: 400 });
  }
}
