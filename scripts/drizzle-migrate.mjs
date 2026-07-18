import { config } from "dotenv";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Pool } from "pg";
import pgConnectionString from "pg-connection-string";

const explicitDatabaseUrl =
  process.env.DRIZZLE_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.DIRECT_URL;

config({ path: ".env.local" });
config({ path: ".env" });

const databaseUrl =
  explicitDatabaseUrl ||
  process.env.DRIZZLE_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.DIRECT_URL;

if (!databaseUrl) {
  throw new Error("DRIZZLE_DATABASE_URL, DATABASE_URL, or DIRECT_URL is missing");
}

const parseConnectionString =
  pgConnectionString.parse ?? pgConnectionString;

const poolConfig = parseConnectionString(databaseUrl, {
  useLibpqCompat: !/[?&]uselibpqcompat=/i.test(databaseUrl),
});

const pool = new Pool({ ...poolConfig, max: 1 });
const db = drizzle(pool);

async function prepareMigrationsFolder() {
  const result = await pool.query(`
    SELECT NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_tables
      WHERE schemaname = 'public'
    ) AS "isPristine"
  `);

  const isPristine = result.rows[0]?.isPristine === true;
  const temporaryRoot = await mkdtemp(join(tmpdir(), "aurea-drizzle-"));
  const temporaryMigrations = join(temporaryRoot, "drizzle");
  await cp("./drizzle", temporaryMigrations, { recursive: true });
  const cleanup = () => rm(temporaryRoot, { force: true, recursive: true });
  if (!isPristine) {
    return { folder: temporaryMigrations, cleanup };
  }

  const baselinePath = "./drizzle/0000_prisma_baseline.sql";
  const baseline = await readFile(baselinePath, "utf8");
  const openingMarker =
    "-- If you want to run this migration please uncomment this code before executing migrations\n/*\n";
  const openingIndex = baseline.indexOf(openingMarker);
  const closingIndex = baseline.lastIndexOf("\n*/");

  if (openingIndex === -1 || closingIndex <= openingIndex) {
    return { folder: "./drizzle", cleanup: async () => undefined };
  }

  let executableBaseline = baseline.slice(
    openingIndex + openingMarker.length,
    closingIndex,
  );
  let studioRenames = await readFile(
    "./drizzle/0001_studio-renames.sql",
    "utf8",
  );

  // The old introspection emitted mismatched built-in operator classes on
  // several indexes. Let PostgreSQL choose the default class during bootstrap;
  // migration 0003 still recreates the historically corrected indexes.
  const removeBuiltInIndexOperatorClasses = (sql) =>
    sql.replace(/CREATE (?:UNIQUE )?INDEX [^;]+;/g, (statement) =>
      statement.replace(
        /\s+(?:bool|date|enum|int4|text|timestamp)_ops(?=[,)])/g,
        "",
      ),
    );
  executableBaseline = removeBuiltInIndexOperatorClasses(executableBaseline);
  studioRenames = removeBuiltInIndexOperatorClasses(studioRenames);

  const webVitalForeignKey =
    'ALTER TABLE "FunnelWebVital" ADD CONSTRAINT "FunnelWebVital_sessionId_fkey"';
  if (!executableBaseline.includes(webVitalForeignKey)) {
    throw new Error("Baseline FunnelWebVital session foreign key is missing");
  }
  executableBaseline = executableBaseline.replace(
    webVitalForeignKey,
    'CREATE UNIQUE INDEX "FunnelSession_sessionId_key" ON "FunnelSession" USING btree ("sessionId");--> statement-breakpoint\n' +
      webVitalForeignKey,
  );
  await writeFile(
    join(temporaryMigrations, "0000_prisma_baseline.sql"),
    executableBaseline,
    "utf8",
  );
  await writeFile(
    join(temporaryMigrations, "0001_studio-renames.sql"),
    studioRenames,
    "utf8",
  );

  console.log("Preparing the introspected baseline for a clean database");
  return {
    folder: temporaryMigrations,
    cleanup,
  };
}

async function applyMigrationsIndividually(folder) {
  const journalPath = join(folder, "meta", "_journal.json");
  const journal = JSON.parse(await readFile(journalPath, "utf8"));
  if (!Array.isArray(journal.entries)) {
    throw new Error("Drizzle migration journal has no entries");
  }

  const cutoff = process.env.DRIZZLE_MIGRATION_CUTOFF;
  const cutoffIndex = cutoff
    ? journal.entries.findIndex((entry) => entry.tag === cutoff)
    : journal.entries.length - 1;
  if (cutoff && cutoffIndex === -1) {
    throw new Error(`Migration cutoff ${cutoff} was not found in the journal`);
  }
  const entries = journal.entries.slice(0, cutoffIndex + 1);

  for (let index = 0; index < entries.length; index += 1) {
    const stagedJournal = {
      ...journal,
      entries: entries.slice(0, index + 1),
    };
    await writeFile(
      journalPath,
      `${JSON.stringify(stagedJournal, null, 2)}\n`,
      "utf8",
    );
    await migrate(db, { migrationsFolder: folder });
  }
}

const migrations = await prepareMigrationsFolder();
try {
  await applyMigrationsIndividually(migrations.folder);
  console.log("Drizzle migrations applied");
} finally {
  await migrations.cleanup();
  await pool.end();
}
