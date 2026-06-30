import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppNav } from "@/components/app-nav";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/tour-badge";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const unread = await prisma.notification.count({
    where: { userId: session.user.id, read: false },
  });

  return (
    <div className="flex min-h-screen">
      <AppNav
        isAdmin={session.user.role === "ADMIN"}
        user={{ name: session.user.name, username: session.user.username }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar (in the content column so it spans full width) */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-card/95 px-4 py-3 pt-safe backdrop-blur md:hidden">
          <Logo className="text-lg" />
          <div className="flex items-center gap-1">
            <NotificationBell count={unread} />
            <ThemeToggle />
          </div>
        </header>
        {/* Desktop top bar */}
        <header className="hidden items-center justify-end gap-1 border-b bg-card/50 px-6 py-3 md:flex">
          <NotificationBell count={unread} />
          <ThemeToggle />
        </header>
        {/* pb-bottom-nav keeps content clear of the fixed mobile tab bar */}
        <main className="flex-1 p-4 pb-bottom-nav md:p-8 md:pb-8">{children}</main>
      </div>
    </div>
  );
}
