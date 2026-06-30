import { prisma } from "@/lib/prisma";
import { lockDueMatches } from "@/lib/services/matches";

/** UTC-midnight Date for "today" (matches are stored on @db.Date). */
export function todayDate(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Today's predictable matches for a user, with their existing prediction (if any).
 * Auto-locks any matches whose start time has passed before returning.
 */
export async function getTodaysMatches(userId: string) {
  await lockDueMatches();
  const today = todayDate();
  const matches = await prisma.match.findMany({
    where: {
      matchDate: today,
      status: { in: ["PUBLISHED", "LOCKED"] },
    },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    include: {
      predictions: { where: { userId }, take: 1 },
    },
  });
  return matches.map((m) => ({
    ...m,
    myPrediction: m.predictions[0] ?? null,
  }));
}

export async function getDashboardData(userId: string) {
  const today = todayDate();
  await lockDueMatches();

  const [user, todaysMatches, predictionsToday, leaderboardTop, recentNotifications] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.match.findMany({
        where: { matchDate: today, status: { in: ["PUBLISHED", "LOCKED", "FINISHED"] } },
        orderBy: { startsAt: "asc" },
        include: { predictions: { where: { userId }, take: 1 } },
      }),
      prisma.prediction.count({
        where: { userId, match: { matchDate: today } },
      }),
      prisma.user.findMany({
        where: { role: "USER" },
        orderBy: [{ totalPoints: "desc" }],
        take: 5,
        select: { id: true, username: true, firstName: true, lastName: true, totalPoints: true, rank: true },
      }),
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  const openMatches = todaysMatches.filter((m) => m.status === "PUBLISHED");
  const predictedMatchIds = new Set(
    todaysMatches.filter((m) => m.predictions.length > 0).map((m) => m.id),
  );
  const remainingToPredict = openMatches.filter((m) => !predictedMatchIds.has(m.id)).length;

  const nextMatch = todaysMatches.find((m) => m.status === "PUBLISHED") ?? null;

  return {
    user,
    matchesToday: todaysMatches.length,
    predictionsToday,
    remainingToPredict,
    nextMatch,
    leaderboardTop,
    recentNotifications,
  };
}
