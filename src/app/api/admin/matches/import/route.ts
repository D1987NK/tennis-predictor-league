import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { parseMatchesCsv } from "@/lib/csv";
import { parseFlexibleDate, resolveStartsAt } from "@/lib/timezone";

export async function POST(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const dateStr = String(formData.get("date") || "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  const matchDate = parseFlexibleDate(dateStr);
  if (!matchDate) {
    return NextResponse.json({ error: "Provide a valid match date (YYYY-MM-DD)." }, { status: 400 });
  }

  const text = await file.text();
  const { rows, errors, total } = parseMatchesCsv(text);

  let created = 0;
  let duplicates = 0;
  for (const m of rows) {
    try {
      await prisma.match.create({
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
      created++;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        duplicates++;
      } else {
        throw e;
      }
    }
  }

  const summary = {
    total,
    created,
    duplicates,
    invalid: errors.length,
    errors,
  };

  await prisma.importBatch.create({
    data: {
      type: "MATCHES",
      fileName: file.name,
      uploadedById: admin.id,
      rowsTotal: total,
      rowsValid: created,
      rowsInvalid: errors.length + duplicates,
      summary: { created, duplicates, invalid: errors.length },
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "IMPORT_MATCHES",
      detail: { fileName: file.name, created, duplicates, date: dateStr },
    },
  });

  return NextResponse.json(summary);
}
