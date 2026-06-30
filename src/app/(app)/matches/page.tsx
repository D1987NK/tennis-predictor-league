import { auth } from "@/lib/auth";
import { getTodaysMatches } from "@/lib/queries";
import { PredictionFlow, type FlowMatch } from "@/components/prediction-flow";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const session = await auth();
  const matches = await getTodaysMatches(session!.user.id);

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
    locked: m.status !== "PUBLISHED",
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
          Predict the winner and score for each match. Predictions lock when play begins.
        </p>
      </div>
      <PredictionFlow matches={flowMatches} />
    </div>
  );
}
