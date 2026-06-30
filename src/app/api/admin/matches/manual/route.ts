import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { parseMatchesCsv } from "@/lib/csv";
import { parseFlexibleDate, resolveStartsAt } from "@/lib/timezone";

function csvField(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function POST(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const {
    date,
    tournament,
    draw,
    timeBst,
    timeAest,
    player1,
    player2,
    status,
  }: {
    date: string;
    tournament: string;
    draw: string;
    timeBst?: string;
    timeAest?: string;
    player1: string;
    player2: string;
    status?: string;
  } = body;

  if (!tournament || !draw || !player1 || !player2) {
    return NextResponse.json(
      { error: "Tournament, draw, and both players are required." },
      { status: 400 },
    );
  }
  const matchDate = parseFlexibleDate(date);
  if (!matchDate) {
    return NextResponse.json({ error: "Provide a valid match date." }, { status: 400 });
  }

  // Build one row in exactly the CSV format the bulk importer expects, then
  // run it through the SAME parser (identical validation + ATP/WTA + best-of
  // detection) used by the file upload path.
  const header = "Tournament,Draw,Time (BST),Time (AEST),Player 1,Player 2,Status";
  const row = [
    csvField(tournament),
    csvField(draw),
    csvField(timeBst ?? ""),
    csvField(timeAest ?? ""),
    csvField(player1),
    csvField(player2),
    csvField(status || "Upcoming"),
  ].join(",");
  const csvText = `${header}\n${row}\n`;

  const { rows, errors } = parseMatchesCsv(csvText);
  if (errors.length > 0 || rows.length === 0) {
    return NextResponse.json(
      { error: errors[0]?.message ?? "Could not validate the entered match." },
      { status: 400 },
    );
  }
  const m = rows[0];

  try {
    const match = await prisma.match.create({
      data: {
        tournament: m.tournament,
        draw: m.draw,
        tour: m.tour,
        round: m.round,
        bestOf: m.bestOf,
        matchDate,
        timeBst: m.timeBst,
        timeAest: m.timeAest,
        startsAt: resolveStartsAt(matchDate, m.timeBst),
        player1: m.player1,
        player2: m.player2,
        status: "UPCOMING",
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: "MANUAL_ADD_MATCH",
        detail: { matchId: match.id, tournament: m.tournament, player1: m.player1, player2: m.player2 },
      },
    });

    return NextResponse.json({ ok: true, match });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "A match with this tournament, date and players already exists." },
        { status: 409 },
      );
    }
    throw e;
  }
}
