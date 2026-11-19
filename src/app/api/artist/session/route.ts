import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artistSessions } from "@/lib/db/schema";
import { ARTIST_SESSION_COOKIE, getArtistSession } from "@/lib/security/artist-session";
export const runtime = "nodejs";
export async function GET() {
  const artist = await getArtistSession();
  return NextResponse.json({ authenticated: !!artist, artist: artist ? { stageName: artist.stageName, fullName: artist.fullName, email: artist.email, municipality: artist.municipality, genre: artist.genre, bio: artist.bio, code: artist.code } : null });
}
export async function DELETE() {
  const token = (await cookies()).get(ARTIST_SESSION_COOKIE)?.value;
  if (token?.length === 64) await db.delete(artistSessions).where(eq(artistSessions.tokenHash, createHash("sha256").update(token).digest("hex")));
  const response = NextResponse.json({ ok: true });
  response.cookies.set({ name: ARTIST_SESSION_COOKIE, value: "", httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
