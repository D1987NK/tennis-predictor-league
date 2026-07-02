import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

// Opponent accepts or declines a pending challenge.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const action = body?.action;
  if (action !== "accept" && action !== "decline") {
    return NextResponse.json({ error: "action must be 'accept' or 'decline'." }, { status: 400 });
  }

  const duel = await prisma.duel.findUnique({
    where: { id: params.id },
    include: { match: true, challenger: { select: { username: true } } },
  });
  if (!duel) return NextResponse.json({ error: "Duel not found." }, { status: 404 });
  if (duel.opponentId !== user.id) {
    return NextResponse.json({ error: "Only the challenged player can respond." }, { status: 403 });
  }
  if (duel.status !== "PENDING") {
    return NextResponse.json({ error: "This challenge has already been responded to." }, { status: 409 });
  }

  if (action === "accept" && duel.stake > 0) {
    const opponent = await prisma.user.findUnique({ where: { id: user.id }, select: { totalPoints: true } });
    if (!opponent || opponent.totalPoints < duel.stake) {
      return NextResponse.json(
        { error: `You need at least ${duel.stake} points to accept this stake.` },
        { status: 409 },
      );
    }
  }

  const newStatus = action === "accept" ? "ACCEPTED" : "DECLINED";
  const updated = await prisma.duel.update({ where: { id: duel.id }, data: { status: newStatus } });

  await prisma.notification.create({
    data: {
      userId: duel.challengerId,
      title: action === "accept" ? "Duel accepted!" : "Duel declined",
      body: `${user.username} ${action === "accept" ? "accepted" : "declined"} your duel challenge on ${duel.match.player1} vs ${duel.match.player2}.`,
      meta: { duelId: duel.id },
    },
  });

  return NextResponse.json({ ok: true, duel: updated });
}
