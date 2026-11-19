import "server-only";
import { createHash } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { artistAccounts, artistApplications, artistSessions } from "@/lib/db/schema";

export const ARTIST_SESSION_COOKIE = "cl_artist_session";
export async function getArtistSession() {
  const token = (await cookies()).get(ARTIST_SESSION_COOKIE)?.value;
  if (!token || token.length !== 64) return null;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const [row] = await db.select({
    accountId: artistAccounts.id,
    applicationId: artistApplications.id,
    code: artistApplications.code,
    stageName: artistApplications.stageName,
    fullName: artistApplications.fullName,
    email: artistApplications.email,
    municipality: artistApplications.municipality,
    genre: artistApplications.genre,
    bio: artistApplications.bio,
  }).from(artistSessions)
    .innerJoin(artistAccounts, eq(artistSessions.accountId, artistAccounts.id))
    .innerJoin(artistApplications, eq(artistAccounts.applicationId, artistApplications.id))
    .where(and(eq(artistSessions.tokenHash, tokenHash), gt(artistSessions.expiresAt, new Date()), eq(artistApplications.status, "approved")))
    .limit(1);
  return row ?? null;
}
