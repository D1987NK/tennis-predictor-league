import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  const userId = session!.user.id;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const scored = await prisma.prediction.findMany({
    where: { userId, pointsAwarded: { not: null } },
  });

  const totalPredictions = await prisma.prediction.count({ where: { userId } });
  const winners = scored.filter((p) => p.winnerCorrect).length;
  const scores = scored.filter((p) => p.scoreCorrect).length;
  const sets = scored.reduce((s, p) => s + p.setsCorrect, 0);
  const accuracy = scored.length ? Math.round((winners / scored.length) * 100) : 0;

  const stats = [
    { label: "Total points", value: user?.totalPoints ?? 0 },
    { label: "Rank", value: user?.rank ? `#${user.rank}` : "—" },
    { label: "Predictions made", value: totalPredictions },
    { label: "Matches scored", value: scored.length },
    { label: "Correct winners", value: winners },
    { label: "Correct scores", value: scores },
    { label: "Correct sets", value: sets },
    { label: "Winner accuracy", value: `${accuracy}%` },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold md:text-3xl">Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" value={`${user?.firstName} ${user?.lastName}`} />
          <Field label="Username" value={`@${user?.username}`} />
          <Field label="Email" value={user?.email ?? ""} />
          <Field
            label="Role"
            value={<Badge variant={user?.role === "ADMIN" ? "default" : "secondary"}>{user?.role}</Badge>}
          />
          <Field
            label="Member since"
            value={user?.createdAt.toLocaleDateString(undefined, { dateStyle: "medium" } as Intl.DateTimeFormatOptions)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your statistics</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border p-4 text-center">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
