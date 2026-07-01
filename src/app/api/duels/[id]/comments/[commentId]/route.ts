import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withinEditWindow, MAX_COMMENT_LENGTH, EDIT_WINDOW_MINUTES } from "@/lib/services/duels";

// Edit your own comment, within the edit window.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; commentId: string } },
) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const comment = await prisma.duelComment.findUnique({ where: { id: params.commentId } });
  if (!comment || comment.duelId !== params.id || comment.deletedAt) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }
  if (comment.userId !== user.id) {
    return NextResponse.json({ error: "You can only edit your own comments." }, { status: 403 });
  }
  if (!withinEditWindow(comment.createdAt)) {
    return NextResponse.json(
      { error: `Comments can only be edited within ${EDIT_WINDOW_MINUTES} minutes of posting.` },
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

  const updated = await prisma.duelComment.update({
    where: { id: comment.id },
    data: { comment: text, editedAt: new Date() },
    include: { user: { select: { id: true, username: true } } },
  });

  return NextResponse.json({ ok: true, comment: updated });
}

// Soft-delete a comment — the author any time, or an admin for moderation.
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; commentId: string } },
) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const comment = await prisma.duelComment.findUnique({ where: { id: params.commentId } });
  if (!comment || comment.duelId !== params.id || comment.deletedAt) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }

  const isOwner = comment.userId === user.id;
  const isAdmin = user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.duelComment.update({ where: { id: comment.id }, data: { deletedAt: new Date() } });

  if (isAdmin && !isOwner) {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "DELETE_DUEL_COMMENT",
        detail: { commentId: comment.id, duelId: comment.duelId, authorId: comment.userId },
      },
    });
  }

  return NextResponse.json({ ok: true });
}
