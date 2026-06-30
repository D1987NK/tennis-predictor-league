"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TourBadge } from "@/components/tour-badge";
import { useToast } from "@/components/ui/toast";
import { Trash2, Pencil, Check, X, UploadCloud } from "lucide-react";

interface PendingMatch {
  id: string;
  tournament: string;
  tour: "ATP" | "WTA";
  round: string | null;
  timeBst: string | null;
  timeAest: string | null;
  player1: string;
  player2: string;
  bestOf: number;
}

export function MatchImportForm({ defaultDate }: { defaultDate: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [date, setDate] = useState(defaultDate);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<null | {
    total: number;
    created: number;
    duplicates: number;
    invalid: number;
    errors: { row: number; message: string }[];
  }>(null);

  async function onImport(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return toast({ variant: "error", title: "Choose a CSV file first." });
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("date", date);
    const res = await fetch("/api/admin/matches/import", { method: "POST", body: fd });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return toast({ variant: "error", title: "Import failed", description: data.error });
    setResult(data);
    toast({
      variant: "success",
      title: "Import complete",
      description: `${data.created} created, ${data.duplicates} duplicates, ${data.invalid} invalid.`,
    });
    router.refresh();
  }

  function downloadErrors() {
    if (!result?.errors.length) return;
    const csv =
      "Row,Error\n" +
      result.errors.map((e) => `${e.row},"${e.message.replace(/"/g, '""')}"`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "match_import_errors.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import daily matches</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onImport} className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="date">Match date</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="file">CSV file</Label>
            <Input
              id="file"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-72"
            />
          </div>
          <Button type="submit" disabled={busy}>
            <UploadCloud className="size-4" /> {busy ? "Importing…" : "Import"}
          </Button>
        </form>

        <p className="mt-2 text-xs text-muted-foreground">
          Columns: Tournament, Draw, Time (BST), Time (AEST), Player 1, Player 2, Status.
          ATP/WTA and best-of are detected automatically.
        </p>

        {result && (
          <div className="mt-4 rounded-lg border p-4 text-sm">
            <div className="flex flex-wrap gap-4">
              <span>Rows: <b>{result.total}</b></span>
              <span className="text-primary">Created: <b>{result.created}</b></span>
              <span className="text-muted-foreground">Duplicates: <b>{result.duplicates}</b></span>
              <span className="text-destructive">Invalid: <b>{result.invalid}</b></span>
            </div>
            {result.errors.length > 0 && (
              <Button variant="outline" size="sm" className="mt-3" onClick={downloadErrors}>
                Download error report
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PublishAllButton({ date, count }: { date: string; count: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  async function publish() {
    setBusy(true);
    const res = await fetch("/api/admin/matches/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return toast({ variant: "error", title: "Publish failed", description: data.error });
    toast({ variant: "success", title: `Published ${data.published} matches.` });
    router.refresh();
  }

  return (
    <Button onClick={publish} disabled={busy || count === 0}>
      {busy ? "Publishing…" : `Publish all (${count})`}
    </Button>
  );
}

export function PendingMatchRow({ match }: { match: PendingMatch }) {
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    round: match.round ?? "",
    timeBst: match.timeBst ?? "",
    player1: match.player1,
    player2: match.player2,
  });

  async function save() {
    const res = await fetch(`/api/admin/matches/${match.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) return toast({ variant: "error", title: "Save failed" });
    toast({ variant: "success", title: "Match updated" });
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    const res = await fetch(`/api/admin/matches/${match.id}`, { method: "DELETE" });
    if (!res.ok) return toast({ variant: "error", title: "Delete failed" });
    toast({ variant: "success", title: "Match deleted" });
    router.refresh();
  }

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <Input value={form.player1} onChange={(e) => setForm({ ...form, player1: e.target.value })} className="w-40" />
        <Input value={form.player2} onChange={(e) => setForm({ ...form, player2: e.target.value })} className="w-40" />
        <Input value={form.timeBst} onChange={(e) => setForm({ ...form, timeBst: e.target.value })} placeholder="HH:MM BST" className="w-28" />
        <Input value={form.round} onChange={(e) => setForm({ ...form, round: e.target.value })} placeholder="Round" className="w-28" />
        <Button size="icon" variant="ghost" onClick={save}><Check className="size-4 text-primary" /></Button>
        <Button size="icon" variant="ghost" onClick={() => setEditing(false)}><X className="size-4" /></Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 border-b p-3 text-sm last:border-0">
      <TourBadge tour={match.tour} />
      <div className="min-w-0 flex-1">
        <span className="truncate font-medium">{match.player1} vs {match.player2}</span>
        <span className="block text-xs text-muted-foreground">
          {match.tournament}{match.round ? ` · ${match.round}` : ""} · {match.timeAest ?? "—"} AEST · Bo{match.bestOf}
        </span>
      </div>
      <Badge variant="secondary">Upcoming</Badge>
      <Button size="icon" variant="ghost" onClick={() => setEditing(true)}><Pencil className="size-4" /></Button>
      <Button size="icon" variant="ghost" onClick={remove}><Trash2 className="size-4 text-destructive" /></Button>
    </div>
  );
}
