import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getAdminSession, requestOriginIsSame } from "@/lib/security/admin-session";
import { hasAnyPermission } from "@/lib/security/permissions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!requestOriginIsSame(request)) {
    return NextResponse.json({ error: "Pedido de origem não permitida." }, { status: 403 });
  }
  const admin = await getAdminSession();
  if (!admin || !hasAnyPermission(admin, ["content.publish", "content.manage"])) {
    return NextResponse.json({ error: "Apenas administradores autorizados podem enviar ficheiros." }, { status: 403 });
  }
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
        allowedContentTypes: [
          "image/jpeg", "image/png", "image/webp",
          "audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav",
          "video/mp4", "video/webm", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
        maximumSizeInBytes: 200 * 1024 * 1024,
        addRandomSuffix: true,
        tokenPayload: JSON.stringify({ adminId: admin.id }),
      }),
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(jsonResponse);
  } catch {
    return NextResponse.json({ error: "Não foi possível concluir o envio do ficheiro." }, { status: 400 });
  }
}
