import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { lockDueMatches } from "@/lib/services/matches";
import { Card, CardContent } from "@/components/ui/card";
import { DuelStatusBadge } from "@/components/duels/duel-status-badge";
import { ChallengeForm, type ChallengeableMatch } from "@/components/duels/challenge-form";
import { Swords } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DuelsPage() {
  const session = await auth();
  const userId = session!.user.id;

  await lockDueMatches();

  const [duels, matches] = await Promise.all([
    prisma.duel.findMany({
      where: { OR: [{ challengerId: userId }, { opponentId: userId }] },
      include: {
        match: true,
        challenger: { select: { id: true, username: true } },
        opponent: { select: { id: true, username: true } },
        winner: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    // Only open matches (still accepting predictions) can be challenged.
    prisma.match.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  const challengeableMatches: ChallengeableMatch[] = matches.map((m) => ({
    id: m.id,
    label: `${m.player1} vs ${m.player2} — ${m.tournament}${m.timeAest ? `, ${m.timeAest} AEST` : ""}`,
  }));

  const pendingIncoming = duels.filter((d) => d.status === "PENDING" && d.opponentId === userId);
  const pendingSent = duels.filter((d) => d.status === "PENDING" && d.challengerId === userId);
  const active = duels.filter((d) => d.status === "ACCEPTED");
  const finished = duels.filter((d) => ["COMPLETED", "DECLINED", "CANCELLED"].includes(d.status));

  function DuelRow({ duel }: { duel: (typeof duels)[number] }) {
    const opponentUser = duel.challengerId === userId ? duel.opponent : duel.challenger;
    const isWinner = duel.winnerId === userId;
    const isLoser = duel.status === "COMPLETED" && duel.winnerId && duel.winnerId !== userId;
    return (
      <Link href={`/duels/${duel.id}`}>
        <Card className="transition-colors hover:border-primary/40">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                vs @{opponentUser.username} · {duel.match.player1} vs {duel.match.player2}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {duel.match.tournament}
                {duel.stake ? ` · ${duel.stake} pt stake` : ""}
                {isWinner && " · You won 🏆"}
                {isLoser && " · You lost"}
              </p>
            </div>
            <DuelStatusBadge status={duel.status} />
          </CardContent>
        </Card>
      </Link>
    );
  }

  function Section({ title, items }: { title: string; items: typeof duels }) {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
        <div className="space-y-2">
          {items.map((d) => (
            <DuelRow key={d.id} duel={d} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
          <Swords className="size-7" /> Duels
        </h1>
        <p className="text-muted-foreground">Challenge a friend to a private head-to-head on any match.</p>
      </div>

      <ChallengeForm matches={challengeableMatches} />

      <div className="space-y-6">
        <Section title="Awaiting your response" items={pendingIncoming} />
        <Section title="Waiting on opponent" items={pendingSent} />
        <Section title="Live" items={active} />
        <Section title="History" items={finished} />
        {duels.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No duels yet — challenge a friend above to get started.
          </p>
        )}
      </div>
    </div>
  );
}
