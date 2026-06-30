import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";

const tabs = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/matches", label: "Matches" },
  { href: "/admin/results", label: "Results" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/audit", label: "Audit & Imports" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Admin</h1>
        <p className="text-muted-foreground">Manage matches, results and users.</p>
      </div>
      <nav className="flex flex-wrap gap-2 border-b pb-2">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
