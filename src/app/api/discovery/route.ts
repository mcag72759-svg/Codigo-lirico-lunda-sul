import { and, asc, desc, eq, gt, isNull, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artistApplications, communityEvents, culturalOpportunities } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const [artists, events, opportunities] = await Promise.all([
    db.select({
      id: artistApplications.id,
      stageName: artistApplications.stageName,
      municipality: artistApplications.municipality,
      genre: artistApplications.genre,
      bio: artistApplications.bio,
      link: artistApplications.link,
      photoUrl: artistApplications.photoUrl,
    }).from(artistApplications)
      .where(eq(artistApplications.status, "approved"))
      .orderBy(asc(artistApplications.stageName)).limit(50),
    db.select({
      id: communityEvents.id,
      title: communityEvents.title,
      category: communityEvents.category,
      municipality: communityEvents.municipality,
      venue: communityEvents.venue,
      startsAt: communityEvents.startsAt,
      endsAt: communityEvents.endsAt,
      organizer: communityEvents.organizer,
      description: communityEvents.description,
      registrationUrl: communityEvents.registrationUrl,
      sourceUrl: communityEvents.sourceUrl,
    }).from(communityEvents)
      .where(and(
        eq(communityEvents.status, "published"),
        or(isNull(communityEvents.endsAt), gt(communityEvents.endsAt, now)),
      ))
      .orderBy(asc(communityEvents.startsAt)).limit(12),
    db.select({
      id: culturalOpportunities.id,
      title: culturalOpportunities.title,
      category: culturalOpportunities.category,
      location: culturalOpportunities.location,
      deadline: culturalOpportunities.deadline,
      eligibility: culturalOpportunities.eligibility,
      description: culturalOpportunities.description,
      applicationUrl: culturalOpportunities.applicationUrl,
      sourceUrl: culturalOpportunities.sourceUrl,
    }).from(culturalOpportunities)
      .where(and(
        eq(culturalOpportunities.status, "published"),
        or(isNull(culturalOpportunities.deadline), gt(culturalOpportunities.deadline, now)),
      ))
      .orderBy(desc(culturalOpportunities.createdAt)).limit(12),
  ]);

  return NextResponse.json({ artists, events, opportunities }, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
