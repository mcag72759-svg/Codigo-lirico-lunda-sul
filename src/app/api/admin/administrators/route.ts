import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { platformAdmins, platformAuditLog } from "@/lib/db/schema";
import { getAdminSession, requestOriginIsSame } from "@/lib/security/admin-session";
import { ADMIN_PERMISSIONS, hasPermission } from "@/lib/security/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_ROLES = new Set(["publisher","editor","artist_moderator","community_moderator","analyst","platform_manager"]);

function clean(value: unknown, limit: number) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}
function validPermissions(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > ADMIN_PERMISSIONS.length) return null;
  const values = [...new Set(value.filter((item): item is string => typeof item === "string"))];
  if (values.some(item => !(ADMIN_PERMISSIONS as readonly string[]).includes(item))) return null;
  return values;
}

export async function GET() {
  const admin = await getAdminSession();
  if (!admin || !hasPermission(admin, "administrators.manage")) {
    return NextResponse.json({ error: "Não tens permissão para gerir administradores." }, { status: 403 });
  }
  const items = await db.select({
    id: platformAdmins.id,
    displayName: platformAdmins.displayName,
    email: platformAdmins.email,
    role: platformAdmins.role,
    permissions: platformAdmins.permissions,
    active: platformAdmins.active,
    createdAt: platformAdmins.createdAt,
  }).from(platformAdmins).orderBy(desc(platformAdmins.createdAt)).limit(100);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  if (!requestOriginIsSame(request)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  const admin = await getAdminSession();
  if (!admin || !hasPermission(admin, "administrators.manage")) {
    return NextResponse.json({ error: "Não tens permissão para criar administradores." }, { status: 403 });
  }
  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Pedido inválido." }, { status: 400 }); }
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const displayName = clean(body.displayName, 100);
  const email = clean(body.email, 254).toLowerCase();
  const role = clean(body.role, 40);
  const permissions = validPermissions(body.permissions);
  if (!displayName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !ADMIN_ROLES.has(role) || !permissions) {
    return NextResponse.json({ error: "Confirma o nome, e-mail, função e permissões." }, { status: 400 });
  }
  if (permissions.includes("*") || (!admin.permissions.includes("*") && permissions.some(permission => !admin.permissions.includes(permission)))) {
    return NextResponse.json({ error: "Não podes conceder permissões que não possuis." }, { status: 403 });
  }
  const temporaryPassword = randomBytes(18).toString("base64url");
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(temporaryPassword, salt, 64).toString("hex");
  const id = randomUUID();
  const now = new Date();
  try {
    await db.insert(platformAdmins).values({
      id, displayName, email, role, permissions,
      passwordSalt: salt, passwordHash: hash, active: true,
      createdAt: now, updatedAt: now, createdBy: admin.id,
    });
  } catch {
    return NextResponse.json({ error: "Já existe uma conta administrativa com esse e-mail." }, { status: 409 });
  }
  await db.insert(platformAuditLog).values({
    actorAdminId: admin.id, action: "administrator.create", entityType: "platform_admins",
    entityId: id, details: { email, role, permissions }, createdAt: now,
  });
  return NextResponse.json({
    ok: true,
    administrator: { id, displayName, email, role, permissions, active: true },
    temporaryPassword,
  }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!requestOriginIsSame(request)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  const admin = await getAdminSession();
  if (!admin || !hasPermission(admin, "administrators.manage")) {
    return NextResponse.json({ error: "Não tens permissão para alterar administradores." }, { status: 403 });
  }
  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Pedido inválido." }, { status: 400 }); }
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const id = clean(body.id, 80);
  const permissions = body.permissions === undefined ? undefined : validPermissions(body.permissions);
  const active = typeof body.active === "boolean" ? body.active : undefined;
  const role = body.role === undefined ? undefined : clean(body.role, 40);
  if (!id || (body.permissions !== undefined && !permissions) || (role !== undefined && !ADMIN_ROLES.has(role)) || (body.active === undefined && body.permissions === undefined && body.role === undefined)) {
    return NextResponse.json({ error: "Dados de administração inválidos." }, { status: 400 });
  }
  if (id === admin.id) return NextResponse.json({ error: "Não podes alterar a tua própria conta através deste painel." }, { status: 409 });
  const [targetAdmin] = await db.select({permissions:platformAdmins.permissions}).from(platformAdmins).where(eq(platformAdmins.id,id)).limit(1);
  if (!targetAdmin) return NextResponse.json({ error: "Administrador não encontrado." }, { status: 404 });
  if (targetAdmin.permissions.includes("*")) return NextResponse.json({ error: "A conta principal não pode ser alterada por este painel." }, { status: 403 });
  if (permissions?.includes("*")) return NextResponse.json({ error: "A permissão total fica reservada ao superadministrador principal." }, { status: 403 });
  if (!admin.permissions.includes("*") && permissions?.some(permission => !admin.permissions.includes(permission))) {
    return NextResponse.json({ error: "Não podes conceder permissões que não possuis." }, { status: 403 });
  }
  const [updated] = await db.update(platformAdmins).set({
    ...(permissions ? { permissions } : {}),
    ...(role ? { role } : {}),
    ...(active !== undefined ? { active } : {}),
    updatedAt: new Date(),
  }).where(eq(platformAdmins.id, id)).returning({
    id: platformAdmins.id, displayName: platformAdmins.displayName, email: platformAdmins.email,
    role: platformAdmins.role, permissions: platformAdmins.permissions, active: platformAdmins.active,
  });
  if (!updated) return NextResponse.json({ error: "Administrador não encontrado." }, { status: 404 });
  await db.insert(platformAuditLog).values({
    actorAdminId: admin.id, action: "administrator.update", entityType: "platform_admins",
    entityId: id, details: { active: updated.active, role: updated.role, permissions: updated.permissions }, createdAt: new Date(),
  });
  return NextResponse.json({ ok: true, administrator: updated });
}
