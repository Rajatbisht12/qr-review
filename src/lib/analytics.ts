import "server-only";
import { prisma } from "./db";

export type FunnelType = "scan" | "rating" | "google_cta_click" | "private_submit";

/** Record a funnel event. `rating` is logged on rating/CTA events to prove the
 *  Google path is rating-agnostic (PRD §9 auditability). */
export async function trackEvent(tenantId: string, type: FunnelType, rating?: number) {
  await prisma.event.create({ data: { tenantId, type, rating: rating ?? null } });
}

function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Increment usage counters for the current billing period (PRD 6.7). */
export async function incrementUsage(tenantId: string, field: "scans" | "alerts", by = 1) {
  const period = currentPeriod();
  await prisma.usageMeter.upsert({
    where: { tenantId_period: { tenantId, period } },
    create: { tenantId, period, [field]: by },
    update: { [field]: { increment: by } },
  });
}

/** Compute the review funnel + rating distribution for a tenant. */
export async function getTenantAnalytics(tenantId: string) {
  const [events, feedback, byRating] = await Promise.all([
    prisma.event.groupBy({
      by: ["type"],
      where: { tenantId },
      _count: { _all: true },
    }),
    prisma.feedback.aggregate({
      where: { tenantId },
      _count: { _all: true },
      _avg: { rating: true },
    }),
    prisma.feedback.groupBy({
      by: ["rating"],
      where: { tenantId },
      _count: { _all: true },
    }),
  ]);

  const counts: Record<string, number> = {};
  for (const e of events) counts[e.type] = e._count._all;

  // Split Google CTA clicks by rating band to surface (or rule out) gating.
  const ctaByRating = await prisma.event.groupBy({
    by: ["rating"],
    where: { tenantId, type: "google_cta_click" },
    _count: { _all: true },
  });

  const ratingDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of byRating) ratingDist[r.rating] = r._count._all;

  return {
    scans: counts["scan"] ?? 0,
    ratings: counts["rating"] ?? 0,
    googleCtaClicks: counts["google_cta_click"] ?? 0,
    privateSubmits: counts["private_submit"] ?? 0,
    totalFeedback: feedback._count._all,
    avgRating: feedback._avg.rating ?? 0,
    ratingDist,
    ctaByRating: ctaByRating.map((c) => ({ rating: c.rating ?? 0, count: c._count._all })),
  };
}
