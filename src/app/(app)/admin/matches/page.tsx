import { prisma } from "@/lib/prisma";
import { todayDate } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TourBadge } from "@/components/tour-badge";
import {
  MatchImportForm,
  PublishAllButton,
  PendingMatchRow,
} from "@/components/admin/match-admin";
import { toDateKey } from "@/lib/timezone";

export const dynamic = "force-dynamic";

export default async function AdminMatchesPage() {
  const todayKey = toDateKey(todayDate());

  const [pending, published] = await Promise.all([
    prisma.match.findMany({ where: { status: "UPCOMING" }, orderBy: { startsAt: "asc" } }),
    prisma.match.findMany({
      where: { status: { in: ["PUBLISHED", "LOCKED"] } },
      orderBy: { startsAt: "asc" },
      take: 50,
    }),
  ]);

  // Group pending by date for publish-by-date.
  const pendingDates = [...new Set(pending.map((m) => toDateKey(m.matchDate)))];

  return (
    <div className="space-y-6 animate-fade-in">
      <MatchImportForm defaultDate={todayKey} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pending matches ({pending.length})</CardTitle>
          {pendingDates.map((d) => (
            <PublishAllButton key={d} date={d} count={pending.filter((m) => toDateKey(m.matchDate) === d).length} />
          ))}
        </CardHeader>
        <CardContent className="p-0">
          {pending.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No pending matches. Import a CSV above to get started.
            </p>
          ) : (
            pending.map((m) => (
              <PendingMatchRow
                key={m.id}
                match={{
                  id: m.id,
                  tournament: m.tournament,
                  tour: m.tour,
                  round: m.round,
                  timeBst: m.timeBst,
                  timeAest: m.timeAest,
                  player1: m.player1,
                  player2: m.player2,
                  bestOf: m.bestOf,
                }}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Published / live ({published.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {published.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing published yet.</p>
          ) : (
            published.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-md border p-2 text-sm">
                <TourBadge tour={m.tour} />
                <span className="min-w-0 flex-1 truncate">{m.player1} vs {m.player2}</span>
                <span className="text-xs text-muted-foreground">{m.timeAest} AEST</span>
                <Badge variant={m.status === "LOCKED" ? "destructive" : "success"}>
                  {m.status === "LOCKED" ? "Locked" : "Open"}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
