import { PrismaClient, type Tour } from "@prisma/client";
import bcrypt from "bcryptjs";
import { detectTour, deriveBestOf } from "../src/lib/tennis";
import { resolveStartsAt, bstToAest } from "../src/lib/timezone";
import { scorePrediction, type SetGames } from "../src/lib/scoring";

const prisma = new PrismaClient();

// "Today" for the demo data — always the REAL current UTC date (must match
// what todayDate() in src/lib/queries.ts computes, or "today's" matches
// silently vanish/mislock the moment the seed is run on a different day).
const seedRunAt = new Date();
const TODAY = new Date(
  Date.UTC(seedRunAt.getUTCFullYear(), seedRunAt.getUTCMonth(), seedRunAt.getUTCDate()),
);
const YESTERDAY = new Date(TODAY.getTime() - 24 * 60 * 60 * 1000);

interface SeedMatch {
  tournament: string;
  draw: string;
  round: string;
  timeBst: string;
  p1: string;
  p2: string;
  // result (yesterday only)
  winner?: string;
  sets?: SetGames[];
}

const todayMatches: SeedMatch[] = [
  { tournament: "Wimbledon", draw: "ATP Men's Singles", round: "Round 1", timeBst: "13:30", p1: "Carlos Alcaraz", p2: "Jan-Lennard Struff" },
  { tournament: "Wimbledon", draw: "ATP Men's Singles", round: "Round 1", timeBst: "13:30", p1: "Jannik Sinner", p2: "Miomir Kecmanovic" },
  { tournament: "Wimbledon", draw: "ATP Men's Singles", round: "Round 1", timeBst: "15:00", p1: "Novak Djokovic", p2: "Yibing Wu" },
  { tournament: "Wimbledon", draw: "ATP Men's Singles", round: "Round 1", timeBst: "15:00", p1: "Daniil Medvedev", p2: "Marin Cilic" },
  { tournament: "Wimbledon", draw: "WTA Women's Singles", round: "Round 1", timeBst: "12:30", p1: "Iga Swiatek", p2: "Emma Raducanu" },
  { tournament: "Wimbledon", draw: "WTA Women's Singles", round: "Round 1", timeBst: "12:30", p1: "Aryna Sabalenka", p2: "Teodora Kostovic" },
  { tournament: "Wimbledon", draw: "WTA Women's Singles", round: "Round 1", timeBst: "16:30", p1: "Coco Gauff", p2: "Tamara Korpatsch" },
  { tournament: "Wimbledon", draw: "WTA Women's Singles", round: "Round 1", timeBst: "14:30", p1: "Naomi Osaka", p2: "Elsa Jacquemot" },
];

const yesterdayMatches: SeedMatch[] = [
  {
    tournament: "Wimbledon", draw: "ATP Men's Singles", round: "Round 1", timeBst: "13:30",
    p1: "Taylor Fritz", p2: "Arthur Rinderknech", winner: "Taylor Fritz",
    sets: [{ p1: 6, p2: 3 }, { p1: 6, p2: 4 }, { p1: 7, p2: 5 }],
  },
  {
    tournament: "Wimbledon", draw: "ATP Men's Singles", round: "Round 1", timeBst: "13:30",
    p1: "Alexander Zverev", p2: "Roberto Bautista Agut", winner: "Alexander Zverev",
    sets: [{ p1: 6, p2: 2 }, { p1: 3, p2: 6 }, { p1: 6, p2: 4 }, { p1: 6, p2: 1 }],
  },
  {
    tournament: "Wimbledon", draw: "ATP Men's Singles", round: "Round 1", timeBst: "15:00",
    p1: "Holger Rune", p2: "Alexei Popyrin", winner: "Alexei Popyrin",
    sets: [{ p1: 4, p2: 6 }, { p1: 6, p2: 7 }, { p1: 6, p2: 3 }, { p1: 2, p2: 6 }],
  },
  {
    tournament: "Wimbledon", draw: "WTA Women's Singles", round: "Round 1", timeBst: "12:30",
    p1: "Elena Rybakina", p2: "Marketa Vondrousova", winner: "Elena Rybakina",
    sets: [{ p1: 6, p2: 4 }, { p1: 6, p2: 4 }],
  },
  {
    tournament: "Wimbledon", draw: "WTA Women's Singles", round: "Round 1", timeBst: "12:30",
    p1: "Jessica Pegula", p2: "Darja Vidmanova", winner: "Jessica Pegula",
    sets: [{ p1: 6, p2: 1 }, { p1: 6, p2: 2 }],
  },
  {
    tournament: "Wimbledon", draw: "WTA Women's Singles", round: "Round 1", timeBst: "14:30",
    p1: "Mirra Andreeva", p2: "Magda Linette", winner: "Mirra Andreeva",
    sets: [{ p1: 7, p2: 5 }, { p1: 4, p2: 6 }, { p1: 6, p2: 3 }],
  },
];

async function createMatch(
  m: SeedMatch,
  date: Date,
  finished: boolean,
  startsAtOverride?: Date,
) {
  const tour = detectTour(m.draw, m.tournament) as Tour;
  const bestOf = deriveBestOf(m.tournament, m.draw, tour);
  let finalScore: string | undefined;
  if (finished && m.sets) {
    let w1 = 0, w2 = 0;
    for (const s of m.sets) s.p1 > s.p2 ? w1++ : w2++;
    finalScore = `${w1}-${w2}`;
  }
  const match = await prisma.match.create({
    data: {
      tournament: m.tournament,
      draw: m.draw,
      tour,
      round: m.round,
      bestOf,
      matchDate: date,
      timeBst: m.timeBst,
      timeAest: bstToAest(m.timeBst),
      startsAt: startsAtOverride ?? resolveStartsAt(date, m.timeBst),
      player1: m.p1,
      player2: m.p2,
      status: finished ? "FINISHED" : "PUBLISHED",
      winner: finished ? m.winner : null,
      finalScore: finished ? finalScore : null,
    },
  });
  if (finished && m.sets) {
    await prisma.matchSet.createMany({
      data: m.sets.map((s, i) => ({
        matchId: match.id,
        setNumber: i + 1,
        player1Games: s.p1,
        player2Games: s.p2,
      })),
    });
  }
  return match;
}

async function main() {
  console.log("Seeding…");

  // Wipe (dev only) for idempotent re-seed.
  await prisma.notification.deleteMany();
  await prisma.prediction.deleteMany();
  await prisma.matchSet.deleteMany();
  await prisma.match.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.importBatch.deleteMany();
  await prisma.user.deleteMany();

  // --- Users ---
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@tennispredictor.local";
  const adminUsername = process.env.SEED_ADMIN_USERNAME ?? "admin";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";

  const admin = await prisma.user.create({
    data: {
      firstName: "Site",
      lastName: "Admin",
      username: adminUsername,
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: "ADMIN",
    },
  });

  const demoNames: [string, string, string][] = [
    ["Alice", "Anderson", "alice"],
    ["Bob", "Brown", "bob"],
    ["Carol", "Clark", "carol"],
    ["Dave", "Davis", "dave"],
  ];
  const demoUsers = [];
  for (const [first, last, uname] of demoNames) {
    demoUsers.push(
      await prisma.user.create({
        data: {
          firstName: first,
          lastName: last,
          username: uname,
          email: `${uname}@example.com`,
          passwordHash: await bcrypt.hash("Test123!", 12),
          role: "USER",
        },
      }),
    );
  }

  // --- Today's open matches ---
  // Force start times into the near future so predictions stay open for the
  // demo regardless of the wall clock when the seed runs.
  const now = Date.now();
  for (let i = 0; i < todayMatches.length; i++) {
    const startsAt = new Date(now + (i + 2) * 60 * 60 * 1000); // +2h, +3h, ...
    await createMatch(todayMatches[i], TODAY, false, startsAt);
  }

  // --- Yesterday's finished matches + scored predictions ---
  for (const m of yesterdayMatches) {
    const match = await createMatch(m, YESTERDAY, true);
    const actualSets = m.sets!;
    const actual = { winner: match.winner!, finalScore: match.finalScore!, sets: actualSets };

    for (const user of demoUsers) {
      // Each demo user predicts with varying accuracy.
      const flip = Math.random() < 0.35;
      const predictedWinner = flip ? match.player2 : match.player1;
      // Predicted sets: mostly the real sets, with some noise.
      const predictedSets: SetGames[] = actualSets.map((s) => {
        if (Math.random() < 0.5) return { p1: s.p1, p2: s.p2 };
        return { p1: Math.min(7, s.p1 + 1), p2: Math.max(0, s.p2 - 1) };
      });
      let w1 = 0, w2 = 0;
      for (const s of predictedSets) s.p1 > s.p2 ? w1++ : w2++;
      const predictedScore = `${w1}-${w2}`;

      const breakdown = scorePrediction(
        { predictedWinner, predictedScore, predictedSets },
        actual,
      );

      await prisma.prediction.create({
        data: {
          userId: user.id,
          matchId: match.id,
          predictedWinner,
          predictedScore,
          predictedSets: predictedSets as object[],
          pointsAwarded: breakdown.total,
          winnerCorrect: breakdown.winnerCorrect,
          scoreCorrect: breakdown.scoreCorrect,
          setsCorrect: breakdown.setsCorrect,
          scoredAt: new Date(),
        },
      });
    }
  }

  // --- Recompute leaderboard ---
  const users = await prisma.user.findMany({
    where: { role: "USER" },
    include: { predictions: { where: { pointsAwarded: { not: null } } } },
  });
  const totals = users
    .map((u) => ({ id: u.id, total: u.predictions.reduce((s, p) => s + (p.pointsAwarded ?? 0), 0) }))
    .sort((a, b) => b.total - a.total);
  let rank = 0, prev: number | null = null;
  for (let i = 0; i < totals.length; i++) {
    if (prev === null || totals[i].total !== prev) {
      rank = i + 1;
      prev = totals[i].total;
    }
    await prisma.user.update({
      where: { id: totals[i].id },
      data: { totalPoints: totals[i].total, rank },
    });
  }

  // Welcome notifications for demo users.
  for (const u of demoUsers) {
    await prisma.notification.create({
      data: {
        userId: u.id,
        title: "Welcome to Tennis Predictor League!",
        body: "Yesterday's results are in. Make your predictions for today's matches.",
      },
    });
  }

  console.log(`Seeded admin (${adminUsername} / ${adminPassword}), ${demoUsers.length} demo users (password: Test123!).`);
  console.log(`Matches: ${todayMatches.length} today (open), ${yesterdayMatches.length} yesterday (finished & scored).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
