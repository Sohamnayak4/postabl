// Runs lib/schema.sql against the Neon database in DATABASE_URL.
// Idempotent (all CREATEs use IF NOT EXISTS).
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { config as loadEnv } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(__dirname, "..", ".env.local") });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Populate .env.local first.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const schemaPath = path.join(__dirname, "..", "lib", "schema.sql");
const schema = await readFile(schemaPath, "utf8");

// Strip full-line SQL comments before splitting. Otherwise a statement
// block that starts with a comment header (e.g. "-- Upgrade older
// deployments …") looks like a comment-only chunk after splitting on ";"
// and gets silently skipped by the startsWith("--") filter below —
// which is how ALTER TABLE statements were being dropped on the floor.
const cleaned = schema
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n");

// The Neon HTTP driver's `.query()` accepts a raw SQL string. Split on ";"
// at statement boundaries so each CREATE runs independently (the driver
// does not accept multi-statement strings).
const statements = cleaned
  .split(/;\s*$/m)
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

for (const stmt of statements) {
  const preview = stmt.split("\n")[0].slice(0, 80);
  process.stdout.write(`→ ${preview} ... `);
  try {
    await sql.query(stmt);
    console.log("ok");
  } catch (err) {
    console.log("FAILED");
    console.error(err);
    process.exit(1);
  }
}

console.log("\n✓ Migration complete.");
