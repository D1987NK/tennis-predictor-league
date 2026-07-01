"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { Swords } from "lucide-react";

export interface ChallengeableMatch {
  id: string;
  label: string; // "Alcaraz vs Sinner — Wimbledon, 22:30 AEST"
}

export function ChallengeForm({ matches }: { matches: ChallengeableMatch[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [opponentUsername, setOpponentUsername] = useState("");
  const [matchId, setMatchId] = useState(matches[0]?.id ?? "");
  const [stake, setStake] = useState("0");
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const opponentBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = opponentUsername.trim();
    if (!query) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.users);
          setActiveIndex(-1);
        }
      } catch {
        // ignore — aborted or transient network error
      }
    }, 200);
    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [opponentUsername]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (opponentBoxRef.current && !opponentBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function pickSuggestion(username: string) {
    setOpponentUsername(username);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  function onOpponentKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      pickSuggestion(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!matchId) {
      toast({ variant: "error", title: "No matches available to challenge on right now." });
      return;
    }
    setBusy(true);
    const res = await fetch("/api/duels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opponentUsername, matchId, stake: Number(stake) || 0 }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast({ variant: "error", title: "Could not send challenge", description: data.error });
      return;
    }
    toast({ variant: "success", title: "Challenge sent!", description: `Waiting for ${opponentUsername} to respond.` });
    setOpponentUsername("");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Swords className="size-5" /> Challenge a friend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3">
          <div ref={opponentBoxRef} className="relative space-y-1">
            <Label htmlFor="opponent">Opponent username</Label>
            <Input
              id="opponent"
              value={opponentUsername}
              onChange={(e) => {
                setOpponentUsername(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={onOpponentKeyDown}
              placeholder="e.g. alice"
              autoComplete="off"
              required
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
                {suggestions.map((username, i) => (
                  <li key={username}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pickSuggestion(username)}
                      className={cn(
                        "block w-full px-3 py-2 text-left text-sm hover:bg-accent",
                        i === activeIndex && "bg-accent",
                      )}
                    >
                      @{username}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="match">Match</Label>
            <select
              id="match"
              value={matchId}
              onChange={(e) => setMatchId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              {matches.length === 0 && <option value="">No open matches</option>}
              {matches.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="stake">Stake (points, optional)</Label>
            <Input
              id="stake"
              type="number"
              min={0}
              value={stake}
              onChange={(e) => setStake(e.target.value)}
            />
          </div>
          <div className="sm:col-span-3">
            <Button type="submit" disabled={busy || matches.length === 0}>
              {busy ? "Sending…" : "Send challenge"}
            </Button>
          </div>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          Stake is for bragging rights only — it&apos;s shown on the duel but isn&apos;t deducted
          from anyone&apos;s league points.
        </p>
      </CardContent>
    </Card>
  );
}
