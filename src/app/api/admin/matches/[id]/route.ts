import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { resolveStartsAt } from "@/lib/timezone";
import { bstToAest } from "@/lib/timezone";

// Edit a match before publishing.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const existing = await prisma.match.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const timeBst = body.timeBst ?? existing.timeBst;
  const updated = await prisma.match.update({
    where: { id: params.id },
    data: {
      tournament: body.tournament ?? existing.tournament,
      round: body.round ?? existing.round,
      player1: body.player1 ?? existing.player1,
      player2: body.player2 ?? existing.player2,
      timeBst,
      timeAest: bstToAest(timeBst),
      startsAt: resolveStartsAt(existing.matchDate, timeBst),
    },
  });
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
