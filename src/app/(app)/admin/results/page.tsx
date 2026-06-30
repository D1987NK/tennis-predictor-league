import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TourBadge } from "@/components/tour-badge";
import { ResultsImportForm } from "@/components/admin/results-import";
import { ResetButton } from "@/components/admin/reset-button";

export const dynamic = "force-dynamic";

export default async function AdminResultsPage() {
  const finished = await prisma.match.findMany({
    where: { status: "FINISHED" },
    orderBy: { matchDate: "desc" },
    take: 30,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <ResultsImportForm />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recently finished ({finished.length})</CardTitle>
          <ResetButton />
        </CardHeader>
        <CardContent className="space-y-2">
          {finished.length === 0 ? (
            <p className="text-sm text-muted-foreground">No results imported yet.</p>
          ) : (
            finished.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-md border p-2 text-sm">
                <TourBadge tour={m.tour} />
                <span className="min-w-0 flex-1 truncate">{m.player1} vs {m.player2}</span>
                <Badge variant="success">{m.winner} {m.finalScore}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
