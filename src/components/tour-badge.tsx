import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function TourBadge({ tour }: { tour: "ATP" | "WTA" }) {
  return (
    <Badge variant={tour === "ATP" ? "atp" : "wta"} className="gap-1">
      🎾 {tour}
    </Badge>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="font-extrabold tracking-tight">Tennis</span>
      <span className="font-extrabold tracking-tight text-primary">Predictor</span>
      {/* Card logo hosted on Vercel Blob (public). Whole image, scales with font size. */}
      <img
        src="https://c4cizlb2akfcloys.public.blob.vercel-storage.com/Logo.png"
        alt="Tennis Predictor"
        className="ml-1 inline-block h-[2.2em] w-auto max-w-none shrink-0 object-contain align-middle"
      />
    </span>
  );
}

/**
 * Secondary Farsi (RTL) brand mark shown next to the logo. Text comes from
 * NEXT_PUBLIC_BRAND_TAGLINE (public — this renders in client components too,
 * so it must be NEXT_PUBLIC_ to be inlined into the browser bundle). Renders
 * nothing if unset.
 */
export function BrandTagline({ className }: { className?: string }) {
  const text = process.env.NEXT_PUBLIC_BRAND_TAGLINE;
  if (!text) return null;

  return (
    <span
      dir="rtl"
      lang="fa"
      className={cn(
        "inline-block rounded-full bg-wta/10 px-2 py-0.5 font-medium text-wta",
        className,
      )}
    >
      {text}
    </span>
  );
}
