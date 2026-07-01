import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TourBadge } from "@/components/tour-badge";
import { NewsSection, NewsSectionSkeleton } from "@/components/news-section";
import { Trophy, Target, CalendarClock, CheckCircle2, Medal, ArrowRight } from "lucide-react";

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

const medals = ["🥇", "🥈", "🥉"];

export default async function DashboardPage() {
  const session = await auth();
  const data = await getDashboardData(session!.user.id);
  const { user } = data;

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">
          Welcome back, {user?.firstName} 👋
        </h1>
        <p className="text-muted-foreground">Here&apos;s your league at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Trophy} label="Total points" value={user?.totalPoints ?? 0} />
        <StatCard
          icon={Medal}
          label="Current ranking"
          value={user?.rank ? `#${user.rank}` : "—"}
        />
        <StatCard
          icon={CalendarClock}
          label="Matches remaining today"
          value={data.remainingToPredict}
          hint={`${data.matchesToday} scheduled`}
        />
        <StatCard
          icon={CheckCircle2}
          label="Predictions today"
          value={data.predictionsToday}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Next match / CTA */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Next match</CardTitle>
            <Button asChild size="sm">
              <Link href="/matches">
                Predict now <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.nextMatch ? (
              <div className="rounded-lg border p-5">
                <div className="mb-3 flex items-center gap-2">
                  <TourBadge tour={data.nextMatch.tour} />
                  <span className="text-sm text-muted-foreground">
                    {data.nextMatch.tournament}
                    {data.nextMatch.round ? ` · ${data.nextMatch.round}` : ""}
                  </span>
                  <Badge variant="secondary" className="ml-auto">
                    {data.nextMatch.timeAest} AEST
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-lg font-semibold">
                  <span>{data.nextMatch.player1}</span>
                  <span className="px-3 text-sm text-muted-foreground">vs</span>
                  <span className="text-right">{data.nextMatch.player2}</span>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                <Target className="mx-auto mb-2 size-8 opacity-50" />
                No open matches right now. Check back soon!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leaderboard preview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Leaderboard</CardTitle>
            <Link href="/leaderboard" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.leaderboardTop.length === 0 && (
              <p className="text-sm text-muted-foreground">No scores yet.</p>
            )}
            {data.leaderboardTop.map((u, i) => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm"
              >
                <span className="flex items-center gap-2">
                  <span className="w-6 text-center">{medals[i] ?? i + 1}</span>
                  <span className={u.id === user?.id ? "font-bold text-primary" : ""}>
                    {u.username}
                  </span>
                </span>
                <span className="font-semibold">{u.totalPoints}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Recent notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recentNotifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing yet.</p>
            ) : (
              data.recentNotifications.map((n) => (
                <div key={n.id} className="rounded-md border p-3">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.body}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Tennis news — streams in independently so a slow/cold fetch never
            blocks the rest of the dashboard from rendering. */}
        <div className="lg:col-span-2">
          <Suspense fallback={<NewsSectionSkeleton />}>
            <NewsSection />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
