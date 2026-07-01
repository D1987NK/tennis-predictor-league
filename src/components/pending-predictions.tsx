"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PredictionCard, type PredictionWithMatch } from "@/components/prediction-card";
import { ArrowUpNarrowWide, ArrowDownWideNarrow } from "lucide-react";

type SortDir = "asc" | "desc";

export function PendingPredictions({ predictions }: { predictions: PredictionWithMatch[] }) {
  const tournaments = useMemo(
    () => [...new Set(predictions.map((p) => p.match.tournament))].sort(),
    [predictions],
  );

  const [tournament, setTournament] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc"); // soonest match first by default

  const filtered = useMemo(() => {
    let list = predictions;
    if (tournament) list = list.filter((p) => p.match.tournament === tournament);
    return [...list].sort((a, b) => {
      const diff = a.match.startsAt.getTime() - b.match.startsAt.getTime();
      return sortDir === "asc" ? diff : -diff;
    });
  }, [predictions, tournament, sortDir]);

  if (predictions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No predictions here yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTournament(null)}
            className={cn(
              "tap rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              tournament === null ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent",
            )}
          >
            All tournaments
          </button>
          {tournaments.map((t) => (
            <button
              key={t}
              onClick={() => setTournament(t)}
              className={cn(
                "tap rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                tournament === t ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
        >
          {sortDir === "asc" ? (
            <>
              <ArrowUpNarrowWide className="size-4" /> Soonest first
            </>
          ) : (
            <>
              <ArrowDownWideNarrow className="size-4" /> Latest first
            </>
          )}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No pending predictions for this tournament.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <PredictionCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
