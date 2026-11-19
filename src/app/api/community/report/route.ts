import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artistApplications, communityPosts, communityReports } from "@/lib/db/schema";
import { getArtistSession } from "@/lib/security/artist-session";
import { requestOriginIsSame } from "@/lib/security/admin-session";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!requestOriginIsSame(request)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  const artist = await getArtistSession();
  if (!artist) return NextResponse.json({ error: "Inicia sessão para enviar uma denúncia." }, { status: 401 });
  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Pedido inválido." }, { status: 400 }); }
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const type = body.targetType === "artist" ? "artist" : "post";
  const id = typeof body.targetId === "string" ? body.targetId.trim().slice(0, 80) : "";
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
  if (!id || reason.length < 5) return NextResponse.json({ error: "Indica o conteúdo e o motivo da denúncia." }, { status: 400 });
  const target = type === "artist"
    ? await db.select({ id: artistApplications.id }).from(artistApplications).where(eq(artistApplications.id, id)).limit(1)
    : await db.select({ id: communityPosts.id }).from(communityPosts).where(eq(communityPosts.id, id)).limit(1);
  if (!target.length || id === artist.applicationId) return NextResponse.json({ error: "O alvo da denúncia não é válido." }, { status: 404 });
  await db.insert(communityReports).values({
    reporterId: artist.applicationId, targetType: type, targetId: id,
    reason, status: "pending", createdAt: new Date(),
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
