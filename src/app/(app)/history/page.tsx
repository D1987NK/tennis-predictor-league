import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TourBadge } from "@/components/tour-badge";
import { toDateKey } from "@/lib/timezone";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const session = await auth();
  const userId = session!.user.id;

  const predictions = await prisma.prediction.findMany({
    where: { userId, match: { status: "FINISHED" } },
    orderBy: { match: { matchDate: "desc" } },
    include: { match: true },
  });

  // Group by date.
  const byDate = new Map<string, typeof predictions>();
  for (const p of predictions) {
    const key = toDateKey(p.match.matchDate);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(p);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">History</h1>
        <p className="text-muted-foreground">Your completed predictions, day by day.</p>
      </div>

      {byDate.size === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No completed matches yet.
          </CardContent>
        </Card>
      )}

      {[...byDate.entries()].map(([date, preds]) => {
        const dayPoints = preds.reduce((s, p) => s + (p.pointsAwarded ?? 0), 0);
        return (
          <Card key={date}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                {new Date(date).toLocaleDateString(undefined, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                })}
              </CardTitle>
              <Badge variant="success">{dayPoints} pts</Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              {preds.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <TourBadge tour={p.match.tour} />
                    <span className="truncate">
                      {p.match.player1} vs {p.match.player2}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-muted-foreground">
                      {p.predictedWinner === p.match.winner ? "✓" : "✗"} {p.predictedScore}
                    </span>
                    <Badge variant={p.pointsAwarded ? "success" : "secondary"}>
                      {p.pointsAwarded ?? 0} pts
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
