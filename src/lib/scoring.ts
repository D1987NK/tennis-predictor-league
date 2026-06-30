// Scoring engine.
//
// Points:
//   Correct winner            -> +15
//   Correct exact match score -> +15  (e.g. predicted "3-1", actual "3-1")
//   Each correct set score    -> +10  (exact games for both players in that set)
//
// Max for best-of-5: 15 + 15 + 5*10 = 80
// Max for best-of-3: 15 + 15 + 3*10 = 60
// Set points are only available for sets that were actually played.

export const POINTS = {
  WINNER: 15,
  SCORE: 15,
  SET: 10,
} as const;

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
  let setsCorrect = 0;
  for (let i = 0; i < result.sets.length; i++) {
    const actual = result.sets[i];
    const predicted = prediction.predictedSets[i];
    if (
      predicted &&
      Number(predicted.p1) === Number(actual.p1) &&
      Number(predicted.p2) === Number(actual.p2)
    ) {
      setsCorrect++;
    }
  }

  const winnerPoints = winnerCorrect ? POINTS.WINNER : 0;
  const scorePoints = scoreCorrect ? POINTS.SCORE : 0;
  const setPoints = setsCorrect * POINTS.SET;

  return {
    winnerCorrect,
    scoreCorrect,
    setsCorrect,
    winnerPoints,
    scorePoints,
    setPoints,
    total: winnerPoints + scorePoints + setPoints,
  };
}

/** Maximum points obtainable for a match given best-of. */
export function maxPoints(bestOf: number): number {
  return POINTS.WINNER + POINTS.SCORE + bestOf * POINTS.SET;
}
