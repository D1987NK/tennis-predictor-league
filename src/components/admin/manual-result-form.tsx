"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TourBadge } from "@/components/tour-badge";
import { useToast } from "@/components/ui/toast";
import { setsToWin } from "@/lib/tennis";
import { cn } from "@/lib/utils";
import { CheckCircle2, ClipboardEdit } from "lucide-react";

export interface PendingMatch {
  id: string;
  tournament: string;
  draw: string;
  tour: "ATP" | "WTA";
  round: string | null;
  matchDateKey: string; // YYYY-MM-DD
  timeBst: string | null;
  timeAest: string | null;
  player1: string;
  player2: string;
  bestOf: number;
  status: string;
}

type SetRow = { p1: string; p2: string };

const emptySets = (n: number): SetRow[] => Array.from({ length: n }, () => ({ p1: "", p2: "" }));

interface ImportSummary {
  matchesUpdated: number;
  predictionsScored: number;
  notificationsCreated: number;
  matchesUnmatched: number;
}

export function ManualResultForm({ matches }: { matches: PendingMatch[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string>(matches[0]?.id ?? "");
  const [winner, setWinner] = useState<"player1" | "player2" | null>(null);
  const [scoreOverride, setScoreOverride] = useState<string | null>(null);
  const [sets, setSets] = useState<SetRow[]>(emptySets(5));
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const match = useMemo(() => matches.find((m) => m.id === selectedId) ?? null, [matches, selectedId]);

  function selectMatch(id: string) {
    setSelectedId(id);
    setWinner(null);
    setScoreOverride(null);
    setSets(emptySets(5));
    setSummary(null);
  }

  function setGame(i: number, key: "p1" | "p2", value: string) {
    setSets((prev) => prev.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)));
  }

  // Auto-computed score (sets won by each player) from entered set games.
  const computedScore = useMemo(() => {
    let w1 = 0;
    let w2 = 0;
    for (const s of sets) {
      const a = Number(s.p1);
      const b = Number(s.p2);
      if (s.p1 === "" || s.p2 === "" || Number.isNaN(a) || Number.isNaN(b)) continue;
      if (a === 0 && b === 0) continue;
      if (a > b) w1++;
      else if (b > a) w2++;
    }
    return `${w1}-${w2}`;
  }, [sets]);

  const effectiveScore = scoreOverride ?? computedScore;
  const needToWin = match ? setsToWin(match.bestOf) : 0;

  async function submit() {
    if (!match) return;
    if (!winner) {
      toast({ variant: "error", title: "Select the winner." });
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/results/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tournament: match.tournament,
        date: match.matchDateKey,
        timeBst: match.timeBst,
        draw: match.draw,
        round: match.round,
        player1: match.player1,
        player2: match.player2,
        winner: winner === "player1" ? match.player1 : match.player2,
        score: effectiveScore,
        sets: sets
          .filter((s) => s.p1 !== "" || s.p2 !== "")
          .map((s) => ({ p1: s.p1 || 0, p2: s.p2 || 0 })),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast({ variant: "error", title: "Could not save result", description: data.error });
      return;
    }
    setSummary(data);
    toast({
      variant: "success",
      title: "Result saved",
      description: `${data.predictionsScored} prediction(s) scored, leaderboard updated.`,
    });
    router.refresh();
  }

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-muted-foreground">
          🎉 No matches are waiting for results — everything published has been scored.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Pending match list */}
      <Card className="h-fit">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Awaiting results ({matches.length})</CardTitle>
        </CardHeader>
        <CardContent className="max-h-[32rem] space-y-1 overflow-y-auto p-2">
          {matches.map((m) => (
            <button
              key={m.id}
              onClick={() => selectMatch(m.id)}
              className={cn(
                "tap w-full rounded-lg border p-2.5 text-left text-sm transition-colors",
                m.id === selectedId ? "border-primary bg-primary/10" : "border-transparent hover:bg-accent",
              )}
            >
              <div className="flex items-center gap-2">
                <TourBadge tour={m.tour} />
                <Badge variant={m.status === "LOCKED" ? "destructive" : "secondary"} className="text-[10px]">
                  {m.status === "LOCKED" ? "In play" : "Open"}
                </Badge>
              </div>
              <p className="mt-1 truncate font-medium">{m.player1} vs {m.player2}</p>
              <p className="truncate text-xs text-muted-foreground">
                {m.tournament}{m.round ? ` · ${m.round}` : ""}
              </p>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Entry form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardEdit className="size-5" /> Enter result
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {match && (
            <>
              <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm">
                <TourBadge tour={match.tour} />
                <span className="font-medium">{match.tournament}</span>
                {match.round && <span className="text-muted-foreground">· {match.round}</span>}
                <span className="ml-auto text-muted-foreground">Best of {match.bestOf}</span>
              </div>

              {/* Winner */}
              <div>
                <p className="mb-2 text-sm font-semibold">Winner</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "player1" as const, name: match.player1 },
                    { key: "player2" as const, name: match.player2 },
                  ].map((p) => (
                    <button
                      key={p.key}
                      onClick={() => setWinner(p.key)}
                      className={cn(
                        "tap flex min-h-[52px] items-center justify-center rounded-xl border-2 p-3 text-center font-medium transition-all active:scale-[0.98]",
                        winner === p.key
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50",
                      )}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Set scores — same fields as the CSV (Set1_P1..Set5_P2) */}
              <div>
                <p className="mb-2 text-sm font-semibold">Set scores</p>
                <div className="space-y-2">
                  {sets.slice(0, match.bestOf).map((row, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg border p-2">
                      <span className="w-12 shrink-0 text-xs text-muted-foreground">Set {i + 1}</span>
                      <span className="flex-1 truncate text-xs">{match.player1}</span>
                      <Input
                        type="number"
                        min={0}
                        max={20}
                        value={row.p1}
                        onChange={(e) => setGame(i, "p1", e.target.value)}
                        className="h-9 w-16 text-center"
                        placeholder="-"
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="number"
                        min={0}
                        max={20}
                        value={row.p2}
                        onChange={(e) => setGame(i, "p2", e.target.value)}
                        className="h-9 w-16 text-center"
                        placeholder="-"
                      />
                      <span className="flex-1 truncate text-right text-xs">{match.player2}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Leave a row blank if that set wasn&apos;t played (best of {match.bestOf} = first to{" "}
                  {needToWin} sets).
                </p>
              </div>

              {/* Final score: auto-calculated, but manually editable/overridable */}
              <div className="space-y-2">
                <Label htmlFor="score">Match score (sets) — auto-calculated, editable</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="score"
                    value={effectiveScore}
                    onChange={(e) => setScoreOverride(e.target.value)}
                    placeholder="e.g. 3-1"
                    className="w-32"
                  />
                  {scoreOverride !== null && scoreOverride !== computedScore && (
                    <button
                      type="button"
                      onClick={() => setScoreOverride(null)}
                      className="text-xs text-primary hover:underline"
                    >
                      Reset to calculated ({computedScore})
                    </button>
                  )}
                </div>
              </div>

              <Button onClick={submit} disabled={saving || !winner} className="h-11 w-full">
                {saving ? "Saving…" : "Save result & score predictions"}
                {!saving && <CheckCircle2 className="size-5" />}
              </Button>

              {summary && (
                <div className="space-y-1 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
                  <p className="flex items-center gap-2 font-semibold text-primary">
                    <CheckCircle2 className="size-4" /> Result saved
                  </p>
                  <p>✓ {summary.predictionsScored} prediction(s) scored</p>
                  <p>✓ Leaderboard updated</p>
                  <p>✓ {summary.notificationsCreated} notification(s) sent</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
