import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { totalPoints: "desc" }],
    include: { _count: { select: { predictions: true } } },
  });

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle>Users ({users.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="hidden grid-cols-[1fr_1fr_6rem_6rem_6rem] gap-2 border-b px-4 py-2 text-xs font-semibold text-muted-foreground md:grid">
          <span>Name</span>
          <span>Email</span>
          <span className="text-center">Points</span>
          <span className="text-center">Predictions</span>
          <span className="text-center">Role</span>
        </div>
        {users.map((u) => (
          <div
            key={u.id}
            className="grid grid-cols-2 gap-2 border-b px-4 py-3 text-sm last:border-0 md:grid-cols-[1fr_1fr_6rem_6rem_6rem]"
          >
            <span>
              <span className="font-medium">{u.firstName} {u.lastName}</span>
              <span className="block text-xs text-muted-foreground">@{u.username}</span>
            </span>
            <span className="truncate text-muted-foreground">{u.email}</span>
            <span className="text-right md:text-center">{u.totalPoints}</span>
            <span className="hidden text-center text-muted-foreground md:block">{u._count.predictions}</span>
            <span className="hidden justify-center md:flex">
              <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>{u.role}</Badge>
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
