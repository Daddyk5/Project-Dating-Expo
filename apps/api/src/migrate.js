// src/migrate.js
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const MIGRATIONS_DIR = path.join(__dirname, "..", "migrations");
const MIGRATIONS_COL = "_migrations";

function initAdmin() {
  if (admin.apps.length) return;
  // If running against prod, ensure GOOGLE_APPLICATION_CREDENTIALS is set
  // Or if running on Cloud Functions/Cloud Run, default creds are fine.
  admin.initializeApp();
}

function loadMigrations() {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{4}_.+\.js$/.test(f))
    .sort(); // lexical sort: 0001, 0002, ...
  return files.map((f) => {
    const mod = require(path.join(MIGRATIONS_DIR, f));
    if (!mod || !mod.id || typeof mod.up !== "function") {
      throw new Error(`Invalid migration file: ${f}`);
    }
    return mod;
  });
}

async function getAppliedIds(db) {
  const snap = await db.collection(MIGRATIONS_COL).orderBy("id").get();
  return new Set(snap.docs.map((d) => d.id));
}

async function runUp(db, migrations, applied) {
  for (const m of migrations) {
    if (applied.has(m.id)) continue;
    console.log(`→ Running ${m.id}`);
    await m.up(db);
    await db.collection(MIGRATIONS_COL).doc(m.id).set({
      id: m.id,
      ranAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`✓ Done ${m.id}`);
  }
  console.log("✓ All migrations up to date.");
}

async function runDown(db, migrations, applied) {
  const list = [...applied].sort();
  const last = list.pop();
  if (!last) return console.log("No migrations to roll back.");
  const mig = migrations.find((m) => m.id === last);
  if (!mig || typeof mig.down !== "function") {
    return console.log(`Migration ${last} has no down() — cannot roll back.`);
  }
  console.log(`↩ Rolling back ${last}`);
  await mig.down(db);
  await db.collection(MIGRATIONS_COL).doc(last).delete();
  console.log("✓ Rolled back.");
}

(async function main() {
  initAdmin();
  const db = admin.firestore();

  // If you want to test against emulator:
  // Windows PowerShell: $env:FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
  // macOS/Linux: export FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
  // Then run: npm run migrate:up

  const cmd = process.argv[2] || "up";
  const migrations = loadMigrations();
  const applied = await getAppliedIds(db);

  if (cmd === "up") await runUp(db, migrations, applied);
  else if (cmd === "down") await runDown(db, migrations, applied);
  else console.log("Usage: node src/migrate.js [up|down]");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
