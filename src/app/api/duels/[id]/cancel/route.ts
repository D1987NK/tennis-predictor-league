import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

// Challenger withdraws a still-pending challenge.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const duel = await prisma.duel.findUnique({ where: { id: params.id } });
  if (!duel) return NextResponse.json({ error: "Duel not found." }, { status: 404 });
  if (duel.challengerId !== user.id) {
    return NextResponse.json({ error: "Only the challenger can cancel." }, { status: 403 });
  }
  if (duel.status !== "PENDING") {
    return NextResponse.json({ error: "This challenge can no longer be cancelled." }, { status: 409 });
  }

  const updated = await prisma.duel.update({ where: { id: duel.id }, data: { status: "CANCELLED" } });
  return NextResponse.json({ ok: true, duel: updated });
}
