import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canPredict } from "@/lib/services/matches";
import { getCutoff } from "@/lib/services/settings";
import { isParticipant } from "@/lib/services/duels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DuelStatusBadge } from "@/components/duels/duel-status-badge";
import { DuelActions } from "@/components/duels/duel-actions";
import { CommentThread } from "@/components/duels/comment-thread";
import { ArrowLeft, Lock } from "lucide-react";

export const dynamic = "force-dynamic";

function PredictionBox({
  label,
  prediction,
}: {
  label: string;
  prediction: { predictedWinner: string; predictedScore: string; pointsAwarded: number | null } | null;
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {prediction ? (
        <>
          <p className="mt-1 text-sm font-semibold">{prediction.predictedWinner}</p>
          <p className="text-xs text-muted-foreground">Score: {prediction.predictedScore}</p>
          {prediction.pointsAwarded !== null && (
            <p className="mt-1 text-xs font-medium text-primary">{prediction.pointsAwarded} pts</p>
          )}
        </>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">No prediction made</p>
      )}
    </div>
  );
}

export default async function DuelDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const userId = session!.user.id;
  const isAdmin = session!.user.role === "ADMIN";

  const duel = await prisma.duel.findUnique({
    where: { id: params.id },
    include: {
      match: true,
      challenger: { select: { id: true, username: true } },
      opponent: { select: { id: true, username: true } },
      winner: { select: { id: true, username: true } },
    },
  });

  if (!duel) notFound();
  if (!isAdmin && !isParticipant(duel, userId)) notFound();

  const [myPrediction, opponentPrediction, comments, cutoff] = await Promise.all([
    prisma.prediction.findUnique({ where: { userId_matchId: { userId, matchId: duel.matchId } } }),
    prisma.prediction.findUnique({
      where: {
        userId_matchId: {
          userId: duel.challengerId === userId ? duel.opponentId : duel.challengerId,
          matchId: duel.matchId,
        },
      },
    }),
    prisma.duelComment.findMany({
      where: { duelId: duel.id, deletedAt: null },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, username: true } } },
    }),
    getCutoff(),
  ]);

  const opponentUser = duel.challengerId === userId ? duel.opponent : duel.challenger;
  const predictionsOpen = canPredict(duel.match.status, duel.match.startsAt, duel.match.matchDate, cutoff);
  const showOpponentPrediction = isAdmin || !predictionsOpen;

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <Link href="/duels" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to duels
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>
              {duel.match.player1} vs {duel.match.player2}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {duel.match.tournament}
              {duel.stake ? ` · ${duel.stake} pt stake` : ""}
            </p>
            <p className="mt-1 text-sm">
              You vs <span className="font-medium">@{opponentUser.username}</span>
              {duel.winner && (
                <span className="ml-2 font-medium text-primary">
                  {duel.winnerId === userId ? "You won 🏆" : `@${duel.winner.username} won`}
                </span>
              )}
            </p>
          </div>
          <DuelStatusBadge status={duel.status} />
        </CardHeader>
        <CardContent className="space-y-4">
          <DuelActions
            duelId={duel.id}
            viewerIsChallenger={duel.challengerId === userId}
            viewerIsOpponent={duel.opponentId === userId}
            status={duel.status}
          />
          <div className="grid grid-cols-2 gap-3">
            <PredictionBox label="Your prediction" prediction={myPrediction} />
            {showOpponentPrediction ? (
              <PredictionBox label={`@${opponentUser.username}'s prediction`} prediction={opponentPrediction} />
            ) : (
              <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-3 text-center">
                <Lock className="size-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Hidden until the match starts
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trash talk</CardTitle>
        </CardHeader>
        <CommentThread
          duelId={duel.id}
          currentUserId={userId}
          isAdmin={isAdmin}
          otherUsername={opponentUser.username}
          initialComments={comments.map((c) => ({
            id: c.id,
            comment: c.comment,
            createdAt: c.createdAt.toISOString(),
            editedAt: c.editedAt ? c.editedAt.toISOString() : null,
            user: c.user,
          }))}
          open={duel.status === "ACCEPTED" || duel.status === "COMPLETED"}
        />
      </Card>
    </div>
  );
}
