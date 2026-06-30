import { prisma } from "@/lib/prisma";

/**
 * Auto-lock predictions: any PUBLISHED match whose start instant has passed
 * moves to LOCKED so users can no longer submit/edit predictions.
 * Idempotent — safe to call on every request that lists matches.
 */
export async function lockDueMatches(now = new Date()): Promise<number> {
  const res = await prisma.match.updateMany({
    where: { status: "PUBLISHED", startsAt: { lte: now } },
    data: { status: "LOCKED" },
  });
  return res.count;
}

/** Whether a match accepts predictions right now. */
export function canPredict(status: string, startsAt: Date, now = new Date()): boolean {
  return status === "PUBLISHED" && startsAt.getTime() > now.getTime();
}
