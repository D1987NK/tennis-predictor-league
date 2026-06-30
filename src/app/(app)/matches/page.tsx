import { auth } from "@/lib/auth";
import { getTodaysMatches } from "@/lib/queries";
import { canPredict } from "@/lib/services/matches";
import { getCutoff, formatCutoff12h } from "@/lib/services/settings";
import { PredictionFlow, type FlowMatch } from "@/components/prediction-flow";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const session = await auth();
  const [matches, cutoff] = await Promise.all([
    getTodaysMatches(session!.user.id),
    getCutoff(),
  ]);

  const flowMatches: FlowMatch[] = matches.map((m) => ({
    id: m.id,
    tournament: m.tournament,
    tour: m.tour,
    round: m.round,
    timeAest: m.timeAest,
    player1: m.player1,
    player2: m.player2,
    bestOf: m.bestOf,
    status: m.status,
    locked: !canPredict(m.status, m.startsAt, m.matchDate, cutoff),
    myPrediction: m.myPrediction
      ? {
          predictedWinner: m.myPrediction.predictedWinner,
          predictedScore: m.myPrediction.predictedScore,
          predictedSets: (m.myPrediction.predictedSets as unknown as { p1: number; p2: number }[]) ?? [],
        }
      : null,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Today&apos;s Matches</h1>
        <p className="text-muted-foreground">
          Predict the winner and score for each match.{" "}
          {cutoff.enabled ? (
            <>
              Predictions lock at{" "}
              <span className="font-medium text-foreground">{formatCutoff12h(cutoff.time)} AEST</span>, or
              when a match starts — whichever comes first.
            </>
          ) : (
            <>Predictions lock when each match starts.</>
          )}
        </p>
      </div>
      <PredictionFlow matches={flowMatches} />
    </div>
  );
}
