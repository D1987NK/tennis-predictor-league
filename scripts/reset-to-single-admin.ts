/**
 * DESTRUCTIVE. Wipes ALL data (users, matches, predictions, results,
 * notifications, audit logs, imports) and leaves exactly one ADMIN user.
 *
 * Usage:
 *   npx tsx scripts/reset-to-single-admin.ts <username> <email> <password> ["First" "Last"]
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const [username, email, password, firstName = username, lastName = "Admin"] =
    process.argv.slice(2);

  if (!username || !email || !password) {
    console.error("Usage: tsx scripts/reset-to-single-admin.ts <username> <email> <password>");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  // Wipe everything (respecting FK order).
  await prisma.notification.deleteMany();
  await prisma.prediction.deleteMany();
  await prisma.matchSet.deleteMany();
  await prisma.match.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.importBatch.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      firstName,
      lastName,
      username,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: "ADMIN",
    },
  });

  const userCount = await prisma.user.count();
  console.log(
    `Database wiped. Single admin created: "${admin.username}" <${admin.email}> (total users: ${userCount}).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
