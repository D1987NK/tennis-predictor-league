import { getMatchesAwaitingResults } from "@/lib/services/matches";
import { toDateKey } from "@/lib/timezone";
import { ManualResultForm, type PendingMatch } from "@/components/admin/manual-result-form";

export const dynamic = "force-dynamic";

export default async function AdminManualResultsPage() {
  const matches = await getMatchesAwaitingResults();

  const pending: PendingMatch[] = matches.map((m) => ({
    id: m.id,
    tournament: m.tournament,
    draw: m.draw,
    tour: m.tour,
    round: m.round,
    matchDateKey: toDateKey(m.matchDate),
    timeBst: m.timeBst,
    timeAest: m.timeAest,
    player1: m.player1,
    player2: m.player2,
    bestOf: m.bestOf,
    status: m.status,
  }));

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Manual results entry</h2>
        <p className="text-sm text-muted-foreground">
          Enter a result by hand for a match that&apos;s still waiting for results — same fields as
          the results CSV. Saving scores predictions and updates the leaderboard immediately,
          exactly like a CSV import.
        </p>
      </div>
      <ManualResultForm matches={pending} />
    </div>
  );
}
