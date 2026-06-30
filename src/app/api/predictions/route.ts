import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { predictionSchema } from "@/lib/validations";
import { canPredict } from "@/lib/services/matches";
import { getCutoff, formatCutoff12h } from "@/lib/services/settings";
import { parseScore, setsToWin } from "@/lib/tennis";

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = predictionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { matchId, predictedWinner, predictedScore, predictedSets } = parsed.data;

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const cutoff = await getCutoff();
  if (!canPredict(match.status, match.startsAt, match.matchDate, cutoff)) {
    const reason = cutoff.enabled
      ? `they lock at ${formatCutoff12h(cutoff.time)} AEST, or when the match starts`
      : "the match has started";
    return NextResponse.json(
      { error: `Predictions are closed (${reason}).` },
      { status: 409 },
    );
  }

  // Winner must be one of the two players.
  if (predictedWinner !== match.player1 && predictedWinner !== match.player2) {
    return NextResponse.json({ error: "Invalid winner." }, { status: 400 });
  }

  // Score must be consistent with best-of and the chosen winner.
  const sc = parseScore(predictedScore);
  const need = setsToWin(match.bestOf);
  if (!sc || (sc.p1 !== need && sc.p2 !== need) || sc.p1 > need || sc.p2 > need) {
    return NextResponse.json({ error: "Invalid score for this match format." }, { status: 400 });
  }
  const winnerIsP1 = predictedWinner === match.player1;
  if ((winnerIsP1 && sc.p1 !== need) || (!winnerIsP1 && sc.p2 !== need)) {
    return NextResponse.json(
      { error: "Score doesn't match the predicted winner." },
      { status: 400 },
    );
  }

  const prediction = await prisma.prediction.upsert({
    where: { userId_matchId: { userId: user.id, matchId } },
    create: {
      userId: user.id,
      matchId,
      predictedWinner,
      predictedScore,
      predictedSets: predictedSets as object[],
    },
    update: {
      predictedWinner,
      predictedScore,
      predictedSets: predictedSets as object[],
    },
  });

  // Notify when the user finishes all of today's open matches.
  const today = match.matchDate;
  const [openToday, predictedToday] = await Promise.all([
    prisma.match.count({ where: { matchDate: today, status: "PUBLISHED" } }),
    prisma.prediction.count({
      where: { userId: user.id, match: { matchDate: today, status: "PUBLISHED" } },
    }),
  ]);
  let completed = false;
  if (openToday > 0 && predictedToday >= openToday) {
    completed = true;
    const already = await prisma.notification.findFirst({
      where: { userId: user.id, title: "You've completed today's predictions." },
      orderBy: { createdAt: "desc" },
    });
    // Avoid spamming: only create once per day.
    const todayKey = today.toISOString().slice(0, 10);
    if (!already || already.createdAt.toISOString().slice(0, 10) !== todayKey) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: "You've completed today's predictions.",
          body: "All predictions submitted. Good luck! 🎾",
        },
      });
    }
  }

  return NextResponse.json({ ok: true, prediction, completed });
}
