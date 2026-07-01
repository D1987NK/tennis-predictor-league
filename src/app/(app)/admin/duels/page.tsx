import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { DuelStatusBadge } from "@/components/duels/duel-status-badge";

export const dynamic = "force-dynamic";

export default async function AdminDuelsPage() {
  const duels = await prisma.duel.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      match: true,
      challenger: { select: { username: true } },
      opponent: { select: { username: true } },
      winner: { select: { username: true } },
      _count: { select: { comments: true } },
    },
  });

  return (
    <div className="space-y-3 animate-fade-in">
      <p className="text-sm text-muted-foreground">
        All duels across the league. Open one to view or moderate its comment thread.
      </p>
      {duels.length === 0 && <p className="text-sm text-muted-foreground">No duels yet.</p>}
      {duels.map((d) => (
        <Link key={d.id} href={`/duels/${d.id}`}>
          <Card className="transition-colors hover:border-primary/40">
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  @{d.challenger.username} vs @{d.opponent.username} · {d.match.player1} vs {d.match.player2}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {d.match.tournament}
                  {d.stake ? ` · ${d.stake} pt stake` : ""} · {d._count.comments} comment
                  {d._count.comments === 1 ? "" : "s"}
                  {d.winner && ` · won by @${d.winner.username}`}
                </p>
              </div>
              <DuelStatusBadge status={d.status} />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
