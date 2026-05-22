import { config } from "dotenv";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

config({ path: ".env.local" });
config({ path: ".env" });

const databaseUrl =
  process.env.DRIZZLE_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.DIRECT_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing");
}

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

try {
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Drizzle migrations applied");
} finally {
  await pool.end();
}
