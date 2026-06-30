// CSV parsing & validation for match imports and results imports.
// Tolerant to header naming/spacing variants ("Player 1" / "Player_1").

import Papa from "papaparse";
import { detectTour, deriveBestOf, parseScore, type Tour } from "./tennis";
import { bstToAest } from "./timezone";

export interface RowError {
  row: number; // 1-based data row (excludes header)
  message: string;
  raw?: Record<string, string>;
}

export interface ParsedMatch {
  tournament: string;
  draw: string;
  tour: Tour;
  bestOf: number;
  round: string | null;
  timeBst: string | null;
  timeAest: string | null;
  player1: string;
  player2: string;
  status: string;
}

export interface ParsedResult {
  tournament: string;
  date: string; // raw date string from CSV
  timeBst: string | null;
  draw: string;
  round: string | null;
  player1: string;
  player2: string;
  sets: { p1: number; p2: number }[];
  winner: string;
  finalScore: string;
}

export interface ParseOutcome<T> {
  rows: T[];
  errors: RowError[];
  total: number;
}

/** Normalise a header key: lowercase, collapse non-alphanumerics. */
function normKey(k: string): string {
  return k.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function rowGet(row: Record<string, string>, ...candidates: string[]): string {
  const normed: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) normed[normKey(k)] = v;
  for (const c of candidates) {
    const v = normed[normKey(c)];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function rawHas(row: Record<string, string>, ...candidates: string[]): boolean {
  const present = new Set(Object.keys(row).map(normKey));
  return candidates.some((c) => present.has(normKey(c)));
}

function parseCsv(text: string): Record<string, string>[] {
  const res = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  return (res.data || []).filter((r) =>
    Object.values(r).some((v) => v !== undefined && String(v).trim() !== ""),
  );
}

/**
 * Parse the daily MATCHES csv.
 * Expected columns: Tournament, Draw, Time (BST), Time (AEST), Player 1, Player 2, Status
 */
export function parseMatchesCsv(text: string): ParseOutcome<ParsedMatch> {
  const rows = parseCsv(text);
  const out: ParsedMatch[] = [];
  const errors: RowError[] = [];

  if (rows.length === 0) {
    return { rows: [], errors: [{ row: 0, message: "CSV is empty or has no data rows." }], total: 0 };
  }

  // Validate required columns exist (based on first row's keys).
  const sample = rows[0];
  const required = [["Tournament"], ["Draw"], ["Player 1", "Player_1"], ["Player 2", "Player_2"]];
  for (const cands of required) {
    if (!rawHas(sample, ...cands)) {
      errors.push({ row: 0, message: `Missing required column: ${cands[0]}` });
    }
  }
  if (errors.length) return { rows: [], errors, total: rows.length };

  const seen = new Set<string>();
  rows.forEach((row, i) => {
    const n = i + 1;
    const tournament = rowGet(row, "Tournament");
    const draw = rowGet(row, "Draw");
    const player1 = rowGet(row, "Player 1", "Player_1");
    const player2 = rowGet(row, "Player 2", "Player_2");
    const timeBst = rowGet(row, "Time (BST)", "Time BST", "Match_Time_BST") || null;
    const timeAestRaw = rowGet(row, "Time (AEST)", "Time AEST") || null;
    const status = rowGet(row, "Status") || "Upcoming";
    const round = rowGet(row, "Round") || null;

    if (!tournament || !draw || !player1 || !player2) {
      errors.push({ row: n, message: "Missing tournament, draw, or player name.", raw: row });
      return;
    }
    const tour = detectTour(draw, tournament);
    if (!tour) {
      errors.push({
        row: n,
        message: `Cannot identify ATP/WTA from draw "${draw}".`,
        raw: row,
      });
      return;
    }
    const dupKey = `${tournament}|${player1}|${player2}`.toLowerCase();
    if (seen.has(dupKey)) {
      errors.push({ row: n, message: "Duplicate match in file.", raw: row });
      return;
    }
    seen.add(dupKey);

    out.push({
      tournament,
      draw,
      tour,
      bestOf: deriveBestOf(tournament, draw, tour),
      round,
      timeBst,
      timeAest: timeAestRaw ?? bstToAest(timeBst),
      player1,
      player2,
      status,
    });
  });

  return { rows: out, errors, total: rows.length };
}

/**
 * Parse the RESULTS csv.
 * Expected: Tournament, Date, Match_Time_BST, Draw, Round, Player_1, Player_2,
 *           Set1_P1..Set5_P2, Winner, Score
 */
export function parseResultsCsv(text: string): ParseOutcome<ParsedResult> {
  const rows = parseCsv(text);
  const out: ParsedResult[] = [];
  const errors: RowError[] = [];

  if (rows.length === 0) {
    return { rows: [], errors: [{ row: 0, message: "CSV is empty or has no data rows." }], total: 0 };
  }

  const sample = rows[0];
  const required = [
    ["Tournament"],
    ["Player_1", "Player 1"],
    ["Player_2", "Player 2"],
    ["Winner"],
  ];
  for (const cands of required) {
    if (!rawHas(sample, ...cands)) {
      errors.push({ row: 0, message: `Missing required column: ${cands[0]}` });
    }
  }
  if (errors.length) return { rows: [], errors, total: rows.length };

  rows.forEach((row, i) => {
    const n = i + 1;
    const tournament = rowGet(row, "Tournament");
    const date = rowGet(row, "Date");
    const draw = rowGet(row, "Draw");
    const player1 = rowGet(row, "Player_1", "Player 1");
    const player2 = rowGet(row, "Player_2", "Player 2");
    const winner = rowGet(row, "Winner");
    let finalScore = rowGet(row, "Score");

    if (!tournament || !player1 || !player2) {
      errors.push({ row: n, message: "Missing tournament or player name.", raw: row });
      return;
    }
    if (!winner) {
      errors.push({ row: n, message: "Missing winner.", raw: row });
      return;
    }

    // Collect set games for sets that were actually played (both > 0).
    const sets: { p1: number; p2: number }[] = [];
    for (let s = 1; s <= 5; s++) {
      const p1 = rowGet(row, `Set${s}_P1`, `Set ${s} P1`, `Set${s}P1`);
      const p2 = rowGet(row, `Set${s}_P2`, `Set ${s} P2`, `Set${s}P2`);
      if (p1 === "" && p2 === "") continue;
      const g1 = Number(p1);
      const g2 = Number(p2);
      if (Number.isNaN(g1) || Number.isNaN(g2)) {
        errors.push({ row: n, message: `Set ${s} has non-numeric games.`, raw: row });
        return;
      }
      // A 0-0 set means "not played" (scraper placeholder) -> skip.
      if (g1 === 0 && g2 === 0) continue;
      sets.push({ p1: g1, p2: g2 });
    }

    // Validate winner is one of the two players.
    if (
      winner.trim().toLowerCase() !== player1.trim().toLowerCase() &&
      winner.trim().toLowerCase() !== player2.trim().toLowerCase()
    ) {
      errors.push({ row: n, message: `Winner "${winner}" is not one of the two players.`, raw: row });
      return;
    }

    // Derive final score from sets if not supplied.
    if (!finalScore) {
      let w1 = 0;
      let w2 = 0;
      for (const set of sets) {
        if (set.p1 > set.p2) w1++;
        else if (set.p2 > set.p1) w2++;
      }
      finalScore = `${w1}-${w2}`;
    }
    if (!parseScore(finalScore)) {
      errors.push({ row: n, message: `Invalid score "${finalScore}".`, raw: row });
      return;
    }

    out.push({
      tournament,
      date,
      timeBst: rowGet(row, "Match_Time_BST", "Time (BST)", "Time BST") || null,
      draw,
      round: rowGet(row, "Round") || null,
      player1,
      player2,
      sets,
      winner,
      finalScore,
    });
  });

  return { rows: out, errors, total: rows.length };
}

/** Build a CSV error report (downloadable) from row errors. */
export function buildErrorReport(errors: RowError[]): string {
  const header = "Row,Error\n";
  const body = errors
    .map((e) => `${e.row},"${e.message.replace(/"/g, '""')}"`)
    .join("\n");
  return header + body + "\n";
}
