import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { fileURLToPath } from "node:url";
import { db, pool } from "../src/db/client";

export async function runMigrations() {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)) });
}

if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/")}` || process.argv[1]?.endsWith("migrate.ts")) {
  const branch = process.env.NEON_BRANCH ?? "unknown";
  console.log(`Applying migrations to Neon branch "${branch}"...`);
  await runMigrations();
  console.log("Migrations up to date.");
  await pool.end();
}
