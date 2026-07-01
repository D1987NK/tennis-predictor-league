import { NextResponse } from "next/server";
import type { MatchStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { resolveStartsAt, bstToAest } from "@/lib/timezone";
import { deriveOpenStatus } from "@/lib/services/matches";
import { getCutoff } from "@/lib/services/settings";

// Edit a match — used both for pending (not-yet-published) matches and for
// correcting the time of an already-published match (e.g. fixing a wrong
// import time, or re-opening a match that auto-locked prematurely).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const existing = await prisma.match.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const timeBst = body.timeBst ?? existing.timeBst;
  const startsAt = resolveStartsAt(existing.matchDate, timeBst);

  // If the match is already live (published or locked), re-evaluate whether
  // it should be open or locked based on the NEW time — otherwise moving a
  // match's time into the future wouldn't actually reopen it for predictions.
  let status: MatchStatus = existing.status;
  if (existing.status === "PUBLISHED" || existing.status === "LOCKED") {
    const cutoff = await getCutoff();
    status = deriveOpenStatus(startsAt, existing.matchDate, cutoff);
  }

  const updated = await prisma.match.update({
    where: { id: params.id },
    data: {
      tournament: body.tournament ?? existing.tournament,
      round: body.round ?? existing.round,
      player1: body.player1 ?? existing.player1,
      player2: body.player2 ?? existing.player2,
      timeBst,
      timeAest: bstToAest(timeBst),
      startsAt,
      status,
    },
  });

  if (status !== existing.status) {
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: "EDIT_MATCH_TIME",
        detail: { matchId: updated.id, timeBst, oldStatus: existing.status, newStatus: status },
      },
    });
  }

  return NextResponse.json({ ok: true, match: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.match.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
