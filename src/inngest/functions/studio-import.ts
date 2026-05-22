import { inngest } from "../client";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { client, importJob } from "@/db/schema";
import { createId } from "@paralleldrive/cuid2";
import {
  setupMindbodyImport,
  runImportPhase,
  completeMindbodyImport,
} from "@/features/studio/import/server/mindbody-import-service";
import { parseCsv, type MindbodyFileKind } from "@/features/studio/import/lib/mindbody-csv";

interface ImportRow {
  name?: string;
  email?: string;
  phone?: string;
  notes?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

async function parseCsvFromUrl(url: string): Promise<Record<string, string>[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    return parseCsv(await res.text()).rows;
  } catch {
    return [];
  }
}

function mapRow(raw: Record<string, string>, mapping: Record<string, string>): ImportRow {
  const result: ImportRow = {};
  for (const [field, csvCol] of Object.entries(mapping)) {
    if (csvCol && raw[csvCol] !== undefined) {
      (result as Record<string, string>)[field] = raw[csvCol];
    }
  }
  return result;
}

const CLIENT_BATCH_SIZE = 500;
const STRUCTURE_BATCH_SIZE = 2000;

export const processStudioImport = inngest.createFunction(
  { id: "studio-import-process", retries: 1, concurrency: { limit: 2 } },
  { event: "studio/import.process" },
  async ({ event, step }) => {
    const { importJobId, organizationId } = event.data as {
      importJobId: string;
      organizationId: string;
    };

    const job = await step.run("load-job", async () => {
      return db.query.importJob.findFirst({
        where: and(eq(importJob.id, importJobId), eq(importJob.organizationId, organizationId)),
      });
    });

    if (!job) return { skipped: true, reason: "job not found" };
    if (job.status !== "PENDING") return { skipped: true, reason: "job already started" };

    if (job.source === "MINDBODY") {
      const setup = await step.run("setup-mindbody", async () => {
        return setupMindbodyImport({ importJobId, organizationId });
      });

      if (!setup.success) return { success: false, reason: "setup failed" };

      const ec = setup.entityCounts;
      const k = (kinds: MindbodyFileKind[], fetchKinds?: MindbodyFileKind[]) => ({
        kinds,
        fetchKinds: fetchKinds ?? kinds,
      });

      // ── Structure (locations first so other steps can resolve locationIds) ──

      await step.run("import-locations", async () => {
        return runImportPhase({ importJobId, organizationId, phase: "structure", ...k(["locations"]) });
      });

      await step.run("import-trainers", async () => {
        return runImportPhase({ importJobId, organizationId, phase: "structure", ...k(["trainers"]) });
      });

      await step.run("import-products", async () => {
        return runImportPhase({ importJobId, organizationId, phase: "structure", ...k(["products"]) });
      });

      // ── Clients (batched — must run before contracts/pricing which depend on clientIds) ──

      const clientCount = ec.clients ?? 0;
      const clientBatches = clientCount > CLIENT_BATCH_SIZE
        ? Math.ceil(clientCount / CLIENT_BATCH_SIZE)
        : 1;

      for (let i = 0; i < clientBatches; i++) {
        const stepName = clientBatches === 1 ? "import-clients" : `import-clients-${i}`;
        await step.run(stepName, async () => {
          return runImportPhase({
            importJobId,
            organizationId,
            phase: "clients",
            ...(clientBatches > 1 ? { batchIndex: i, batchSize: CLIENT_BATCH_SIZE } : {}),
          });
        });
      }

      // ── Contracts & pricing (depend on clients existing) ──

      const contractCount = ec.clientAutopayContracts ?? 0;
      const contractBatches = contractCount > STRUCTURE_BATCH_SIZE
        ? Math.ceil(contractCount / STRUCTURE_BATCH_SIZE)
        : 1;

      for (let i = 0; i < contractBatches; i++) {
        const stepName = contractBatches === 1 ? "import-autopay-contracts" : `import-autopay-contracts-${i}`;
        await step.run(stepName, async () => {
          return runImportPhase({
            importJobId, organizationId, phase: "structure",
            ...k(["clientAutopayContracts"]),
            ...(contractBatches > 1 ? { batchIndex: i, batchSize: STRUCTURE_BATCH_SIZE } : {}),
          });
        });
      }

      const pricingCount = ec.clientPricingOptions ?? 0;
      const pricingBatches = pricingCount > STRUCTURE_BATCH_SIZE
        ? Math.ceil(pricingCount / STRUCTURE_BATCH_SIZE)
        : 1;

      for (let i = 0; i < pricingBatches; i++) {
        const stepName = pricingBatches === 1 ? "import-pricing-options" : `import-pricing-options-${i}`;
        await step.run(stepName, async () => {
          return runImportPhase({
            importJobId, organizationId, phase: "structure",
            ...k(["clientPricingOptions"]),
            ...(pricingBatches > 1 ? { batchIndex: i, batchSize: STRUCTURE_BATCH_SIZE } : {}),
          });
        });
      }

      // ── Activity (per-kind) ──

      await step.run("import-visits", async () => {
        return runImportPhase({
          importJobId, organizationId, phase: "activity",
          ...k(["visitData", "reservationData"]),
        });
      });

      await step.run("import-payments", async () => {
        return runImportPhase({ importJobId, organizationId, phase: "activity", ...k(["payments"]) });
      });

      await step.run("import-sales", async () => {
        return runImportPhase({ importJobId, organizationId, phase: "activity", ...k(["clientSales"]) });
      });

      await step.run("import-linking", async () => {
        return runImportPhase({
          importJobId, organizationId, phase: "activity",
          ...k(["visitPaymentLinking", "accountBalances"]),
        });
      });

      // ── Metadata (per-kind) ──

      await step.run("import-notes", async () => {
        return runImportPhase({
          importJobId, organizationId, phase: "metadata",
          ...k(["notes", "contactLogs", "appointmentNotes"]),
        });
      });

      await step.run("import-relationships", async () => {
        return runImportPhase({
          importJobId, organizationId, phase: "metadata",
          ...k(["clientRelationships"]),
        });
      });

      // ── Documents & completion ──

      await step.run("import-documents", async () => {
        return runImportPhase({ importJobId, organizationId, phase: "documents" });
      });

      const result = await step.run("complete-mindbody", async () => {
        return completeMindbodyImport({ importJobId, organizationId });
      });

      return { success: result.success };
    }

    // ─── Generic CSV import (non-Mindbody) ───────────────────────────────

    await step.run("mark-processing", async () => {
      await db
        .update(importJob)
        .set({ status: "PROCESSING", startedAt: new Date(), updatedAt: new Date() })
        .where(eq(importJob.id, importJobId));
    });

    const rows = await step.run("parse-csv", async () => {
      if (!job.rawFileUrl) return [];
      return parseCsvFromUrl(job.rawFileUrl);
    });

    if (rows.length === 0) {
      await db
        .update(importJob)
        .set({
          status: "FAILED",
          completedAt: new Date(),
          errorLog: [{ error: "No rows found in CSV" }],
          updatedAt: new Date(),
        })
        .where(eq(importJob.id, importJobId));
      return { success: false, reason: "empty csv" };
    }

    const mapping =
      job.columnMapping &&
      typeof job.columnMapping === "object" &&
      !Array.isArray(job.columnMapping)
        ? (job.columnMapping as Record<string, string>)
        : {};

    await step.run("update-total", async () => {
      await db
        .update(importJob)
        .set({ totalRecords: rows.length, updatedAt: new Date() })
        .where(eq(importJob.id, importJobId));
    });

    const errors: Array<{ row: number; error: string }> = [];
    let processed = 0;
    let failed = 0;

    const BATCH_SIZE = 50;
    for (let batchStart = 0; batchStart < rows.length; batchStart += BATCH_SIZE) {
      const batch = rows.slice(batchStart, batchStart + BATCH_SIZE);

      await step.run(`process-batch-${batchStart}`, async () => {
        for (let i = 0; i < batch.length; i++) {
          const rowIndex = batchStart + i + 1;
          const mapped = mapRow(batch[i], mapping);

          if (!mapped.email || !mapped.name) {
            errors.push({ row: rowIndex, error: "Missing required name or email" });
            failed++;
            continue;
          }

          try {
            const existing = await db.query.client.findFirst({
              where: and(eq(client.organizationId, organizationId), eq(client.email, mapped.email)),
              columns: { id: true },
            });

            if (!existing) {
              await db.insert(client).values({
                  id: createId(),
                  organizationId,
                  name: mapped.name,
                  email: mapped.email,
                  phone: mapped.phone ?? undefined,
                  type: "LEAD",
                  emergencyContactName: mapped.emergencyContactName ?? undefined,
                  emergencyContactPhone: mapped.emergencyContactPhone ?? undefined,
                  updatedAt: new Date(),
              });
            }

            processed++;
          } catch (err) {
            errors.push({
              row: rowIndex,
              error: err instanceof Error ? err.message : "Unknown error",
            });
            failed++;
          }
        }

        await db
          .update(importJob)
          .set({
            processedRecords: sql`${importJob.processedRecords} + ${batch.length - failed}`,
            failedRecords: sql`${importJob.failedRecords} + ${failed}`,
            updatedAt: new Date(),
          })
          .where(eq(importJob.id, importJobId));
        failed = 0;
      });
    }

    await step.run("complete-job", async () => {
      await db
        .update(importJob)
        .set({
          status: errors.length === rows.length ? "FAILED" : "COMPLETED",
          completedAt: new Date(),
          errorLog: errors.slice(0, 100),
          updatedAt: new Date(),
        })
        .where(eq(importJob.id, importJobId));
    });

    return { success: true, processed, failed: errors.length };
  }
);
