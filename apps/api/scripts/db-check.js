import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";

dotenv.config({ path: new URL("../../../.env", import.meta.url) });

const sql = neon(process.env.DATABASE_URL);
const [{ version }] = await sql`SELECT version()`;
console.log(version);
