import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as relations from "./relations";
import * as tables from "./schema";

export const dbSchema = {
  ...tables,
  ...relations,
};

type DbSchema = typeof dbSchema;
export type Database = NodePgDatabase<DbSchema>;

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing");
}

const globalForDrizzle = globalThis as unknown as {
  drizzleDb?: Database;
  drizzlePool?: Pool;
};

export const dbPool =
  globalForDrizzle.drizzlePool ??
  new Pool({
    connectionString,
    max: 10,
  });

export const db = globalForDrizzle.drizzleDb ?? drizzle(dbPool, { schema: dbSchema });

if (process.env.NODE_ENV !== "production") {
  globalForDrizzle.drizzleDb = db;
  globalForDrizzle.drizzlePool = dbPool;
}

export default db;
