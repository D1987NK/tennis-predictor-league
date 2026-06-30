import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { updateCutoff, getCutoff } from "@/lib/services/settings";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(await getCutoff());
}

export async function POST(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const enabled = Boolean(body?.enabled);
  const time = typeof body?.time === "string" ? body.time.trim() : "";

  if (enabled && !/^\d{1,2}:\d{2}$/.test(time)) {
    return NextResponse.json({ error: "Enter a valid time (HH:MM)." }, { status: 400 });
  }

  await updateCutoff(enabled, time || "19:00");
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "UPDATE_SETTINGS",
      detail: { predictionCutoffEnabled: enabled, predictionCutoffTime: time || "19:00" },
    },
  });

  return NextResponse.json({ ok: true });
}
