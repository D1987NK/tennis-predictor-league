/**
 * Connection check. Connects using the current DATABASE_URL and runs a trivial
 * query, then reports whether the app tables exist yet.
 *
 * Usage (PowerShell), pointing at Supabase:
 *   $env:DATABASE_URL="<your Supabase connection string>"
 *   $env:DIRECT_URL=$env:DATABASE_URL
 *   npx tsx scripts/check-db.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const url = process.env.DATABASE_URL ?? "(unset)";
  // Mask the password before printing.
  console.log("Using DATABASE_URL:", url.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:****@"));

  const result = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`;
  console.log("✅ Connected — server responded:", result);

  try {
    const users = await prisma.user.count();
    console.log(`✅ Tables exist. User count: ${users}`);
  } catch {
    console.log("ℹ️  Connected, but app tables don't exist yet (run a deploy / 'prisma migrate deploy').");
  }
}

main()
  .catch((e) => {
    console.error("❌ Connection FAILED:\n", e.message ?? e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
