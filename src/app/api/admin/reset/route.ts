import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// Reset the competition: clears predictions, results & scores. Keeps users.
// Optionally also deletes matches when { matches: true } is sent.
export async function POST(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const alsoMatches = body?.matches === true;

  await prisma.$transaction(async (tx) => {
    await tx.notification.deleteMany();
    await tx.prediction.deleteMany();
    if (alsoMatches) {
      await tx.matchSet.deleteMany();
      await tx.match.deleteMany();
    } else {
      // Keep matches but clear results & revert to PUBLISHED.
      await tx.matchSet.deleteMany();
      await tx.match.updateMany({
        data: { winner: null, finalScore: null, status: "PUBLISHED" },
      });
    }
    await tx.user.updateMany({
      where: { role: "USER" },
      data: { totalPoints: 0, rank: null },
    });
  });

  await prisma.auditLog.create({
    data: { userId: admin.id, action: "RESET_COMPETITION", detail: { alsoMatches } },
  });

  return NextResponse.json({ ok: true });
}
