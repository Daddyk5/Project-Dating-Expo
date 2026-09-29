import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) }).parsed ?? {};
const testDb = process.env.TEST_DATABASE_URL ?? root.TEST_DATABASE_URL;
if (!testDb) throw new Error("Set TEST_DATABASE_URL (Neon 'test' branch) — see .env.example");
if (testDb === (process.env.DATABASE_URL ?? root.DATABASE_URL)) {
  throw new Error("TEST_DATABASE_URL must point at a different branch than DATABASE_URL");
}

const testEnv = { NODE_ENV: "test", DATABASE_URL: testDb, DATABASE_URL_UNPOOLED: testDb };
// Global setup (migrations) runs in this process; test.env only reaches the workers.
Object.assign(process.env, testEnv);

export default defineConfig({
  test: {
    env: testEnv,
    globalSetup: ["./test/global-setup.ts"],
    setupFiles: ["./test/setup.ts"],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
