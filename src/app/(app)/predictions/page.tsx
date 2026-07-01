import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayDate } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PredictionCard } from "@/components/prediction-card";
import { PendingPredictions } from "@/components/pending-predictions";

export const dynamic = "force-dynamic";

async function getPredictions(userId: string) {
  return prisma.prediction.findMany({
    where: { userId },
    orderBy: { match: { startsAt: "desc" } },
    include: { match: { include: { sets: { orderBy: { setNumber: "asc" } } } } },
  });
}

export default async function PredictionsPage() {
  const session = await auth();
  const predictions = await getPredictions(session!.user.id);
  const today = todayDate().getTime();

  const todays = predictions.filter((p) => p.match.matchDate.getTime() === today);
  const pending = predictions.filter((p) => p.match.status !== "FINISHED");
  const completed = predictions.filter((p) => p.match.status === "FINISHED");

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">My Predictions</h1>
        <p className="text-muted-foreground">Track your picks and points.</p>
      </div>

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">Today ({todays.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="animate-fade-in space-y-3">
          {todays.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No predictions here yet.
              </CardContent>
            </Card>
          ) : (
            todays.map((p, i) => (
              <div key={p.id} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}>
                <PredictionCard p={p} />
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="pending" className="animate-fade-in">
          <PendingPredictions predictions={pending} />
        </TabsContent>

        <TabsContent value="completed" className="animate-fade-in space-y-3">
          {completed.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No predictions here yet.
              </CardContent>
            </Card>
          ) : (
            completed.map((p, i) => (
              <div key={p.id} className="animate-fade-in" style={{ animationDelay: `${Math.min(i, 10) * 50}ms`, animationFillMode: "backwards" }}>
                <PredictionCard p={p} />
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
