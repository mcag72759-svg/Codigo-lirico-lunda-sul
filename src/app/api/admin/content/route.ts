import { createHash, randomUUID } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  platformAdmins,
  platformAdminSessions,
  platformAuditLog,
  publishedContent,
} from "@/lib/db/schema";
import { hasPermission } from "@/lib/security/permissions";

export const runtime = "nodejs";

const SESSION_COOKIE = "cl_admin_session";
const CONTENT_TYPES = new Set([
  "article",
  "music",
  "video",
  "announcement",
  "poetry",
  "event",
  "opportunity",
  "gallery",
]);

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned.length > 0 && cleaned.length <= maxLength ? cleaned : null;
}

function safeUrl(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  const requestOrigin = request.headers.get("origin");
  if (requestOrigin && requestOrigin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Pedido de origem não permitida." }, { status: 403 });
  }
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionToken || sessionToken.length < 32 || sessionToken.length > 512) {
    return NextResponse.json({ error: "Sessão administrativa necessária." }, { status: 401 });
  }

  const tokenHash = createHash("sha256").update(sessionToken).digest("hex");
  const [session] = await db
    .select({
      adminId: platformAdmins.id,
      displayName: platformAdmins.displayName,
      active: platformAdmins.active,
      permissions: platformAdmins.permissions,
    })
    .from(platformAdminSessions)
    .innerJoin(platformAdmins, eq(platformAdminSessions.adminId, platformAdmins.id))
    .where(
      and(
        eq(platformAdminSessions.tokenHash, tokenHash),
        gt(platformAdminSessions.expiresAt, new Date()),
        eq(platformAdmins.active, true),
      ),
    )
    .limit(1);

  if (!session || !hasPermission(session, "content.publish")) {
    return NextResponse.json({ error: "Não tens permissão para publicar conteúdo." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "O conteúdo enviado não é válido." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Preenche os dados da publicação." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const type = cleanText(input.type, 32);
  const title = cleanText(input.title, 160);
  const genre = cleanText(input.genre, 80) ?? "Geral";
  const description = cleanText(input.description, 12000);

  if (!type || !CONTENT_TYPES.has(type) || !title || !description) {
    return NextResponse.json(
      { error: "Tipo, título e descrição são obrigatórios. Confirma também o limite dos campos." },
      { status: 400 },
    );
  }

  const link = safeUrl(input.link);
  const audioUrl = safeUrl(input.audioUrl);
  const imageUrl = safeUrl(input.imageUrl);
  const id = randomUUID();
  const featured = input.featured === true;

  await db.insert(publishedContent).values({
    id,
    type,
    title,
    artist: cleanText(input.artist, 120) ?? session.displayName,
    genre,
    description,
    link,
    audioUrl,
    imageUrl,
    featured,
    createdAt: new Date(),
  });

  await db.insert(platformAuditLog).values({
    actorAdminId: session.adminId,
    action: "content.publish",
    entityType: "published_content",
    entityId: id,
    details: { type, title, featured },
    createdAt: new Date(),
  });

  revalidatePath("/");
  return NextResponse.json({ ok: true, id }, { status: 201 });
}
