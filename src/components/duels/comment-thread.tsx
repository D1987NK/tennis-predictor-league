"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { Send, Pencil, Trash2, Check, X } from "lucide-react";

const MAX_COMMENT_LENGTH = 500;
const EDIT_WINDOW_MS = 10 * 60 * 1000;
const POLL_MS = 5000;

export interface DuelCommentDto {
  id: string;
  comment: string;
  createdAt: string;
  editedAt: string | null;
  user: { id: string; username: string };
}

function initials(username: string) {
  return username.slice(0, 2).toUpperCase();
}

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

/** Renders comment text with @mentions of a known username highlighted. */
function MentionText({ text, mentionable }: { text: string; mentionable: string }) {
  const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
  return (
    <>
      {parts.map((part, i) => {
        const isMention =
          part.startsWith("@") && part.slice(1).toLowerCase() === mentionable.toLowerCase();
        return isMention ? (
          <span key={i} className="font-semibold text-primary">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </>
  );
}

export function CommentThread({
  duelId,
  currentUserId,
  isAdmin,
  otherUsername,
  initialComments,
  open,
}: {
  duelId: string;
  currentUserId: string;
  isAdmin: boolean;
  otherUsername: string;
  initialComments: DuelCommentDto[];
  open: boolean;
}) {
  const { toast } = useToast();
  const [comments, setComments] = useState(initialComments);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialScroll = useRef(false);

  async function refresh() {
    const res = await fetch(`/api/duels/${duelId}/comments`);
    if (res.ok) {
      const data = await res.json();
      setComments(data.comments);
    }
  }

  useEffect(() => {
    const interval = setInterval(refresh, POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duelId]);

  useEffect(() => {
    if (!initialScroll.current) {
      initialScroll.current = true;
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  async function send() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    const res = await fetch(`/api/duels/${duelId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment: trimmed }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      toast({ variant: "error", title: "Could not post comment", description: data.error });
      return;
    }
    setComments((prev) => [...prev, data.comment]);
    setText("");
  }

  function startEdit(c: DuelCommentDto) {
    setEditingId(c.id);
    setEditText(c.comment);
  }

  async function saveEdit(id: string) {
    const trimmed = editText.trim();
    if (!trimmed) return;
    const res = await fetch(`/api/duels/${duelId}/comments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment: trimmed }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast({ variant: "error", title: "Could not edit", description: data.error });
      return;
    }
    setComments((prev) => prev.map((c) => (c.id === id ? data.comment : c)));
    setEditingId(null);
  }

  async function remove(id: string) {
    const res = await fetch(`/api/duels/${duelId}/comments/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast({ variant: "error", title: "Could not delete", description: data.error });
      return;
    }
    setComments((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="flex flex-col">
      <div className="max-h-[28rem] space-y-3 overflow-y-auto p-4">
        {comments.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No comments yet — say hello 👋
          </p>
        )}
        {comments.map((c) => {
          const mine = c.user.id === currentUserId;
          const canEdit = mine && Date.now() - new Date(c.createdAt).getTime() < EDIT_WINDOW_MS;
          const canDelete = mine || isAdmin;
          const isEditing = editingId === c.id;

          return (
            <div key={c.id} className={cn("flex animate-fade-in gap-2", mine && "flex-row-reverse")}>
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                {initials(c.user.username)}
              </div>
              <div className={cn("group max-w-[75%] space-y-1", mine && "items-end text-right")}>
                <div className={cn("flex items-baseline gap-2", mine && "flex-row-reverse")}>
                  <span className="text-xs font-semibold">{c.user.username}</span>
                  <span className="text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
                  {c.editedAt && <span className="text-[10px] text-muted-foreground">(edited)</span>}
                </div>

                {isEditing ? (
                  <div className="space-y-1">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      maxLength={MAX_COMMENT_LENGTH}
                      className="w-full rounded-lg border bg-background p-2 text-sm"
                      rows={2}
                    />
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => saveEdit(c.id)}>
                        <Check className="size-4 text-primary" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "inline-block rounded-2xl px-3 py-2 text-sm",
                      mine ? "bg-primary text-primary-foreground" : "bg-muted",
                    )}
                  >
                    <MentionText text={c.comment} mentionable={otherUsername} />
                  </div>
                )}

                {!isEditing && (canEdit || canDelete) && (
                  <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    {canEdit && (
                      <button
                        onClick={() => startEdit(c)}
                        className="text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="mr-0.5 inline size-3" /> Edit
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => remove(c.id)}
                        className="text-[10px] text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="mr-0.5 inline size-3" /> Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {open ? (
        <div className="border-t p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              maxLength={MAX_COMMENT_LENGTH}
              placeholder={`Write a comment... (mention @${otherUsername})`}
              rows={1}
              className="max-h-32 flex-1 resize-none rounded-lg border bg-background p-2 text-sm"
            />
            <Button size="icon" onClick={send} disabled={sending || !text.trim()}>
              <Send className="size-4" />
            </Button>
          </div>
          <p className="mt-1 text-right text-[10px] text-muted-foreground">
            {text.length}/{MAX_COMMENT_LENGTH}
          </p>
        </div>
      ) : (
        <p className="border-t p-3 text-center text-xs text-muted-foreground">
          Comments open once the challenge is accepted.
        </p>
      )}
    </div>
  );
}
