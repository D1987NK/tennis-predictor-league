import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getTennisNews } from "@/lib/services/news";

// GET: today's tennis news. Serves the DB cache while it's under a day old;
// refreshes automatically via the Claude API (web search) once it's stale.
// There is no user-triggered refresh — this is the only way news updates.
export async function GET() {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  try {
    const news = await getTennisNews();
    return NextResponse.json(news);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch news." },
      { status: 502 },
    );
  }
}
