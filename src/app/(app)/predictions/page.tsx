import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayDate } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TourBadge } from "@/components/tour-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

type Pred = Awaited<ReturnType<typeof getPredictions>>[number];

async function getPredictions(userId: string) {
  return prisma.prediction.findMany({
    where: { userId },
    orderBy: { match: { startsAt: "desc" } },
    include: { match: { include: { sets: { orderBy: { setNumber: "asc" } } } } },
  });
}

function PredictionCard({ p }: { p: Pred }) {
  const m = p.match;
  const finished = m.status === "FINISHED";
  const scored = p.pointsAwarded !== null;
  const predictedSets = (p.predictedSets as unknown as { p1: number; p2: number }[]) ?? [];

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <TourBadge tour={m.tour} />
          <span className="text-sm text-muted-foreground">
            {m.tournament}
            {m.round ? ` · ${m.round}` : ""}
          </span>
          <span className="ml-auto">
            {finished ? (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="size-3" /> {p.pointsAwarded} pts
              </Badge>
            ) : m.status === "LOCKED" ? (
              <Badge variant="secondary" className="gap-1">
                <Clock className="size-3" /> In play
              </Badge>
            ) : (
              <Badge variant="outline">Open</Badge>
            )}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          {[m.player1, m.player2].map((player) => {
            const isPredictedWinner = p.predictedWinner === player;
            const isActualWinner = m.winner === player;
            return (
              <div
                key={player}
                className={cn(
                  "rounded-lg border p-3",
                  finished && isActualWinner && "border-primary/50 bg-primary/5",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{player}</span>
                  {isPredictedWinner && (
                    <Badge variant="outline" className="text-[10px]">your pick</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Prediction vs result */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
          <span className="text-muted-foreground">
            Predicted: <span className="font-medium text-foreground">{p.predictedWinner} {p.predictedScore}</span>
          </span>
          {finished && (
            <span className="text-muted-foreground">
              Result: <span className="font-medium text-foreground">{m.winner} {m.finalScore}</span>
            </span>
          )}
        </div>

        {/* Per-result breakdown */}
        {scored && (
          <div className="flex flex-wrap gap-2 text-xs">
            <Indicator ok={p.winnerCorrect} label="Winner +15" />
            <Indicator ok={p.scoreCorrect} label="Score +15" />
            <Indicator ok={p.setsCorrect > 0} label={`Sets ${p.setsCorrect}×10`} />
          </div>
        )}

        {/* Set comparison */}
        {finished && m.sets.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {m.sets.map((s, i) => {
              const pred = predictedSets[i];
              const correct = pred && pred.p1 === s.player1Games && pred.p2 === s.player2Games;
              return (
                <span
                  key={s.id}
                  className={cn(
                    "rounded border px-2 py-0.5 text-xs",
                    correct ? "border-primary/50 bg-primary/10 text-primary" : "text-muted-foreground",
                  )}
                  title={pred ? `You: ${pred.p1}-${pred.p2}` : "No set prediction"}
                >
                  S{i + 1} {s.player1Games}-{s.player2Games}
                </span>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Indicator({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
        ok ? "bg-primary/15 text-primary" : "bg-destructive/10 text-destructive",
      )}
    >
      {ok ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
      {label}
    </span>
  );
}

export default async function PredictionsPage() {
  const session = await auth();
  const predictions = await getPredictions(session!.user.id);
  const today = todayDate().getTime();

  const todays = predictions.filter((p) => p.match.matchDate.getTime() === today);
  const pending = predictions.filter((p) => p.match.status !== "FINISHED");
  const completed = predictions.filter((p) => p.match.status === "FINISHED");

  const sections: [string, Pred[]][] = [
    ["today", todays],
    ["pending", pending],
    ["completed", completed],
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">My Predictions</h1>
        <p className="text-muted-foreground">Track your picks and points.</p>
      </div>

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">Today ({todays.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        </TabsList>
        {sections.map(([key, list]) => (
          <TabsContent key={key} value={key} className="space-y-3">
            {list.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No predictions here yet.
                </CardContent>
              </Card>
            ) : (
              list.map((p) => <PredictionCard key={p.id} p={p} />)
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
