import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { recomputeLeaderboard } from "@/lib/services/leaderboard";

// Manually add (or subtract, via a negative amount) points for a user —
// e.g. a bonus, a correction, or a penalty. Folded into totalPoints via
// User.bonusPoints so it survives the next leaderboard recompute.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const points = Number.isInteger(body?.points) ? body.points : NaN;
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 280) : "";

  if (!Number.isInteger(points) || points === 0) {
    return NextResponse.json({ error: "Enter a non-zero whole number of points." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user || user.role !== "USER") {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { bonusPoints: { increment: points } },
  });

  // Re-fold predictions + stakes + the new bonus into totalPoints/rank for everyone.
  await recomputeLeaderboard();

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "ADJUST_USER_POINTS",
      detail: { targetUserId: user.id, targetUsername: user.username, points, reason: reason || null },
    },
  });

  await prisma.notification.create({
    data: {
      userId: user.id,
      title: points > 0 ? `An admin added ${points} points to your total!` : `An admin deducted ${Math.abs(points)} points from your total.`,
      body: reason || "No reason was given.",
      meta: { adjustedPoints: points },
    },
  });

  const refreshed = await prisma.user.findUnique({ where: { id: user.id } });

  return NextResponse.json({ ok: true, totalPoints: refreshed?.totalPoints ?? updated.totalPoints });
}
