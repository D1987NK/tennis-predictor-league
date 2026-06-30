import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { todayDate } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const today = todayDate();

  const [
    totalUsers,
    matchesToday,
    predictionsToday,
    matchesCompleted,
    resultsImports,
    pointsAgg,
    topPlayers,
    recentImports,
    mostPredicted,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.match.count({ where: { matchDate: today } }),
    prisma.prediction.count({ where: { match: { matchDate: today } } }),
    prisma.match.count({ where: { status: "FINISHED" } }),
    prisma.importBatch.count({ where: { type: "RESULTS" } }),
    prisma.prediction.aggregate({ _sum: { pointsAwarded: true } }),
    prisma.user.findMany({
      where: { role: "USER" },
      orderBy: { totalPoints: "desc" },
      take: 5,
      select: { id: true, username: true, totalPoints: true, rank: true },
    }),
    prisma.importBatch.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.prediction.groupBy({
      by: ["predictedWinner"],
      _count: { predictedWinner: true },
      orderBy: { _count: { predictedWinner: "desc" } },
      take: 1,
    }),
  ]);

  const stats = [
    { label: "Total users", value: totalUsers },
    { label: "Matches today", value: matchesToday },
    { label: "Predictions today", value: predictionsToday },
    { label: "Matches completed", value: matchesCompleted },
    { label: "Results imports", value: resultsImports },
    { label: "Total points awarded", value: pointsAgg._sum.pointsAwarded ?? 0 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-3xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Leaderboard snapshot</CardTitle>
            <Link href="/leaderboard" className="text-sm text-primary hover:underline">View</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {topPlayers.length === 0 && <p className="text-sm text-muted-foreground">No scores yet.</p>}
            {topPlayers.map((u, i) => (
              <div key={u.id} className="flex items-center justify-between text-sm">
                <span>{i + 1}. {u.username}</span>
                <span className="font-semibold">{u.totalPoints} pts</span>
              </div>
            ))}
            {mostPredicted[0] && (
              <p className="pt-2 text-sm text-muted-foreground">
                Most predicted winner:{" "}
                <span className="font-medium text-foreground">{mostPredicted[0].predictedWinner}</span>{" "}
                ({mostPredicted[0]._count.predictedWinner})
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent imports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentImports.length === 0 && <p className="text-sm text-muted-foreground">No imports yet.</p>}
            {recentImports.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                <div className="min-w-0">
                  <Badge variant={b.type === "RESULTS" ? "default" : "secondary"}>{b.type}</Badge>
                  <span className="ml-2 truncate text-muted-foreground">{b.fileName ?? "—"}</span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {b.rowsValid}/{b.rowsTotal} ok
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
