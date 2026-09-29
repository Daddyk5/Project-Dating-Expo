import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const [{ version }] = await sql`SELECT version()`;
console.log(version);
