"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Check, X, Ban } from "lucide-react";

export function DuelActions({
  duelId,
  viewerIsChallenger,
  viewerIsOpponent,
  status,
}: {
  duelId: string;
  viewerIsChallenger: boolean;
  viewerIsOpponent: boolean;
  status: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  async function respond(action: "accept" | "decline") {
    setBusy(true);
    const res = await fetch(`/api/duels/${duelId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return toast({ variant: "error", title: "Failed", description: data.error });
    toast({ variant: "success", title: action === "accept" ? "Duel accepted!" : "Duel declined" });
    router.refresh();
  }

  async function cancel() {
    setBusy(true);
    const res = await fetch(`/api/duels/${duelId}/cancel`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return toast({ variant: "error", title: "Failed", description: data.error });
    toast({ variant: "success", title: "Challenge cancelled" });
    router.refresh();
  }

  if (status !== "PENDING") return null;

  if (viewerIsOpponent) {
    return (
      <div className="flex gap-2">
        <Button size="sm" onClick={() => respond("accept")} disabled={busy}>
          <Check className="size-4" /> Accept
        </Button>
        <Button size="sm" variant="outline" onClick={() => respond("decline")} disabled={busy}>
          <X className="size-4" /> Decline
        </Button>
      </div>
    );
  }

  if (viewerIsChallenger) {
    return (
      <Button size="sm" variant="ghost" onClick={cancel} disabled={busy}>
        <Ban className="size-4" /> Cancel challenge
      </Button>
    );
  }

  return null;
}
