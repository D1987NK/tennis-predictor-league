"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export function NotificationBell({ count }: { count: number }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(count);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = await res.json();
      setItems(data.notifications);
      setUnread(data.unread);
    }
  }

  async function markAllRead() {
    await fetch("/api/notifications", { method: "POST", body: JSON.stringify({}) });
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) load();
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Button variant="ghost" size="icon" onClick={toggle} aria-label="Notifications" className="relative">
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b p-3">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "border-b p-3 last:border-0",
                    !n.read && "bg-primary/5",
                  )}
                >
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
