import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLeaderboard } from "@/lib/services/leaderboard";
import { todayDate } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const medals = ["🥇", "🥈", "🥉"];

const FILTERS = [
  { key: "all", label: "All Time" },
  { key: "today", label: "Today" },
  { key: "season", label: "Season" },
] as const;

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: { filter?: string; tournament?: string };
}) {
  const session = await auth();
  const filter = searchParams.filter ?? "all";
  const tournament = searchParams.tournament;

  const tournaments = (
    await prisma.match.findMany({
      where: { status: "FINISHED" },
      distinct: ["tournament"],
      select: { tournament: true },
    })
  ).map((t) => t.tournament);

  const rows = await getLeaderboard({
    dateKey: filter === "today" ? todayDate().toISOString().slice(0, 10) : undefined,
    tournament: tournament || undefined,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Leaderboard</h1>
        <p className="text-muted-foreground">See who&apos;s topping the league.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <a
            key={f.key}
            href={`/leaderboard?filter=${f.key}`}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              filter === f.key && !tournament
                ? "border-primary bg-primary/10 text-primary"
                : "hover:bg-accent",
            )}
          >
            {f.label}
          </a>
        ))}
        {tournaments.map((t) => (
          <a
            key={t}
            href={`/leaderboard?tournament=${encodeURIComponent(t)}`}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              tournament === t ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent",
            )}
          >
            {t}
          </a>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Header row */}
          <div className="hidden grid-cols-[3rem_1fr_repeat(5,5rem)] gap-2 border-b px-4 py-3 text-xs font-semibold text-muted-foreground md:grid">
            <span>Rank</span>
            <span>Player</span>
            <span className="text-center">Points</span>
            <span className="text-center">Winners</span>
            <span className="text-center">Scores</span>
            <span className="text-center">Sets</span>
            <span className="text-center">Accuracy</span>
          </div>

          {rows.length === 0 && (
            <p className="p-8 text-center text-muted-foreground">No scored predictions yet.</p>
          )}

          {rows.map((r) => {
            const isMe = r.userId === session?.user.id;
            return (
              <div
                key={r.userId}
                className={cn(
                  "grid grid-cols-2 items-center gap-2 border-b px-4 py-3 text-sm last:border-0 md:grid-cols-[3rem_1fr_repeat(5,5rem)]",
                  isMe && "bg-primary/5",
                )}
              >
                <span className="font-bold">
                  {r.rank && r.rank <= 3 ? medals[r.rank - 1] : `#${r.rank}`}
                </span>
                <span className="truncate">
                  <span className={cn("font-medium", isMe && "text-primary")}>{r.username}</span>
                  {isMe && <Badge variant="outline" className="ml-2 text-[10px]">You</Badge>}
                  <span className="block text-xs text-muted-foreground">{r.name}</span>
                </span>
                <span className="text-right font-bold md:text-center">{r.totalPoints}</span>
                <span className="hidden text-center text-muted-foreground md:block">{r.winnersCorrect}</span>
                <span className="hidden text-center text-muted-foreground md:block">{r.scoresCorrect}</span>
                <span className="hidden text-center text-muted-foreground md:block">{r.setsCorrect}</span>
                <span className="hidden text-center text-muted-foreground md:block">{r.accuracy}%</span>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
