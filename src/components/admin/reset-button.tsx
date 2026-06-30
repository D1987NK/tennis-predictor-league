"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { AlertTriangle } from "lucide-react";

export function ResetButton() {
  const router = useRouter();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function reset() {
    setBusy(true);
    const res = await fetch("/api/admin/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matches: false }),
    });
    setBusy(false);
    setConfirming(false);
    if (!res.ok) return toast({ variant: "error", title: "Reset failed" });
    toast({ variant: "success", title: "Competition reset", description: "Predictions & scores cleared." });
    router.refresh();
  }

  if (!confirming) {
    return (
      <Button variant="outline" onClick={() => setConfirming(true)}>
        <AlertTriangle className="size-4 text-destructive" /> Reset competition
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Clear all predictions & scores?</span>
      <Button variant="destructive" size="sm" onClick={reset} disabled={busy}>
        {busy ? "Resetting…" : "Yes, reset"}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>Cancel</Button>
    </div>
  );
}
