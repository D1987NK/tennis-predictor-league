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
  matchesPredicted: number;
  accuracy: number; // % of predicted matches where winner was correct
}

/** Build the full leaderboard with aggregate stats, optionally filtered. */
export async function getLeaderboard(filter?: {
  tournament?: string;
  dateKey?: string; // YYYY-MM-DD (today filter)
}): Promise<LeaderboardRow[]> {
  const matchWhere: Record<string, unknown> = { status: "FINISHED" };
  if (filter?.tournament) matchWhere.tournament = filter.tournament;
  if (filter?.dateKey) {
    const start = new Date(filter.dateKey + "T00:00:00.000Z");
    matchWhere.matchDate = start;
  }

  const users = await prisma.user.findMany({
    where: { role: "USER" },
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      predictions: {
        where: { match: matchWhere },
        select: {
          pointsAwarded: true,
          winnerCorrect: true,
          scoreCorrect: true,
          setsCorrect: true,
        },
      },
    },
  });

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

  return rows;
}
