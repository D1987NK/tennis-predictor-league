// Domain helpers: tour detection, best-of derivation, score helpers.

export type Tour = "ATP" | "WTA";

const GRAND_SLAMS = [
  "wimbledon",
  "australian open",
  "roland garros",
  "french open",
  "us open",
];

/**
 * Identify ATP vs WTA from the Draw and/or Tournament strings.
 * Handles: "ATP Singles", "WTA Singles", "Men's Singles", "Women's Singles",
 * and tournament prefixes like "ATP Wimbledon" / "WTA Wimbledon".
 */
export function detectTour(draw: string, tournament = ""): Tour | null {
  const hay = `${draw} ${tournament}`.toLowerCase();
  if (/\bwta\b/.test(hay) || /\bwomen('|’)?s\b/.test(hay) || /\bladies\b/.test(hay)) {
    return "WTA";
  }
  if (/\batp\b/.test(hay) || /\bmen('|’)?s\b/.test(hay)) {
    return "ATP";
  }
  return null;
}

/**
 * Determine best-of (3 or 5) from tournament + draw + tour.
 * Men's singles at Grand Slams are best-of-5; everything else best-of-3.
 */
export function deriveBestOf(tournament: string, draw: string, tour: Tour): number {
  const t = tournament.toLowerCase();
  const d = draw.toLowerCase();
  const isGrandSlam = GRAND_SLAMS.some((g) => t.includes(g));
  const isSingles = d.includes("singles") || !d.includes("doubles");
  if (tour === "ATP" && isGrandSlam && isSingles) return 5;
  return 3;
}

/** Sets needed to win a best-of match. */
export function setsToWin(bestOf: number): number {
  return Math.floor(bestOf / 2) + 1;
}

/**
 * Normalise a "x-y" score string (sets won by player1-player2).
 * Returns null if not parseable.
 */
export function parseScore(score: string): { p1: number; p2: number } | null {
  const m = score.trim().match(/^(\d+)\s*[-:]\s*(\d+)$/);
  if (!m) return null;
  return { p1: Number(m[1]), p2: Number(m[2]) };
}

/** All valid match-score options for a given best-of, ordered for display. */
export function scoreOptions(bestOf: number): string[] {
  const win = setsToWin(bestOf);
  const opts: string[] = [];
  // Player 1 wins: win-(0..win-1)
  for (let l = win - 1; l >= 0; l--) opts.push(`${win}-${l}`);
  // Player 2 wins: (win-1..0)-win
  for (let l = win - 1; l >= 0; l--) opts.push(`${l}-${win}`);
  return opts;
}
