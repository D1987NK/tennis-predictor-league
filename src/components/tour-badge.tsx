import { Badge } from "@/components/ui/badge";

export function TourBadge({ tour }: { tour: "ATP" | "WTA" }) {
  return (
    <Badge variant={tour === "ATP" ? "atp" : "wta"} className="gap-1">
      🎾 {tour}
    </Badge>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="font-extrabold tracking-tight">Tennis</span>
      <span className="font-extrabold tracking-tight text-primary">Predictor</span>
    </span>
  );
}
