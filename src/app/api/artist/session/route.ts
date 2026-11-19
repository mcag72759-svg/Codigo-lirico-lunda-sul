import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { artistSessions } from "@/lib/db/schema";
import { ARTIST_SESSION_COOKIE, getArtistSession } from "@/lib/security/artist-session";

export const runtime = "nodejs";

export async function GET() {
  const artist = await getArtistSession();
  if (!artist) return NextResponse.json({ authenticated: false });
  return NextResponse.json({ authenticated: true, artist: {
    stageName: artist.stageName,
    email: artist.email,
    municipality: artist.municipality,
    genre: artist.genre,
    bio: artist.bio,
    photoUrl: artist.photoUrl,
  }});
}

export async function DELETE() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ARTIST_SESSION_COOKIE)?.value;
  if (token && token.length === 64) {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await db.delete(artistSessions).where(eq(artistSessions.tokenHash, tokenHash));
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ARTIST_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
