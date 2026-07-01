"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  CalendarDays,
  ListChecks,
  Trophy,
  History,
  User,
  BarChart3,
  Shield,
  LogOut,
  MoreHorizontal,
  X,
  Swords,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Logo, BrandTagline } from "@/components/tour-badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const primaryLinks = [
  { href: "/dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { href: "/matches", label: "Today's Matches", short: "Matches", icon: CalendarDays },
  { href: "/predictions", label: "My Predictions", short: "Picks", icon: ListChecks },
  { href: "/leaderboard", label: "Leaderboard", short: "Ranks", icon: Trophy },
];

const secondaryLinks = [
  { href: "/duels", label: "Duels", icon: Swords },
  { href: "/analysis", label: "Analysis", icon: BarChart3 },
  { href: "/history", label: "History", icon: History },
  { href: "/profile", label: "Profile", icon: User },
];

export function AppNav({
  isAdmin,
  user,
}: {
  isAdmin: boolean;
  user: { name?: string | null; username: string };
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const desktopLinks = isAdmin
    ? [...primaryLinks, ...secondaryLinks, { href: "/admin", label: "Admin", icon: Shield }]
    : [...primaryLinks, ...secondaryLinks];

  const moreLinks = isAdmin
    ? [...secondaryLinks, { href: "/admin", label: "Admin", icon: Shield }]
    : secondaryLinks;

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  // Lock body scroll while the bottom sheet is open.
  useEffect(() => {
    document.body.style.overflow = moreOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [moreOpen]);

  return (
    <>
      {/* ---------- Desktop sidebar ---------- */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-card p-4 md:flex">
        <div className="px-3 py-2">
          <Link href="/dashboard">
            <Logo className="text-xl" />
          </Link>
          <BrandTagline className="mt-2 text-[11px] leading-snug" />
        </div>
        <nav className="my-4 flex flex-1 flex-col gap-1">
          {desktopLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive(l.href)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <l.icon className="size-4" />
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="rounded-lg border bg-background p-3">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-start text-muted-foreground"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="size-4" /> Logout
          </Button>
        </div>
      </aside>

      {/* ---------- Mobile bottom tab bar ---------- */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-safe backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {primaryLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "tap flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors active:scale-95",
                isActive(l.href) ? "text-primary" : "text-muted-foreground",
              )}
            >
              <l.icon className={cn("size-5", isActive(l.href) && "scale-110 transition-transform")} />
              {l.short}
            </Link>
          ))}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              "tap flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors active:scale-95",
              moreLinks.some((l) => isActive(l.href)) ? "text-primary" : "text-muted-foreground",
            )}
          >
            <MoreHorizontal className="size-5" />
            More
          </button>
        </div>
      </nav>

      {/* ---------- Mobile "More" bottom sheet ---------- */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/50 animate-fade-in"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t bg-card pb-safe animate-fade-in">
            <div className="flex items-center justify-between border-b p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setMoreOpen(false)} aria-label="Close">
                <X className="size-5" />
              </Button>
            </div>
            <div className="p-2">
              {moreLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "tap flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors active:bg-accent",
                    isActive(l.href) ? "bg-primary/10 text-primary" : "hover:bg-accent",
                  )}
                >
                  <l.icon className="size-5" />
                  {l.label}
                </Link>
              ))}
              <div className="flex items-center justify-between rounded-lg px-3 py-3">
                <span className="text-sm font-medium text-muted-foreground">Theme</span>
                <ThemeToggle />
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="tap flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-destructive transition-colors active:bg-destructive/10"
              >
                <LogOut className="size-5" /> Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
