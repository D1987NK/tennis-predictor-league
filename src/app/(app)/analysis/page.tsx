import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseScore } from "@/lib/tennis";
import { POINTS, POINTS_PER_SET } from "@/lib/scoring";
import { toDateKey } from "@/lib/timezone";
import { AnalysisCharts, type AnalysisData } from "@/components/analysis-charts";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

function shortDate(key: string): string {
  return new Date(key + "T00:00:00.000Z").toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

export default async function AnalysisPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [me, preds, allUsers] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.prediction.findMany({
      where: { userId, pointsAwarded: { not: null } },
      include: { match: true },
      orderBy: { match: { matchDate: "asc" } },
    }),
    prisma.user.findMany({ where: { role: "USER" }, select: { totalPoints: true } }),
  ]);

  const predicted = preds.length;
  const correctWinners = preds.filter((p) => p.winnerCorrect).length;
  const correctScores = preds.filter((p) => p.scoreCorrect).length;
  const totalSetsCorrect = preds.reduce((s, p) => s + p.setsCorrect, 0);
  const totalSetWinnersCorrect = preds.reduce((s, p) => s + p.setWinnersCorrect, 0);
  const totalPoints = preds.reduce((s, p) => s + (p.pointsAwarded ?? 0), 0);

  // Sets actually played (from final score) — for set accuracy & efficiency.
  let setsPlayed = 0;
  let maxPoints = 0;
  for (const p of preds) {
    const sc = p.match.finalScore ? parseScore(p.match.finalScore) : null;
    const played = sc ? sc.p1 + sc.p2 : 0;
    setsPlayed += played;
    maxPoints += POINTS.WINNER + POINTS.SCORE + played * POINTS_PER_SET;
  }

  // --- Daily aggregation ---
  const dayMap = new Map<string, { points: number; correct: number; wrong: number }>();
  for (const p of preds) {
    const key = toDateKey(p.match.matchDate);
    const d = dayMap.get(key) ?? { points: 0, correct: 0, wrong: 0 };
    d.points += p.pointsAwarded ?? 0;
    if (p.winnerCorrect) d.correct++;
    else d.wrong++;
    dayMap.set(key, d);
  }
  const sortedDays = [...dayMap.entries()].sort(([a], [b]) => a.localeCompare(b));
  let running = 0;
  const daily = sortedDays.map(([key, v]) => {
    running += v.points;
    return { date: shortDate(key), points: v.points, cumulative: running, correct: v.correct, wrong: v.wrong };
  });

  // --- By tour ---
  const byTour = (["ATP", "WTA"] as const).map((tour) => {
    const sub = preds.filter((p) => p.match.tour === tour);
    const w = sub.filter((p) => p.winnerCorrect).length;
    return {
      tour,
      points: sub.reduce((s, p) => s + (p.pointsAwarded ?? 0), 0),
      predicted: sub.length,
      accuracy: sub.length ? Math.round((w / sub.length) * 100) : 0,
    };
  });

  // --- By tournament (top 8) ---
  const tourneyMap = new Map<string, number>();
  for (const p of preds) {
    tourneyMap.set(p.match.tournament, (tourneyMap.get(p.match.tournament) ?? 0) + (p.pointsAwarded ?? 0));
  }
  const byTournament = [...tourneyMap.entries()]
    .map(([tournament, points]) => ({ tournament, points }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 8);

  // --- By format ---
  const byFormat = [3, 5]
    .map((bestOf) => {
      const sub = preds.filter((p) => p.match.bestOf === bestOf);
      const w = sub.filter((p) => p.winnerCorrect).length;
      return {
        format: `Best of ${bestOf}`,
        predicted: sub.length,
        points: sub.reduce((s, p) => s + (p.pointsAwarded ?? 0), 0),
        accuracy: sub.length ? Math.round((w / sub.length) * 100) : 0,
      };
    })
    .filter((f) => f.predicted > 0);

  // --- League average ---
  const leagueAvg = allUsers.length
    ? Math.round(allUsers.reduce((s, u) => s + u.totalPoints, 0) / allUsers.length)
    : 0;

  const data: AnalysisData = {
    totalPredictions: predicted,
    daily,
    winnerAccuracy: predicted
      ? [
          { name: "Correct", value: correctWinners },
          { name: "Missed", value: predicted - correctWinners },
        ]
      : [],
    pointsSource: [
      { name: "Winners", value: correctWinners * POINTS.WINNER },
      { name: "Match scores", value: correctScores * POINTS.SCORE },
      {
        name: "Set scores",
        value: (totalSetWinnersCorrect + totalSetsCorrect) * POINTS.SET_WINNER,
      },
    ],
    byTour,
    radar: [
      { metric: "Winner", value: predicted ? Math.round((correctWinners / predicted) * 100) : 0 },
      { metric: "Exact score", value: predicted ? Math.round((correctScores / predicted) * 100) : 0 },
      { metric: "Sets", value: setsPlayed ? Math.round((totalSetsCorrect / setsPlayed) * 100) : 0 },
      { metric: "Efficiency", value: maxPoints ? Math.round((totalPoints / maxPoints) * 100) : 0 },
    ],
    byTournament,
    vsLeague: [
      { name: "You", points: me?.totalPoints ?? totalPoints },
      { name: "League avg", points: leagueAvg },
    ],
    byFormat,
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
          <BarChart3 className="size-7 text-primary" /> Analysis
        </h1>
        <p className="text-muted-foreground">
          Ten reports on how you&apos;re performing across the season.
        </p>
      </div>

      {predicted === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            No performance data yet. Once results are imported and your predictions are scored,
            your reports will appear here. 🎾
          </CardContent>
        </Card>
      ) : (
        <AnalysisCharts data={data} />
      )}
    </div>
  );
}
