// Scoring engine.
//
// Points:
//   Correct winner              -> +15
//   Correct exact match score   -> +15  (e.g. predicted "3-1", actual "3-1")
//   Each set, correct winner    -> +10  (predicted the right player to win that set,
//                                        regardless of the exact games)
//   Each set, exact score too   -> +10  (additional bonus, on top of the above,
//                                        when the exact games also match)
//
// A fully-correct set is therefore worth 20 (10 + 10); a set where only the
// winner was called right is worth 10. Set points are only available for sets
// that were actually played.
//
// Max for best-of-5: 15 + 15 + 5*20 = 130
// Max for best-of-3: 15 + 15 + 3*20 = 90

export const POINTS = {
  WINNER: 15,
  SCORE: 15,
  SET_WINNER: 10,
  SET_EXACT: 10,
} as const;

/** Points for one fully-correct set (winner + exact score). */
export const POINTS_PER_SET = POINTS.SET_WINNER + POINTS.SET_EXACT;

export interface SetGames {
  p1: number;
  p2: number;
}

export interface PredictionInput {
  predictedWinner: string;
  predictedScore: string; // "3-1"
  predictedSets: SetGames[];
}

export interface ResultInput {
  winner: string;
  finalScore: string; // "3-1"
  sets: SetGames[]; // actual sets played, in order
}

export interface ScoreBreakdown {
  winnerCorrect: boolean;
  scoreCorrect: boolean;
  /** Sets where the predicted set-winner matches the actual set-winner (any score). */
  setWinnersCorrect: number;
  /** Sets where the exact games also matched (subset of setWinnersCorrect). */
  setsCorrect: number;
  winnerPoints: number;
  scorePoints: number;
  setPoints: number;
  total: number;
}

function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function normScore(s: string): string {
  return s.trim().replace(/\s/g, "");
}

/** Score a single prediction against an actual result. */
export function scorePrediction(
  prediction: PredictionInput,
  result: ResultInput,
): ScoreBreakdown {
  const winnerCorrect = sameName(prediction.predictedWinner, result.winner);

  const scoreCorrect = normScore(prediction.predictedScore) === normScore(result.finalScore);

  // Only sets that were actually played can earn points.
  let setWinnersCorrect = 0;
  let setsCorrect = 0;
  for (let i = 0; i < result.sets.length; i++) {
    const actual = result.sets[i];
    const predicted = prediction.predictedSets[i];
    if (!predicted) continue;

    const actualP1 = Number(actual.p1);
    const actualP2 = Number(actual.p2);
    const predictedP1 = Number(predicted.p1);
    const predictedP2 = Number(predicted.p2);

    // Exact score match implies the same set-winner, so this is always a
    // subset of the winner-only check below — the two bonuses stack.
    if (predictedP1 === actualP1 && predictedP2 === actualP2) {
      setsCorrect++;
      setWinnersCorrect++;
    } else if (predictedP1 > predictedP2 === actualP1 > actualP2) {
      setWinnersCorrect++;
    }
  }

  const winnerPoints = winnerCorrect ? POINTS.WINNER : 0;
  const scorePoints = scoreCorrect ? POINTS.SCORE : 0;
  const setPoints = setWinnersCorrect * POINTS.SET_WINNER + setsCorrect * POINTS.SET_EXACT;

  return {
    winnerCorrect,
    scoreCorrect,
    setWinnersCorrect,
    setsCorrect,
    winnerPoints,
    scorePoints,
    setPoints,
    total: winnerPoints + scorePoints + setPoints,
  };
}

/** Maximum points obtainable for a match given best-of. */
export function maxPoints(bestOf: number): number {
  return POINTS.WINNER + POINTS.SCORE + bestOf * POINTS_PER_SET;
}
