/**
 * Production-safe admin creation. Unlike seed.ts, this NEVER deletes data.
 * Creates an admin user, or promotes/updates an existing one (matched by email
 * or username) to ADMIN.
 *
 * Usage:
 *   npm run db:create-admin -- <username> <email> <password> ["First" "Last"]
 *   # or via env vars:
 *   ADMIN_USERNAME=admin ADMIN_EMAIL=me@x.com ADMIN_PASSWORD='S3cret!' npm run db:create-admin
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const [argUser, argEmail, argPass, argFirst, argLast] = process.argv.slice(2);

  const username = argUser ?? process.env.ADMIN_USERNAME;
  const email = argEmail ?? process.env.ADMIN_EMAIL;
  const password = argPass ?? process.env.ADMIN_PASSWORD;
  const firstName = argFirst ?? process.env.ADMIN_FIRST_NAME ?? "Site";
  const lastName = argLast ?? process.env.ADMIN_LAST_NAME ?? "Admin";

  if (!username || !email || !password) {
    console.error(
      "Missing input. Provide username, email and password via args or " +
        "ADMIN_USERNAME / ADMIN_EMAIL / ADMIN_PASSWORD env vars.",
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: { role: "ADMIN", passwordHash, firstName, lastName },
    });
    console.log(`Updated existing user "${updated.username}" -> role ADMIN (password reset).`);
  } else {
    const created = await prisma.user.create({
      data: { username, email, passwordHash, firstName, lastName, role: "ADMIN" },
    });
    console.log(`Created admin "${created.username}" <${created.email}>.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
