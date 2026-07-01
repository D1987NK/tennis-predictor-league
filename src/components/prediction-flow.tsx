"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TourBadge } from "@/components/tour-badge";
import { useToast } from "@/components/ui/toast";
import { scoreOptions, setsToWin } from "@/lib/tennis";
import { cn } from "@/lib/utils";
import { Lock, CheckCircle2, ChevronLeft, ChevronRight, PartyPopper } from "lucide-react";

export interface FlowMatch {
  id: string;
  tournament: string;
  tour: "ATP" | "WTA";
  round: string | null;
  timeAest: string | null;
  player1: string;
  player2: string;
  bestOf: number;
  status: string;
  locked: boolean;
  myPrediction: {
    predictedWinner: string;
    predictedScore: string;
    predictedSets: { p1: number; p2: number }[];
  } | null;
}

const GAME_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7];

export function PredictionFlow({ matches }: { matches: FlowMatch[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [index, setIndex] = useState(() => {
    const firstUnpredicted = matches.findIndex((m) => !m.locked && !m.myPrediction);
    return firstUnpredicted === -1 ? 0 : firstUnpredicted;
  });
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const match = matches[index];

  const [winner, setWinner] = useState<string | null>(match?.myPrediction?.predictedWinner ?? null);
  const [score, setScore] = useState<string | null>(match?.myPrediction?.predictedScore ?? null);
  const [showSets, setShowSets] = useState((match?.myPrediction?.predictedSets?.length ?? 0) > 0);
  const [sets, setSets] = useState<{ p1: number; p2: number }[]>(
    match?.myPrediction?.predictedSets ?? [],
  );

  const options = useMemo(() => (match ? scoreOptions(match.bestOf) : []), [match]);

  // Reset local form state when navigating between matches.
  function loadMatch(i: number) {
    const m = matches[i];
    setIndex(i);
    setWinner(m?.myPrediction?.predictedWinner ?? null);
    setScore(m?.myPrediction?.predictedScore ?? null);
    setSets(m?.myPrediction?.predictedSets ?? []);
    setShowSets((m?.myPrediction?.predictedSets?.length ?? 0) > 0);
  }

  // When score changes, (re)build the set rows with sensible defaults.
  function onScore(s: string) {
    setScore(s);
    const [a, b] = s.split("-").map(Number);
    const total = a + b;
    const need = setsToWin(match.bestOf);
    const winnerIsP1 = a === need;
    // Auto-select the winner implied by the chosen score.
    setWinner(winnerIsP1 ? match.player1 : match.player2);
    const next: { p1: number; p2: number }[] = [];
    for (let i = 0; i < total; i++) {
      // Default: predicted winner takes 6-4 sets, loser takes 4-6 sets.
      next.push(winnerIsP1 ? { p1: 6, p2: 4 } : { p1: 4, p2: 6 });
    }
    setSets(next);
  }

  function setGame(i: number, key: "p1" | "p2", value: number) {
    setSets((prev) => prev.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)));
  }

  async function submit() {
    if (!winner || !score) {
      toast({ variant: "error", title: "Pick a winner and score first." });
      return;
    }
    setSaving(true);
    const res = await fetch("/api/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchId: match.id,
        predictedWinner: winner,
        predictedScore: score,
        predictedSets: showSets ? sets : [],
      }),
    });
    setSaving(false);
    const data = await res.json();
    if (!res.ok) {
      toast({ variant: "error", title: "Could not save", description: data.error });
      return;
    }
    toast({ variant: "success", title: "Prediction saved!" });
    // Advance to the next unpredicted/open match, else show done.
    const nextOpen = matches.findIndex((m, i) => i > index && !m.locked);
    if (nextOpen === -1) {
      setDone(true);
      router.refresh();
    } else {
      // Mark current as predicted locally so progress reflects it.
      matches[index].myPrediction = { predictedWinner: winner, predictedScore: score, predictedSets: sets };
      loadMatch(nextOpen);
    }
  }

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-muted-foreground">
          No matches are open for prediction right now. Check back soon! 🎾
        </CardContent>
      </Card>
    );
  }

  if (done) {
    return (
      <Card className="animate-scale-in">
        <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
          <PartyPopper className="size-14 animate-bounce text-primary" />
          <h2 className="animate-fade-in text-2xl font-bold">🎉 You&apos;re Done for Today!</h2>
          <p className="max-w-md text-muted-foreground">
            All predictions have been submitted successfully. Good luck!
          </p>
          <Button asChild>
            <Link href="/dashboard">Return to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const predictedCount = matches.filter((m) => m.myPrediction).length;
  const progress = Math.round((predictedCount / matches.length) * 100);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            Match {index + 1} of {matches.length}
          </span>
          <span className="text-muted-foreground">{predictedCount} predicted</span>
        </div>
        <Progress value={progress} />
      </div>

      <Card key={match.id} className="animate-scale-in">
        <CardContent className="space-y-6 p-6">
          {/* Header */}
          <div className="text-center">
            <div className="mb-2 flex items-center justify-center gap-2">
              <TourBadge tour={match.tour} />
              {match.locked && (
                <Badge variant="destructive" className="gap-1">
                  <Lock className="size-3" /> Closed
                </Badge>
              )}
            </div>
            <h2 className="text-xl font-bold">{match.tournament}</h2>
            <p className="text-sm text-muted-foreground">
              {match.round ? `${match.round} · ` : ""}
              {match.timeAest} AEST · Best of {match.bestOf}
            </p>
          </div>

          {/* Winner */}
          <div>
            <p className="mb-2 text-sm font-semibold">Winner</p>
            <div className="grid grid-cols-2 gap-3">
              {[match.player1, match.player2].map((p) => (
                <button
                  key={p}
                  disabled={match.locked}
                  onClick={() => setWinner(p)}
                  className={cn(
                    "tap flex min-h-[60px] items-center justify-center rounded-xl border-2 p-4 text-center font-medium transition-all active:scale-[0.98] disabled:opacity-60",
                    winner === p
                      ? "animate-pop border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Match score */}
          <div>
            <p className="mb-2 text-sm font-semibold">Match score</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {options.map((o) => (
                <button
                  key={o}
                  disabled={match.locked}
                  onClick={() => onScore(o)}
                  className={cn(
                    "tap min-h-[52px] rounded-xl border-2 font-semibold transition-all active:scale-95 disabled:opacity-60",
                    score === o
                      ? "animate-pop border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          {/* Optional set scores */}
          {score && !match.locked && (
            <div>
              <button
                onClick={() => setShowSets((s) => !s)}
                className="text-sm font-medium text-primary hover:underline"
              >
                {showSets ? "Hide" : "Add"} set scores (+10 for the set winner, +10 more for the exact score)
              </button>
              {showSets && (
                <div className="mt-3 space-y-2">
                  {sets.map((row, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg border p-2">
                      <span className="w-12 text-sm text-muted-foreground">Set {i + 1}</span>
                      <span className="flex-1 truncate text-sm">{match.player1}</span>
                      <select
                        value={row.p1}
                        onChange={(e) => setGame(i, "p1", Number(e.target.value))}
                        className="h-8 rounded border bg-background px-2 text-sm"
                      >
                        {GAME_OPTIONS.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                      <span className="text-muted-foreground">-</span>
                      <select
                        value={row.p2}
                        onChange={(e) => setGame(i, "p2", Number(e.target.value))}
                        className="h-8 rounded border bg-background px-2 text-sm"
                      >
                        {GAME_OPTIONS.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                      <span className="hidden flex-1 truncate text-right text-sm sm:block">
                        {match.player2}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions — primary button full-width for thumbs, nav below */}
          <div className="space-y-3 pt-2">
            {match.locked ? (
              <Button
                variant="secondary"
                className="h-12 w-full text-base"
                onClick={() => loadMatch(Math.min(matches.length - 1, index + 1))}
                disabled={index === matches.length - 1}
              >
                Next match <ChevronRight className="size-5" />
              </Button>
            ) : (
              <Button
                className="h-12 w-full text-base"
                onClick={submit}
                disabled={saving || !winner || !score}
              >
                {saving ? "Saving…" : `${match.myPrediction ? "Update" : "Submit"} prediction`}
                {!saving && <CheckCircle2 className="size-5" />}
              </Button>
            )}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadMatch(Math.max(0, index - 1))}
                disabled={index === 0}
              >
                <ChevronLeft className="size-4" /> Prev
              </Button>
              <span className="text-xs text-muted-foreground">
                {index + 1} / {matches.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadMatch(Math.min(matches.length - 1, index + 1))}
                disabled={index === matches.length - 1}
              >
                Skip <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
