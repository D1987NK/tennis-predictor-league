"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { PlusCircle } from "lucide-react";

export interface PointsAdjustableUser {
  id: string;
  username: string;
  name: string;
}

export function AddPointsForm({ users }: { users: PointsAdjustableUser[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [userId, setUserId] = useState(users[0]?.id ?? "");
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(points);
    if (!userId || !Number.isInteger(amount) || amount === 0) {
      toast({ variant: "error", title: "Choose a user and a non-zero whole number of points." });
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/admin/users/${userId}/points`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points: amount, reason }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast({ variant: "error", title: "Could not adjust points", description: data.error });
      return;
    }
    const user = users.find((u) => u.id === userId);
    toast({
      variant: "success",
      title: `${amount > 0 ? "Added" : "Deducted"} ${Math.abs(amount)} points`,
      description: `${user?.username ?? "User"} is now at ${data.totalPoints} points.`,
    });
    setPoints("");
    setReason("");
    router.refresh();
  }

  if (users.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlusCircle className="size-5" /> Add points
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="points-user">User</Label>
            <select
              id="points-user"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} (@{u.username})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="points-amount">Points (negative to deduct)</Label>
            <Input
              id="points-amount"
              type="number"
              step={1}
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="e.g. 50"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="points-reason">Reason (optional)</Label>
            <Input
              id="points-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. bug compensation"
            />
          </div>
          <div className="sm:col-span-3">
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Apply"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
