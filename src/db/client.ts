import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse, toClientConfig } from "pg-connection-string";
import { Pool } from "pg";

import * as relations from "./relations";
import * as tables from "./schema";

export const dbSchema = {
  ...tables,
  ...relations,
};

type DbSchema = typeof dbSchema;
export type Database = NodePgDatabase<DbSchema>;

// Runtime traffic should use the pooled URL when one is configured.
// DIRECT_URL is reserved for migration/admin paths that need a direct session.
const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing");
}

const poolConfig = toClientConfig(
  parse(connectionString, {
    useLibpqCompat: !/[?&]uselibpqcompat=/i.test(connectionString),
  }),
);

const globalForDrizzle = globalThis as unknown as {
  drizzleDb?: Database;
  drizzlePool?: Pool;
};

export const dbPool =
  globalForDrizzle.drizzlePool ??
  new Pool({
    ...poolConfig,
    max: 10,
  });

export const db = globalForDrizzle.drizzleDb ?? drizzle(dbPool, { schema: dbSchema });

if (process.env.NODE_ENV !== "production") {
  globalForDrizzle.drizzleDb = db;
  globalForDrizzle.drizzlePool = dbPool;
}

export default db;
