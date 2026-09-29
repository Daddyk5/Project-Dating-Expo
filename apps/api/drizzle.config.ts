import "./src/env";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL! },
  schemaFilter: ["public"],
  // PostGIS owns these; never diff them.
  tablesFilter: ["!spatial_ref_sys", "!geography_columns", "!geometry_columns"],
});
