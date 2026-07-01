"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { AlertTriangle } from "lucide-react";

const CONFIRM_PHRASE = "RESET TOURNAMENT";

export function NewTournamentButton({
  matchCount,
  predictionCount,
  userCount,
}: {
  matchCount: number;
  predictionCount: number;
  userCount: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  async function wipe() {
    setBusy(true);
    const res = await fetch("/api/admin/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matches: true }),
    });
    setBusy(false);
    if (!res.ok) {
      toast({ variant: "error", title: "Reset failed" });
      return;
    }
    setConfirming(false);
    setTyped("");
    toast({
      variant: "success",
      title: "New tournament started",
      description: "All matches, predictions and scores were cleared.",
    });
    router.refresh();
  }

  if (!confirming) {
    return (
      <Button variant="destructive" onClick={() => setConfirming(true)}>
        <AlertTriangle className="size-4" /> Start new tournament
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
      <p className="text-sm font-medium text-destructive">
        This will permanently delete:
      </p>
      <ul className="list-inside list-disc text-sm text-muted-foreground">
        <li>{matchCount} match{matchCount === 1 ? "" : "es"} (and their set scores)</li>
        <li>{predictionCount} prediction{predictionCount === 1 ? "" : "s"}</li>
        <li>Every user&apos;s points and rank (reset to zero)</li>
      </ul>
      <p className="text-sm text-muted-foreground">
        The {userCount} user account{userCount === 1 ? "" : "s"} themselves are <b>not</b> deleted —
        they can log in and start predicting fresh. This cannot be undone.
      </p>
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">
          Type <span className="font-mono font-semibold text-foreground">{CONFIRM_PHRASE}</span> to confirm
        </label>
        <Input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={CONFIRM_PHRASE}
          autoComplete="off"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="destructive"
          size="sm"
          onClick={wipe}
          disabled={busy || typed !== CONFIRM_PHRASE}
        >
          {busy ? "Deleting…" : "Permanently delete & start new tournament"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setConfirming(false);
            setTyped("");
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
