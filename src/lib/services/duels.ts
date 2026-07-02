import { prisma } from "@/lib/prisma";

export const MAX_COMMENT_LENGTH = 500;
export const EDIT_WINDOW_MINUTES = 10;

/** True if `userId` is either side of the duel. */
export function isParticipant(
  duel: { challengerId: string; opponentId: string },
  userId: string,
): boolean {
  return duel.challengerId === userId || duel.opponentId === userId;
}

/** Comments are only open once the challenge has been accepted (or resolved). */
export function commentsOpen(status: string): boolean {
  return status === "ACCEPTED" || status === "COMPLETED";
}

/** Still within the edit window for a comment (from its original creation). */
export function withinEditWindow(createdAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - createdAt.getTime() <= EDIT_WINDOW_MINUTES * 60 * 1000;
}

/**
 * Extract @username mentions from comment text, keeping only ones that match
 * a real participant in this duel (there are only ever two people to mention).
 */
export function extractMentionedUsernames(text: string, candidateUsernames: string[]): string[] {
  const found = new Set(
    Array.from(text.matchAll(/@([a-zA-Z0-9_]+)/g), (m) => m[1].toLowerCase()),
  );
  return candidateUsernames.filter((u) => found.has(u.toLowerCase()));
}

/**
 * Resolve any ACCEPTED duels riding on a match once its results have been
 * scored: the winner is whoever's league Prediction earned more points for
 * that match (a tie is a draw — no winner). Notifies both participants.
 * Called from the results-import pipeline right after predictions are scored.
 */
export async function resolveDuelsForMatch(matchId: string): Promise<number> {
  const duels = await prisma.duel.findMany({
    where: { matchId, status: "ACCEPTED" },
    include: {
      match: true,
      challenger: { select: { id: true, username: true } },
      opponent: { select: { id: true, username: true } },
    },
  });
  if (duels.length === 0) return 0;

  for (const duel of duels) {
    const [challengerPred, opponentPred] = await Promise.all([
      prisma.prediction.findUnique({
        where: { userId_matchId: { userId: duel.challengerId, matchId } },
      }),
      prisma.prediction.findUnique({
        where: { userId_matchId: { userId: duel.opponentId, matchId } },
      }),
    ]);
    const challengerPts = challengerPred?.pointsAwarded ?? 0;
    const opponentPts = opponentPred?.pointsAwarded ?? 0;

    let winnerId: string | null = null;
    if (challengerPts > opponentPts) winnerId = duel.challengerId;
    else if (opponentPts > challengerPts) winnerId = duel.opponentId;
    const loserId = winnerId === null ? null : winnerId === duel.challengerId ? duel.opponentId : duel.challengerId;

    await prisma.$transaction([
      prisma.duel.update({
        where: { id: duel.id },
        data: { status: "COMPLETED", winnerId },
      }),
      ...(winnerId && loserId && duel.stake > 0
        ? [
            prisma.user.update({
              where: { id: winnerId },
              data: { stakePoints: { increment: duel.stake } },
            }),
            prisma.user.update({
              where: { id: loserId },
              data: { stakePoints: { decrement: duel.stake } },
            }),
          ]
        : []),
    ]);

    const matchLabel = `${duel.match.player1} vs ${duel.match.player2}`;
    const stakeLine = winnerId && duel.stake > 0 ? ` ${duel.stake} points changed hands.` : "";
    const resultLine =
      winnerId === null
        ? `It's a draw (${challengerPts}-${opponentPts} points).`
        : `${winnerId === duel.challengerId ? duel.challenger.username : duel.opponent.username} won ${Math.max(challengerPts, opponentPts)}-${Math.min(challengerPts, opponentPts)}.${stakeLine}`;

    await prisma.notification.createMany({
      data: [duel.challengerId, duel.opponentId].map((userId) => ({
        userId,
        title: "Duel complete",
        body: `Your duel on ${matchLabel} is over. ${resultLine}`,
        meta: { duelId: duel.id },
      })),
    });
  }

  return duels.length;
}
