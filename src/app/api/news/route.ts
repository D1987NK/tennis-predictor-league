import { NextResponse } from "next/server";
import { requireUser, requireAdmin } from "@/lib/auth";
import { getTennisNews } from "@/lib/services/news";

// GET: today's tennis news. Serves the DB cache while it's under a day old;
// refreshes automatically via the Claude API (web search) once it's stale.
// Regular users can't trigger a refresh; admins can force one with
// ?refresh=1, bypassing the 1-day cache.
export async function GET(req: Request) {
  const forceRefresh = new URL(req.url).searchParams.get("refresh") === "1";

  try {
    if (forceRefresh) {
      await requireAdmin();
    } else {
      await requireUser();
    }
  } catch {
    return NextResponse.json(
      { error: forceRefresh ? "Forbidden" : "Unauthenticated" },
      { status: forceRefresh ? 403 : 401 },
    );
  }

  try {
    const news = await getTennisNews({ force: forceRefresh });
    return NextResponse.json(news);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch news." },
      { status: 502 },
    );
  }
}
