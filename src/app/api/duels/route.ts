import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

// Create a new duel challenge.
export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const opponentUsername = typeof body?.opponentUsername === "string" ? body.opponentUsername.trim() : "";
  const matchId = typeof body?.matchId === "string" ? body.matchId : "";
  const stake = Number.isFinite(body?.stake) ? Math.max(0, Math.floor(body.stake)) : 0;

  if (!opponentUsername || !matchId) {
    return NextResponse.json({ error: "Choose an opponent and a match." }, { status: 400 });
  }

  const opponent = await prisma.user.findUnique({ where: { username: opponentUsername } });
  if (!opponent) {
    return NextResponse.json({ error: `No user found with username "${opponentUsername}".` }, { status: 404 });
  }
  if (opponent.id === user.id) {
    return NextResponse.json({ error: "You can't duel yourself." }, { status: 400 });
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return NextResponse.json({ error: "Match not found." }, { status: 404 });
  if (match.status === "FINISHED") {
    return NextResponse.json({ error: "That match has already finished." }, { status: 409 });
  }

  if (stake > 0) {
    const challenger = await prisma.user.findUnique({ where: { id: user.id }, select: { totalPoints: true } });
    if (!challenger || challenger.totalPoints < stake) {
      return NextResponse.json(
        { error: `You don't have enough points for that stake. You have ${challenger?.totalPoints ?? 0} points.` },
        { status: 409 },
      );
    }
  }

  const existing = await prisma.duel.findFirst({
    where: {
      matchId,
      status: { in: ["PENDING", "ACCEPTED"] },
      OR: [
        { challengerId: user.id, opponentId: opponent.id },
        { challengerId: opponent.id, opponentId: user.id },
      ],
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "You already have an active duel with this player for this match." },
      { status: 409 },
    );
  }

  const duel = await prisma.duel.create({
    data: {
      challengerId: user.id,
      opponentId: opponent.id,
      matchId,
      stake,
    },
  });

  await prisma.notification.create({
    data: {
      userId: opponent.id,
      title: "New duel challenge!",
      body: `${user.username} challenged you to a duel on ${match.player1} vs ${match.player2}${stake ? ` for ${stake} points` : ""}.`,
      meta: { duelId: duel.id },
    },
  });

  return NextResponse.json({ ok: true, duel }, { status: 201 });
}
