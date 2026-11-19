import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getArtistSession } from "@/lib/security/artist-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const artist = await getArtistSession();
  if (!artist) return NextResponse.json({ error: "Inicia sessão como artista para enviar ficheiros." }, { status: 401 });

  let body: HandleUploadBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido de upload inválido." }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav", "video/mp4", "video/webm"],
        maximumSizeInBytes: 200 * 1024 * 1024,
        addRandomSuffix: true,
        tokenPayload: JSON.stringify({ applicationId: artist.applicationId }),
      }),
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(jsonResponse);
  } catch {
    return NextResponse.json({ error: "Não foi possível concluir o envio do ficheiro." }, { status: 400 });
  }
}
