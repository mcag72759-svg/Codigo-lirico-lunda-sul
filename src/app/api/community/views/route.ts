import { createHash, randomBytes } from "node:crypto";
import { count, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communityPostViews } from "@/lib/db/schema";
import { canReadCommunityPost } from "@/lib/community/access";
import { getArtistSession } from "@/lib/security/artist-session";
import { requestOriginIsSame } from "@/lib/security/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const VISITOR_COOKIE = "cl_public_visitor";

export async function POST(request: Request) {
  if (!requestOriginIsSame(request)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  let input: unknown;
  try { input = await request.json(); }
  catch { return NextResponse.json({ error: "Pedido inválido." }, { status: 400 }); }
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const postId = typeof body.postId === "string" ? body.postId.trim().slice(0, 80) : "";
  if (!postId) return NextResponse.json({ error: "Publicação inválida." }, { status: 400 });

  const artist = await getArtistSession();
  const post = await canReadCommunityPost(postId, artist?.applicationId);
  if (!post) return NextResponse.json({ error: "Esta publicação não está disponível." }, { status: 404 });

  const cookieStore = await cookies();
  const existing = cookieStore.get(VISITOR_COOKIE)?.value;
  const visitorToken = existing && /^[a-f0-9]{64}$/.test(existing) ? existing : randomBytes(32).toString("hex");
  const visitorHash = createHash("sha256").update(visitorToken).digest("hex");

  if (artist?.applicationId !== post.authorId) {
    await db.insert(communityPostViews).values({
      postId,
      visitorHash,
      createdAt: new Date(),
    }).onConflictDoNothing();
  }

  const [total] = await db.select({ total: count() }).from(communityPostViews)
    .where(eq(communityPostViews.postId, postId));
  const response = NextResponse.json({ ok: true, viewCount: Number(total?.total ?? 0) });
  if (!existing || !/^[a-f0-9]{64}$/.test(existing)) {
    response.cookies.set({
      name: VISITOR_COOKIE,
      value: visitorToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}
