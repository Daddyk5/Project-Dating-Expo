// Bring the Neon "test" branch schema up to date before any test runs.
export default async function setup() {
  const { runMigrations } = await import("../scripts/migrate");
  const { pool } = await import("../src/db/client");
  await runMigrations();
  await pool.end();
}
