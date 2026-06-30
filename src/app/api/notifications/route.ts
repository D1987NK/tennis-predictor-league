import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const unread = notifications.filter((n) => !n.read).length;
  return NextResponse.json({ notifications, unread });
}

// Mark all (or specific) notifications as read.
export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const ids: string[] | undefined = body?.ids;
  await prisma.notification.updateMany({
    where: { userId: user.id, ...(ids ? { id: { in: ids } } : {}) },
    data: { read: true },
  });
  return NextResponse.json({ ok: true });
}
