import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { parseResultsCsv, buildErrorReport } from "@/lib/csv";
import { applyResults } from "@/lib/services/results";

export async function POST(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  const text = await file.text();
  const { rows, errors, total } = parseResultsCsv(text);

  const summary = await applyResults(rows, { fileName: file.name, adminId: admin.id });

  return NextResponse.json({
    total,
    validRows: rows.length,
    invalidRows: errors.length,
    errors,
    errorReport: errors.length ? buildErrorReport(errors) : null,
    ...summary,
  });
}
