import { createHash, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artistApplications, platformAuditLog } from "@/lib/db/schema";
import { getAdminSession, requestOriginIsSame } from "@/lib/security/admin-session";
import { hasAnyPermission } from "@/lib/security/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!requestOriginIsSame(request)) {
    return NextResponse.json({ error: "Origem do pedido não permitida." }, { status: 403 });
  }

  const admin = await getAdminSession();
  if (!admin || !hasAnyPermission(admin, ["artists.review", "artists.manage", "content.manage"])) {
    return NextResponse.json({ error: "Não tens permissão para emitir códigos de acesso." }, { status: 403 });
  }

  let input: unknown;
  try { input = await request.json(); }
  catch { return NextResponse.json({ error: "Pedido inválido." }, { status: 400 }); }

  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const id = typeof body.id === "string" ? body.id.trim().slice(0, 80) : "";
  if (!id) return NextResponse.json({ error: "Selecciona uma conta de artista." }, { status: 400 });

  const activationCode = randomBytes(24).toString("hex");
  const codeHash = createHash("sha256").update(activationCode).digest("hex");
  const now = new Date();

  const application = await db.transaction(async (tx) => {
    const [current] = await tx.select({
      id: artistApplications.id,
      stageName: artistApplications.stageName,
      phone: artistApplications.phone,
    }).from(artistApplications)
      .where(and(
        eq(artistApplications.id, id),
        eq(artistApplications.status, "approved"),
      ))
      .limit(1);

    if (!current) return null;

    await tx.update(artistApplications).set({
      code: codeHash,
      updatedAt: now,
    }).where(eq(artistApplications.id, id));

    await tx.insert(platformAuditLog).values({
      actorAdminId: admin.id,
      action: "artist_activation_code.issue",
      entityType: "artist_application",
      entityId: id,
      details: { stageName: current.stageName },
      createdAt: now,
    });

    return current;
  });

  if (!application) {
    return NextResponse.json({ error: "Só é possível emitir um código para uma candidatura aprovada." }, { status: 409 });
  }

  return NextResponse.json({
    ok: true,
    phone: application.phone,
    stageName: application.stageName,
    activationCode,
  });
}
