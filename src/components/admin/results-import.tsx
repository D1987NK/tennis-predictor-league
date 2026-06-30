"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { UploadCloud, CheckCircle2 } from "lucide-react";

interface ResultSummary {
  total: number;
  validRows: number;
  invalidRows: number;
  matchesUpdated: number;
  matchesUnmatched: number;
  predictionsScored: number;
  notificationsCreated: number;
  unmatched: { tournament: string; player1: string; player2: string; reason: string }[];
  errorReport: string | null;
}

export function ResultsImportForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<ResultSummary | null>(null);

  async function onImport(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return toast({ variant: "error", title: "Choose a CSV file first." });
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/results/import", { method: "POST", body: fd });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return toast({ variant: "error", title: "Import failed", description: data.error });
    setSummary(data);
    toast({
      variant: "success",
      title: "Results import complete",
      description: `${data.matchesUpdated} matches, ${data.predictionsScored} predictions scored.`,
    });
    router.refresh();
  }

  function downloadErrors() {
    if (!summary?.errorReport) return;
    const blob = new Blob([summary.errorReport], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "results_import_errors.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import official results</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onImport} className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="rfile">Results CSV</Label>
            <Input
              id="rfile"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-72"
            />
          </div>
          <Button type="submit" disabled={busy}>
            <UploadCloud className="size-4" /> {busy ? "Processing…" : "Import & score"}
          </Button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          Matches results to scheduled matches, calculates all user points, updates the leaderboard
          and notifies users automatically.
        </p>

        {summary && (
          <div className="mt-4 space-y-3 rounded-lg border p-4">
            <h3 className="flex items-center gap-2 font-semibold text-primary">
              <CheckCircle2 className="size-5" /> Results Import Complete
            </h3>
            <ul className="space-y-1 text-sm">
              <li>✓ {summary.matchesUpdated} matches updated</li>
              <li>✓ {summary.predictionsScored} predictions scored</li>
              <li>✓ Leaderboard updated</li>
              <li>✓ {summary.notificationsCreated} notifications sent</li>
              {summary.matchesUnmatched > 0 && (
                <li className="text-destructive">⚠ {summary.matchesUnmatched} result rows unmatched</li>
              )}
            </ul>
            {summary.unmatched.length > 0 && (
              <div className="rounded border border-destructive/30 bg-destructive/5 p-3 text-xs">
                <p className="mb-1 font-medium">Unmatched rows:</p>
                {summary.unmatched.slice(0, 8).map((u, i) => (
                  <p key={i} className="text-muted-foreground">
                    {u.tournament}: {u.player1} vs {u.player2}
                  </p>
                ))}
              </div>
            )}
            {summary.errorReport && (
              <Button variant="outline" size="sm" onClick={downloadErrors}>
                Download error report
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
