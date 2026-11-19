import "server-only";

import { createHash } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { artistAccounts, artistApplications, artistSessions } from "@/lib/db/schema";

export const ARTIST_SESSION_COOKIE = "cl_artist_session";

export async function getArtistSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ARTIST_SESSION_COOKIE)?.value;
  if (!token || token.length !== 64) return null;

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const [artist] = await db
    .select({
      accountId: artistAccounts.id,
      applicationId: artistApplications.id,
      stageName: artistApplications.stageName,
      email: artistApplications.email,
      municipality: artistApplications.municipality,
      genre: artistApplications.genre,
      bio: artistApplications.bio,
      photoUrl: artistApplications.photoUrl,
    })
    .from(artistSessions)
    .innerJoin(artistAccounts, eq(artistSessions.accountId, artistAccounts.id))
    .innerJoin(artistApplications, eq(artistAccounts.applicationId, artistApplications.id))
    .where(
      and(
        eq(artistSessions.tokenHash, tokenHash),
        gt(artistSessions.expiresAt, new Date()),
        eq(artistApplications.status, "approved"),
      ),
    )
    .limit(1);

  return artist ?? null;
}
