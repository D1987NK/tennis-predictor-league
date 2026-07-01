import { prisma } from "@/lib/prisma";
import type { ParsedResult } from "@/lib/csv";
import { scorePrediction, type SetGames } from "@/lib/scoring";
import { recomputeLeaderboard } from "./leaderboard";
import { markResultsUpdated } from "./settings";

export interface ResultsImportSummary {
  matchesUpdated: number;
  matchesUnmatched: number;
  predictionsScored: number;
  notificationsCreated: number;
  unmatched: { tournament: string; player1: string; player2: string; reason: string }[];
}

// Minimum name similarity (0..1) required to consider two player names "the same".
const NAME_MATCH_THRESHOLD = 0.9; // 90%

/**
 * Normalise a player name for comparison: lowercase, strip accents, remove
 * seed/qualifier tags like "[1]", "[Q]", "[WC]", and collapse punctuation.
 * e.g. "[1] Félix Auger-Aliassime" -> "felix auger aliassime"
 */
function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/\[[^\]]*\]/g, " ") // remove [1], [Q], [WC] etc.
    .replace(/[^a-z0-9]+/g, " ") // punctuation/hyphens -> space
    .trim()
    .replace(/\s+/g, " ");
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array(n + 1);
  const curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

/** Similarity ratio (0..1) between two player names after normalisation. */
function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na && !nb) return 1;
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const dist = levenshtein(na, nb);
  return 1 - dist / Math.max(na.length, nb.length);
}

/**
 * Find the scheduled match a result row refers to — matched ONLY on the two
 * player names, fuzzily (>= 90% similarity), order-insensitive. Tournament and
 * date are ignored. Returns the best-scoring match above the threshold.
 */
async function findMatch(row: ParsedResult) {
  const candidates = await prisma.match.findMany();

  let best: (typeof candidates)[number] | undefined;
  let bestScore = 0;

  for (const m of candidates) {
    // Both players must clear the threshold — score each orientation by its
    // weaker player, then take the better orientation.
    const direct = Math.min(
      nameSimilarity(m.player1, row.player1),
      nameSimilarity(m.player2, row.player2),
    );
    const swapped = Math.min(
      nameSimilarity(m.player1, row.player2),
      nameSimilarity(m.player2, row.player1),
    );
    const score = Math.max(direct, swapped);
    if (score >= NAME_MATCH_THRESHOLD && score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
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
        reason: "No scheduled match with ≥90% matching player names.",
      });
      continue;
    }

    // Canonicalise winner to the scheduled player's spelling (closest match).
    const winner =
      nameSimilarity(match.player1, row.winner) >= nameSimilarity(match.player2, row.winner)
        ? match.player1
        : match.player2;
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
            setWinnersCorrect: breakdown.setWinnersCorrect,
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

  // Stamp a new results version so users get the one-time "results updated" splash.
  if (summary.matchesUpdated > 0) await markResultsUpdated();

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
