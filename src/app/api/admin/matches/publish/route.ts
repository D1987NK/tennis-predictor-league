import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { parseFlexibleDate } from "@/lib/timezone";

// Publish UPCOMING matches (by date or specific ids) -> status PUBLISHED.
export async function POST(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const ids: string[] | undefined = body?.ids;
  const date = body?.date ? parseFlexibleDate(String(body.date)) : null;

  const where = ids?.length
    ? { id: { in: ids }, status: "UPCOMING" as const }
    : date
      ? { matchDate: date, status: "UPCOMING" as const }
      : { status: "UPCOMING" as const };

  const res = await prisma.match.updateMany({ where, data: { status: "PUBLISHED" } });

  await prisma.auditLog.create({
    data: { userId: admin.id, action: "PUBLISH_MATCHES", detail: { count: res.count } },
  });

  return NextResponse.json({ published: res.count });
}
