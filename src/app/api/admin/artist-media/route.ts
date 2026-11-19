import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artistApplications, artistMedia, platformAuditLog } from "@/lib/db/schema";
import { getAdminSession, requestOriginIsSame } from "@/lib/security/admin-session";
import { hasPermission } from "@/lib/security/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin || !hasPermission(admin, "content.manage")) {
    return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  }
  const items = await db.select({
    id: artistMedia.id,
    title: artistMedia.title,
    description: artistMedia.description,
    kind: artistMedia.kind,
    genre: artistMedia.genre,
    mediaUrl: artistMedia.mediaUrl,
    mimeType: artistMedia.mimeType,
    sizeBytes: artistMedia.sizeBytes,
    downloadAllowed: artistMedia.downloadAllowed,
    status: artistMedia.status,
    createdAt: artistMedia.createdAt,
    artist: artistApplications.stageName,
    applicationId: artistApplications.id,
  }).from(artistMedia)
    .innerJoin(artistApplications, eq(artistMedia.applicationId, artistApplications.id))
    .orderBy(desc(artistMedia.createdAt)).limit(100);
  return NextResponse.json({ items });
}

export async function PATCH(request: Request) {
  if (!requestOriginIsSame(request)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  const admin = await getAdminSession();
  if (!admin || !hasPermission(admin, "content.manage")) {
    return NextResponse.json({ error: "Não tens permissão para moderar ficheiros." }, { status: 403 });
  }

  let input: unknown;
  try { input = await request.json(); } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const id = typeof body.id === "string" ? body.id.trim().slice(0, 80) : "";
  const status = body.status === "approved" || body.status === "rejected" ? body.status : "";
  if (!id || !status) return NextResponse.json({ error: "Escolhe o ficheiro e uma decisão válida." }, { status: 400 });

  const now = new Date();
  const [updated] = await db.update(artistMedia)
    .set({ status, reviewedAt: now })
    .where(eq(artistMedia.id, id))
    .returning({ id: artistMedia.id, title: artistMedia.title, applicationId: artistMedia.applicationId });
  if (!updated) return NextResponse.json({ error: "Ficheiro não encontrado." }, { status: 404 });

  await db.insert(platformAuditLog).values({
    actorAdminId: admin.id,
    action: status === "approved" ? "artist_media.approve" : "artist_media.reject",
    entityType: "artist_media",
    entityId: updated.id,
    details: { title: updated.title, applicationId: updated.applicationId },
    createdAt: now,
  });
  return NextResponse.json({ ok: true });
}
