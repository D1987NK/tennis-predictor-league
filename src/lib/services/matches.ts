import { prisma } from "@/lib/prisma";
import { getCutoff, type CutoffConfig } from "./settings";

// The daily prediction cut-off is admin-configurable (see AppSetting / settings.ts)
// and expressed in Australian Eastern time (AEST, UTC+10, no DST in winter).
const AEST_OFFSET_HOURS = 10;

/** UTC instant of the daily cut-off for a match date, given minutes-from-midnight AEST. */
export function predictionDeadline(matchDate: Date, cutoffMinutesAest: number): Date {
  const utcMinutes = cutoffMinutesAest - AEST_OFFSET_HOURS * 60;
  const d = new Date(
    Date.UTC(matchDate.getUTCFullYear(), matchDate.getUTCMonth(), matchDate.getUTCDate(), 0, 0, 0, 0),
  );
  d.setUTCMinutes(d.getUTCMinutes() + utcMinutes);
  return d;
}

/**
 * A prediction can be added/updated only while open: the match is published,
 * hasn't started, AND (when the cut-off is enabled) it's before the daily cut-off.
 */
export function canPredict(
  status: string,
  startsAt: Date,
  matchDate: Date,
  cutoff: CutoffConfig | null,
  now: Date = new Date(),
): boolean {
  if (status !== "PUBLISHED") return false;
  if (startsAt.getTime() <= now.getTime()) return false;
  if (cutoff?.enabled && now.getTime() >= predictionDeadline(matchDate, cutoff.minutes).getTime()) {
    return false;
  }
  return true;
}

/**
 * Auto-lock predictions: any PUBLISHED match whose start time OR (if enabled)
 * daily cut-off has passed moves to LOCKED. Idempotent — safe to call on every
 * request that lists matches.
 */
export async function lockDueMatches(now: Date = new Date()): Promise<number> {
  const cutoff = await getCutoff();
  const published = await prisma.match.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, startsAt: true, matchDate: true },
  });
  const toLock = published
    .filter(
      (m) =>
        m.startsAt <= now ||
        (cutoff.enabled && now >= predictionDeadline(m.matchDate, cutoff.minutes)),
    )
    .map((m) => m.id);
  if (toLock.length === 0) return 0;
  const res = await prisma.match.updateMany({
    where: { id: { in: toLock } },
    data: { status: "LOCKED" },
  });
  return res.count;
}
