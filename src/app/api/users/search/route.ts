import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

// Username autocomplete for challenging a duel opponent.
export async function GET(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ users: [] });

  const users = await prisma.user.findMany({
    where: {
      username: { startsWith: q, mode: "insensitive" },
      id: { not: user.id },
    },
    select: { username: true },
    orderBy: { username: "asc" },
    take: 8,
  });

  return NextResponse.json({ users: users.map((u) => u.username) });
}
