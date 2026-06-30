import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Recompute every user's total points (from scored predictions) and dense rank.
 * Returns the ordered leaderboard rows.
 */
export async function recomputeLeaderboard() {
  const users = await prisma.user.findMany({
    where: { role: "USER" },
    select: {
      id: true,
      predictions: {
        where: { pointsAwarded: { not: null } },
        select: { pointsAwarded: true },
      },
    },
  });

  const totals = users.map((u) => ({
    id: u.id,
    total: u.predictions.reduce((s, p) => s + (p.pointsAwarded ?? 0), 0),
  }));

  totals.sort((a, b) => b.total - a.total);

  let rank = 0;
  let prevTotal: number | null = null;
  let index = 0;
  const updates = totals.map((t) => {
    index++;
    if (prevTotal === null || t.total !== prevTotal) {
      rank = index;
      prevTotal = t.total;
    }
    return prisma.user.update({
      where: { id: t.id },
      data: { totalPoints: t.total, rank },
    });
  });

  await prisma.$transaction(updates);
  return totals;
}

export interface LeaderboardRow {
  rank: number | null;
  userId: string;
  username: string;
  name: string;
  totalPoints: number;
  winnersCorrect: number;
  scoresCorrect: number;
  setsCorrect: number;
  matchesPredicted: number; // scored (finished) predictions — used for accuracy
  predictedCount: number; // predictions submitted for ANY match in scope, finished or not
  accuracy: number; // % of predicted matches where winner was correct
}

export interface LeaderboardResult {
  rows: LeaderboardRow[];
  totalMatches: number; // matches available to predict in this scope (published/locked/finished)
}

/** Build the full leaderboard with aggregate stats, optionally filtered. */
export async function getLeaderboard(filter?: {
  tournament?: string;
  dateKey?: string; // YYYY-MM-DD (today filter)
}): Promise<LeaderboardResult> {
  const baseWhere: Prisma.MatchWhereInput = {};
  if (filter?.tournament) baseWhere.tournament = filter.tournament;
  if (filter?.dateKey) {
    baseWhere.matchDate = new Date(filter.dateKey + "T00:00:00.000Z");
  }

  // Matches that were ever predictable in this scope (excludes still-pending/unpublished).
  const visibleMatchWhere: Prisma.MatchWhereInput = {
    ...baseWhere,
    status: { in: ["PUBLISHED", "LOCKED", "FINISHED"] },
  };
  // Matches that have actually been scored — used for points & accuracy.
  const finishedMatchWhere: Prisma.MatchWhereInput = { ...baseWhere, status: "FINISHED" };

  const [totalMatches, users] = await Promise.all([
    prisma.match.count({ where: visibleMatchWhere }),
    prisma.user.findMany({
      where: { role: "USER" },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        predictions: {
          where: { match: finishedMatchWhere },
          select: {
            pointsAwarded: true,
            winnerCorrect: true,
            scoreCorrect: true,
            setsCorrect: true,
          },
        },
        _count: {
          select: { predictions: { where: { match: visibleMatchWhere } } },
        },
      },
    }),
  ]);

  const rows: LeaderboardRow[] = users.map((u) => {
    const scored = u.predictions.filter((p) => p.pointsAwarded !== null);
    const total = scored.reduce((s, p) => s + (p.pointsAwarded ?? 0), 0);
    const winners = scored.filter((p) => p.winnerCorrect).length;
    const scores = scored.filter((p) => p.scoreCorrect).length;
    const sets = scored.reduce((s, p) => s + p.setsCorrect, 0);
    const predicted = scored.length;
    return {
      rank: null,
      userId: u.id,
      username: u.username,
      name: `${u.firstName} ${u.lastName}`,
      totalPoints: total,
      winnersCorrect: winners,
      scoresCorrect: scores,
      setsCorrect: sets,
      matchesPredicted: predicted,
      predictedCount: u._count.predictions,
      accuracy: predicted ? Math.round((winners / predicted) * 100) : 0,
    };
  });

  rows.sort((a, b) => b.totalPoints - a.totalPoints || b.winnersCorrect - a.winnersCorrect);

  let rank = 0;
  let prev: number | null = null;
  rows.forEach((r, i) => {
    if (prev === null || r.totalPoints !== prev) {
      rank = i + 1;
      prev = r.totalPoints;
    }
    r.rank = rank;
  });

  return { rows, totalMatches };
}
