"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { Clock } from "lucide-react";

function to12h(time: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m) return time;
  const h = Number(m[1]);
  return `${((h + 11) % 12) + 1}:${m[2]} ${h >= 12 ? "PM" : "AM"}`;
}

export function CutoffSettingsForm({
  enabled: initialEnabled,
  time: initialTime,
}: {
  enabled: boolean;
  time: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [time, setTime] = useState(initialTime);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled, time }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast({ variant: "error", title: "Could not save", description: data.error });
      return;
    }
    toast({
      variant: "success",
      title: "Settings saved",
      description: enabled
        ? `Predictions now lock at ${to12h(time)} AEST.`
        : "Daily cut-off disabled.",
    });
    router.refresh();
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="size-5" /> Prediction cut-off
        </CardTitle>
        <CardDescription>
          Set a daily deadline (Australian Eastern time, AEST / UTC+10) after which users can no
          longer add or change predictions. Matches still lock individually when they start.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="size-5 rounded border-input"
          />
          <span className="text-sm font-medium">Enable daily prediction cut-off</span>
        </label>

        <div className="space-y-2">
          <Label htmlFor="cutoff-time">Cut-off time (AEST)</Label>
          <div className="flex items-center gap-3">
            <Input
              id="cutoff-time"
              type="time"
              value={time}
              disabled={!enabled}
              onChange={(e) => setTime(e.target.value)}
              className="w-40"
            />
            {enabled && (
              <span className="text-sm text-muted-foreground">= {to12h(time)} AEST</span>
            )}
          </div>
          {!enabled && (
            <p className="text-xs text-muted-foreground">
              Cut-off is off — predictions only lock when each match starts.
            </p>
          )}
        </div>

        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
