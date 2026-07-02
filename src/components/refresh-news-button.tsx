"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function RefreshNewsButton() {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);
    const res = await fetch("/api/news?refresh=1");
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast({ variant: "error", title: "Could not refresh news", description: data.error });
      return;
    }
    toast({ variant: "success", title: "News refreshed" });
    router.refresh();
  }

  return (
    <Button size="icon" variant="ghost" onClick={refresh} disabled={busy} aria-label="Refresh news">
      <RefreshCw className={cn("size-4", busy && "animate-spin")} />
    </Button>
  );
}
