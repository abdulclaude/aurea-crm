import { createId } from "@paralleldrive/cuid2";
import { config } from "dotenv";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import {
  classifyMindbodyFileName,
  mimeTypeForImportPath,
  parseCsv,
  readField,
  type CsvRow,
  type MindbodyFileKind,
} from "../src/features/studio/import/lib/mindbody-csv";

type JsonPrimitive = string | number | boolean | null;
type JsonObject = { [key: string]: JsonValue };
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

type ImportJobRow = {
  id: string;
  organizationId: string;
  locationId: string | null;
  rawFileUrl: string | null;
  sourceFilenames: string[] | null;
};

type ReferenceMaps = {
  clientIdByMindbodyId: Map<string, string>;
  clientIdByBarcodeId: Map<string, string>;
  productIdByExternalId: Map<string, string>;
  productTypeById: Map<string, string>;
  paymentIdByExternalId: Map<string, string>;
  paymentIdByPmtRefNo: Map<string, string>;
  paymentClientIdById: Map<string, string>;
  lineItemIdByExternalId: Map<string, string>;
  lineItemIdByPmtRefNo: Map<string, string>;
  lineItemClientIdById: Map<string, string>;
  membershipIdByContractRef: Map<string, string>;
  membershipClientIdById: Map<string, string>;
  classCreditIdByPmtRefNo: Map<string, string>;
  bookingIdByVisitRefNo: Map<string, string>;
};

const DEFAULT_EXPORT_DIR = "/Users/abdul/Downloads/Elestudio Wembley Mindbody Export";
const WRITE_BATCH_SIZE = 500;
const LOOKUP_BATCH_SIZE = 1_000;

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function uniqueNonEmpty(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function parseArgs(): { exportDir: string; importJobId: string | null } {
  const args = process.argv.slice(2);
  let exportDir = process.env.MINDBODY_EXPORT_DIR ?? DEFAULT_EXPORT_DIR;
  let importJobId = process.env.MINDBODY_IMPORT_JOB_ID ?? null;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];
    if (arg === "--export-dir" && next) {
      exportDir = next;
      index += 1;
    } else if (arg === "--job-id" && next) {
      importJobId = next;
      index += 1;
    }
  }

  return { exportDir, importJobId };
}

function now(): Date {
  return new Date();
}

function toJsonValue(value: unknown): JsonValue {
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(toJsonValue);
  if (typeof value === "object") {
    const objectValue: JsonObject = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      objectValue[key] = toJsonValue(child);
    }
    return objectValue;
  }
  return String(value);
}

function rowMetadata(row: CsvRow, fileName: string): JsonObject {
  return {
    importSource: "MINDBODY",
    sourceFile: fileName,
    raw: toJsonValue(row),
  };
}

function boolFromMindbody(value: string): boolean | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (["true", "yes", "y", "1", "active"].includes(normalized)) return true;
  if (["false", "no", "n", "0", "inactive"].includes(normalized)) return false;
  return null;
}

function parseMoney(value: string): number | null {
  const normalized = value.replace(/[£$,]/g, "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(value: string): number | null {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "0001-01-01") return null;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function makeName(firstName: string, lastName: string, fallback: string): string {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || fallback;
}

function looksLikeMindbodyIntegrationAccount(row: CsvRow): boolean {
  const identity = [
    readField(row, "DisplayName"),
    readField(row, "Firstname", "FirstName"),
    readField(row, "Lastname", "LastName"),
    readField(row, "Email"),
  ]
    .join(" ")
    .toLowerCase();

  return (
    identity.includes(" api") ||
    identity.includes("_mbo.") ||
    identity.includes("activecampaign") ||
    identity.includes("brandedweb") ||
    identity.includes("classpass") ||
    identity.includes("fitmetrix") ||
    identity.includes("gympass") ||
    identity.includes("lymber") ||
    identity.includes("schedulingmindbody") ||
    identity.includes("wellhub") ||
    identity.includes("autogration") ||
    identity.includes("apiant")
  );
}

function staffFlags(row: CsvRow): {
  isActive: boolean;
  isDeleted: boolean;
  isSystem: boolean;
  isIntegrationAccount: boolean;
  canTeachClasses: boolean;
  canTakeAppointments: boolean;
  canHandleReservations: boolean;
  canLeadWorkshops: boolean;
} {
  const isDeleted = boolFromMindbody(readField(row, "Delete")) ?? false;
  const isSystem = boolFromMindbody(readField(row, "isSystem")) ?? false;
  const isIntegrationAccount = looksLikeMindbodyIntegrationAccount(row);
  const canTeachClasses = boolFromMindbody(readField(row, "Teacher")) ?? false;

  return {
    isActive: boolFromMindbody(readField(row, "Active")) ?? true,
    isDeleted,
    isSystem,
    isIntegrationAccount,
    canTeachClasses,
    canTakeAppointments: boolFromMindbody(readField(row, "AppointmentTrn")) ?? false,
    canHandleReservations: boolFromMindbody(readField(row, "ReservationTrn")) ?? false,
    canLeadWorkshops: boolFromMindbody(readField(row, "Workshop Instructor")) ?? false,
  };
}

function staffType(row: CsvRow): string {
  const flags = staffFlags(row);
  const teachesClasses = [
    readField(row, "Teacher"),
    readField(row, "AppointmentTrn"),
    readField(row, "ReservationTrn"),
    readField(row, "Workshop Instructor"),
  ].some((value) => boolFromMindbody(value) === true);
  if (flags.isSystem || flags.isIntegrationAccount) return "SYSTEM";
  if (flags.isActive && !flags.isDeleted && teachesClasses) return "INSTRUCTOR";
  if (boolFromMindbody(readField(row, "Employee")) === true) return "TEAM_MEMBER";
  if (boolFromMindbody(readField(row, "Rep")) === true) return "SALES_REP";
  if ([readField(row, "Assistant"), readField(row, "Assistant2")].some((value) => boolFromMindbody(value) === true)) {
    return "ASSISTANT";
  }
  return "TEAM_MEMBER";
}

function productTypeFor(row: CsvRow): string {
  const category = readField(row, "CategoryName").toLowerCase();
  const itemType = readField(row, "ItemTypeName", "ItemType").toLowerCase();
  const serviceCategory = readField(row, "ServiceCategoryName", "Program/Service Category").toLowerCase();
  const description = readField(row, "Description").toLowerCase();
  const source = [itemType, category, serviceCategory, description].join(" ").toLowerCase();

  if (source.includes("tip")) return "TIP";
  if (source.includes("gift")) return "GIFT_CARD";
  if (source.includes("shipping") || source.includes("handling")) return "SHIPPING";
  if (source.includes("wellhub") || source.includes("gympass") || source.includes("classpass")) return "EXTERNAL_REVENUE";
  if (source.includes("account")) return "ACCOUNT_CREDIT";
  if (source.includes("fee")) return "FEE";
  if (source.includes("retail") || source.includes("clothing") || source.includes("merchandise")) return "RETAIL";
  if (
    category.includes("membership") ||
    serviceCategory.includes("membership") ||
    description.includes("membership") ||
    description.includes("members only") ||
    itemType.includes(" mm") ||
    itemType.endsWith("mm") ||
    source.includes("contract")
  ) {
    return "MEMBERSHIP_PLAN";
  }
  if (
    source.includes("class") ||
    source.includes("pack") ||
    source.includes("session") ||
    source.includes("series") ||
    source.includes("pip") ||
    category.includes("open days") ||
    category.includes("pay as you go")
  ) {
    return "CLASS_PACK";
  }
  return "OTHER";
}

function paymentTypeForProduct(productType: string): "MEMBERSHIP" | "CLASS_PACK" | "GIFT_CARD" | "POS" {
  if (productType === "MEMBERSHIP_PLAN") return "MEMBERSHIP";
  if (productType === "CLASS_PACK") return "CLASS_PACK";
  if (productType === "GIFT_CARD") return "GIFT_CARD";
  return "POS";
}

function numericBasenameRef(filePath: string): string {
  return filePath.match(/(\d+)(?=\.[^.]+$)/)?.[1] ?? "";
}

function numericSegmentAfter(filePath: string, segmentName: string): string {
  const segments = filePath.replace(/\\/g, "/").split("/");
  const segmentIndex = segments.findIndex((segment) => segment.toLowerCase() === segmentName.toLowerCase());
  const candidate = segmentIndex >= 0 ? segments[segmentIndex + 1] ?? "" : "";
  return /^\d+$/.test(candidate) ? candidate : "";
}

function importFileName(filePath: string): string {
  return filePath.replace(/\\/g, "/").split("/").pop()?.toLowerCase() ?? "";
}

function importRootSegment(filePath: string): string {
  return filePath.replace(/\\/g, "/").split("/")[0]?.toLowerCase() ?? "";
}

function signedWaiverClientRef(filePath: string): string {
  return importFileName(filePath).match(/signedwaiver_(\d+)/)?.[1] ?? "";
}

function shouldImportDocument(filePath: string, kind: MindbodyFileKind): boolean {
  if (kind !== "clientFile") return false;

  const rootSegment = importRootSegment(filePath);
  if (rootSegment === "contractsignatures" || rootSegment === "sales") return false;

  const fileName = importFileName(filePath);
  if (fileName.includes("contractsignature")) return false;

  return rootSegment === "files" || fileName.includes("waiver") || fileName.includes("liability");
}

function documentType(kind: MindbodyFileKind, filePath: string): "WAIVER" | "CONTRACT_SIGNATURE" | "PROFILE_FILE" | "SALE_IMAGE" | "OTHER" {
  const fileName = importFileName(filePath);
  if (kind === "saleImage") return "SALE_IMAGE";
  if (kind === "contractSignature" || fileName.includes("contractsignature")) return "CONTRACT_SIGNATURE";
  if (fileName.includes("waiver") || fileName.includes("liability")) return "WAIVER";
  if (kind === "clientFile") return "PROFILE_FILE";
  return "OTHER";
}

function documentRefs(filePath: string, kind: MindbodyFileKind): {
  clientRef: string;
  membershipRef: string;
  saleRef: string;
} {
  const basenameRef = numericBasenameRef(filePath);
  if (kind === "saleImage") return { clientRef: "", membershipRef: "", saleRef: basenameRef };
  if (kind === "contractSignature") return { clientRef: "", membershipRef: basenameRef, saleRef: "" };
  return {
    clientRef: signedWaiverClientRef(filePath) || numericSegmentAfter(filePath, "files") || basenameRef,
    membershipRef: "",
    saleRef: "",
  };
}

function nestedArchiveName(relativePath: string): string {
  const firstSegment = relativePath.replace(/\\/g, "/").split("/")[0] ?? "";
  if (firstSegment === "files") return "files.zip";
  if (firstSegment === "contractsignatures") return "contractsignatures.zip";
  if (firstSegment === "sales") return "sales.zip";
  return "";
}

function sourcePathForDocument(archiveName: string, relativePath: string): string {
  const nestedArchive = nestedArchiveName(relativePath);
  return nestedArchive ? `${archiveName}:${nestedArchive}:${relativePath}` : `${archiveName}:${relativePath}`;
}

async function readCsvRows(exportDir: string, fileName: string): Promise<CsvRow[]> {
  const contents = await readFile(path.join(exportDir, fileName), "utf8");
  return parseCsv(contents.replace(/^\uFEFF/, "")).rows;
}

async function listDocumentFiles(exportDir: string): Promise<Array<{ absolutePath: string; relativePath: string }>> {
  const roots = ["files"];
  const documents: Array<{ absolutePath: string; relativePath: string }> = [];

  async function walk(root: string): Promise<void> {
    const entries = await readdir(root);
    for (const entry of entries) {
      if (entry.startsWith(".")) continue;
      const absolutePath = path.join(root, entry);
      const stats = await stat(absolutePath);
      if (stats.isDirectory()) {
        await walk(absolutePath);
      } else if (stats.isFile()) {
        const relativePath = path.relative(exportDir, absolutePath).replace(/\\/g, "/");
        const kind = classifyMindbodyFileName(relativePath);
        if (shouldImportDocument(relativePath, kind)) {
          documents.push({ absolutePath, relativePath });
        }
      }
    }
  }

  for (const root of roots) {
    await walk(path.join(exportDir, root));
  }

  return documents;
}

async function main(): Promise<void> {
  config({ path: ".env", override: true });
  config({ path: ".env.local" });
  if (process.env.DEBUG_MINDBODY_BACKFILL === "1") {
    const connectionUrl = new URL(process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "postgresql://missing");
    console.log(`[Mindbody detail backfill] DB host: ${connectionUrl.host}`);
  }

  const { db, dbPool } = await import("../src/db");
  const schema = await import("../src/db/schema");
  const { exportDir, importJobId } = parseArgs();

  try {
    const [job] = importJobId
      ? await db
          .select({
            id: schema.importJob.id,
            organizationId: schema.importJob.organizationId,
            locationId: schema.importJob.locationId,
            rawFileUrl: schema.importJob.rawFileUrl,
            sourceFilenames: schema.importJob.sourceFilenames,
          })
          .from(schema.importJob)
          .where(eq(schema.importJob.id, importJobId))
          .limit(1)
      : await db
          .select({
            id: schema.importJob.id,
            organizationId: schema.importJob.organizationId,
            locationId: schema.importJob.locationId,
            rawFileUrl: schema.importJob.rawFileUrl,
            sourceFilenames: schema.importJob.sourceFilenames,
          })
          .from(schema.importJob)
          .where(eq(schema.importJob.source, "MINDBODY"))
          .orderBy(desc(schema.importJob.createdAt))
          .limit(1);

    if (!job) throw new Error("No Mindbody import job found. Pass --job-id if needed.");

    const importJob = job satisfies ImportJobRow;
    const archiveName = importJob.sourceFilenames?.[0] ?? "mindbody-export.zip";
    const documentStorageUrl = importJob.rawFileUrl ?? pathToFileURL(exportDir).toString();

    const clientRows = await readCsvRows(exportDir, "Clients.csv");
    const trainersRows = await readCsvRows(exportDir, "Trainers.csv");
    const salesRows = await readCsvRows(exportDir, "ClientSales.csv");
    const paymentRows = await readCsvRows(exportDir, "Payments.csv");
    const contractRows = await readCsvRows(exportDir, "ClientAutopayContracts.csv");
    const visitPaymentRows = await readCsvRows(exportDir, "VisitPaymentLinking.csv");
    const documentFiles = await listDocumentFiles(exportDir);

    const missingClientCount = await backfillMissingClients(db, schema, importJob, clientRows);

    const maps: ReferenceMaps = {
      clientIdByMindbodyId: new Map(),
      clientIdByBarcodeId: new Map(),
      productIdByExternalId: new Map(),
      productTypeById: new Map(),
      paymentIdByExternalId: new Map(),
      paymentIdByPmtRefNo: new Map(),
      paymentClientIdById: new Map(),
      lineItemIdByExternalId: new Map(),
      lineItemIdByPmtRefNo: new Map(),
      lineItemClientIdById: new Map(),
      membershipIdByContractRef: new Map(),
      membershipClientIdById: new Map(),
      classCreditIdByPmtRefNo: new Map(),
      bookingIdByVisitRefNo: new Map(),
    };

    const clients = await db
      .select({
        id: schema.client.id,
        mindbodyId: schema.client.mindbodyId,
        barcodeId: schema.client.barcodeId,
      })
      .from(schema.client)
      .where(eq(schema.client.organizationId, importJob.organizationId));
    for (const clientRow of clients) {
      if (clientRow.mindbodyId) maps.clientIdByMindbodyId.set(clientRow.mindbodyId, clientRow.id);
      if (clientRow.barcodeId) maps.clientIdByBarcodeId.set(clientRow.barcodeId, clientRow.id);
    }

    const products = await db
      .select({
        id: schema.studioProduct.id,
        externalId: schema.studioProduct.externalId,
        type: schema.studioProduct.type,
      })
      .from(schema.studioProduct)
      .where(eq(schema.studioProduct.organizationId, importJob.organizationId));
    for (const product of products) {
      if (product.externalId) maps.productIdByExternalId.set(product.externalId, product.id);
      maps.productTypeById.set(product.id, product.type);
    }

    await refreshPaymentMaps(db, schema, importJob, maps);
    await refreshLineItemMaps(db, schema, importJob, maps);

    const memberships = await db
      .select({
        id: schema.studioMembership.id,
        externalId: schema.studioMembership.externalId,
        clientId: schema.studioMembership.clientId,
      })
      .from(schema.studioMembership)
      .where(eq(schema.studioMembership.organizationId, importJob.organizationId));
    for (const membership of memberships) {
      if (membership.externalId) maps.membershipIdByContractRef.set(membership.externalId, membership.id);
      maps.membershipClientIdById.set(membership.id, membership.clientId);
    }
    for (const row of contractRows) {
      const rowId = readField(row, "RowID");
      const contractId = readField(row, "ClientContractID");
      const membershipId = contractId ? maps.membershipIdByContractRef.get(contractId) ?? null : null;
      if (rowId && membershipId) maps.membershipIdByContractRef.set(rowId, membershipId);
    }

    const classCredits = await db
      .select({
        id: schema.classCredit.id,
        paymentRefNo: schema.classCredit.paymentRefNo,
      })
      .from(schema.classCredit)
      .where(eq(schema.classCredit.organizationId, importJob.organizationId));
    for (const credit of classCredits) {
      if (credit.paymentRefNo) maps.classCreditIdByPmtRefNo.set(credit.paymentRefNo, credit.id);
    }

    const visitRefs = uniqueNonEmpty(visitPaymentRows.map((row) => readField(row, "VisitRefNo")));
    for (const chunk of chunks(visitRefs, LOOKUP_BATCH_SIZE)) {
      const bookings = await db
        .select({
          id: schema.studioBooking.id,
          externalId: schema.studioBooking.externalId,
        })
        .from(schema.studioBooking)
        .innerJoin(schema.studioClass, eq(schema.studioBooking.classId, schema.studioClass.id))
        .where(and(eq(schema.studioClass.organizationId, importJob.organizationId), inArray(schema.studioBooking.externalId, chunk)));
      for (const booking of bookings) {
        if (booking.externalId) maps.bookingIdByVisitRefNo.set(booking.externalId, booking.id);
      }
    }

    const paymentCount = await backfillPayments(db, schema, importJob, maps, paymentRows);
    if (paymentCount > 0) await refreshPaymentMaps(db, schema, importJob, maps);

    const staffCount = await backfillStaffMembers(db, schema, importJob, trainersRows);
    const shellPaymentCount = await ensureMissingSalePayments(db, schema, importJob, maps, salesRows);
    if (shellPaymentCount > 0) await refreshPaymentMaps(db, schema, importJob, maps);

    const lineItemCount = await backfillSaleLineItems(db, schema, importJob, maps, salesRows);
    if (lineItemCount > 0) await refreshLineItemMaps(db, schema, importJob, maps);

    const visitPaymentCount = await backfillVisitPaymentLinks(db, schema, importJob, maps, visitPaymentRows);
    const documentCount = await backfillDocuments(
      db,
      schema,
      importJob,
      maps,
      documentFiles,
      archiveName,
      documentStorageUrl,
    );

    console.log(
      JSON.stringify(
        {
          importJobId: importJob.id,
          organizationId: importJob.organizationId,
          exportDir,
          processed: {
            missingClients: missingClientCount,
            payments: paymentCount,
            staffMembers: staffCount,
            shellPayments: shellPaymentCount,
            saleLineItems: lineItemCount,
            visitPaymentLinks: visitPaymentCount,
            documents: documentCount,
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await dbPool.end();
  }
}

async function backfillMissingClients(
  db: typeof import("../src/db").db,
  schema: typeof import("../src/db/schema"),
  importJob: ImportJobRow,
  rows: CsvRow[],
): Promise<number> {
  const existingMindbodyIds = new Set<string>();
  const existingBarcodeIds = new Set<string>();
  const existingClients = await db
    .select({
      mindbodyId: schema.client.mindbodyId,
      barcodeId: schema.client.barcodeId,
    })
    .from(schema.client)
    .where(eq(schema.client.organizationId, importJob.organizationId));

  for (const existing of existingClients) {
    if (existing.mindbodyId) existingMindbodyIds.add(existing.mindbodyId);
    if (existing.barcodeId) existingBarcodeIds.add(existing.barcodeId);
  }

  let inserted = 0;
  for (const batch of chunks(rows, WRITE_BATCH_SIZE)) {
    const values = batch.flatMap((row) => {
      const mindbodyId = readField(row, "MBSystemID");
      const barcodeId = readField(row, "BarcodeID");
      if ((mindbodyId && existingMindbodyIds.has(mindbodyId)) || (barcodeId && existingBarcodeIds.has(barcodeId))) {
        return [];
      }

      const firstName = readField(row, "FirstName");
      const lastName = readField(row, "LastName");
      const email = readField(row, "EmailName").toLowerCase();
      const dateOfBirth = parseDate(readField(row, "Birthdate"));
      const inactive = boolFromMindbody(readField(row, "Inactive")) ?? false;
      const isProspect = boolFromMindbody(readField(row, "IsProspect")) ?? false;
      const sourceCreatedAt = parseDate(readField(row, "ProfileCreationDate", "FirstContactDate"));
      const type = inactive ? "CHURN" : isProspect ? "PROSPECT" : "CUSTOMER";
      const acquisitionStage = inactive ? "LOST" : isProspect ? "INQUIRY" : "ACTIVE";

      if (mindbodyId) existingMindbodyIds.add(mindbodyId);
      if (barcodeId) existingBarcodeIds.add(barcodeId);

      return [
        {
          id: createId(),
          organizationId: importJob.organizationId,
          locationId: importJob.locationId,
          mindbodyId: mindbodyId || null,
          barcodeId: barcodeId || null,
          firstName: firstName || null,
          middleName: readField(row, "MiddleName") || null,
          lastName: lastName || null,
          nickname: readField(row, "Nickname") || null,
          name: makeName(firstName, lastName, readField(row, "CompanyName") || "Imported client"),
          companyName: readField(row, "CompanyName") || null,
          email: email || null,
          phone: readField(row, "CellPhone", "HomePhone", "WorkPhone") || null,
          homePhone: readField(row, "HomePhone") || null,
          workPhone: readField(row, "WorkPhone") || null,
          mobilePhone: readField(row, "CellPhone") || null,
          addressLine1: readField(row, "Address") || null,
          addressLine2: readField(row, "Address2") || null,
          city: readField(row, "City") || null,
          state: readField(row, "State") || null,
          postalCode: readField(row, "PostalCode") || null,
          country: readField(row, "Country") || null,
          dateOfBirth,
          birthMonth: dateOfBirth ? dateOfBirth.getMonth() + 1 : null,
          birthDay: dateOfBirth?.getDate() ?? null,
          gender: readField(row, "Gender") || null,
          type,
          source: readField(row, "ReferredBy") || "Mindbody",
          website: readField(row, "Website") || null,
          tags: [],
          emergencyContactName: readField(row, "EmergContact") || null,
          emergencyContactRelation: readField(row, "EmergRela") || null,
          emergencyContactPhone: readField(row, "EmergPhone") || null,
          emergencyContactEmail: readField(row, "EmergEmail") || null,
          waiverSignedAt: parseDate(readField(row, "LiabilityAgreementDate")),
          acquiredAt: parseDate(readField(row, "FirstContactDate", "ProfileCreationDate")),
          trialStartedAt: parseDate(readField(row, "FirstClassDate", "FirstApptDate")),
          acquisitionStage,
          emailUnsubscribed: false,
          metadata: {
            ...rowMetadata(row, "Clients.csv"),
            mindbody: {
              id: mindbodyId,
              barcodeId,
              status: inactive ? "inactive" : isProspect ? "prospect" : "active",
              creationDate: readField(row, "ProfileCreationDate"),
              deactivatedTime: readField(row, "DeactivatedTime"),
              reactivatedTime: readField(row, "ReactivatedTime"),
              createdBy: readField(row, "CreatedBy"),
            },
          },
          ...(sourceCreatedAt ? { createdAt: sourceCreatedAt } : {}),
          updatedAt: now(),
        } satisfies typeof schema.client.$inferInsert,
      ];
    });

    if (values.length === 0) continue;
    await db.insert(schema.client).values(values).onConflictDoNothing();
    inserted += values.length;
  }

  return inserted;
}

async function refreshPaymentMaps(
  db: typeof import("../src/db").db,
  schema: typeof import("../src/db/schema"),
  importJob: ImportJobRow,
  maps: ReferenceMaps,
): Promise<void> {
  maps.paymentIdByExternalId.clear();
  maps.paymentIdByPmtRefNo.clear();
  maps.paymentClientIdById.clear();

  const payments = await db
    .select({
      id: schema.studioPayment.id,
      externalId: schema.studioPayment.externalId,
      mindbodyPmtRefNo: schema.studioPayment.mindbodyPmtRefNo,
      clientId: schema.studioPayment.clientId,
    })
    .from(schema.studioPayment)
    .where(eq(schema.studioPayment.organizationId, importJob.organizationId));

  for (const payment of payments) {
    if (payment.externalId) maps.paymentIdByExternalId.set(payment.externalId, payment.id);
    if (payment.mindbodyPmtRefNo) maps.paymentIdByPmtRefNo.set(payment.mindbodyPmtRefNo, payment.id);
    if (payment.clientId) maps.paymentClientIdById.set(payment.id, payment.clientId);
  }
}

async function refreshLineItemMaps(
  db: typeof import("../src/db").db,
  schema: typeof import("../src/db/schema"),
  importJob: ImportJobRow,
  maps: ReferenceMaps,
): Promise<void> {
  maps.lineItemIdByExternalId.clear();
  maps.lineItemIdByPmtRefNo.clear();
  maps.lineItemClientIdById.clear();

  const lineItems = await db
    .select({
      id: schema.studioPaymentLineItem.id,
      externalId: schema.studioPaymentLineItem.externalId,
      mindbodyPmtRefNo: schema.studioPaymentLineItem.mindbodyPmtRefNo,
      paymentId: schema.studioPaymentLineItem.paymentId,
      clientId: schema.studioPaymentLineItem.clientId,
    })
    .from(schema.studioPaymentLineItem)
    .where(eq(schema.studioPaymentLineItem.organizationId, importJob.organizationId));

  for (const lineItem of lineItems) {
    if (lineItem.externalId) maps.lineItemIdByExternalId.set(lineItem.externalId, lineItem.id);
    if (lineItem.mindbodyPmtRefNo) {
      maps.lineItemIdByPmtRefNo.set(lineItem.mindbodyPmtRefNo, lineItem.id);
      if (lineItem.paymentId) maps.paymentIdByPmtRefNo.set(lineItem.mindbodyPmtRefNo, lineItem.paymentId);
    }
    if (lineItem.clientId) maps.lineItemClientIdById.set(lineItem.id, lineItem.clientId);
  }
}

async function backfillStaffMembers(
  db: typeof import("../src/db").db,
  schema: typeof import("../src/db/schema"),
  importJob: ImportJobRow,
  rows: CsvRow[],
): Promise<number> {
  let processed = 0;
  for (const batch of chunks(rows, WRITE_BATCH_SIZE)) {
    const values = batch.map((row) => {
      const trainerId = readField(row, "TrainerID");
      const firstName = readField(row, "Firstname", "FirstName");
      const lastName = readField(row, "Lastname", "LastName");
      const flags = staffFlags(row);
      return {
        id: createId(),
        organizationId: importJob.organizationId,
        locationId: importJob.locationId,
        externalId: trainerId || null,
        employeeId: readField(row, "EmpID") || null,
        firstName: firstName || null,
        lastName: lastName || null,
        name: readField(row, "DisplayName") || makeName(firstName, lastName, "Imported staff member"),
        email: readField(row, "Email") || null,
        phone: readField(row, "Cellphone", "Homephone", "Workphone") || null,
        role: readField(row, "Location") || null,
        staffType: staffType(row),
        isActive: flags.isActive && !flags.isDeleted,
        isSystem: flags.isSystem,
        isIntegrationAccount: flags.isIntegrationAccount,
        canTeachClasses: flags.canTeachClasses,
        canTakeAppointments: flags.canTakeAppointments,
        canHandleReservations: flags.canHandleReservations,
        canLeadWorkshops: flags.canLeadWorkshops,
        hourlyRate: parseMoney(readField(row, "HourlyRate"))?.toString() ?? null,
        currency: "GBP",
        employmentStart: parseDate(readField(row, "EmploymentStart")),
        employmentEnd: parseDate(readField(row, "EmploymentEnd")),
        metadata: rowMetadata(row, "Trainers.csv"),
        updatedAt: now(),
      } satisfies typeof schema.studioStaffMember.$inferInsert;
    });

    await db
      .insert(schema.studioStaffMember)
      .values(values)
      .onConflictDoUpdate({
        target: [schema.studioStaffMember.organizationId, schema.studioStaffMember.externalId],
        set: {
          locationId: sql.raw('excluded."locationId"'),
          employeeId: sql.raw('excluded."employeeId"'),
          firstName: sql.raw('excluded."firstName"'),
          lastName: sql.raw('excluded."lastName"'),
          name: sql.raw('excluded."name"'),
          email: sql.raw('excluded."email"'),
          phone: sql.raw('excluded."phone"'),
          role: sql.raw('excluded."role"'),
          staffType: sql.raw('excluded."staffType"'),
          isActive: sql.raw('excluded."isActive"'),
          isSystem: sql.raw('excluded."isSystem"'),
          isIntegrationAccount: sql.raw('excluded."isIntegrationAccount"'),
          canTeachClasses: sql.raw('excluded."canTeachClasses"'),
          canTakeAppointments: sql.raw('excluded."canTakeAppointments"'),
          canHandleReservations: sql.raw('excluded."canHandleReservations"'),
          canLeadWorkshops: sql.raw('excluded."canLeadWorkshops"'),
          hourlyRate: sql.raw('excluded."hourlyRate"'),
          currency: sql.raw('excluded."currency"'),
          employmentStart: sql.raw('excluded."employmentStart"'),
          employmentEnd: sql.raw('excluded."employmentEnd"'),
          metadata: sql.raw('excluded."metadata"'),
          updatedAt: sql.raw('excluded."updatedAt"'),
        },
      });
    processed += values.length;
  }
  return processed;
}

async function backfillPayments(
  db: typeof import("../src/db").db,
  schema: typeof import("../src/db/schema"),
  importJob: ImportJobRow,
  maps: ReferenceMaps,
  rows: CsvRow[],
): Promise<number> {
  let processed = 0;

  for (const batch of chunks(rows, WRITE_BATCH_SIZE)) {
    const inserts: Array<typeof schema.studioPayment.$inferInsert> = [];
    const updates: Array<{
      id: string;
      values: Omit<typeof schema.studioPayment.$inferInsert, "id">;
    }> = [];

    for (const row of batch) {
      const externalId = readField(row, "SaleID", "PmtRefNo");
      if (!externalId) continue;
      const productExternalId = readField(row, "ProductID");
      const productId = productExternalId ? maps.productIdByExternalId.get(productExternalId) ?? null : null;
      const productType = (productId ? maps.productTypeById.get(productId) ?? null : null) ?? productTypeFor(row);
      const amount = parseMoney(readField(row, "PaymentAmount", "SDPaymentAmt", "UnitPrice")) ?? 0;
      const paymentDate = parseDate(readField(row, "SaleDate", "PaymentDate")) ?? now();
      const values = {
        organizationId: importJob.organizationId,
        locationId: importJob.locationId,
        clientId: resolveClientId(maps, row),
        productId,
        externalId,
        mindbodyPmtRefNo: readField(row, "PmtRefNo") || null,
        amount: amount.toString(),
        currency: "GBP",
        status: boolFromMindbody(readField(row, "Returned")) === true ? "REFUNDED" : "SUCCEEDED",
        type: paymentTypeForProduct(productType),
        description: readField(row, "Description", "PaymentNotes", "PmtTypes") || "Imported Mindbody payment",
        paymentMethod: readField(row, "PmtTypes") || null,
        taxAmount: parseMoney(readField(row, "PaymentTax"))?.toString() ?? null,
        discountAmount: parseMoney(readField(row, "PaymentDiscount", "Discount"))?.toString() ?? null,
        metadata: rowMetadata(row, "Payments.csv"),
        createdAt: paymentDate,
        updatedAt: now(),
      } satisfies Omit<typeof schema.studioPayment.$inferInsert, "id">;

      const existingId = maps.paymentIdByExternalId.get(externalId) ?? null;
      if (existingId) {
        const existingClientId = maps.paymentClientIdById.get(existingId) ?? null;
        if (existingClientId !== values.clientId) {
          updates.push({ id: existingId, values });
          if (values.clientId) maps.paymentClientIdById.set(existingId, values.clientId);
        }
      } else {
        const id = createId();
        inserts.push({ id, ...values });
        maps.paymentIdByExternalId.set(externalId, id);
        if (values.mindbodyPmtRefNo) maps.paymentIdByPmtRefNo.set(values.mindbodyPmtRefNo, id);
        if (values.clientId) maps.paymentClientIdById.set(id, values.clientId);
      }
    }

    if (inserts.length > 0) await db.insert(schema.studioPayment).values(inserts);
    for (const update of updates) {
      await db.update(schema.studioPayment).set(update.values).where(eq(schema.studioPayment.id, update.id));
    }
    processed += inserts.length + updates.length;
  }

  return processed;
}

async function ensureMissingSalePayments(
  db: typeof import("../src/db").db,
  schema: typeof import("../src/db/schema"),
  importJob: ImportJobRow,
  maps: ReferenceMaps,
  rows: CsvRow[],
): Promise<number> {
  const rowsBySaleId = new Map<string, CsvRow[]>();
  for (const row of rows) {
    const saleId = readField(row, "SaleID");
    if (!saleId || maps.paymentIdByExternalId.has(saleId)) continue;
    rowsBySaleId.set(saleId, [...(rowsBySaleId.get(saleId) ?? []), row]);
  }

  let inserted = 0;
  for (const batch of chunks(Array.from(rowsBySaleId.entries()), WRITE_BATCH_SIZE)) {
    const values = batch.flatMap(([saleId, saleRows]) => {
      const firstRow = saleRows[0];
      if (!firstRow) return [];
      const clientId = resolveClientId(maps, firstRow);
      const productExternalId = readField(firstRow, "ProductID");
      const productId = productExternalId ? maps.productIdByExternalId.get(productExternalId) ?? null : null;
      const productType = (productId ? maps.productTypeById.get(productId) ?? null : null) ?? productTypeFor(firstRow);
      const amount = saleRows.reduce((sum, row) => sum + (parseMoney(readField(row, "SDPaymentAmt")) ?? 0), 0);
      const paymentDate = parseDate(readField(firstRow, "SaleDate")) ?? now();
      return [
        {
          id: createId(),
          organizationId: importJob.organizationId,
          locationId: importJob.locationId,
          clientId,
          productId,
          externalId: saleId,
          mindbodyPmtRefNo: readField(firstRow, "PmtRefNo") || null,
          amount: amount.toString(),
          currency: "GBP",
          status: "SUCCEEDED" as const,
          type: paymentTypeForProduct(productType),
          description: readField(firstRow, "Description") || "Imported Mindbody sale",
          metadata: {
            ...rowMetadata(firstRow, "ClientSales.csv"),
            mindbodySale: {
              lineCount: saleRows.length,
              generatedFromClientSales: true,
            },
          },
          createdAt: paymentDate,
          updatedAt: now(),
        } satisfies typeof schema.studioPayment.$inferInsert,
      ];
    });
    if (values.length === 0) continue;
    await db.insert(schema.studioPayment).values(values).onConflictDoNothing();
    inserted += values.length;
  }
  return inserted;
}

function resolveClientId(maps: ReferenceMaps, row: CsvRow): string | null {
  const mindbodyId = readField(row, "MBSystemID", "ClientID", "PayingClientID", "ReceivingClientId");
  const barcodeId = readField(row, "BarcodeID");
  return (
    (mindbodyId ? maps.clientIdByMindbodyId.get(mindbodyId) ?? null : null) ??
    (barcodeId ? maps.clientIdByBarcodeId.get(barcodeId) ?? null : null)
  );
}

async function backfillSaleLineItems(
  db: typeof import("../src/db").db,
  schema: typeof import("../src/db/schema"),
  importJob: ImportJobRow,
  maps: ReferenceMaps,
  rows: CsvRow[],
): Promise<number> {
  let processed = 0;
  for (const batch of chunks(rows, WRITE_BATCH_SIZE)) {
    const values = batch.flatMap((row) => {
      const externalId = readField(row, "SDID");
      if (!externalId) return [];
      const saleId = readField(row, "SaleID");
      const productExternalId = readField(row, "ProductID");
      const productId = productExternalId ? maps.productIdByExternalId.get(productExternalId) ?? null : null;
      const paymentId = saleId ? maps.paymentIdByExternalId.get(saleId) ?? null : null;
      return [
        {
          id: createId(),
          organizationId: importJob.organizationId,
          locationId: importJob.locationId,
          paymentId,
          clientId: resolveClientId(maps, row),
          productId,
          externalId,
          saleId: saleId || null,
          mindbodyPmtRefNo: readField(row, "PmtRefNo") || null,
          productExternalId: productExternalId || null,
          description: readField(row, "Description") || null,
          category: readField(row, "CategoryName") || null,
          quantity: parseInteger(readField(row, "Quantity")) ?? 1,
          unitPrice: (parseMoney(readField(row, "UnitPrice")) ?? 0).toString(),
          discountAmount: (parseMoney(readField(row, "Discount")) ?? 0).toString(),
          amount: (parseMoney(readField(row, "SDPaymentAmt")) ?? 0).toString(),
          currency: "GBP",
          returned: boolFromMindbody(readField(row, "Returned")) ?? false,
          soldAt: parseDate(readField(row, "SaleDate")) ?? now(),
          metadata: rowMetadata(row, "ClientSales.csv"),
          updatedAt: now(),
        } satisfies typeof schema.studioPaymentLineItem.$inferInsert,
      ];
    });
    if (values.length === 0) continue;
    await db
      .insert(schema.studioPaymentLineItem)
      .values(values)
      .onConflictDoUpdate({
        target: [schema.studioPaymentLineItem.organizationId, schema.studioPaymentLineItem.externalId],
        set: {
          locationId: sql.raw('excluded."locationId"'),
          paymentId: sql.raw('excluded."paymentId"'),
          clientId: sql.raw('excluded."clientId"'),
          productId: sql.raw('excluded."productId"'),
          saleId: sql.raw('excluded."saleId"'),
          mindbodyPmtRefNo: sql.raw('excluded."mindbodyPmtRefNo"'),
          productExternalId: sql.raw('excluded."productExternalId"'),
          description: sql.raw('excluded."description"'),
          category: sql.raw('excluded."category"'),
          quantity: sql.raw('excluded."quantity"'),
          unitPrice: sql.raw('excluded."unitPrice"'),
          discountAmount: sql.raw('excluded."discountAmount"'),
          amount: sql.raw('excluded."amount"'),
          currency: sql.raw('excluded."currency"'),
          returned: sql.raw('excluded."returned"'),
          soldAt: sql.raw('excluded."soldAt"'),
          metadata: sql.raw('excluded."metadata"'),
          updatedAt: sql.raw('excluded."updatedAt"'),
        },
      });
    processed += values.length;
  }
  return processed;
}

async function backfillVisitPaymentLinks(
  db: typeof import("../src/db").db,
  schema: typeof import("../src/db/schema"),
  importJob: ImportJobRow,
  maps: ReferenceMaps,
  rows: CsvRow[],
): Promise<number> {
  let processed = 0;
  for (const batch of chunks(rows, WRITE_BATCH_SIZE)) {
    const values = batch.flatMap((row) => {
      const visitRefNo = readField(row, "VisitRefNo");
      const pmtRefNo = readField(row, "PmtRefNo");
      const bookingId = visitRefNo ? maps.bookingIdByVisitRefNo.get(visitRefNo) ?? null : null;
      if (!visitRefNo || !pmtRefNo || !bookingId) return [];
      return [
        {
          id: createId(),
          organizationId: importJob.organizationId,
          locationId: importJob.locationId,
          bookingId,
          paymentId: maps.paymentIdByPmtRefNo.get(pmtRefNo) ?? null,
          lineItemId: maps.lineItemIdByPmtRefNo.get(pmtRefNo) ?? null,
          classCreditId: maps.classCreditIdByPmtRefNo.get(pmtRefNo) ?? null,
          visitRefNo,
          mindbodyPmtRefNo: pmtRefNo,
          metadata: rowMetadata(row, "VisitPaymentLinking.csv"),
          updatedAt: now(),
        } satisfies typeof schema.studioBookingPayment.$inferInsert,
      ];
    });
    if (values.length === 0) continue;
    await db.insert(schema.studioBookingPayment).values(values).onConflictDoNothing();
    processed += values.length;
  }
  return processed;
}

async function backfillDocuments(
  db: typeof import("../src/db").db,
  schema: typeof import("../src/db/schema"),
  importJob: ImportJobRow,
  maps: ReferenceMaps,
  files: Array<{ absolutePath: string; relativePath: string }>,
  archiveName: string,
  documentStorageUrl: string,
): Promise<number> {
  let processed = 0;
  for (const batch of chunks(files, WRITE_BATCH_SIZE)) {
    const values = batch.flatMap((file) => {
      const kind = classifyMindbodyFileName(file.relativePath);
      const refs = documentRefs(file.relativePath, kind);
      const membershipId = refs.membershipRef ? maps.membershipIdByContractRef.get(refs.membershipRef) ?? null : null;
      const paymentId = refs.saleRef
        ? maps.paymentIdByExternalId.get(refs.saleRef) ?? maps.paymentIdByPmtRefNo.get(refs.saleRef) ?? null
        : null;
      const paymentLineItemId = refs.saleRef
        ? maps.lineItemIdByExternalId.get(refs.saleRef) ?? maps.lineItemIdByPmtRefNo.get(refs.saleRef) ?? null
        : null;
      const clientId =
        (membershipId ? maps.membershipClientIdById.get(membershipId) ?? null : null) ??
        (paymentId ? maps.paymentClientIdById.get(paymentId) ?? null : null) ??
        (paymentLineItemId ? maps.lineItemClientIdById.get(paymentLineItemId) ?? null : null) ??
        (refs.clientRef
          ? maps.clientIdByMindbodyId.get(refs.clientRef) ?? maps.clientIdByBarcodeId.get(refs.clientRef) ?? null
          : null);

      if (!clientId) return [];

      const sourcePath = sourcePathForDocument(archiveName, file.relativePath);
      return [
        {
          id: createId(),
          organizationId: importJob.organizationId,
          locationId: importJob.locationId,
          clientId,
          membershipId,
          paymentId,
          paymentLineItemId,
          source: "MINDBODY" as const,
          sourcePath,
          fileName: path.basename(file.relativePath),
          fileType: mimeTypeForImportPath(file.relativePath) ?? null,
          storageUrl: documentStorageUrl,
          documentType: documentType(kind, file.relativePath),
          metadata: {
            importSource: "MINDBODY",
            localPath: file.absolutePath,
            clientRef: refs.clientRef || null,
            membershipRef: refs.membershipRef || null,
            saleRef: refs.saleRef || null,
            storageMode: "ZIP_ENTRY",
            archiveName,
            archiveUrl: documentStorageUrl,
            archiveEntryPath: file.relativePath,
          },
          updatedAt: now(),
        } satisfies typeof schema.clientDocument.$inferInsert,
      ];
    });
    if (values.length === 0) continue;
    await db.insert(schema.clientDocument).values(values).onConflictDoNothing();
    processed += values.length;
  }
  return processed;
}

main().catch((error: unknown) => {
  console.error("[Mindbody detail backfill] Failed:", error);
  process.exit(1);
});
