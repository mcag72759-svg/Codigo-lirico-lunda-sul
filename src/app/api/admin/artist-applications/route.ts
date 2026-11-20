import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { artistAccounts, artistApplications, platformAuditLog } from "@/lib/db/schema";
import { getAdminSession, requestOriginIsSame } from "@/lib/security/admin-session";
import { hasAnyPermission } from "@/lib/security/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ARTIST_REVIEW_PERMISSIONS = ["artists.view", "artists.review", "artists.manage", "content.manage"] as const;

export async function GET() {
  const admin = await getAdminSession();
  if (!admin || !hasAnyPermission(admin, ARTIST_REVIEW_PERMISSIONS)) {
    return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  }

  const rows = await db.select({
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
    accountId: artistAccounts.id,
  }).from(artistApplications)
    .leftJoin(artistAccounts, eq(artistApplications.id, artistAccounts.applicationId))
    .orderBy(desc(artistApplications.createdAt))
    .limit(100);

  const items = rows.map(({ accountId, ...item }) => ({
    ...item,
    hasAccount: Boolean(accountId),
  }));

  return NextResponse.json({ items });
}

export async function PATCH(request: Request) {
  if (!requestOriginIsSame(request)) {
    return NextResponse.json({ error: "Origem do pedido não permitida." }, { status: 403 });
  }
  const admin = await getAdminSession();
  if (!admin || !hasAnyPermission(admin, ["artists.review", "artists.manage", "content.manage"])) {
    return NextResponse.json({ error: "Não tens permissão para aprovar candidaturas." }, { status: 403 });
  }

  let input: unknown;
  try { input = await request.json(); }
  catch { return NextResponse.json({ error: "Pedido inválido." }, { status: 400 }); }

  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const id = typeof body.id === "string" ? body.id.trim().slice(0, 80) : "";
  if (!id || body.status !== "approved") {
    return NextResponse.json({ error: "Esta área permite apenas aprovar candidaturas." }, { status: 400 });
  }

  const now = new Date();
  const updated = await db.transaction(async (tx) => {
    const [application] = await tx.update(artistApplications).set({
      status: "approved",
      reviewedAt: now,
      reviewedBy: admin.id,
      decisionNote: "Candidatura aprovada pela administração.",
      updatedAt: now,
    }).where(and(
      eq(artistApplications.id, id),
      eq(artistApplications.status, "pending"),
    )).returning({
      id: artistApplications.id,
      stageName: artistApplications.stageName,
      status: artistApplications.status,
    });

    if (!application) return null;

    await tx.insert(platformAuditLog).values({
      actorAdminId: admin.id,
      action: "artist_application.approve",
      entityType: "artist_application",
      entityId: application.id,
      details: { stageName: application.stageName },
      createdAt: now,
    });

    return application;
  });

  if (!updated) {
    return NextResponse.json({ error: "Candidatura não encontrada ou já aprovada." }, { status: 409 });
  }

  revalidatePath("/");
  revalidatePath("/comunidade");
  return NextResponse.json({ ok: true, status: updated.status });
}
