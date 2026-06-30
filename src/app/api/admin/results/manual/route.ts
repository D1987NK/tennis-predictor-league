import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { parseResultsCsv } from "@/lib/csv";
import { applyResults } from "@/lib/services/results";

const HEADER =
  "Tournament,Date,Match_Time_BST,Draw,Round,Player_1,Player_2," +
  "Set1_P1,Set1_P2,Set2_P1,Set2_P2,Set3_P1,Set3_P2,Set4_P1,Set4_P2,Set5_P1,Set5_P2,Winner,Score";

function csvField(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

interface ManualSet {
  p1?: number | string | null;
  p2?: number | string | null;
}

export async function POST(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const {
    tournament,
    date,
    timeBst,
    draw,
    round,
    player1,
    player2,
    winner,
    score,
    sets,
  }: {
    tournament: string;
    date: string;
    timeBst?: string;
    draw: string;
    round?: string;
    player1: string;
    player2: string;
    winner: string;
    score?: string;
    sets: ManualSet[];
  } = body;

  if (!tournament || !date || !draw || !player1 || !player2 || !winner) {
    return NextResponse.json(
      { error: "Tournament, date, draw, both players and winner are required." },
      { status: 400 },
    );
  }

  // Build one row in exactly the CSV format the bulk importer expects, then
  // run it through the SAME parser + apply pipeline (identical validation,
  // fuzzy player-name matching, scoring, leaderboard, notifications, audit).
  const setCells: string[] = [];
  for (let i = 0; i < 5; i++) {
    const s = sets?.[i];
    const p1 = s?.p1 ?? "";
    const p2 = s?.p2 ?? "";
    setCells.push(csvField(p1), csvField(p2));
  }

  const row = [
    csvField(tournament),
    csvField(date),
    csvField(timeBst ?? ""),
    csvField(draw),
    csvField(round ?? ""),
    csvField(player1),
    csvField(player2),
    ...setCells,
    csvField(winner),
    csvField(score ?? ""),
  ].join(",");

  const csvText = `${HEADER}\n${row}\n`;
  const { rows, errors } = parseResultsCsv(csvText);

  if (errors.length > 0 || rows.length === 0) {
    return NextResponse.json(
      { error: errors[0]?.message ?? "Could not parse the entered result." },
      { status: 400 },
    );
  }

  const summary = await applyResults(rows, { fileName: "Manual entry", adminId: admin.id });

  if (summary.matchesUnmatched > 0) {
    return NextResponse.json(
      {
        error:
          "Could not find a scheduled match for these players (need ≥90% name match). " +
          "Check the spelling against the match list.",
      },
      { status: 409 },
    );
  }

  return NextResponse.json(summary);
}
