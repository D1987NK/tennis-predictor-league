import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { registerSchema } from "@/lib/validations";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { firstName, lastName, username, email, password } = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
    select: { username: true, email: true },
  });
  if (existing) {
    const field = existing.username === username ? "username" : "email";
    return NextResponse.json(
      { error: `That ${field} is already taken.`, field },
      { status: 409 },
    );
  }

  await prisma.user.create({
    data: {
      firstName,
      lastName,
      username,
      email,
      passwordHash: await hashPassword(password),
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
