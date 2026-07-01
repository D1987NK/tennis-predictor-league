import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { isParticipant, commentsOpen, extractMentionedUsernames, MAX_COMMENT_LENGTH } from "@/lib/services/duels";

async function loadDuelForAccess(duelId: string) {
  return prisma.duel.findUnique({
    where: { id: duelId },
    include: {
      match: true,
      challenger: { select: { id: true, username: true } },
      opponent: { select: { id: true, username: true } },
    },
  });
}

function canView(duel: { challengerId: string; opponentId: string }, userId: string, role: string) {
  return role === "ADMIN" || isParticipant(duel, userId);
}

// List comments (non-deleted, oldest first — chat style).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const duel = await loadDuelForAccess(params.id);
  if (!duel) return NextResponse.json({ error: "Duel not found." }, { status: 404 });
  if (!canView(duel, user.id, user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const comments = await prisma.duelComment.findMany({
    where: { duelId: duel.id, deletedAt: null },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, username: true } } },
  });

  return NextResponse.json({ comments });
}

// Post a new comment.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const duel = await loadDuelForAccess(params.id);
  if (!duel) return NextResponse.json({ error: "Duel not found." }, { status: 404 });
  if (!isParticipant(duel, user.id)) {
    return NextResponse.json({ error: "Only the two duelists can comment." }, { status: 403 });
  }
  if (!commentsOpen(duel.status)) {
    return NextResponse.json(
      { error: "Comments open once the challenge is accepted." },
      { status: 409 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const text = typeof body?.comment === "string" ? body.comment.trim() : "";
  if (!text) return NextResponse.json({ error: "Comment can't be empty." }, { status: 400 });
  if (text.length > MAX_COMMENT_LENGTH) {
    return NextResponse.json(
      { error: `Comments are limited to ${MAX_COMMENT_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const comment = await prisma.duelComment.create({
    data: { duelId: duel.id, userId: user.id, comment: text },
    include: { user: { select: { id: true, username: true } } },
  });

  // Notify the other participant — one notification per comment, worded
  // differently if they were explicitly @mentioned.
  const other = duel.challengerId === user.id ? duel.opponent : duel.challenger;
  const mentioned = extractMentionedUsernames(text, [other.username]).length > 0;
  await prisma.notification.create({
    data: {
      userId: other.id,
      title: mentioned ? `${user.username} mentioned you in your duel` : `${user.username} commented on your duel`,
      body: text.length > 140 ? `${text.slice(0, 140)}…` : text,
      meta: { duelId: duel.id },
    },
  });

  return NextResponse.json({ ok: true, comment }, { status: 201 });
}
