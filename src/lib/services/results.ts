import { prisma } from "@/lib/prisma";
import type { ParsedResult } from "@/lib/csv";
import { parseFlexibleDate } from "@/lib/timezone";
import { scorePrediction, type SetGames } from "@/lib/scoring";
import { recomputeLeaderboard } from "./leaderboard";

export interface ResultsImportSummary {
  matchesUpdated: number;
  matchesUnmatched: number;
  predictionsScored: number;
  notificationsCreated: number;
  unmatched: { tournament: string; player1: string; player2: string; reason: string }[];
}

function nameEq(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Find the scheduled match a result row refers to. Matches on tournament-ish +
 * the two players (order-insensitive), optionally constrained by date. The
 * tournament comparison is loose because results CSVs sometimes prefix the tour
 * (e.g. "ATP Wimbledon" vs scheduled "Wimbledon").
 */
async function findMatch(row: ParsedResult) {
  const date = row.date ? parseFlexibleDate(row.date) : null;
  const candidates = await prisma.match.findMany({
    where: date ? { matchDate: date } : {},
  });

  const tourNorm = row.tournament.toLowerCase().replace(/\b(atp|wta)\b/g, "").trim();

  return candidates.find((m) => {
    const mt = m.tournament.toLowerCase().replace(/\b(atp|wta)\b/g, "").trim();
    const tournamentOk = mt === tourNorm || mt.includes(tourNorm) || tourNorm.includes(mt);
    if (!tournamentOk) return false;
    const direct = nameEq(m.player1, row.player1) && nameEq(m.player2, row.player2);
    const swapped = nameEq(m.player1, row.player2) && nameEq(m.player2, row.player1);
    return direct || swapped;
  });
}

/**
 * Apply a batch of parsed results:
 *  1. match each to a scheduled match
 *  2. update winner / score / sets / status=FINISHED
 *  3. score every prediction for those matches
 *  4. recompute leaderboard
 *  5. generate per-user notifications
 *  6. write audit log + import batch
 */
export async function applyResults(
  rows: ParsedResult[],
  opts: { fileName?: string; adminId: string },
): Promise<ResultsImportSummary> {
  const summary: ResultsImportSummary = {
    matchesUpdated: 0,
    matchesUnmatched: 0,
    predictionsScored: 0,
    notificationsCreated: 0,
    unmatched: [],
  };

  // Track per-user points earned in this batch (for notifications).
  const userBatchPoints = new Map<string, number>();
  const scoredMatchIds: string[] = [];

  for (const row of rows) {
    const match = await findMatch(row);
    if (!match) {
      summary.matchesUnmatched++;
      summary.unmatched.push({
        tournament: row.tournament,
        player1: row.player1,
        player2: row.player2,
        reason: "No matching scheduled match found.",
      });
      continue;
    }

    // Canonicalise winner to the scheduled player's exact spelling.
    const winner = nameEq(match.player1, row.winner) ? match.player1 : match.player2;
    const sets: SetGames[] = row.sets;

    await prisma.$transaction(async (tx) => {
      await tx.match.update({
        where: { id: match.id },
        data: { winner, finalScore: row.finalScore, status: "FINISHED", round: row.round ?? match.round },
      });
      await tx.matchSet.deleteMany({ where: { matchId: match.id } });
      if (sets.length) {
        await tx.matchSet.createMany({
          data: sets.map((s, i) => ({
            matchId: match.id,
            setNumber: i + 1,
            player1Games: s.p1,
            player2Games: s.p2,
          })),
        });
      }

      const predictions = await tx.prediction.findMany({ where: { matchId: match.id } });
      for (const p of predictions) {
        const predictedSets = (p.predictedSets as unknown as SetGames[]) ?? [];
        const breakdown = scorePrediction(
          {
            predictedWinner: p.predictedWinner,
            predictedScore: p.predictedScore,
            predictedSets,
          },
          { winner, finalScore: row.finalScore, sets },
        );
        await tx.prediction.update({
          where: { id: p.id },
          data: {
            pointsAwarded: breakdown.total,
            winnerCorrect: breakdown.winnerCorrect,
            scoreCorrect: breakdown.scoreCorrect,
            setsCorrect: breakdown.setsCorrect,
            scoredAt: new Date(),
          },
        });
        summary.predictionsScored++;
        userBatchPoints.set(p.userId, (userBatchPoints.get(p.userId) ?? 0) + breakdown.total);
      }
    });

    summary.matchesUpdated++;
    scoredMatchIds.push(match.id);
  }

  // Recompute leaderboard / ranks from scratch (authoritative).
  await recomputeLeaderboard();

  // Notifications with points + new rank.
  for (const [userId, points] of userBatchPoints.entries()) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) continue;
    await prisma.notification.create({
      data: {
        userId,
        title: `You earned ${points} point${points === 1 ? "" : "s"}!`,
        body: `Results are in. You scored ${points} points. You're now ranked #${user.rank ?? "-"} with ${user.totalPoints} total points.`,
        meta: { points, rank: user.rank, totalPoints: user.totalPoints },
      },
    });
    summary.notificationsCreated++;
  }

  await prisma.importBatch.create({
    data: {
      type: "RESULTS",
      fileName: opts.fileName,
      uploadedById: opts.adminId,
      rowsTotal: rows.length,
      rowsValid: summary.matchesUpdated,
      rowsInvalid: summary.matchesUnmatched,
      summary: summary as unknown as object,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: opts.adminId,
      action: "IMPORT_RESULTS",
      detail: {
        fileName: opts.fileName,
        matchesUpdated: summary.matchesUpdated,
        predictionsScored: summary.predictionsScored,
      },
    },
  });

  return summary;
}
