import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const [logs, imports] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { username: true } } },
    }),
    prisma.importBatch.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { uploadedBy: { select: { username: true } } },
    }),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-2 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle>Import history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {imports.length === 0 && <p className="text-sm text-muted-foreground">No imports yet.</p>}
          {imports.map((b) => (
            <div key={b.id} className="rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between">
                <Badge variant={b.type === "RESULTS" ? "default" : "secondary"}>{b.type}</Badge>
                <span className="text-xs text-muted-foreground">
                  {b.createdAt.toLocaleString()}
                </span>
              </div>
              <p className="mt-1 truncate text-muted-foreground">{b.fileName ?? "—"}</p>
              <p className="text-xs text-muted-foreground">
                {b.rowsValid}/{b.rowsTotal} ok · {b.rowsInvalid} issues · by @{b.uploadedBy?.username ?? "system"}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {logs.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
          {logs.map((l) => (
            <div key={l.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
              <div>
                <Badge variant="outline">{l.action}</Badge>
                <span className="ml-2 text-xs text-muted-foreground">@{l.user?.username ?? "system"}</span>
              </div>
              <span className="text-xs text-muted-foreground">{l.createdAt.toLocaleString()}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
