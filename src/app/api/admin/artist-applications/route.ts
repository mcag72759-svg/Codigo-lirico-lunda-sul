import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artistApplications, platformAuditLog } from "@/lib/db/schema";
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
    id: artistApplications.id,
    stageName: artistApplications.stageName,
    fullName: artistApplications.fullName,
    municipality: artistApplications.municipality,
    genre: artistApplications.genre,
    email: artistApplications.email,
    phone: artistApplications.phone,
    bio: artistApplications.bio,
    link: artistApplications.link,
    status: artistApplications.status,
    createdAt: artistApplications.createdAt,
  }).from(artistApplications)
    .orderBy(desc(artistApplications.createdAt))
    .limit(100);

  return NextResponse.json({ items });
}

export async function PATCH(request: Request) {
  if (!requestOriginIsSame(request)) return NextResponse.json({ error: "Origem do pedido não permitida." }, { status: 403 });
  const admin = await getAdminSession();
  if (!admin || !hasPermission(admin, "content.manage")) {
    return NextResponse.json({ error: "Não tens permissão para rever candidaturas." }, { status: 403 });
  }

  let input: unknown;
  try { input = await request.json(); }
  catch { return NextResponse.json({ error: "Pedido inválido." }, { status: 400 }); }
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const id = typeof body.id === "string" ? body.id.trim().slice(0, 80) : "";
  const status = body.status === "approved" || body.status === "rejected" ? body.status : "";
  if (!id || !status) return NextResponse.json({ error: "Selecciona uma candidatura e uma decisão válida." }, { status: 400 });

  const now = new Date();
  const [updated] = await db.update(artistApplications)
    .set({
      status,
      reviewedAt: now,
      reviewedBy: admin.id,
      decisionNote: status === "approved" ? "Candidatura aprovada pela equipa." : "Candidatura não aprovada pela equipa.",
      updatedAt: now,
    })
    .where(and(eq(artistApplications.id, id), eq(artistApplications.status, "pending")))
    .returning({
      id: artistApplications.id,
      stageName: artistApplications.stageName,
      status: artistApplications.status,
    });

  if (!updated) return NextResponse.json({ error: "Candidatura não encontrada ou já revista." }, { status: 409 });

  await db.insert(platformAuditLog).values({
    actorAdminId: admin.id,
    action: status === "approved" ? "artist_application.approve" : "artist_application.reject",
    entityType: "artist_application",
    entityId: updated.id,
    details: { stageName: updated.stageName },
    createdAt: now,
  });

  return NextResponse.json({ ok: true, status: updated.status });
}
