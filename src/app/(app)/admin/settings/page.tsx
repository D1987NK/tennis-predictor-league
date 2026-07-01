import { getCutoff } from "@/lib/services/settings";
import { prisma } from "@/lib/prisma";
import { CutoffSettingsForm } from "@/components/admin/cutoff-settings-form";
import { NewTournamentButton } from "@/components/admin/new-tournament-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [cutoff, matchCount, predictionCount, userCount] = await Promise.all([
    getCutoff(),
    prisma.match.count(),
    prisma.prediction.count(),
    prisma.user.count({ where: { role: "USER" } }),
  ]);

  return (
    <div className="animate-fade-in space-y-6">
      <CutoffSettingsForm enabled={cutoff.enabled} time={cutoff.time} />

      <Card className="max-w-xl border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" /> Danger zone
          </CardTitle>
          <CardDescription>
            Wipe every match, result, prediction and user score so the league starts
            completely fresh — as if it were a brand new tournament. User accounts are
            kept; only their competition data is cleared.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewTournamentButton
            matchCount={matchCount}
            predictionCount={predictionCount}
            userCount={userCount}
          />
        </CardContent>
      </Card>
    </div>
  );
}
