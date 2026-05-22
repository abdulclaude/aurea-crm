import { createId } from "@paralleldrive/cuid2";
import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import JSZip from "jszip";

import { db } from "@/db";
import {
  checkIn,
  classCredit,
  classType,
  client,
  clientDocument,
  clientHousehold,
  clientHouseholdMember,
  importJob,
  instructor,
  locationMember,
  location as locationTable,
  note,
  organization,
  session as sessionTable,
  studioBookingPayment,
  studioBooking,
  studioClass,
  studioMembership,
  studioPayment,
  studioPaymentLineItem,
  studioProduct,
  studioStaffMember,
  waiverSignature,
  waiverTemplate,
} from "@/db/schema";
import type { JsonObject, JsonValue } from "@/db/json";
import { createNotification } from "@/lib/notifications";
import {
  classifyMindbodyFileName,
  findUnexpectedHeaders,
  isZipImportFile,
  mimeTypeForImportPath,
  parseCsv,
  readField,
  type CsvRow,
  type MindbodyFileKind,
  type UploadedImportFile,
} from "@/features/studio/import/lib/mindbody-csv";

type ImportWarning = {
  fileName: string;
  fileKind: MindbodyFileKind;
  message: string;
  headers?: string[];
  sample?: Record<string, string>;
};

type ImportError = {
  fileName: string;
  row?: number;
  entity: string;
  error: string;
};

type ImportCounters = Record<string, { total: number; processed: number; failed: number }>;

type MindbodyImportConfig = {
  files?: UploadedImportFile[];
  dryRun?: boolean;
  source?: "dashboard" | "onboarding";
};

type CsvDataset = {
  file: UploadedImportFile;
  kind: MindbodyFileKind;
  headers: string[];
  rows: CsvRow[];
};

type ImportState = {
  organizationId: string;
  locationId: string | null;
  importedBy: string;
  dryRun: boolean;
  errors: ImportError[];
  warnings: ImportWarning[];
  counters: ImportCounters;
  clientIdsByMindbodyId: Map<string, string>;
  clientIdsByBarcodeId: Map<string, string>;
  clientIdsByEmail: Map<string, string>;
  locationIdsByExternalId: Map<string, string>;
  locationIdsByName: Map<string, string>;
  instructorIdsByTrainerId: Map<string, string>;
  staffMemberIdsByTrainerId: Map<string, string>;
  productIdsByExternalId: Map<string, string>;
  productIdsBySku: Map<string, string>;
  productTypesById: Map<string, typeof studioProduct.$inferSelect.type>;
  membershipIdsByContractId: Map<string, string>;
  membershipClientIdsById: Map<string, string>;
  classCreditIdsByExternalId: Map<string, string>;
  classCreditIdsByPaymentRefNo: Map<string, string>;
  paymentIdsByExternalId: Map<string, string>;
  paymentIdsByMindbodyPmtRefNo: Map<string, string>;
  paymentClientIdsById: Map<string, string>;
  saleLineItemIdsByExternalId: Map<string, string>;
  saleLineItemIdsByMindbodyPmtRefNo: Map<string, string>;
  saleLineItemClientIdsById: Map<string, string>;
  bookingIdsByExternalClientKey: Map<string, string>;
  bookingIdsByVisitRefNo: Map<string, string>;
  bookingPaymentKeys: Set<string>;
  classTypeIdsBySlug: Map<string, string>;
  visitClassIdsByKey: Map<string, string>;
  visitClientIdsByVisitRef: Map<string, string>;
  checkInKeys: Set<string>;
  clientDocumentSourcePaths: Set<string>;
  mindbodyWaiverTemplateId: string | null;
  waiverSignatureKeys: Set<string>;
};

const CSV_KINDS_IN_ORDER: MindbodyFileKind[] = [
  "locations",
  "clients",
  "trainers",
  "products",
  "clientAutopayContracts",
  "clientPricingOptions",
  "visitData",
  "reservationData",
  "payments",
  "clientSales",
  "visitPaymentLinking",
  "accountBalances",
  "notes",
  "contactLogs",
  "appointmentNotes",
  "clientRelationships",
];

const MAX_ZIP_ENTRIES = 5000;
const MAX_NESTED_ZIP_DEPTH = 2;
const IMPORT_LOOKUP_CHUNK_SIZE = 1000;
const IMPORT_LOOKUP_CONCURRENCY = 4;
const IMPORT_WRITE_CHUNK_SIZE = 500;
const IMPORT_WRITE_CONCURRENCY = 6;
const IMPORT_PROGRESS_FLUSH_INTERVAL = 1000;
const FILE_FETCH_CONCURRENCY = 4;
const ZIP_ENTRY_READ_CONCURRENCY = 8;
const MINDBODY_WAIVER_TEMPLATE_NAME = "Mindbody imported liability waiver";

function normalizeConfig(value: unknown): MindbodyImportConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const files = Array.isArray(record.files)
    ? record.files
        .filter((file): file is UploadedImportFile => {
          if (!file || typeof file !== "object" || Array.isArray(file)) return false;
          const item = file as Record<string, unknown>;
          return typeof item.name === "string" && typeof item.url === "string";
        })
        .map((file) => ({
          name: file.name,
          url: file.url,
          size: typeof file.size === "number" ? file.size : undefined,
          type: typeof file.type === "string" ? file.type : undefined,
          relativePath: typeof file.relativePath === "string" ? file.relativePath : undefined,
          zipSourceName: typeof file.zipSourceName === "string" ? file.zipSourceName : undefined,
          zipSourceUrl: typeof file.zipSourceUrl === "string" ? file.zipSourceUrl : undefined,
          zipEntryPath: typeof file.zipEntryPath === "string" ? file.zipEntryPath : undefined,
        }))
    : [];

  return {
    files,
    dryRun: record.dryRun === true,
    source: record.source === "onboarding" ? "onboarding" : "dashboard",
  };
}

function uniqueNonEmpty(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

async function runWithConcurrency<T>(
  values: T[],
  concurrency: number,
  worker: (value: T) => Promise<void>,
): Promise<void> {
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, values.length);
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < values.length) {
        const value = values[nextIndex];
        nextIndex++;
        if (value !== undefined) await worker(value);
      }
    }),
  );
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

function parseDateTime(dateValue: string, timeValue: string): Date | null {
  const date = dateValue.trim();
  const time = timeValue.trim();
  if (!date) return null;
  return parseDate(time ? `${date}T${time}` : date);
}

function makeName(firstName: string, lastName: string, fallback: string): string {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || fallback || "Imported client";
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "imported";
}

function stableHash(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

function productTypeFor(row: CsvRow): typeof studioProduct.$inferInsert.type {
  const category = readField(row, "CategoryName").toLowerCase();
  const itemType = readField(row, "ItemTypeName", "ItemType").toLowerCase();
  const serviceCategory = readField(row, "ServiceCategoryName", "Program/Service Category").toLowerCase();
  const description = readField(row, "Description").toLowerCase();
  const source = [itemType, category, serviceCategory, description]
    .join(" ")
    .toLowerCase();

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

function paymentTypeForProduct(type: typeof studioProduct.$inferInsert.type): typeof studioPayment.$inferInsert.type {
  if (type === "MEMBERSHIP_PLAN") return "MEMBERSHIP";
  if (type === "CLASS_PACK") return "CLASS_PACK";
  if (type === "GIFT_CARD") return "GIFT_CARD";
  return "POS";
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
    identity.includes("lymber") ||
    identity.includes("schedulingmindbody") ||
    identity.includes("fitmetrix") ||
    identity.includes("classpass") ||
    identity.includes("gympass") ||
    identity.includes("autogration") ||
    identity.includes("apiant")
  );
}

function mindbodyStaffFlags(row: CsvRow): {
  isActive: boolean;
  isDeleted: boolean;
  isSystem: boolean;
  isIntegrationAccount: boolean;
  canTeachClasses: boolean;
  canTakeAppointments: boolean;
  canHandleReservations: boolean;
  canLeadWorkshops: boolean;
} {
  const canTeachClasses = boolFromMindbody(readField(row, "Teacher")) === true;
  const canTakeAppointments = boolFromMindbody(readField(row, "AppointmentTrn")) === true;
  const canHandleReservations = boolFromMindbody(readField(row, "ReservationTrn")) === true;
  const canLeadWorkshops = boolFromMindbody(readField(row, "Workshop Instructor")) === true;

  return {
    isActive: boolFromMindbody(readField(row, "Active")) ?? true,
    isDeleted: boolFromMindbody(readField(row, "Delete")) ?? false,
    isSystem: boolFromMindbody(readField(row, "isSystem")) ?? false,
    isIntegrationAccount: looksLikeMindbodyIntegrationAccount(row),
    canTeachClasses,
    canTakeAppointments,
    canHandleReservations,
    canLeadWorkshops,
  };
}

function isMindbodyTeachingInstructor(row: CsvRow): boolean {
  const flags = mindbodyStaffFlags(row);
  const teachesClasses = [
    readField(row, "Teacher"),
    readField(row, "AppointmentTrn"),
    readField(row, "ReservationTrn"),
    readField(row, "Workshop Instructor"),
  ].some((value) => boolFromMindbody(value) === true);

  return flags.isActive && !flags.isDeleted && !flags.isSystem && !flags.isIntegrationAccount && teachesClasses;
}

function mindbodyStaffType(row: CsvRow): string {
  const flags = mindbodyStaffFlags(row);
  if (flags.isSystem || flags.isIntegrationAccount) return "SYSTEM";
  if (isMindbodyTeachingInstructor(row)) return "INSTRUCTOR";
  if (boolFromMindbody(readField(row, "Employee")) === true) return "TEAM_MEMBER";
  if (boolFromMindbody(readField(row, "Rep")) === true) return "SALES_REP";
  if ([readField(row, "Assistant"), readField(row, "Assistant2")].some((value) => boolFromMindbody(value) === true)) {
    return "ASSISTANT";
  }
  return "TEAM_MEMBER";
}

async function updateJobProgress(importJobId: string, state: ImportState): Promise<void> {
  const totals = Object.values(state.counters).reduce(
    (acc, counter) => ({
      total: acc.total + counter.total,
      processed: acc.processed + counter.processed,
      failed: acc.failed + counter.failed,
    }),
    { total: 0, processed: 0, failed: 0 },
  );

  await db
    .update(importJob)
    .set({
      totalRecords: totals.total,
      processedRecords: totals.processed,
      failedRecords: totals.failed,
      entityProgress: state.counters,
      warningLog: state.warnings.slice(-250),
      errorLog: state.errors.slice(-250),
      updatedAt: now(),
    })
    .where(eq(importJob.id, importJobId));
}

async function flushProgressIfDue(
  importJobId: string,
  state: ImportState,
  entity: string,
): Promise<void> {
  const counter = state.counters[entity];
  if (!counter) return;
  const completed = counter.processed + counter.failed;
  if (completed > 0 && completed % IMPORT_PROGRESS_FLUSH_INTERVAL === 0) {
    await updateJobProgress(importJobId, state);
  }
}

function markEntityTotal(state: ImportState, entity: string, total: number): void {
  state.counters[entity] = state.counters[entity] ?? { total: 0, processed: 0, failed: 0 };
  state.counters[entity].total += total;
}

function markProcessed(state: ImportState, entity: string): void {
  state.counters[entity] = state.counters[entity] ?? { total: 0, processed: 0, failed: 0 };
  state.counters[entity].processed++;
}

function markFailed(state: ImportState, entity: string, error: ImportError): void {
  state.counters[entity] = state.counters[entity] ?? { total: 0, processed: 0, failed: 0 };
  state.counters[entity].failed++;
  state.errors.push(error);
}

async function ensureImportedLocationMember(state: ImportState, locationId: string): Promise<void> {
  await ensureImportedLocationMembers(state, [locationId]);
}

async function ensureImportedLocationMembers(state: ImportState, locationIds: string[]): Promise<void> {
  if (state.dryRun) return;
  const uniqueLocationIds = uniqueNonEmpty(locationIds);
  if (uniqueLocationIds.length === 0) return;

  const existingLocationIds = new Set<string>();
  await runWithConcurrency(
    chunks(uniqueLocationIds, IMPORT_LOOKUP_CHUNK_SIZE),
    IMPORT_LOOKUP_CONCURRENCY,
    async (chunk) => {
      const existingMembers = await db
        .select({ locationId: locationMember.locationId })
        .from(locationMember)
        .where(
          and(
            eq(locationMember.userId, state.importedBy),
            inArray(locationMember.locationId, chunk),
          ),
        );
      for (const existing of existingMembers) existingLocationIds.add(existing.locationId);
    },
  );

  const inserts = uniqueLocationIds
    .filter((locationId) => !existingLocationIds.has(locationId))
    .map((locationId) => ({
      id: createId(),
      locationId,
      userId: state.importedBy,
      role: "AGENCY" as const,
      updatedAt: now(),
    }));

  for (const chunk of chunks(inserts, IMPORT_WRITE_CHUNK_SIZE)) {
    await db.insert(locationMember).values(chunk).onConflictDoNothing();
  }
}

async function ensureOnboardingLocationContext(
  state: ImportState,
  source: MindbodyImportConfig["source"],
): Promise<string | null> {
  if (state.dryRun || source !== "onboarding") return state.locationId;

  let activeLocationId = state.locationId;

  if (!activeLocationId) {
    const [existingLocation] = await db
      .select({ id: locationTable.id })
      .from(locationTable)
      .where(eq(locationTable.organizationId, state.organizationId))
      .orderBy(desc(locationTable.isActive), asc(locationTable.createdAt))
      .limit(1);

    activeLocationId = existingLocation?.id ?? null;
  }

  if (!activeLocationId) {
    const [org] = await db
      .select({
        name: organization.name,
        logo: organization.logo,
        website: organization.website,
      })
      .from(organization)
      .where(eq(organization.id, state.organizationId))
      .limit(1);

    const fallbackName = org?.name ? `${org.name} Main` : "Imported studio";
    const [createdLocation] = await db
      .insert(locationTable)
      .values({
        id: createId(),
        organizationId: state.organizationId,
        companyName: fallbackName,
        logo: org?.logo ?? null,
        website: org?.website ?? null,
        createdByUserId: state.importedBy,
        slug: `${slugify(fallbackName)}-${createId().slice(0, 8)}`,
        createdAt: now(),
        updatedAt: now(),
        metadata: {
          importSource: "MINDBODY",
          fallbackReason: "Mindbody export did not include Locations.csv",
        },
      })
      .returning({ id: locationTable.id });

    activeLocationId = createdLocation.id;
  }

  await ensureImportedLocationMember(state, activeLocationId);
  await db
    .update(sessionTable)
    .set({
      activeOrganizationId: state.organizationId,
      activeLocationId,
      updatedAt: now(),
    })
    .where(eq(sessionTable.userId, state.importedBy));

  state.locationId = activeLocationId;
  return activeLocationId;
}

function importPathFor(file: UploadedImportFile): string {
  return file.zipEntryPath ?? file.relativePath ?? file.name;
}

function normalizeZipEntryPath(entryPath: string): string {
  return entryPath.replace(/\\/g, "/").replace(/^\/+/, "");
}

function shouldSkipZipEntry(entryPath: string): boolean {
  const normalized = normalizeZipEntryPath(entryPath);
  if (!normalized || normalized.endsWith("/")) return true;
  const segments = normalized.split("/");
  return segments.some((segment) => segment === "__MACOSX" || segment === ".DS_Store" || segment.startsWith("._"));
}

function importFileName(path: string): string {
  return normalizeZipEntryPath(path).split("/").pop()?.toLowerCase() ?? "";
}

function importRootSegment(path: string): string {
  return normalizeZipEntryPath(path).split("/")[0]?.toLowerCase() ?? "";
}

function isWaiverDocumentPath(path: string): boolean {
  const fileName = importFileName(path);
  return fileName.includes("waiver") || fileName.includes("liability");
}

function shouldImportMindbodyDocument(path: string, kind: MindbodyFileKind): boolean {
  if (kind !== "clientFile") return false;

  const rootSegment = importRootSegment(path);
  if (rootSegment === "contractsignatures" || rootSegment === "sales") return false;

  const fileName = importFileName(path);
  if (fileName.includes("contractsignature")) return false;

  return rootSegment === "files" || isWaiverDocumentPath(path);
}

function archiveEntryFileWithSource(
  archiveFile: UploadedImportFile,
  entryPath: string,
  sourceName: string,
): UploadedImportFile {
  const normalizedEntryPath = normalizeZipEntryPath(entryPath);
  return {
    name: normalizedEntryPath.split("/").pop() || normalizedEntryPath,
    url: archiveFile.url,
    type: mimeTypeForImportPath(normalizedEntryPath),
    relativePath: normalizedEntryPath,
    zipSourceName: sourceName,
    zipSourceUrl: archiveFile.url,
    zipEntryPath: normalizedEntryPath,
  };
}

function nestedZipEntryPath(nestedZipPath: string, innerEntryPath: string): string {
  const prefix = normalizeZipEntryPath(nestedZipPath).replace(/\.zip$/i, "");
  const innerPath = normalizeZipEntryPath(innerEntryPath);
  const baseName = prefix.split("/").pop() ?? prefix;
  if (!prefix || innerPath.startsWith(`${prefix}/`) || innerPath.startsWith(`${baseName}/`)) {
    return innerPath;
  }
  return normalizeZipEntryPath(`${prefix}/${innerPath}`);
}

function pushCsvDataset(params: {
  file: UploadedImportFile;
  kind: MindbodyFileKind;
  text: string;
  datasets: CsvDataset[];
  warnings: ImportWarning[];
}): void {
  const parsed = parseCsv(params.text);
  const path = importPathFor(params.file);
  const unexpectedHeaders = findUnexpectedHeaders(path, parsed.headers);
  if (unexpectedHeaders.length > 0) {
    params.warnings.push({
      fileName: path,
      fileKind: params.kind,
      message: "The import preserved these fields in metadata but does not map them to first-class schema columns yet.",
      headers: unexpectedHeaders,
    });
  }

  if (params.kind === "unknown") {
    params.warnings.push({
      fileName: path,
      fileKind: params.kind,
      message: "CSV file was parsed but is not a recognised Mindbody export type.",
      headers: parsed.headers,
    });
  }

  params.datasets.push({
    file: params.file,
    kind: params.kind,
    headers: parsed.headers,
    rows: parsed.rows,
  });
}

async function fetchUploadedText(file: UploadedImportFile, kind: MindbodyFileKind): Promise<{
  text: string | null;
  warning: ImportWarning | null;
}> {
  const path = importPathFor(file);
  const response = await fetch(file.url);
  if (!response.ok) {
    return {
      text: null,
      warning: {
        fileName: path,
        fileKind: kind,
        message: `Could not fetch uploaded file (${response.status}).`,
      },
    };
  }

  return { text: await response.text(), warning: null };
}

async function expandZipFile(
  archiveFile: UploadedImportFile,
  datasets: CsvDataset[],
  documentFiles: UploadedImportFile[],
  warnings: ImportWarning[],
): Promise<void> {
  const archivePath = archiveFile.relativePath || archiveFile.name;
  const response = await fetch(archiveFile.url);
  if (!response.ok) {
    warnings.push({
      fileName: archivePath,
      fileKind: "zipArchive",
      message: `Could not fetch uploaded ZIP archive (${response.status}).`,
    });
    return;
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(await response.arrayBuffer());
  } catch (error) {
    warnings.push({
      fileName: archivePath,
      fileKind: "zipArchive",
      message: error instanceof Error ? `Could not read ZIP archive: ${error.message}` : "Could not read ZIP archive.",
    });
    return;
  }

  const entries = Object.values(zip.files).filter((entry) => !entry.dir && !shouldSkipZipEntry(entry.name));
  const limitedEntries = entries.slice(0, MAX_ZIP_ENTRIES);
  if (entries.length > MAX_ZIP_ENTRIES) {
    warnings.push({
      fileName: archivePath,
      fileKind: "zipArchive",
      message: `ZIP archive contains ${entries.length} files; only the first ${MAX_ZIP_ENTRIES} were inspected.`,
    });
  }

  const csvEntries: Array<{
    entry: JSZip.JSZipObject;
    entryFile: UploadedImportFile;
    entryPath: string;
    kind: MindbodyFileKind;
  }> = [];

  const queueEntry = async (params: {
    entry: JSZip.JSZipObject;
    entryPath: string;
    sourceName: string;
    depth: number;
  }): Promise<void> => {
    const entryPath = normalizeZipEntryPath(params.entryPath);
    const entryFile = archiveEntryFileWithSource(archiveFile, entryPath, params.sourceName);
    const kind = classifyMindbodyFileName(entryPath);

    if (shouldImportMindbodyDocument(entryPath, kind)) {
      documentFiles.push(entryFile);
      return;
    }

    if (kind === "zipArchive") {
      if (params.depth >= MAX_NESTED_ZIP_DEPTH) {
        warnings.push({
          fileName: `${archivePath}:${entryPath}`,
          fileKind: kind,
          message: "Nested ZIP archive was skipped because it is deeper than the import limit.",
        });
        return;
      }

      let nestedZip: JSZip;
      try {
        nestedZip = await JSZip.loadAsync(await params.entry.async("arraybuffer"));
      } catch (error) {
        warnings.push({
          fileName: `${archivePath}:${entryPath}`,
          fileKind: kind,
          message:
            error instanceof Error
              ? `Could not read nested ZIP archive: ${error.message}`
              : "Could not read nested ZIP archive.",
        });
        return;
      }

      const nestedEntries = Object.values(nestedZip.files).filter(
        (entry) => !entry.dir && !shouldSkipZipEntry(entry.name),
      );
      const limitedNestedEntries = nestedEntries.slice(0, MAX_ZIP_ENTRIES);
      if (nestedEntries.length > MAX_ZIP_ENTRIES) {
        warnings.push({
          fileName: `${archivePath}:${entryPath}`,
          fileKind: kind,
          message: `Nested ZIP archive contains ${nestedEntries.length} files; only the first ${MAX_ZIP_ENTRIES} were inspected.`,
        });
      }

      for (const nestedEntry of limitedNestedEntries) {
        await queueEntry({
          entry: nestedEntry,
          entryPath: nestedZipEntryPath(entryPath, nestedEntry.name),
          sourceName: `${params.sourceName}:${entryPath}`,
          depth: params.depth + 1,
        });
      }
      return;
    }

    if (!entryPath.toLowerCase().endsWith(".csv")) {
      if (kind === "unknown") {
        warnings.push({
          fileName: `${archivePath}:${entryPath}`,
          fileKind: kind,
          message: "ZIP entry is not a recognised Mindbody CSV or supported document.",
        });
      }
      return;
    }

    csvEntries.push({ entry: params.entry, entryFile, entryPath, kind });
  };

  for (const entry of limitedEntries) {
    await queueEntry({
      entry,
      entryPath: entry.name,
      sourceName: archivePath,
      depth: 0,
    });
  }

  await runWithConcurrency(
    csvEntries,
    ZIP_ENTRY_READ_CONCURRENCY,
    async ({ entry, entryFile, kind }) => {
      pushCsvDataset({
        file: entryFile,
        kind,
        text: await entry.async("text"),
        datasets,
        warnings,
      });
    },
  );
}

async function fetchCsvDatasets(files: UploadedImportFile[]): Promise<{
  datasets: CsvDataset[];
  documentFiles: UploadedImportFile[];
  warnings: ImportWarning[];
}> {
  const datasets: CsvDataset[] = [];
  const documentFiles: UploadedImportFile[] = [];
  const warnings: ImportWarning[] = [];
  const directCsvFiles: Array<{ file: UploadedImportFile; kind: MindbodyFileKind }> = [];

  for (const file of files) {
    const path = file.relativePath || file.name;
    const kind = classifyMindbodyFileName(path);
    if (isZipImportFile(file)) {
      await expandZipFile(file, datasets, documentFiles, warnings);
      continue;
    }

    if (shouldImportMindbodyDocument(path, kind)) {
      documentFiles.push(file);
      continue;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      if (kind === "unknown") {
        warnings.push({
          fileName: path,
          fileKind: kind,
          message: "File was uploaded but is not a recognised Mindbody CSV or supported document.",
        });
      }
      continue;
    }

    directCsvFiles.push({ file, kind });
  }

  await runWithConcurrency(directCsvFiles, FILE_FETCH_CONCURRENCY, async ({ file, kind }) => {
    const fetched = await fetchUploadedText(file, kind);
    if (fetched.warning) {
      warnings.push(fetched.warning);
      return;
    }
    if (!fetched.text) return;

    pushCsvDataset({ file, kind, text: fetched.text, datasets, warnings });
  });

  return { datasets, documentFiles, warnings };
}

function datasetsByKind(datasets: CsvDataset[]): Map<MindbodyFileKind, CsvDataset[]> {
  const grouped = new Map<MindbodyFileKind, CsvDataset[]>();
  for (const dataset of datasets) {
    const group = grouped.get(dataset.kind) ?? [];
    group.push(dataset);
    grouped.set(dataset.kind, group);
  }
  return grouped;
}

function resolveLocationId(state: ImportState, row: CsvRow): string | null {
  const externalId = readField(row, "LocationID", "StudioId");
  if (externalId && state.locationIdsByExternalId.has(externalId)) {
    return state.locationIdsByExternalId.get(externalId) ?? state.locationId;
  }

  const name = readField(row, "LocationName", "Location", "VisitLocation");
  if (name && state.locationIdsByName.has(name.toLowerCase())) {
    return state.locationIdsByName.get(name.toLowerCase()) ?? state.locationId;
  }

  return state.locationId;
}

async function findClientId(state: ImportState, row: CsvRow): Promise<string | null> {
  const cached = findCachedClientId(state, row);
  if (cached) return cached;

  const mindbodyId = readField(row, "MBSystemID", "ClientID", "PayingClientID", "ReceivingClientId");
  const barcodeId = readField(row, "BarcodeID");
  const email = readField(row, "EmailName", "Email").toLowerCase();

  const existing =
    mindbodyId
      ? await db.query.client.findFirst({
          where: and(eq(client.organizationId, state.organizationId), eq(client.mindbodyId, mindbodyId)),
          columns: { id: true, mindbodyId: true, barcodeId: true, email: true },
        })
      : barcodeId
        ? await db.query.client.findFirst({
            where: and(eq(client.organizationId, state.organizationId), eq(client.barcodeId, barcodeId)),
            columns: { id: true, mindbodyId: true, barcodeId: true, email: true },
          })
        : !mindbodyId && !barcodeId && email
          ? await db.query.client.findFirst({
              where: and(eq(client.organizationId, state.organizationId), eq(client.email, email)),
              columns: { id: true, mindbodyId: true, barcodeId: true, email: true },
            })
          : null;

  if (!existing) return null;
  if (existing.mindbodyId) state.clientIdsByMindbodyId.set(existing.mindbodyId, existing.id);
  if (existing.barcodeId) state.clientIdsByBarcodeId.set(existing.barcodeId, existing.id);
  if (existing.email) state.clientIdsByEmail.set(existing.email.toLowerCase(), existing.id);
  return existing.id;
}

function findCachedClientId(state: ImportState, row: CsvRow): string | null {
  const mindbodyId = readField(row, "MBSystemID", "ClientID", "PayingClientID", "ReceivingClientId");
  const barcodeId = readField(row, "BarcodeID");
  const email = readField(row, "EmailName", "Email").toLowerCase();

  if (mindbodyId && state.clientIdsByMindbodyId.has(mindbodyId)) {
    return state.clientIdsByMindbodyId.get(mindbodyId) ?? null;
  }
  if (barcodeId && state.clientIdsByBarcodeId.has(barcodeId)) {
    return state.clientIdsByBarcodeId.get(barcodeId) ?? null;
  }
  if (!mindbodyId && !barcodeId && email && state.clientIdsByEmail.has(email)) {
    return state.clientIdsByEmail.get(email) ?? null;
  }

  return null;
}

async function preloadExistingClientIds(
  state: ImportState,
  rows: CsvRow[],
): Promise<void> {
  const addExisting = (existing: {
    id: string;
    mindbodyId: string | null;
    barcodeId: string | null;
    email: string | null;
  }) => {
    if (existing.mindbodyId) {
      state.clientIdsByMindbodyId.set(existing.mindbodyId, existing.id);
    }
    if (existing.barcodeId) {
      state.clientIdsByBarcodeId.set(existing.barcodeId, existing.id);
    }
    if (existing.email) {
      state.clientIdsByEmail.set(existing.email.toLowerCase(), existing.id);
    }
  };

  const mindbodyIds = uniqueNonEmpty(
    rows.map((row) => readField(row, "MBSystemID", "ClientID")),
  );
  const barcodeIds = uniqueNonEmpty(rows.map((row) => readField(row, "BarcodeID")));
  const emails = uniqueNonEmpty(
    rows.map((row) => readField(row, "EmailName", "Email").toLowerCase()),
  );

  await runWithConcurrency(chunks(mindbodyIds, IMPORT_LOOKUP_CHUNK_SIZE), IMPORT_LOOKUP_CONCURRENCY, async (chunk) => {
    const existingClients = await db
      .select({
        id: client.id,
        mindbodyId: client.mindbodyId,
        barcodeId: client.barcodeId,
        email: client.email,
      })
      .from(client)
      .where(
        and(
          eq(client.organizationId, state.organizationId),
          inArray(client.mindbodyId, chunk),
        ),
      );
    existingClients.forEach(addExisting);
  });

  await runWithConcurrency(chunks(barcodeIds, IMPORT_LOOKUP_CHUNK_SIZE), IMPORT_LOOKUP_CONCURRENCY, async (chunk) => {
    const existingClients = await db
      .select({
        id: client.id,
        mindbodyId: client.mindbodyId,
        barcodeId: client.barcodeId,
        email: client.email,
      })
      .from(client)
      .where(
        and(
          eq(client.organizationId, state.organizationId),
          inArray(client.barcodeId, chunk),
        ),
      );
    existingClients.forEach(addExisting);
  });

  await runWithConcurrency(chunks(emails, IMPORT_LOOKUP_CHUNK_SIZE), IMPORT_LOOKUP_CONCURRENCY, async (chunk) => {
    const existingClients = await db
      .select({
        id: client.id,
        mindbodyId: client.mindbodyId,
        barcodeId: client.barcodeId,
        email: client.email,
      })
      .from(client)
      .where(
        and(
          eq(client.organizationId, state.organizationId),
          inArray(client.email, chunk),
        ),
      );
    existingClients.forEach(addExisting);
  });
}

async function preloadExistingInstructors(
  state: ImportState,
  rows: CsvRow[],
): Promise<void> {
  const trainerIds = uniqueNonEmpty(rows.map((row) => readField(row, "TrainerID")));
  await runWithConcurrency(chunks(trainerIds, IMPORT_LOOKUP_CHUNK_SIZE), IMPORT_LOOKUP_CONCURRENCY, async (chunk) => {
    const existingInstructors = await db
      .select({ id: instructor.id, mindbodyTrainerId: instructor.mindbodyTrainerId })
      .from(instructor)
      .where(
        and(
          eq(instructor.organizationId, state.organizationId),
          inArray(instructor.mindbodyTrainerId, chunk),
        ),
      );
    for (const existing of existingInstructors) {
      if (existing.mindbodyTrainerId) {
        state.instructorIdsByTrainerId.set(existing.mindbodyTrainerId, existing.id);
      }
    }
  });
}

async function preloadExistingStaffMembers(
  state: ImportState,
  rows: CsvRow[],
): Promise<void> {
  const trainerIds = uniqueNonEmpty(rows.map((row) => readField(row, "TrainerID")));
  await runWithConcurrency(chunks(trainerIds, IMPORT_LOOKUP_CHUNK_SIZE), IMPORT_LOOKUP_CONCURRENCY, async (chunk) => {
    const existingStaffMembers = await db
      .select({ id: studioStaffMember.id, externalId: studioStaffMember.externalId })
      .from(studioStaffMember)
      .where(
        and(
          eq(studioStaffMember.organizationId, state.organizationId),
          inArray(studioStaffMember.externalId, chunk),
        ),
      );
    for (const existing of existingStaffMembers) {
      if (existing.externalId) {
        state.staffMemberIdsByTrainerId.set(existing.externalId, existing.id);
      }
    }
  });
}

async function preloadExistingProducts(
  state: ImportState,
  rows: CsvRow[],
): Promise<void> {
  const externalIds = uniqueNonEmpty(rows.map((row) => readField(row, "ProductID")));
  const skus = uniqueNonEmpty(rows.map((row) => readField(row, "BarcodeID")));

  const addExisting = (existing: {
    id: string;
    externalId: string | null;
    sku: string | null;
    type: typeof studioProduct.$inferSelect.type;
  }) => {
    if (existing.externalId) state.productIdsByExternalId.set(existing.externalId, existing.id);
    if (existing.sku) state.productIdsBySku.set(existing.sku, existing.id);
    state.productTypesById.set(existing.id, existing.type);
  };

  await runWithConcurrency(chunks(externalIds, IMPORT_LOOKUP_CHUNK_SIZE), IMPORT_LOOKUP_CONCURRENCY, async (chunk) => {
    const products = await db
      .select({
        id: studioProduct.id,
        externalId: studioProduct.externalId,
        sku: studioProduct.sku,
        type: studioProduct.type,
      })
      .from(studioProduct)
      .where(
        and(
          eq(studioProduct.organizationId, state.organizationId),
          inArray(studioProduct.externalId, chunk),
        ),
      );
    products.forEach(addExisting);
  });

  await runWithConcurrency(chunks(skus, IMPORT_LOOKUP_CHUNK_SIZE), IMPORT_LOOKUP_CONCURRENCY, async (chunk) => {
    const products = await db
      .select({
        id: studioProduct.id,
        externalId: studioProduct.externalId,
        sku: studioProduct.sku,
        type: studioProduct.type,
      })
      .from(studioProduct)
      .where(
        and(
          eq(studioProduct.organizationId, state.organizationId),
          inArray(studioProduct.sku, chunk),
        ),
      );
    products.forEach(addExisting);
  });
}

async function preloadExistingMemberships(
  state: ImportState,
  rows: CsvRow[],
): Promise<void> {
  const externalIds = uniqueNonEmpty(
    rows.flatMap((row) => [
      readField(row, "ClientContractID"),
      readField(row, "RowID"),
    ]),
  );
  await runWithConcurrency(chunks(externalIds, IMPORT_LOOKUP_CHUNK_SIZE), IMPORT_LOOKUP_CONCURRENCY, async (chunk) => {
    const memberships = await db
      .select({
        id: studioMembership.id,
        externalId: studioMembership.externalId,
        clientId: studioMembership.clientId,
      })
      .from(studioMembership)
      .where(
        and(
          eq(studioMembership.organizationId, state.organizationId),
          inArray(studioMembership.externalId, chunk),
        ),
      );
    for (const membership of memberships) {
      if (membership.externalId) {
        state.membershipIdsByContractId.set(membership.externalId, membership.id);
      }
      state.membershipClientIdsById.set(membership.id, membership.clientId);
    }
  });
}

async function preloadExistingClassCredits(
  state: ImportState,
  rows: CsvRow[],
): Promise<void> {
  const externalIds = uniqueNonEmpty(
    rows.flatMap((row) => [
      readField(row, "PaymentDataID"),
      readField(row, "PmtRefNo"),
    ]),
  );
  await runWithConcurrency(
    chunks(externalIds, IMPORT_LOOKUP_CHUNK_SIZE),
    IMPORT_LOOKUP_CONCURRENCY,
    async (chunk) => {
      const credits = await db
        .select({
          id: classCredit.id,
          externalId: classCredit.externalId,
          paymentRefNo: classCredit.paymentRefNo,
        })
        .from(classCredit)
        .where(
          and(
            eq(classCredit.organizationId, state.organizationId),
            or(
              inArray(classCredit.externalId, chunk),
              inArray(classCredit.paymentRefNo, chunk),
            ),
          ),
        );
      for (const credit of credits) {
        if (credit.externalId) state.classCreditIdsByExternalId.set(credit.externalId, credit.id);
        if (credit.paymentRefNo) state.classCreditIdsByPaymentRefNo.set(credit.paymentRefNo, credit.id);
      }
    },
  );
}

async function preloadExistingPayments(
  state: ImportState,
  externalIds: string[],
): Promise<void> {
  await runWithConcurrency(
    chunks(uniqueNonEmpty(externalIds), IMPORT_LOOKUP_CHUNK_SIZE),
    IMPORT_LOOKUP_CONCURRENCY,
    async (chunk) => {
      const payments = await db
        .select({
          id: studioPayment.id,
          externalId: studioPayment.externalId,
          mindbodyPmtRefNo: studioPayment.mindbodyPmtRefNo,
          clientId: studioPayment.clientId,
        })
        .from(studioPayment)
        .where(
          and(
            eq(studioPayment.organizationId, state.organizationId),
            inArray(studioPayment.externalId, chunk),
          ),
        );
      for (const payment of payments) {
        if (payment.externalId) state.paymentIdsByExternalId.set(payment.externalId, payment.id);
        if (payment.mindbodyPmtRefNo) state.paymentIdsByMindbodyPmtRefNo.set(payment.mindbodyPmtRefNo, payment.id);
        if (payment.clientId) state.paymentClientIdsById.set(payment.id, payment.clientId);
      }
    },
  );
}

async function preloadExistingSaleLineItems(
  state: ImportState,
  rows: CsvRow[],
): Promise<void> {
  const externalIds = uniqueNonEmpty(rows.map((row) => readField(row, "SDID")));
  await runWithConcurrency(
    chunks(externalIds, IMPORT_LOOKUP_CHUNK_SIZE),
    IMPORT_LOOKUP_CONCURRENCY,
    async (chunk) => {
      const lineItems = await db
        .select({
          id: studioPaymentLineItem.id,
          externalId: studioPaymentLineItem.externalId,
          mindbodyPmtRefNo: studioPaymentLineItem.mindbodyPmtRefNo,
          paymentId: studioPaymentLineItem.paymentId,
          clientId: studioPaymentLineItem.clientId,
        })
        .from(studioPaymentLineItem)
        .where(
          and(
            eq(studioPaymentLineItem.organizationId, state.organizationId),
            inArray(studioPaymentLineItem.externalId, chunk),
          ),
        );
      for (const lineItem of lineItems) {
        if (lineItem.externalId) state.saleLineItemIdsByExternalId.set(lineItem.externalId, lineItem.id);
        if (lineItem.clientId) state.saleLineItemClientIdsById.set(lineItem.id, lineItem.clientId);
        if (lineItem.mindbodyPmtRefNo) {
          state.saleLineItemIdsByMindbodyPmtRefNo.set(lineItem.mindbodyPmtRefNo, lineItem.id);
          if (lineItem.paymentId) {
            state.paymentIdsByMindbodyPmtRefNo.set(lineItem.mindbodyPmtRefNo, lineItem.paymentId);
          }
        }
      }
    },
  );
}

async function preloadExistingBookingPaymentLinks(
  state: ImportState,
  rows: CsvRow[],
): Promise<void> {
  const visitRefNos = uniqueNonEmpty(rows.map((row) => readField(row, "VisitRefNo")));
  if (visitRefNos.length === 0) return;

  await runWithConcurrency(
    chunks(visitRefNos, IMPORT_LOOKUP_CHUNK_SIZE),
    IMPORT_LOOKUP_CONCURRENCY,
    async (chunk) => {
      const links = await db
        .select({
          visitRefNo: studioBookingPayment.visitRefNo,
          mindbodyPmtRefNo: studioBookingPayment.mindbodyPmtRefNo,
        })
        .from(studioBookingPayment)
        .where(
          and(
            eq(studioBookingPayment.organizationId, state.organizationId),
            inArray(studioBookingPayment.visitRefNo, chunk),
          ),
        );
      for (const link of links) {
        state.bookingPaymentKeys.add(`${link.visitRefNo}|${link.mindbodyPmtRefNo}`);
      }
    },
  );

  await runWithConcurrency(
    chunks(visitRefNos, IMPORT_LOOKUP_CHUNK_SIZE),
    IMPORT_LOOKUP_CONCURRENCY,
    async (chunk) => {
      const bookings = await db
        .select({ id: studioBooking.id, externalId: studioBooking.externalId })
        .from(studioBooking)
        .where(inArray(studioBooking.externalId, chunk));
      for (const booking of bookings) {
        if (booking.externalId) state.bookingIdsByVisitRefNo.set(booking.externalId, booking.id);
      }
    },
  );
}

async function preloadExistingVisitRecords(
  state: ImportState,
  rows: CsvRow[],
): Promise<void> {
  const externalIds = uniqueNonEmpty(rows.map((row) => readField(row, "VisitID", "VisitRefNo")));
  const classExternalIdsByKey = new Map<string, string>(
    rows.map((row) => {
      const key = visitClassKey(row);
      return [key, `mindbody-visit-group-${stableHash(key)}`] as const;
    }),
  );
  const classKeysByExternalId = new Map(
    Array.from(classExternalIdsByKey.entries()).map(([key, externalId]) => [
      externalId,
      key,
    ]),
  );

  await runWithConcurrency(
    chunks(externalIds, IMPORT_LOOKUP_CHUNK_SIZE),
    IMPORT_LOOKUP_CONCURRENCY,
    async (chunk) => {
      const bookings = await db
        .select({
          id: studioBooking.id,
          externalId: studioBooking.externalId,
          clientId: studioBooking.clientId,
        })
        .from(studioBooking)
        .where(inArray(studioBooking.externalId, chunk));

      for (const booking of bookings) {
        if (booking.externalId) {
          state.bookingIdsByExternalClientKey.set(
            `${booking.externalId}|${booking.clientId}`,
            booking.id,
          );
          state.bookingIdsByVisitRefNo.set(booking.externalId, booking.id);
        }
      }
    },
  );

  await runWithConcurrency(
    chunks(Array.from(classExternalIdsByKey.values()), IMPORT_LOOKUP_CHUNK_SIZE),
    IMPORT_LOOKUP_CONCURRENCY,
    async (chunk) => {
      const classes = await db
        .select({ id: studioClass.id, externalId: studioClass.externalId })
        .from(studioClass)
        .where(
          and(
            eq(studioClass.organizationId, state.organizationId),
            inArray(studioClass.externalId, chunk),
          ),
        );

      for (const existingClass of classes) {
        const key = existingClass.externalId
          ? classKeysByExternalId.get(existingClass.externalId)
          : null;
        if (key) state.visitClassIdsByKey.set(key, existingClass.id);
      }
    },
  );
}

async function preloadExistingCheckIns(
  state: ImportState,
  pairs: Array<{ clientId: string; classId: string }>,
): Promise<void> {
  const classIds = uniqueNonEmpty(pairs.map((pair) => pair.classId));
  if (classIds.length === 0) return;

  await runWithConcurrency(
    chunks(classIds, IMPORT_LOOKUP_CHUNK_SIZE),
    IMPORT_LOOKUP_CONCURRENCY,
    async (chunk) => {
      const existingCheckIns = await db
        .select({
          clientId: checkIn.clientId,
          classId: checkIn.classId,
        })
        .from(checkIn)
        .where(
          and(
            eq(checkIn.organizationId, state.organizationId),
            inArray(checkIn.classId, chunk),
          ),
        );

      for (const existing of existingCheckIns) {
        state.checkInKeys.add(checkInKey(existing.clientId, existing.classId));
      }
    },
  );
}

async function preloadExistingClientDocuments(
  state: ImportState,
  sourcePaths: string[],
): Promise<void> {
  await runWithConcurrency(
    chunks(uniqueNonEmpty(sourcePaths), IMPORT_LOOKUP_CHUNK_SIZE),
    IMPORT_LOOKUP_CONCURRENCY,
    async (chunk) => {
      const documents = await db
        .select({ sourcePath: clientDocument.sourcePath })
        .from(clientDocument)
        .where(
          and(
            eq(clientDocument.organizationId, state.organizationId),
            inArray(clientDocument.sourcePath, chunk),
          ),
        );

      for (const document of documents) {
        if (document.sourcePath) state.clientDocumentSourcePaths.add(document.sourcePath);
      }
    },
  );
}

async function preloadExistingLocations(state: ImportState, rows: CsvRow[]): Promise<void> {
  const externalIds = uniqueNonEmpty(rows.map((row) => readField(row, "LocationID")));
  await runWithConcurrency(
    chunks(externalIds, IMPORT_LOOKUP_CHUNK_SIZE),
    IMPORT_LOOKUP_CONCURRENCY,
    async (chunk) => {
      const locations = await db
        .select({
          id: locationTable.id,
          externalId: locationTable.externalId,
          companyName: locationTable.companyName,
        })
        .from(locationTable)
        .where(
          and(
            eq(locationTable.organizationId, state.organizationId),
            inArray(locationTable.externalId, chunk),
          ),
        );

      for (const existingLocation of locations) {
        if (existingLocation.externalId) {
          state.locationIdsByExternalId.set(existingLocation.externalId, existingLocation.id);
        }
        state.locationIdsByName.set(existingLocation.companyName.toLowerCase(), existingLocation.id);
      }
    },
  );
}

async function importLocations(state: ImportState, dataset: CsvDataset): Promise<void> {
  markEntityTotal(state, "locations", dataset.rows.length);
  if (!state.dryRun) await preloadExistingLocations(state, dataset.rows);

  const locationUpdates: Array<{
    id: string;
    values: Omit<typeof locationTable.$inferInsert, "id" | "createdByUserId">;
    externalId: string;
    companyName: string;
    rowNumber: number;
  }> = [];
  const locationInserts: Array<{
    id: string;
    values: typeof locationTable.$inferInsert;
    externalId: string;
    companyName: string;
    rowNumber: number;
  }> = [];
  const locationIdsToEnsure = new Set<string>();
  const pendingLocationIdsByExternalId = new Map<string, string>();

  const rememberLocation = (id: string, externalId: string, companyName: string): void => {
    if (!state.locationId) state.locationId = id;
    if (externalId) state.locationIdsByExternalId.set(externalId, id);
    state.locationIdsByName.set(companyName.toLowerCase(), id);
    locationIdsToEnsure.add(id);
  };

  for (const [index, row] of dataset.rows.entries()) {
    try {
      const externalId = readField(row, "LocationID");
      const companyName = readField(row, "LocationName") || "Imported location";
      const existingId = externalId
        ? state.locationIdsByExternalId.get(externalId) ?? pendingLocationIdsByExternalId.get(externalId) ?? null
        : null;
      const values = {
        organizationId: state.organizationId,
        externalId: externalId || null,
        companyName,
        phone: readField(row, "Phone") || null,
        billingEmail: readField(row, "Email") || null,
        contactName: readField(row, "ContactName") || null,
        taxId: readField(row, "TaxID") || null,
        taxGrouping: readField(row, "TaxGrouping") || null,
        taxRates: {
          tax1: readField(row, "Tax1"),
          tax2: readField(row, "Tax2"),
          tax3: readField(row, "Tax3"),
          tax4: readField(row, "Tax4"),
          tax5: readField(row, "Tax5"),
        },
        addressLine1: readField(row, "StreetAddress") || null,
        city: readField(row, "City") || null,
        state: readField(row, "StateProvCode") || null,
        postalCode: readField(row, "PostalCode") || null,
        country: readField(row, "Country") || null,
        description: readField(row, "LocationDescription") || null,
        isActive: boolFromMindbody(readField(row, "Active")) ?? true,
        metadata: rowMetadata(row, dataset.file.name),
        updatedAt: now(),
      } satisfies Omit<typeof locationTable.$inferInsert, "id" | "createdByUserId">;

      if (state.dryRun) {
        markProcessed(state, "locations");
      } else if (existingId) {
        locationUpdates.push({
          id: existingId,
          values,
          externalId,
          companyName,
          rowNumber: index + 2,
        });
      } else {
        const id = createId();
        if (externalId) pendingLocationIdsByExternalId.set(externalId, id);
        locationInserts.push({
          id,
          values: { id, ...values, createdByUserId: state.importedBy },
          externalId,
          companyName,
          rowNumber: index + 2,
        });
      }
    } catch (error) {
      markFailed(state, "locations", {
        fileName: dataset.file.name,
        row: index + 2,
        entity: "location",
        error: error instanceof Error ? error.message : "Unknown location import error",
      });
    }
  }

  for (const chunk of chunks(locationInserts, IMPORT_WRITE_CHUNK_SIZE)) {
    try {
      await db
        .insert(locationTable)
        .values(chunk.map((item) => item.values))
        .onConflictDoNothing();
      for (const item of chunk) {
        rememberLocation(item.id, item.externalId, item.companyName);
        markProcessed(state, "locations");
      }
    } catch (error) {
      await runWithConcurrency(chunk, IMPORT_WRITE_CONCURRENCY, async (item) => {
        try {
          await db.insert(locationTable).values(item.values).onConflictDoNothing();
          rememberLocation(item.id, item.externalId, item.companyName);
          markProcessed(state, "locations");
        } catch (rowError) {
          markFailed(state, "locations", {
            fileName: dataset.file.name,
            row: item.rowNumber,
            entity: "location",
            error:
              rowError instanceof Error
                ? rowError.message
                : error instanceof Error
                  ? error.message
                  : "Unknown location insert error",
          });
        }
      });
    }
  }

  await runWithConcurrency(locationUpdates, IMPORT_WRITE_CONCURRENCY, async (item) => {
    try {
      await db.update(locationTable).set(item.values).where(eq(locationTable.id, item.id));
      rememberLocation(item.id, item.externalId, item.companyName);
      markProcessed(state, "locations");
    } catch (error) {
      markFailed(state, "locations", {
        fileName: dataset.file.name,
        row: item.rowNumber,
        entity: "location",
        error: error instanceof Error ? error.message : "Unknown location update error",
      });
    }
  });

  await ensureImportedLocationMembers(state, Array.from(locationIdsToEnsure));
}

async function importClients(
  state: ImportState,
  datasets: CsvDataset[],
  importJobId: string,
): Promise<void> {
  const notificationRows = new Map<string, CsvRow>();
  const referrerRowsById = new Map<string, CsvRow>();
  const tagsByMindbodyId = new Map<string, Set<string>>();
  const indexRowsByMindbodyId = new Map<string, CsvRow[]>();
  const noteRowsByMindbodyId = new Map<string, string[]>();

  for (const dataset of datasets.filter((item) => item.kind === "clientNotifications")) {
    for (const row of dataset.rows) notificationRows.set(readField(row, "MBSystemID"), row);
  }
  for (const dataset of datasets.filter((item) => item.kind === "referrers")) {
    for (const row of dataset.rows) referrerRowsById.set(readField(row, "ReferrerID"), row);
  }
  for (const dataset of datasets.filter((item) => item.kind === "clientTypes")) {
    for (const row of dataset.rows) {
      const id = readField(row, "MBSystemID");
      if (!id) continue;
      const tags = tagsByMindbodyId.get(id) ?? new Set<string>();
      const tag = readField(row, "TypeName");
      if (tag) tags.add(tag);
      tagsByMindbodyId.set(id, tags);
    }
  }
  for (const dataset of datasets.filter((item) => item.kind === "indexes")) {
    for (const row of dataset.rows) {
      const id = readField(row, "MBSystemID");
      if (!id) continue;
      const rows = indexRowsByMindbodyId.get(id) ?? [];
      rows.push(row);
      indexRowsByMindbodyId.set(id, rows);
    }
  }
  for (const dataset of datasets.filter((item) => item.kind === "notes")) {
    for (const row of dataset.rows) {
      const id = readField(row, "MBSystemID");
      const text = readField(row, "Notes");
      if (!id || !text) continue;
      const notes = noteRowsByMindbodyId.get(id) ?? [];
      notes.push(text);
      noteRowsByMindbodyId.set(id, notes);
    }
  }

  const clientDatasets = datasets.filter((item) => item.kind === "clients");
  const allClientRows = clientDatasets.flatMap((dataset) => dataset.rows);
  if (!state.dryRun && allClientRows.length > 0) {
    await preloadExistingClientIds(state, allClientRows);
  }

  const rememberClient = (saved: {
    id: string;
    mindbodyId: string | null;
    barcodeId: string | null;
    email: string | null;
  }) => {
    if (saved.mindbodyId) state.clientIdsByMindbodyId.set(saved.mindbodyId, saved.id);
    if (saved.barcodeId) state.clientIdsByBarcodeId.set(saved.barcodeId, saved.id);
    if (saved.email) state.clientIdsByEmail.set(saved.email.toLowerCase(), saved.id);
  };

  for (const dataset of clientDatasets) {
    markEntityTotal(state, "clients", dataset.rows.length);
    const clientUpdates: Array<{
      id: string;
      values: Omit<typeof client.$inferInsert, "id">;
      rowNumber: number;
      fileName: string;
    }> = [];
    const clientInserts: Array<{
      values: typeof client.$inferInsert;
      rowNumber: number;
      fileName: string;
    }> = [];

    for (const [index, row] of dataset.rows.entries()) {
      try {
        const mindbodyId = readField(row, "MBSystemID");
        const barcodeId = readField(row, "BarcodeID");
        const firstName = readField(row, "FirstName");
        const lastName = readField(row, "LastName");
        const email = readField(row, "EmailName").toLowerCase();
        const dateOfBirth = parseDate(readField(row, "Birthdate"));
        const inactive = boolFromMindbody(readField(row, "Inactive")) ?? false;
        const isProspect = boolFromMindbody(readField(row, "IsProspect")) ?? false;
        const locationId = resolveLocationId(state, row);
        const notificationRow = notificationRows.get(mindbodyId);
        const existingId = findCachedClientId(state, row);
        const tags = Array.from(tagsByMindbodyId.get(mindbodyId) ?? new Set<string>());
        const referrerId = readField(row, "ReferrerID");
        const referrerRow = referrerId ? referrerRowsById.get(referrerId) ?? null : null;
        const referrerName = referrerRow ? readField(referrerRow, "ReferrerName") : readField(row, "ReferredBy");
        const sourceCreatedAt = parseDate(
          readField(row, "ProfileCreationDate", "FirstContactDate"),
        );
        const metadata: JsonObject = {
          ...rowMetadata(row, dataset.file.name),
          mindbody: {
            id: mindbodyId,
            barcodeId,
            status: inactive ? "inactive" : isProspect ? "prospect" : "active",
            creationDate: readField(row, "ProfileCreationDate"),
            deactivatedTime: readField(row, "DeactivatedTime"),
            reactivatedTime: readField(row, "ReactivatedTime"),
            closeDate: readField(row, "CloseDate"),
            referrerId,
            referrerName,
            createdBy: readField(row, "CreatedBy"),
            repIds: [
              readField(row, "RepID"),
              readField(row, "RepID2"),
              readField(row, "RepID3"),
              readField(row, "RepID4"),
              readField(row, "RepID5"),
              readField(row, "RepID6"),
            ].filter(Boolean),
            onlineSignUp: readField(row, "OnlineSignUp"),
            suspended: readField(row, "Suspended"),
            suspendFromDate: readField(row, "SuspendFromDate"),
            suspendToDate: readField(row, "SuspendToDate"),
            coordinates: {
              longitude: readField(row, "Longitude"),
              latitude: readField(row, "Latitude"),
            },
          },
          indexes: toJsonValue(indexRowsByMindbodyId.get(mindbodyId) ?? []),
          notes: toJsonValue(noteRowsByMindbodyId.get(mindbodyId) ?? []),
          referrer: referrerRow ? toJsonValue(referrerRow) : null,
          referredBy: referrerName,
          prospectStage: readField(row, "ProspectStage"),
          allowAccountPurchases: readField(row, "AllowAccountPurchases"),
        };
        const promotionalEmailOptIn = notificationRow
          ? boolFromMindbody(readField(notificationRow, "PromotionalEmailOptIn"))
          : null;
        const notificationPrefs = notificationRow
          ? {
              promotionalEmail: boolFromMindbody(readField(notificationRow, "PromotionalEmailOptIn")),
              promotionalText: boolFromMindbody(readField(notificationRow, "PromotionalTextOptIn")),
              scheduleEmail: boolFromMindbody(readField(notificationRow, "ScheduleEmailOptIn")),
              scheduleText: boolFromMindbody(readField(notificationRow, "ScheduleTextOptIn")),
              accountEmail: boolFromMindbody(readField(notificationRow, "AccountEmailOptIn")),
              accountText: boolFromMindbody(readField(notificationRow, "AccountTextOptIn")),
              operationalEmail: boolFromMindbody(readField(notificationRow, "OperationalEmailOptIn")),
              twilio: boolFromMindbody(readField(notificationRow, "TwilioOptIn")),
            }
          : null;
        const clientTypeValue: typeof client.$inferInsert.type = inactive
          ? "CHURN"
          : isProspect
            ? "PROSPECT"
            : "CUSTOMER";
        const acquisitionStageValue: typeof client.$inferInsert.acquisitionStage = inactive
          ? "LOST"
          : isProspect
            ? "INQUIRY"
            : "ACTIVE";
        const values = {
          organizationId: state.organizationId,
          locationId,
          mindbodyId: mindbodyId || null,
          barcodeId: barcodeId || null,
          firstName: firstName || null,
          middleName: readField(row, "MiddleName") || null,
          lastName: lastName || null,
          nickname: readField(row, "Nickname") || null,
          name: makeName(firstName, lastName, readField(row, "CompanyName")),
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
          type: clientTypeValue,
          source: referrerName || "Mindbody",
          website: readField(row, "Website") || null,
          tags,
          emergencyContactName: readField(row, "EmergContact") || null,
          emergencyContactRelation: readField(row, "EmergRela") || null,
          emergencyContactPhone: readField(row, "EmergPhone") || null,
          emergencyContactEmail: readField(row, "EmergEmail") || null,
          waiverSignedAt: parseDate(readField(row, "LiabilityAgreementDate")),
          acquiredAt: parseDate(readField(row, "FirstContactDate", "ProfileCreationDate")),
          trialStartedAt: parseDate(readField(row, "FirstClassDate", "FirstApptDate")),
          acquisitionStage: acquisitionStageValue,
          emailUnsubscribed: promotionalEmailOptIn === false,
          notificationPrefs,
          metadata,
          ...(sourceCreatedAt ? { createdAt: sourceCreatedAt } : {}),
          updatedAt: now(),
        } satisfies Omit<typeof client.$inferInsert, "id">;

        if (state.dryRun) {
          markProcessed(state, "clients");
        } else if (existingId) {
          clientUpdates.push({
            id: existingId,
            values,
            rowNumber: index + 2,
            fileName: dataset.file.name,
          });
        } else {
          const id = createId();
          rememberClient({
            id,
            mindbodyId: mindbodyId || null,
            barcodeId: barcodeId || null,
            email: email || null,
          });
          clientInserts.push({
            values: { id, ...values },
            rowNumber: index + 2,
            fileName: dataset.file.name,
          });
        }
      } catch (error) {
        markFailed(state, "clients", {
          fileName: dataset.file.name,
          row: index + 2,
          entity: "client",
          error: error instanceof Error ? error.message : "Unknown client import error",
        });
      }

      const completed = state.counters.clients?.processed ?? 0;
      const failed = state.counters.clients?.failed ?? 0;
      if ((completed + failed) % IMPORT_PROGRESS_FLUSH_INTERVAL === 0) {
        await updateJobProgress(importJobId, state);
      }
    }

    for (const chunk of chunks(clientInserts, IMPORT_WRITE_CHUNK_SIZE)) {
      try {
        const savedClients = await db
          .insert(client)
          .values(chunk.map((item) => item.values))
          .onConflictDoNothing()
          .returning({
            id: client.id,
            mindbodyId: client.mindbodyId,
            barcodeId: client.barcodeId,
            email: client.email,
          });
        savedClients.forEach(rememberClient);
        for (const item of chunk) {
          markProcessed(state, "clients");
          await flushProgressIfDue(importJobId, state, "clients");
        }
      } catch (error) {
        await runWithConcurrency(chunk, IMPORT_WRITE_CONCURRENCY, async (item) => {
          try {
            const [saved] = await db
              .insert(client)
              .values(item.values)
              .onConflictDoNothing()
              .returning({
                id: client.id,
                mindbodyId: client.mindbodyId,
                barcodeId: client.barcodeId,
                email: client.email,
              });
            if (saved) rememberClient(saved);
            markProcessed(state, "clients");
          } catch (rowError) {
            markFailed(state, "clients", {
              fileName: item.fileName,
              row: item.rowNumber,
              entity: "client",
              error:
                rowError instanceof Error
                  ? rowError.message
                  : error instanceof Error
                    ? error.message
                    : "Unknown client insert error",
            });
          }
          await flushProgressIfDue(importJobId, state, "clients");
        });
      }
    }

    await runWithConcurrency(clientUpdates, IMPORT_WRITE_CONCURRENCY, async (item) => {
      try {
        const [saved] = await db
          .update(client)
          .set(item.values)
          .where(eq(client.id, item.id))
          .returning({
            id: client.id,
            mindbodyId: client.mindbodyId,
            barcodeId: client.barcodeId,
            email: client.email,
          });
        if (saved) rememberClient(saved);
        markProcessed(state, "clients");
      } catch (error) {
        markFailed(state, "clients", {
          fileName: item.fileName,
          row: item.rowNumber,
          entity: "client",
          error: error instanceof Error ? error.message : "Unknown client update error",
        });
      }
      await flushProgressIfDue(importJobId, state, "clients");
    });
    await updateJobProgress(importJobId, state);
  }
}

async function importTrainers(state: ImportState, dataset: CsvDataset): Promise<void> {
  markEntityTotal(state, "instructors", dataset.rows.length);
  if (!state.dryRun) await preloadExistingInstructors(state, dataset.rows);
  const instructorUpdates: Array<{
    id: string;
    values: Omit<typeof instructor.$inferInsert, "id">;
    trainerId: string;
    rowNumber: number;
  }> = [];
  const instructorInserts: Array<{
    values: typeof instructor.$inferInsert;
    trainerId: string;
    rowNumber: number;
  }> = [];

  for (const [index, row] of dataset.rows.entries()) {
    try {
      if (!isMindbodyTeachingInstructor(row)) {
        markProcessed(state, "instructors");
        continue;
      }

      const trainerId = readField(row, "TrainerID");
      const firstName = readField(row, "Firstname", "FirstName");
      const lastName = readField(row, "Lastname", "LastName");
      const name = readField(row, "DisplayName") || makeName(firstName, lastName, "Imported instructor");
      const existingId = trainerId ? state.instructorIdsByTrainerId.get(trainerId) ?? null : null;
      const values = {
        organizationId: state.organizationId,
        locationId: resolveLocationId(state, row),
        mindbodyTrainerId: trainerId || null,
        name,
        firstName: firstName || null,
        lastName: lastName || null,
        email: readField(row, "Email") || null,
        phone: readField(row, "Cellphone", "Homephone", "Workphone") || null,
        employeeId: readField(row, "EmpID") || null,
        addressLine1: readField(row, "Address") || null,
        city: readField(row, "City") || null,
        county: readField(row, "State") || null,
        postcode: readField(row, "Postalcode") || null,
        country: readField(row, "Country") || null,
        dateOfBirth: parseDate(readField(row, "Birthdate")),
        bio: readField(row, "Bio", "Notes") || null,
        gender: boolFromMindbody(readField(row, "Male")) === true ? "Male" : null,
        hourlyRate: parseMoney(readField(row, "HourlyRate"))?.toString() ?? null,
        isActive: boolFromMindbody(readField(row, "Active")) ?? true,
        isSystem: boolFromMindbody(readField(row, "isSystem")) ?? false,
        employmentStart: parseDate(readField(row, "EmploymentStart")),
        employmentEnd: parseDate(readField(row, "EmploymentEnd")),
        commissionConfig: {
          earnsCommissions: readField(row, "EarnsCommissions"),
          standardPercent: readField(row, "StdTrnCommissionPercRate"),
          standardFlat: readField(row, "StdTrnCommissionFlatRate"),
          promoPercent: readField(row, "PromoTrnCommissionPercRate"),
          promoFlat: readField(row, "PromoTrnCommissionFlatRate"),
          earnsTips: readField(row, "EarnsTips"),
        },
        customFields: rowMetadata(row, dataset.file.name),
        updatedAt: now(),
      } satisfies Omit<typeof instructor.$inferInsert, "id">;

      if (state.dryRun) {
        markProcessed(state, "instructors");
      } else if (existingId) {
        instructorUpdates.push({
          id: existingId,
          values,
          trainerId,
          rowNumber: index + 2,
        });
      } else {
        const id = createId();
        if (trainerId) state.instructorIdsByTrainerId.set(trainerId, id);
        instructorInserts.push({
          values: { id, ...values },
          trainerId,
          rowNumber: index + 2,
        });
      }
    } catch (error) {
      markFailed(state, "instructors", {
        fileName: dataset.file.name,
        row: index + 2,
        entity: "instructor",
        error: error instanceof Error ? error.message : "Unknown trainer import error",
      });
    }
  }

  await runWithConcurrency(instructorUpdates, IMPORT_WRITE_CONCURRENCY, async (item) => {
    try {
      const [saved] = await db
        .update(instructor)
        .set(item.values)
        .where(eq(instructor.id, item.id))
        .returning({ id: instructor.id, mindbodyTrainerId: instructor.mindbodyTrainerId });
      if (saved?.mindbodyTrainerId) {
        state.instructorIdsByTrainerId.set(saved.mindbodyTrainerId, saved.id);
      }
      markProcessed(state, "instructors");
    } catch (error) {
      markFailed(state, "instructors", {
        fileName: dataset.file.name,
        row: item.rowNumber,
        entity: "instructor",
        error: error instanceof Error ? error.message : "Unknown trainer update error",
      });
    }
  });

  for (const chunk of chunks(instructorInserts, IMPORT_WRITE_CHUNK_SIZE)) {
    try {
      const savedInstructors = await db
        .insert(instructor)
        .values(chunk.map((item) => item.values))
        .onConflictDoNothing()
        .returning({ id: instructor.id, mindbodyTrainerId: instructor.mindbodyTrainerId });
      for (const saved of savedInstructors) {
        if (saved.mindbodyTrainerId) {
          state.instructorIdsByTrainerId.set(saved.mindbodyTrainerId, saved.id);
        }
      }
      for (const item of chunk) markProcessed(state, "instructors");
    } catch (error) {
      await runWithConcurrency(chunk, IMPORT_WRITE_CONCURRENCY, async (item) => {
        try {
          const [saved] = await db
            .insert(instructor)
            .values(item.values)
            .onConflictDoNothing()
            .returning({ id: instructor.id, mindbodyTrainerId: instructor.mindbodyTrainerId });
          if (saved?.mindbodyTrainerId) {
            state.instructorIdsByTrainerId.set(saved.mindbodyTrainerId, saved.id);
          }
          markProcessed(state, "instructors");
        } catch (rowError) {
          markFailed(state, "instructors", {
            fileName: dataset.file.name,
            row: item.rowNumber,
            entity: "instructor",
            error:
              rowError instanceof Error
                ? rowError.message
                : error instanceof Error
                  ? error.message
                  : "Unknown trainer insert error",
          });
        }
      });
    }
  }
}

async function importStaffMembers(state: ImportState, dataset: CsvDataset): Promise<void> {
  markEntityTotal(state, "staffMembers", dataset.rows.length);
  if (!state.dryRun) await preloadExistingStaffMembers(state, dataset.rows);

  const staffUpdates: Array<{
    id: string;
    values: Omit<typeof studioStaffMember.$inferInsert, "id">;
    trainerId: string;
    rowNumber: number;
  }> = [];
  const staffInserts: Array<{
    values: typeof studioStaffMember.$inferInsert;
    trainerId: string;
    rowNumber: number;
  }> = [];

  for (const [index, row] of dataset.rows.entries()) {
    try {
      const trainerId = readField(row, "TrainerID");
      const firstName = readField(row, "Firstname", "FirstName");
      const lastName = readField(row, "Lastname", "LastName");
      const flags = mindbodyStaffFlags(row);
      const name = readField(row, "DisplayName") || makeName(firstName, lastName, "Imported staff member");
      const existingId = trainerId ? state.staffMemberIdsByTrainerId.get(trainerId) ?? null : null;
      const values = {
        organizationId: state.organizationId,
        locationId: resolveLocationId(state, row),
        externalId: trainerId || null,
        employeeId: readField(row, "EmpID") || null,
        firstName: firstName || null,
        lastName: lastName || null,
        name,
        email: readField(row, "Email") || null,
        phone: readField(row, "Cellphone", "Homephone", "Workphone") || null,
        role: readField(row, "Location") || null,
        staffType: mindbodyStaffType(row),
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
        metadata: rowMetadata(row, dataset.file.name),
        updatedAt: now(),
      } satisfies Omit<typeof studioStaffMember.$inferInsert, "id">;

      if (state.dryRun) {
        markProcessed(state, "staffMembers");
      } else if (existingId) {
        staffUpdates.push({
          id: existingId,
          values,
          trainerId,
          rowNumber: index + 2,
        });
      } else {
        const id = createId();
        if (trainerId) state.staffMemberIdsByTrainerId.set(trainerId, id);
        staffInserts.push({
          values: { id, ...values },
          trainerId,
          rowNumber: index + 2,
        });
      }
    } catch (error) {
      markFailed(state, "staffMembers", {
        fileName: dataset.file.name,
        row: index + 2,
        entity: "staffMember",
        error: error instanceof Error ? error.message : "Unknown staff member import error",
      });
    }
  }

  await runWithConcurrency(staffUpdates, IMPORT_WRITE_CONCURRENCY, async (item) => {
    try {
      const [saved] = await db
        .update(studioStaffMember)
        .set(item.values)
        .where(eq(studioStaffMember.id, item.id))
        .returning({ id: studioStaffMember.id, externalId: studioStaffMember.externalId });
      if (saved?.externalId) state.staffMemberIdsByTrainerId.set(saved.externalId, saved.id);
      markProcessed(state, "staffMembers");
    } catch (error) {
      markFailed(state, "staffMembers", {
        fileName: dataset.file.name,
        row: item.rowNumber,
        entity: "staffMember",
        error: error instanceof Error ? error.message : "Unknown staff member update error",
      });
    }
  });

  for (const chunk of chunks(staffInserts, IMPORT_WRITE_CHUNK_SIZE)) {
    try {
      const savedStaffMembers = await db
        .insert(studioStaffMember)
        .values(chunk.map((item) => item.values))
        .onConflictDoNothing()
        .returning({ id: studioStaffMember.id, externalId: studioStaffMember.externalId });
      for (const saved of savedStaffMembers) {
        if (saved.externalId) state.staffMemberIdsByTrainerId.set(saved.externalId, saved.id);
      }
      for (const item of chunk) markProcessed(state, "staffMembers");
    } catch (error) {
      await runWithConcurrency(chunk, IMPORT_WRITE_CONCURRENCY, async (item) => {
        try {
          const [saved] = await db
            .insert(studioStaffMember)
            .values(item.values)
            .onConflictDoNothing()
            .returning({ id: studioStaffMember.id, externalId: studioStaffMember.externalId });
          if (saved?.externalId) state.staffMemberIdsByTrainerId.set(saved.externalId, saved.id);
          markProcessed(state, "staffMembers");
        } catch (rowError) {
          markFailed(state, "staffMembers", {
            fileName: dataset.file.name,
            row: item.rowNumber,
            entity: "staffMember",
            error:
              rowError instanceof Error
                ? rowError.message
                : error instanceof Error
                  ? error.message
                  : "Unknown staff member insert error",
          });
        }
      });
    }
  }
}

async function importProducts(
  state: ImportState,
  dataset: CsvDataset,
  importJobId: string,
): Promise<void> {
  markEntityTotal(state, "products", dataset.rows.length);
  if (!state.dryRun) await preloadExistingProducts(state, dataset.rows);
  const productUpdates: Array<{
    id: string;
    values: Omit<typeof studioProduct.$inferInsert, "id">;
    externalId: string;
    sku: string;
    rowNumber: number;
  }> = [];
  const productInserts: Array<{
    values: typeof studioProduct.$inferInsert;
    externalId: string;
    sku: string;
    rowNumber: number;
  }> = [];

  for (const [index, row] of dataset.rows.entries()) {
    try {
      const externalId = readField(row, "ProductID");
      const sku = readField(row, "BarcodeID");
      const existingId = externalId
        ? state.productIdsByExternalId.get(externalId) ?? null
        : sku
          ? state.productIdsBySku.get(sku) ?? null
          : null;
      const type = productTypeFor(row);
      const values = {
        organizationId: state.organizationId,
        locationId: resolveLocationId(state, row),
        externalId: externalId || null,
        sku: sku || null,
        name: readField(row, "Description") || readField(row, "CategoryName") || "Imported product",
        description: readField(row, "Description") || null,
        type,
        category: readField(row, "CategoryName", "ServiceCategoryName", "Program/Service Category") || null,
        price: (parseMoney(readField(row, "UnitPrice", "PaymentAmount", "UnitPrice")) ?? 0).toString(),
        cost: parseMoney(readField(row, "OurCost"))?.toString() ?? null,
        currency: "GBP",
        trackInventory: type === "RETAIL" && readField(row, "Count") !== "",
        stockQuantity: parseInteger(readField(row, "Count")),
        lowStockThreshold: parseInteger(readField(row, "ReorderLevel")),
        isActive: !(boolFromMindbody(readField(row, "Discontinued")) ?? false),
        metadata: rowMetadata(row, dataset.file.name),
        updatedAt: now(),
      } satisfies Omit<typeof studioProduct.$inferInsert, "id">;

      if (state.dryRun) {
        markProcessed(state, "products");
      } else if (existingId) {
        productUpdates.push({
          id: existingId,
          values,
          externalId,
          sku,
          rowNumber: index + 2,
        });
      } else {
        const id = createId();
        if (externalId) state.productIdsByExternalId.set(externalId, id);
        if (sku) state.productIdsBySku.set(sku, id);
        state.productTypesById.set(id, type ?? "OTHER");
        productInserts.push({
          values: { id, ...values },
          externalId,
          sku,
          rowNumber: index + 2,
        });
      }
    } catch (error) {
      markFailed(state, "products", {
        fileName: dataset.file.name,
        row: index + 2,
        entity: "product",
        error: error instanceof Error ? error.message : "Unknown product import error",
      });
    }
    await flushProgressIfDue(importJobId, state, "products");
  }

  for (const chunk of chunks(productInserts, IMPORT_WRITE_CHUNK_SIZE)) {
    try {
      const savedProducts = await db
        .insert(studioProduct)
        .values(chunk.map((item) => item.values))
        .onConflictDoNothing()
        .returning({
          id: studioProduct.id,
          externalId: studioProduct.externalId,
          sku: studioProduct.sku,
          type: studioProduct.type,
        });
      for (const saved of savedProducts) {
        if (saved.externalId) state.productIdsByExternalId.set(saved.externalId, saved.id);
        if (saved.sku) state.productIdsBySku.set(saved.sku, saved.id);
        state.productTypesById.set(saved.id, saved.type);
      }
      for (const item of chunk) {
        markProcessed(state, "products");
        await flushProgressIfDue(importJobId, state, "products");
      }
    } catch (error) {
      await runWithConcurrency(chunk, IMPORT_WRITE_CONCURRENCY, async (item) => {
        try {
          const [saved] = await db
            .insert(studioProduct)
            .values(item.values)
            .onConflictDoNothing()
            .returning({
              id: studioProduct.id,
              externalId: studioProduct.externalId,
              sku: studioProduct.sku,
              type: studioProduct.type,
            });
          if (saved?.externalId) state.productIdsByExternalId.set(saved.externalId, saved.id);
          if (saved?.sku) state.productIdsBySku.set(saved.sku, saved.id);
          if (saved) state.productTypesById.set(saved.id, saved.type);
          markProcessed(state, "products");
        } catch (rowError) {
          markFailed(state, "products", {
            fileName: dataset.file.name,
            row: item.rowNumber,
            entity: "product",
            error:
              rowError instanceof Error
                ? rowError.message
                : error instanceof Error
                  ? error.message
                  : "Unknown product insert error",
          });
        }
        await flushProgressIfDue(importJobId, state, "products");
      });
    }
  }

  await runWithConcurrency(productUpdates, IMPORT_WRITE_CONCURRENCY, async (item) => {
    try {
      const [saved] = await db
        .update(studioProduct)
        .set(item.values)
        .where(eq(studioProduct.id, item.id))
        .returning({
          id: studioProduct.id,
          externalId: studioProduct.externalId,
          sku: studioProduct.sku,
          type: studioProduct.type,
        });
      if (saved?.externalId) state.productIdsByExternalId.set(saved.externalId, saved.id);
      if (saved?.sku) state.productIdsBySku.set(saved.sku, saved.id);
      if (saved) state.productTypesById.set(saved.id, saved.type);
      markProcessed(state, "products");
    } catch (error) {
      markFailed(state, "products", {
        fileName: dataset.file.name,
        row: item.rowNumber,
        entity: "product",
        error: error instanceof Error ? error.message : "Unknown product update error",
      });
    }
    await flushProgressIfDue(importJobId, state, "products");
  });
}

async function importContracts(
  state: ImportState,
  dataset: CsvDataset,
  importJobId: string,
): Promise<void> {
  markEntityTotal(state, "memberships", dataset.rows.length);
  const clientLookupRows = dataset.rows.map((row) => ({
    ...row,
    MBSystemID: readField(row, "ReceivingClientId", "PayingClientID"),
  }));
  if (!state.dryRun) {
    await preloadExistingClientIds(state, clientLookupRows);
    await preloadExistingMemberships(state, dataset.rows);
  }

  const membershipUpdates: Array<{
    id: string;
    values: Omit<typeof studioMembership.$inferInsert, "id">;
    contractId: string;
    rowId: string;
    clientId: string;
    rowNumber: number;
  }> = [];
  const membershipInserts: Array<{
    id: string;
    values: typeof studioMembership.$inferInsert;
    contractId: string;
    rowId: string;
    clientId: string;
    rowNumber: number;
  }> = [];

  for (const [index, row] of dataset.rows.entries()) {
    try {
      const contractId = readField(row, "ClientContractID", "RowID");
      const rowId = readField(row, "RowID");
      const clientId = await findClientId(state, clientLookupRows[index] ?? row);
      if (!clientId) {
        throw new Error("No matching client found for contract");
      }
      const existingId =
        (contractId ? state.membershipIdsByContractId.get(contractId) ?? null : null) ??
        (rowId ? state.membershipIdsByContractId.get(rowId) ?? null : null);
      const startDate = parseDate(readField(row, "ContractStartDate")) ?? now();
      const endDate = parseDate(readField(row, "ContractEndDate"));
      const isAutoRenewing = boolFromMindbody(readField(row, "AutoRenewing")) ?? false;
      const statusValue: typeof studioMembership.$inferInsert.status =
        endDate && endDate < now() ? "EXPIRED" : "ACTIVE";
      const values = {
        organizationId: state.organizationId,
        locationId: resolveLocationId(state, row),
        clientId,
        externalId: contractId || null,
        name: readField(row, "ContractName") || "Imported contract",
        type: "MINDBODY_CONTRACT",
        status: statusValue,
        startDate,
        endDate,
        renewalDate: parseDate(readField(row, "NextPaymentDate")),
        price: parseMoney(readField(row, "NormalPaymentAmount", "FirstPaymentAmount"))?.toString() ?? null,
        currency: "GBP",
        autoRenew: isAutoRenewing,
        paymentMethod: readField(row, "PaymentMethod") || null,
        paymentFrequency: readField(row, "PaymentFrequency") || null,
        totalPayments: parseInteger(readField(row, "TotalNumberofPayments")),
        remainingPayments: parseInteger(readField(row, "RemainingPayments")),
        frozenAt: parseDate(readField(row, "ContractSuspendStartDate")),
        frozenUntil: parseDate(readField(row, "ContractSuspendEndDate")),
        suspendNotes: readField(row, "SuspendNotes") || null,
        metadata: rowMetadata(row, dataset.file.name),
        updatedAt: now(),
      } satisfies Omit<typeof studioMembership.$inferInsert, "id">;

      if (state.dryRun) {
        markProcessed(state, "memberships");
      } else if (existingId) {
        membershipUpdates.push({
          id: existingId,
          values,
          contractId,
          rowId,
          clientId,
          rowNumber: index + 2,
        });
      } else {
        const id = createId();
        if (contractId) state.membershipIdsByContractId.set(contractId, id);
        if (rowId) state.membershipIdsByContractId.set(rowId, id);
        state.membershipClientIdsById.set(id, clientId);
        membershipInserts.push({
          id,
          values: { id, ...values },
          contractId,
          rowId,
          clientId,
          rowNumber: index + 2,
        });
      }
    } catch (error) {
      markFailed(state, "memberships", {
        fileName: dataset.file.name,
        row: index + 2,
        entity: "membership",
        error: error instanceof Error ? error.message : "Unknown contract import error",
      });
    }
    await flushProgressIfDue(importJobId, state, "memberships");
  }

  for (const chunk of chunks(membershipInserts, IMPORT_WRITE_CHUNK_SIZE)) {
    try {
      await db
        .insert(studioMembership)
        .values(chunk.map((item) => item.values))
        .onConflictDoNothing();
      for (const item of chunk) {
        if (item.contractId) state.membershipIdsByContractId.set(item.contractId, item.id);
        if (item.rowId) state.membershipIdsByContractId.set(item.rowId, item.id);
        state.membershipClientIdsById.set(item.id, item.clientId);
        markProcessed(state, "memberships");
        await flushProgressIfDue(importJobId, state, "memberships");
      }
    } catch (error) {
      await runWithConcurrency(chunk, IMPORT_WRITE_CONCURRENCY, async (item) => {
        try {
          await db.insert(studioMembership).values(item.values).onConflictDoNothing();
          if (item.contractId) state.membershipIdsByContractId.set(item.contractId, item.id);
          if (item.rowId) state.membershipIdsByContractId.set(item.rowId, item.id);
          state.membershipClientIdsById.set(item.id, item.clientId);
          markProcessed(state, "memberships");
        } catch (rowError) {
          markFailed(state, "memberships", {
            fileName: dataset.file.name,
            row: item.rowNumber,
            entity: "membership",
            error:
              rowError instanceof Error
                ? rowError.message
                : error instanceof Error
                  ? error.message
                  : "Unknown membership insert error",
          });
        }
        await flushProgressIfDue(importJobId, state, "memberships");
      });
    }
  }

  await runWithConcurrency(membershipUpdates, IMPORT_WRITE_CONCURRENCY, async (item) => {
    try {
      await db.update(studioMembership).set(item.values).where(eq(studioMembership.id, item.id));
      if (item.contractId) state.membershipIdsByContractId.set(item.contractId, item.id);
      if (item.rowId) state.membershipIdsByContractId.set(item.rowId, item.id);
      state.membershipClientIdsById.set(item.id, item.clientId);
      markProcessed(state, "memberships");
    } catch (error) {
      markFailed(state, "memberships", {
        fileName: dataset.file.name,
        row: item.rowNumber,
        entity: "membership",
        error: error instanceof Error ? error.message : "Unknown membership update error",
      });
    }
    await flushProgressIfDue(importJobId, state, "memberships");
  });
}

async function importPricingOptions(
  state: ImportState,
  dataset: CsvDataset,
  importJobId: string,
): Promise<void> {
  markEntityTotal(state, "classCredits", dataset.rows.length);
  if (!state.dryRun) {
    await preloadExistingClientIds(state, dataset.rows);
    await preloadExistingClassCredits(state, dataset.rows);
  }

  const creditUpdates: Array<{
    id: string;
    values: Omit<typeof classCredit.$inferInsert, "id">;
    externalId: string;
    rowNumber: number;
  }> = [];
  const creditInserts: Array<{
    id: string;
    values: typeof classCredit.$inferInsert;
    externalId: string;
    rowNumber: number;
  }> = [];

  for (const [index, row] of dataset.rows.entries()) {
    try {
      const clientId = await findClientId(state, row);
      if (!clientId) throw new Error("No matching client found for pricing option");
      const externalId = readField(row, "PaymentDataID", "PmtRefNo");
      const paymentRefNo = readField(row, "PmtRefNo");
      const existingId =
        (externalId ? state.classCreditIdsByExternalId.get(externalId) ?? null : null) ??
        (paymentRefNo ? state.classCreditIdsByPaymentRefNo.get(paymentRefNo) ?? null : null);
      const totalCredits = parseInteger(readField(row, "NumClasses")) ?? parseInteger(readField(row, "Remaining")) ?? 0;
      const remaining = parseInteger(readField(row, "Remaining")) ?? totalCredits;
      const productExternalId = readField(row, "ProductID");
      const membershipId = state.membershipIdsByContractId.get(readField(row, "ClientContractID")) ?? null;
      const values = {
        membershipId,
        clientId,
        organizationId: state.organizationId,
        locationId: resolveLocationId(state, row),
        externalId: externalId || null,
        paymentRefNo: paymentRefNo || null,
        productId: productExternalId ? state.productIdsByExternalId.get(productExternalId) ?? null : null,
        totalCredits,
        usedCredits: Math.max(totalCredits - remaining, 0),
        expiresAt: parseDate(readField(row, "ExpDate")),
        metadata: rowMetadata(row, dataset.file.name),
        updatedAt: now(),
      } satisfies Omit<typeof classCredit.$inferInsert, "id">;

      if (state.dryRun) {
        markProcessed(state, "classCredits");
      } else if (existingId) {
        creditUpdates.push({
          id: existingId,
          values,
          externalId,
          rowNumber: index + 2,
        });
      } else {
        const id = createId();
        if (externalId) state.classCreditIdsByExternalId.set(externalId, id);
        if (paymentRefNo) state.classCreditIdsByPaymentRefNo.set(paymentRefNo, id);
        creditInserts.push({
          id,
          values: { id, ...values },
          externalId,
          rowNumber: index + 2,
        });
      }
    } catch (error) {
      markFailed(state, "classCredits", {
        fileName: dataset.file.name,
        row: index + 2,
        entity: "classCredit",
        error: error instanceof Error ? error.message : "Unknown class credit import error",
      });
    }
    await flushProgressIfDue(importJobId, state, "classCredits");
  }

  for (const chunk of chunks(creditInserts, IMPORT_WRITE_CHUNK_SIZE)) {
    try {
      await db
        .insert(classCredit)
        .values(chunk.map((item) => item.values))
        .onConflictDoNothing();
      for (const item of chunk) {
        if (item.externalId) state.classCreditIdsByExternalId.set(item.externalId, item.id);
        if (item.values.paymentRefNo) state.classCreditIdsByPaymentRefNo.set(item.values.paymentRefNo, item.id);
        markProcessed(state, "classCredits");
        await flushProgressIfDue(importJobId, state, "classCredits");
      }
    } catch (error) {
      await runWithConcurrency(chunk, IMPORT_WRITE_CONCURRENCY, async (item) => {
        try {
          await db.insert(classCredit).values(item.values).onConflictDoNothing();
          if (item.externalId) state.classCreditIdsByExternalId.set(item.externalId, item.id);
          if (item.values.paymentRefNo) state.classCreditIdsByPaymentRefNo.set(item.values.paymentRefNo, item.id);
          markProcessed(state, "classCredits");
        } catch (rowError) {
          markFailed(state, "classCredits", {
            fileName: dataset.file.name,
            row: item.rowNumber,
            entity: "classCredit",
            error:
              rowError instanceof Error
                ? rowError.message
                : error instanceof Error
                  ? error.message
                  : "Unknown class credit insert error",
          });
        }
        await flushProgressIfDue(importJobId, state, "classCredits");
      });
    }
  }

  await runWithConcurrency(creditUpdates, IMPORT_WRITE_CONCURRENCY, async (item) => {
    try {
      await db.update(classCredit).set(item.values).where(eq(classCredit.id, item.id));
      if (item.externalId) state.classCreditIdsByExternalId.set(item.externalId, item.id);
      if (item.values.paymentRefNo) state.classCreditIdsByPaymentRefNo.set(item.values.paymentRefNo, item.id);
      markProcessed(state, "classCredits");
    } catch (error) {
      markFailed(state, "classCredits", {
        fileName: dataset.file.name,
        row: item.rowNumber,
        entity: "classCredit",
        error: error instanceof Error ? error.message : "Unknown class credit update error",
      });
    }
    await flushProgressIfDue(importJobId, state, "classCredits");
  });
}

async function ensureClassType(state: ImportState, name: string, locationId: string | null): Promise<string | null> {
  const safeName = name || "Imported class";
  const slug = slugify(safeName);
  if (state.classTypeIdsBySlug.has(slug)) return state.classTypeIdsBySlug.get(slug) ?? null;

  const existing = await db.query.classType.findFirst({
    where: and(eq(classType.organizationId, state.organizationId), eq(classType.slug, slug)),
    columns: { id: true },
  });
  if (existing) {
    state.classTypeIdsBySlug.set(slug, existing.id);
    return existing.id;
  }
  if (state.dryRun) return null;
  const [saved] = await db
    .insert(classType)
    .values({
      id: createId(),
      organizationId: state.organizationId,
      locationId,
      name: safeName,
      slug,
      updatedAt: now(),
    })
    .returning({ id: classType.id });
  state.classTypeIdsBySlug.set(slug, saved.id);
  return saved.id;
}

async function ensureClassTypes(
  state: ImportState,
  values: Array<{ name: string; locationId: string | null }>,
): Promise<void> {
  const classTypesBySlug = new Map<string, { name: string; locationId: string | null }>();
  for (const value of values) {
    const safeName = value.name || "Imported class";
    const slug = slugify(safeName);
    if (!state.classTypeIdsBySlug.has(slug)) {
      classTypesBySlug.set(slug, { name: safeName, locationId: value.locationId });
    }
  }

  const slugs = Array.from(classTypesBySlug.keys());
  for (const chunk of chunks(slugs, IMPORT_LOOKUP_CHUNK_SIZE)) {
    const existingClassTypes = await db
      .select({ id: classType.id, slug: classType.slug })
      .from(classType)
      .where(
        and(
          eq(classType.organizationId, state.organizationId),
          inArray(classType.slug, chunk),
        ),
      );
    for (const existing of existingClassTypes) {
      state.classTypeIdsBySlug.set(existing.slug, existing.id);
    }
  }

  if (state.dryRun) return;
  const inserts = Array.from(classTypesBySlug.entries())
    .filter(([slug]) => !state.classTypeIdsBySlug.has(slug))
    .map(([slug, value]) => ({
      slug,
      values: {
        id: createId(),
        organizationId: state.organizationId,
        locationId: value.locationId,
        name: value.name,
        slug,
        updatedAt: now(),
      } satisfies typeof classType.$inferInsert,
    }));

  for (const chunk of chunks(inserts, IMPORT_WRITE_CHUNK_SIZE)) {
    const savedClassTypes = await db
      .insert(classType)
      .values(chunk.map((item) => item.values))
      .onConflictDoNothing()
      .returning({ id: classType.id, slug: classType.slug });
    for (const saved of savedClassTypes) {
      state.classTypeIdsBySlug.set(saved.slug, saved.id);
    }
  }

  const unresolvedSlugs = inserts
    .map((item) => item.slug)
    .filter((slug) => !state.classTypeIdsBySlug.has(slug));
  for (const chunk of chunks(unresolvedSlugs, IMPORT_LOOKUP_CHUNK_SIZE)) {
    const existingClassTypes = await db
      .select({ id: classType.id, slug: classType.slug })
      .from(classType)
      .where(
        and(
          eq(classType.organizationId, state.organizationId),
          inArray(classType.slug, chunk),
        ),
      );
    for (const existing of existingClassTypes) {
      state.classTypeIdsBySlug.set(existing.slug, existing.id);
    }
  }
}

function visitClassKey(row: CsvRow): string {
  return [
    readField(row, "VisitDate"),
    readField(row, "VisitStartTime"),
    readField(row, "VisitEndTime"),
    readField(row, "Description"),
    readField(row, "TrainerID"),
    readField(row, "VisitLocation"),
  ].join("|");
}

function visitClassTypeName(row: CsvRow): string {
  const classTypeName = readField(row, "ClassType");
  const description = readField(row, "Description");
  const genericClassType = ["class", "session"].includes(classTypeName.toLowerCase());
  if (!classTypeName || genericClassType) return description || classTypeName || "Imported class";
  return classTypeName;
}

function checkInKey(clientId: string, classId: string): string {
  return `${clientId}|${classId}`;
}

async function ensureStudioClass(state: ImportState, row: CsvRow): Promise<string | null> {
  const startTime = parseDateTime(readField(row, "VisitDate"), readField(row, "VisitStartTime"));
  const endTime = parseDateTime(readField(row, "VisitDate"), readField(row, "VisitEndTime")) ?? startTime;
  if (!startTime || !endTime) return null;

  const locationId = resolveLocationId(state, row);
  const key = visitClassKey(row);
  if (state.visitClassIdsByKey.has(key)) return state.visitClassIdsByKey.get(key) ?? null;

  const externalId = `mindbody-visit-group-${stableHash(key)}`;
  const existing = await db.query.studioClass.findFirst({
    where: and(eq(studioClass.organizationId, state.organizationId), eq(studioClass.externalId, externalId)),
    columns: { id: true },
  });
  if (existing) {
    state.visitClassIdsByKey.set(key, existing.id);
    return existing.id;
  }
  if (state.dryRun) return null;

  const trainerId = readField(row, "TrainerID");
  const classTypeId = await ensureClassType(state, visitClassTypeName(row), locationId);
  const [saved] = await db
    .insert(studioClass)
    .values({
      id: createId(),
      organizationId: state.organizationId,
      locationId,
      externalId,
      name: readField(row, "Description") || "Imported class",
      description: readField(row, "TypePurchased") || null,
      classTypeId,
      instructorId: trainerId ? state.instructorIdsByTrainerId.get(trainerId) ?? null : null,
      instructorName: readField(row, "StaffMember") || null,
      location: readField(row, "VisitLocation") || null,
      startTime,
      endTime,
      status: classStatusForRange(startTime, endTime),
      updatedAt: now(),
      metadata: rowMetadata(row, "VisitData.csv"),
    })
    .returning({ id: studioClass.id });

  state.visitClassIdsByKey.set(key, saved.id);
  return saved.id;
}

async function ensureVisitClasses(
  state: ImportState,
  dataset: CsvDataset,
): Promise<void> {
  const rowsByKey = new Map<string, CsvRow>();
  for (const row of dataset.rows) {
    const startTime = parseDateTime(readField(row, "VisitDate"), readField(row, "VisitStartTime"));
    const endTime = parseDateTime(readField(row, "VisitDate"), readField(row, "VisitEndTime")) ?? startTime;
    if (!startTime || !endTime) continue;
    const key = visitClassKey(row);
    if (!state.visitClassIdsByKey.has(key)) rowsByKey.set(key, row);
  }

  if (rowsByKey.size === 0) return;

  await ensureClassTypes(
    state,
    Array.from(rowsByKey.values()).map((row) => ({
      name: visitClassTypeName(row),
      locationId: resolveLocationId(state, row),
    })),
  );

  if (state.dryRun) return;

  const classInserts = Array.from(rowsByKey.entries()).map(([key, row]) => {
    const startTime = parseDateTime(readField(row, "VisitDate"), readField(row, "VisitStartTime"));
    const endTime = parseDateTime(readField(row, "VisitDate"), readField(row, "VisitEndTime")) ?? startTime;
    const locationId = resolveLocationId(state, row);
    const trainerId = readField(row, "TrainerID");
    const className = visitClassTypeName(row) || "Imported class";
    const id = createId();
    const externalId = `mindbody-visit-group-${stableHash(key)}`;
    state.visitClassIdsByKey.set(key, id);

    return {
      id,
      key,
      values: {
        id,
        organizationId: state.organizationId,
        locationId,
        externalId,
        name: readField(row, "Description") || "Imported class",
        description: readField(row, "TypePurchased") || null,
        classTypeId: state.classTypeIdsBySlug.get(slugify(className)) ?? null,
        instructorId: trainerId ? state.instructorIdsByTrainerId.get(trainerId) ?? null : null,
        instructorName: readField(row, "StaffMember") || null,
        location: readField(row, "VisitLocation") || null,
        startTime: startTime ?? now(),
        endTime: endTime ?? startTime ?? now(),
        status: classStatusForRange(startTime ?? now(), endTime ?? startTime ?? now()),
        updatedAt: now(),
        metadata: rowMetadata(row, dataset.file.name),
      } satisfies typeof studioClass.$inferInsert,
    };
  });

  for (const chunk of chunks(classInserts, IMPORT_WRITE_CHUNK_SIZE)) {
    try {
      await db
        .insert(studioClass)
        .values(chunk.map((item) => item.values))
        .onConflictDoNothing();
      for (const item of chunk) {
        state.visitClassIdsByKey.set(item.key, item.id);
      }
    } catch {
      await runWithConcurrency(chunk, IMPORT_WRITE_CONCURRENCY, async (item) => {
        try {
          await db.insert(studioClass).values(item.values).onConflictDoNothing();
          state.visitClassIdsByKey.set(item.key, item.id);
        } catch {
          state.visitClassIdsByKey.delete(item.key);
        }
      });
    }
  }
}

function bookingStatus(value: string): typeof studioBooking.$inferInsert.status {
  const status = value.toLowerCase();
  if (status.includes("cancel")) return "CANCELLED";
  if (status.includes("no") && status.includes("show")) return "NO_SHOW";
  if (status.includes("complete") || status.includes("attend")) return "ATTENDED";
  return "BOOKED";
}

function classStatusForRange(
  startTime: Date,
  endTime: Date,
): typeof studioClass.$inferInsert.status {
  const current = now();
  if (startTime <= current && endTime >= current) return "IN_PROGRESS";
  if (endTime < current) return "COMPLETED";
  return "SCHEDULED";
}

async function importVisits(
  state: ImportState,
  dataset: CsvDataset,
  importJobId: string,
): Promise<void> {
  markEntityTotal(state, "visits", dataset.rows.length);
  if (!state.dryRun) {
    await preloadExistingClientIds(state, dataset.rows);
    await preloadExistingVisitRecords(state, dataset.rows);
    await ensureVisitClasses(state, dataset);
  }

  const bookingUpdates: Array<{
    id: string;
    values: Omit<typeof studioBooking.$inferInsert, "id">;
    rowNumber: number;
  }> = [];
  const bookingInserts: Array<{
    id: string;
    values: typeof studioBooking.$inferInsert;
    rowNumber: number;
  }> = [];
  const candidateCheckIns: Array<{
    key: string;
    values: typeof checkIn.$inferInsert;
    rowNumber: number;
  }> = [];
  const candidateCheckInKeys = new Set<string>();

  for (const [index, row] of dataset.rows.entries()) {
    try {
      const clientId = await findClientId(state, row);
      const classId = state.visitClassIdsByKey.get(visitClassKey(row)) ?? await ensureStudioClass(state, row);
      if (!clientId || !classId) throw new Error("No matching client or class found for visit");
      const visitRef = readField(row, "VisitID", "VisitRefNo");
      if (visitRef) state.visitClientIdsByVisitRef.set(visitRef, clientId);
      const existingId = visitRef
        ? state.bookingIdsByExternalClientKey.get(`${visitRef}|${clientId}`) ?? null
        : null;
      const visitStart = parseDateTime(readField(row, "VisitDate"), readField(row, "VisitStartTime")) ?? now();
      const importedStatus = bookingStatus(readField(row, "Status"));
      const status =
        visitStart > now() && (importedStatus === "NO_SHOW" || importedStatus === "ATTENDED")
          ? "BOOKED"
          : importedStatus;
      const values = {
        classId,
        clientId,
        externalId: visitRef || null,
        status,
        bookedAt: visitStart,
        checkedInAt: status === "ATTENDED" ? visitStart : null,
        cancelledAt: status === "CANCELLED" ? visitStart : null,
        notes: readField(row, "TypePurchased") || null,
        metadata: rowMetadata(row, dataset.file.name),
        updatedAt: now(),
      } satisfies Omit<typeof studioBooking.$inferInsert, "id">;

      if (state.dryRun) {
        markProcessed(state, "visits");
      } else if (existingId) {
        if (visitRef) state.bookingIdsByVisitRefNo.set(visitRef, existingId);
        bookingUpdates.push({
          id: existingId,
          values,
          rowNumber: index + 2,
        });
      } else {
        const id = createId();
        if (visitRef) state.bookingIdsByExternalClientKey.set(`${visitRef}|${clientId}`, id);
        if (visitRef) state.bookingIdsByVisitRefNo.set(visitRef, id);
        bookingInserts.push({
          id,
          values: { id, ...values },
          rowNumber: index + 2,
        });
      }

      if (!state.dryRun && status === "ATTENDED") {
        const key = checkInKey(clientId, classId);
        if (!candidateCheckInKeys.has(key)) {
          candidateCheckInKeys.add(key);
          candidateCheckIns.push({
            key,
            rowNumber: index + 2,
            values: {
              id: createId(),
              organizationId: state.organizationId,
              locationId: resolveLocationId(state, row),
              clientId,
              classId,
              method: "IMPORT",
              checkedInAt: visitStart,
              metadata: rowMetadata(row, dataset.file.name),
            },
          });
        }
      }
    } catch (error) {
      markFailed(state, "visits", {
        fileName: dataset.file.name,
        row: index + 2,
        entity: "visit",
        error: error instanceof Error ? error.message : "Unknown visit import error",
      });
    }
    await flushProgressIfDue(importJobId, state, "visits");
  }

  if (!state.dryRun) {
    await preloadExistingCheckIns(
      state,
      candidateCheckIns.map((item) => ({
        clientId: item.values.clientId,
        classId: item.values.classId,
      })),
    );
  }

  for (const chunk of chunks(bookingInserts, IMPORT_WRITE_CHUNK_SIZE)) {
    try {
      await db
        .insert(studioBooking)
        .values(chunk.map((item) => item.values))
        .onConflictDoNothing();
      for (const item of chunk) {
        markProcessed(state, "visits");
        await flushProgressIfDue(importJobId, state, "visits");
      }
    } catch (error) {
      await runWithConcurrency(chunk, IMPORT_WRITE_CONCURRENCY, async (item) => {
        try {
          await db.insert(studioBooking).values(item.values).onConflictDoNothing();
          markProcessed(state, "visits");
        } catch (rowError) {
          markFailed(state, "visits", {
            fileName: dataset.file.name,
            row: item.rowNumber,
            entity: "visit",
            error:
              rowError instanceof Error
                ? rowError.message
                : error instanceof Error
                  ? error.message
                  : "Unknown visit insert error",
          });
        }
        await flushProgressIfDue(importJobId, state, "visits");
      });
    }
  }

  await runWithConcurrency(bookingUpdates, IMPORT_WRITE_CONCURRENCY, async (item) => {
    try {
      await db.update(studioBooking).set(item.values).where(eq(studioBooking.id, item.id));
      markProcessed(state, "visits");
    } catch (error) {
      markFailed(state, "visits", {
        fileName: dataset.file.name,
        row: item.rowNumber,
        entity: "visit",
        error: error instanceof Error ? error.message : "Unknown visit update error",
      });
    }
    await flushProgressIfDue(importJobId, state, "visits");
  });

  const checkInInserts = candidateCheckIns.filter((item) => !state.checkInKeys.has(item.key));
  for (const chunk of chunks(checkInInserts, IMPORT_WRITE_CHUNK_SIZE)) {
    try {
      await db
        .insert(checkIn)
        .values(chunk.map((item) => item.values))
        .onConflictDoNothing();
      for (const item of chunk) state.checkInKeys.add(item.key);
    } catch {
      await runWithConcurrency(chunk, IMPORT_WRITE_CONCURRENCY, async (item) => {
        try {
          await db.insert(checkIn).values(item.values).onConflictDoNothing();
          state.checkInKeys.add(item.key);
        } catch (error) {
          state.warnings.push({
            fileName: dataset.file.name,
            fileKind: dataset.kind,
            message:
              error instanceof Error
                ? `Visit imported but check-in could not be created: ${error.message}`
                : "Visit imported but check-in could not be created.",
          });
        }
      });
    }
  }
}

async function importPayments(
  state: ImportState,
  dataset: CsvDataset,
  importJobId: string,
): Promise<void> {
  markEntityTotal(state, "payments", dataset.rows.length);
  if (!state.dryRun) {
    await preloadExistingClientIds(state, dataset.rows);
    await preloadExistingProducts(state, dataset.rows);
    await preloadExistingPayments(
      state,
      dataset.rows.map((row) => readField(row, "SaleID", "PmtRefNo")),
    );
  }

  const paymentUpdates: Array<{
    id: string;
    values: Omit<typeof studioPayment.$inferInsert, "id">;
    externalId: string;
    rowNumber: number;
  }> = [];
  const paymentInserts: Array<{
    id: string;
    values: typeof studioPayment.$inferInsert;
    externalId: string;
    rowNumber: number;
  }> = [];

  for (const [index, row] of dataset.rows.entries()) {
    try {
      const externalId = readField(row, "SaleID", "PmtRefNo");
      const clientId = await findClientId(state, row);
      const productExternalId = readField(row, "ProductID");
      const productId = productExternalId ? state.productIdsByExternalId.get(productExternalId) ?? null : null;
      const productType = productId ? state.productTypesById.get(productId) ?? null : null;
      const existingId = externalId ? state.paymentIdsByExternalId.get(externalId) ?? null : null;
      const amount = parseMoney(readField(row, "PaymentAmount", "SDPaymentAmt", "UnitPrice")) ?? 0;
      const paymentDate = parseDate(readField(row, "SaleDate", "PaymentDate")) ?? now();
      const statusValue: typeof studioPayment.$inferInsert.status =
        boolFromMindbody(readField(row, "Returned")) === true ? "REFUNDED" : "SUCCEEDED";
      const typeValue: typeof studioPayment.$inferInsert.type = productType ? paymentTypeForProduct(productType) : "POS";
      const values = {
        organizationId: state.organizationId,
        locationId: resolveLocationId(state, row),
        clientId,
        productId,
        externalId: externalId || null,
        mindbodyPmtRefNo: readField(row, "PmtRefNo") || null,
        amount: amount.toString(),
        currency: "GBP",
        status: statusValue,
        type: typeValue,
        description: readField(row, "Description", "PaymentNotes", "PmtTypes") || "Imported Mindbody payment",
        paymentMethod: readField(row, "PmtTypes") || null,
        taxAmount: parseMoney(readField(row, "PaymentTax"))?.toString() ?? null,
        discountAmount: parseMoney(readField(row, "PaymentDiscount", "Discount"))?.toString() ?? null,
        metadata: rowMetadata(row, dataset.file.name),
        createdAt: paymentDate,
        updatedAt: now(),
      } satisfies Omit<typeof studioPayment.$inferInsert, "id">;

      if (state.dryRun) {
        markProcessed(state, "payments");
      } else if (existingId) {
        paymentUpdates.push({
          id: existingId,
          values,
          externalId,
          rowNumber: index + 2,
        });
      } else {
        const id = createId();
        if (externalId) state.paymentIdsByExternalId.set(externalId, id);
        if (clientId) state.paymentClientIdsById.set(id, clientId);
        paymentInserts.push({
          id,
          values: { id, ...values },
          externalId,
          rowNumber: index + 2,
        });
      }
    } catch (error) {
      markFailed(state, "payments", {
        fileName: dataset.file.name,
        row: index + 2,
        entity: "payment",
        error: error instanceof Error ? error.message : "Unknown payment import error",
      });
    }
    await flushProgressIfDue(importJobId, state, "payments");
  }

  for (const chunk of chunks(paymentInserts, IMPORT_WRITE_CHUNK_SIZE)) {
    try {
      await db
        .insert(studioPayment)
        .values(chunk.map((item) => item.values))
        .onConflictDoNothing();
      for (const item of chunk) {
        if (item.externalId) state.paymentIdsByExternalId.set(item.externalId, item.id);
        if (item.values.clientId) state.paymentClientIdsById.set(item.id, item.values.clientId);
        markProcessed(state, "payments");
        await flushProgressIfDue(importJobId, state, "payments");
      }
    } catch (error) {
      await runWithConcurrency(chunk, IMPORT_WRITE_CONCURRENCY, async (item) => {
        try {
          await db.insert(studioPayment).values(item.values).onConflictDoNothing();
          if (item.externalId) state.paymentIdsByExternalId.set(item.externalId, item.id);
          if (item.values.clientId) state.paymentClientIdsById.set(item.id, item.values.clientId);
          markProcessed(state, "payments");
        } catch (rowError) {
          markFailed(state, "payments", {
            fileName: dataset.file.name,
            row: item.rowNumber,
            entity: "payment",
            error:
              rowError instanceof Error
                ? rowError.message
                : error instanceof Error
                  ? error.message
                  : "Unknown payment insert error",
          });
        }
        await flushProgressIfDue(importJobId, state, "payments");
      });
    }
  }

  await runWithConcurrency(paymentUpdates, IMPORT_WRITE_CONCURRENCY, async (item) => {
    try {
      await db.update(studioPayment).set(item.values).where(eq(studioPayment.id, item.id));
      if (item.externalId) state.paymentIdsByExternalId.set(item.externalId, item.id);
      if (item.values.clientId) state.paymentClientIdsById.set(item.id, item.values.clientId);
      markProcessed(state, "payments");
    } catch (error) {
      markFailed(state, "payments", {
        fileName: dataset.file.name,
        row: item.rowNumber,
        entity: "payment",
        error: error instanceof Error ? error.message : "Unknown payment update error",
      });
    }
    await flushProgressIfDue(importJobId, state, "payments");
  });
}

async function ensurePaymentsFromClientSales(
  state: ImportState,
  dataset: CsvDataset,
): Promise<void> {
  if (state.dryRun) return;

  const saleRowsBySaleId = new Map<string, CsvRow[]>();
  for (const row of dataset.rows) {
    const saleId = readField(row, "SaleID");
    if (!saleId || state.paymentIdsByExternalId.has(saleId)) continue;
    const rows = saleRowsBySaleId.get(saleId) ?? [];
    rows.push(row);
    saleRowsBySaleId.set(saleId, rows);
  }

  if (saleRowsBySaleId.size === 0) return;
  await preloadExistingPayments(state, Array.from(saleRowsBySaleId.keys()));

  const paymentInserts: Array<{
    id: string;
    externalId: string;
    values: typeof studioPayment.$inferInsert;
  }> = [];

  for (const [saleId, rows] of saleRowsBySaleId.entries()) {
    if (state.paymentIdsByExternalId.has(saleId)) continue;
    const firstRow = rows[0];
    if (!firstRow) continue;
    const clientId = await findClientId(state, firstRow);
    const productExternalId = readField(firstRow, "ProductID");
    const productId = productExternalId ? state.productIdsByExternalId.get(productExternalId) ?? null : null;
    const productType = productId ? state.productTypesById.get(productId) ?? null : null;
    const amount = rows.reduce((sum, row) => sum + (parseMoney(readField(row, "SDPaymentAmt")) ?? 0), 0);
    const paymentDate = parseDate(readField(firstRow, "SaleDate")) ?? now();
    const mindbodyPmtRefNo = readField(firstRow, "PmtRefNo");
    const id = createId();
    state.paymentIdsByExternalId.set(saleId, id);
    if (mindbodyPmtRefNo) state.paymentIdsByMindbodyPmtRefNo.set(mindbodyPmtRefNo, id);
    if (clientId) state.paymentClientIdsById.set(id, clientId);
    paymentInserts.push({
      id,
      externalId: saleId,
      values: {
        id,
        organizationId: state.organizationId,
        locationId: resolveLocationId(state, firstRow),
        clientId,
        productId,
        externalId: saleId,
        mindbodyPmtRefNo: mindbodyPmtRefNo || null,
        amount: amount.toString(),
        currency: "GBP",
        status: "SUCCEEDED",
        type: productType ? paymentTypeForProduct(productType) : "POS",
        description: readField(firstRow, "Description") || "Imported Mindbody sale",
        metadata: {
          ...rowMetadata(firstRow, dataset.file.name),
          mindbodySale: {
            lineCount: rows.length,
            generatedFromClientSales: true,
          },
        },
        createdAt: paymentDate,
        updatedAt: now(),
      },
    });
  }

  for (const chunk of chunks(paymentInserts, IMPORT_WRITE_CHUNK_SIZE)) {
    try {
      await db
        .insert(studioPayment)
        .values(chunk.map((item) => item.values))
        .onConflictDoNothing();
      for (const item of chunk) {
        state.paymentIdsByExternalId.set(item.externalId, item.id);
        if (item.values.clientId) state.paymentClientIdsById.set(item.id, item.values.clientId);
      }
    } catch {
      await runWithConcurrency(chunk, IMPORT_WRITE_CONCURRENCY, async (item) => {
        try {
          await db.insert(studioPayment).values(item.values).onConflictDoNothing();
          state.paymentIdsByExternalId.set(item.externalId, item.id);
          if (item.values.clientId) state.paymentClientIdsById.set(item.id, item.values.clientId);
        } catch (error) {
          state.warnings.push({
            fileName: dataset.file.name,
            fileKind: dataset.kind,
            message:
              error instanceof Error
                ? `Sale line items imported but payment shell could not be created for sale ${item.externalId}: ${error.message}`
                : `Sale line items imported but payment shell could not be created for sale ${item.externalId}.`,
          });
        }
      });
    }
  }
}

type SalePaymentPatch = {
  productId: string | null;
  mindbodyPmtRefNo: string | null;
  type: typeof studioPayment.$inferInsert.type;
  description: string;
  updatedAt: Date;
};

async function updatePaymentsFromSaleLineItems(
  patches: Map<string, SalePaymentPatch>,
): Promise<void> {
  for (const chunk of chunks(Array.from(patches.entries()), IMPORT_WRITE_CHUNK_SIZE)) {
    if (chunk.length === 0) continue;

    const values = sql.join(
      chunk.map(
        ([paymentId, patch]) =>
          sql`(${paymentId}, ${patch.productId}, ${patch.mindbodyPmtRefNo}, ${patch.type}, ${patch.description}, ${patch.updatedAt})`,
      ),
      sql`, `,
    );

    await db.execute(sql`
      update "StudioPayment" as payment
      set
        "productId" = patch."productId"::text,
        "mindbodyPmtRefNo" = patch."mindbodyPmtRefNo"::text,
        "type" = patch."type"::"StudioPaymentType",
        "description" = patch."description"::text,
        "updatedAt" = patch."updatedAt"::timestamp
      from (values ${values}) as patch("id", "productId", "mindbodyPmtRefNo", "type", "description", "updatedAt")
      where payment."id" = patch."id"::text
    `);
  }
}

async function importSaleLineItems(
  state: ImportState,
  dataset: CsvDataset,
  importJobId: string,
): Promise<void> {
  markEntityTotal(state, "saleLineItems", dataset.rows.length);
  if (!state.dryRun) {
    await preloadExistingClientIds(state, dataset.rows);
    await preloadExistingProducts(state, dataset.rows);
    await preloadExistingPayments(state, dataset.rows.map((row) => readField(row, "SaleID")));
    await preloadExistingSaleLineItems(state, dataset.rows);
    await ensurePaymentsFromClientSales(state, dataset);
  }

  const paymentPatchById = new Map<string, SalePaymentPatch>();
  const lineItemUpdates: Array<{
    id: string;
    values: Omit<typeof studioPaymentLineItem.$inferInsert, "id">;
    externalId: string;
    mindbodyPmtRefNo: string;
    paymentId: string | null;
    rowNumber: number;
  }> = [];
  const lineItemInserts: Array<{
    id: string;
    values: typeof studioPaymentLineItem.$inferInsert;
    externalId: string;
    mindbodyPmtRefNo: string;
    paymentId: string | null;
    rowNumber: number;
  }> = [];

  for (const [index, row] of dataset.rows.entries()) {
    try {
      const externalId = readField(row, "SDID");
      if (!externalId) throw new Error("Sale line item is missing SDID");
      const saleId = readField(row, "SaleID");
      const mindbodyPmtRefNo = readField(row, "PmtRefNo");
      const clientId = await findClientId(state, row);
      const productExternalId = readField(row, "ProductID");
      const productId = productExternalId ? state.productIdsByExternalId.get(productExternalId) ?? null : null;
      const productType = productId ? state.productTypesById.get(productId) ?? null : null;
      const paymentId = saleId ? state.paymentIdsByExternalId.get(saleId) ?? null : null;
      const existingId = state.saleLineItemIdsByExternalId.get(externalId) ?? null;
      const soldAt = parseDate(readField(row, "SaleDate")) ?? now();
      const lineAmount = parseMoney(readField(row, "SDPaymentAmt")) ?? 0;
      const values = {
        organizationId: state.organizationId,
        locationId: resolveLocationId(state, row),
        paymentId,
        clientId,
        productId,
        externalId,
        saleId: saleId || null,
        mindbodyPmtRefNo: mindbodyPmtRefNo || null,
        productExternalId: productExternalId || null,
        description: readField(row, "Description") || null,
        category: readField(row, "CategoryName") || null,
        quantity: parseInteger(readField(row, "Quantity")) ?? 1,
        unitPrice: (parseMoney(readField(row, "UnitPrice")) ?? 0).toString(),
        discountAmount: (parseMoney(readField(row, "Discount")) ?? 0).toString(),
        amount: lineAmount.toString(),
        currency: "GBP",
        returned: boolFromMindbody(readField(row, "Returned")) ?? false,
        soldAt,
        metadata: rowMetadata(row, dataset.file.name),
        updatedAt: now(),
      } satisfies Omit<typeof studioPaymentLineItem.$inferInsert, "id">;

      if (paymentId && mindbodyPmtRefNo) {
        state.paymentIdsByMindbodyPmtRefNo.set(mindbodyPmtRefNo, paymentId);
      }
      if (paymentId && !paymentPatchById.has(paymentId)) {
        paymentPatchById.set(paymentId, {
          productId,
          mindbodyPmtRefNo: mindbodyPmtRefNo || null,
          type: productType ? paymentTypeForProduct(productType) : "POS",
          description: readField(row, "Description") || "Imported Mindbody payment",
          updatedAt: now(),
        });
      }

      if (state.dryRun) {
        markProcessed(state, "saleLineItems");
      } else if (existingId) {
        lineItemUpdates.push({
          id: existingId,
          values,
          externalId,
          mindbodyPmtRefNo,
          paymentId,
          rowNumber: index + 2,
        });
      } else {
        const id = createId();
        state.saleLineItemIdsByExternalId.set(externalId, id);
        if (mindbodyPmtRefNo) state.saleLineItemIdsByMindbodyPmtRefNo.set(mindbodyPmtRefNo, id);
        if (clientId) state.saleLineItemClientIdsById.set(id, clientId);
        lineItemInserts.push({
          id,
          values: { id, ...values },
          externalId,
          mindbodyPmtRefNo,
          paymentId,
          rowNumber: index + 2,
        });
      }
    } catch (error) {
      markFailed(state, "saleLineItems", {
        fileName: dataset.file.name,
        row: index + 2,
        entity: "saleLineItem",
        error: error instanceof Error ? error.message : "Unknown sale line item import error",
      });
    }
    await flushProgressIfDue(importJobId, state, "saleLineItems");
  }

  for (const chunk of chunks(lineItemInserts, IMPORT_WRITE_CHUNK_SIZE)) {
    try {
      const savedLineItems = await db
        .insert(studioPaymentLineItem)
        .values(chunk.map((item) => item.values))
        .onConflictDoNothing()
        .returning({
          id: studioPaymentLineItem.id,
          externalId: studioPaymentLineItem.externalId,
          mindbodyPmtRefNo: studioPaymentLineItem.mindbodyPmtRefNo,
          paymentId: studioPaymentLineItem.paymentId,
          clientId: studioPaymentLineItem.clientId,
        });
      for (const saved of savedLineItems) {
        if (saved.externalId) state.saleLineItemIdsByExternalId.set(saved.externalId, saved.id);
        if (saved.clientId) state.saleLineItemClientIdsById.set(saved.id, saved.clientId);
        if (saved.mindbodyPmtRefNo) {
          state.saleLineItemIdsByMindbodyPmtRefNo.set(saved.mindbodyPmtRefNo, saved.id);
          if (saved.paymentId) state.paymentIdsByMindbodyPmtRefNo.set(saved.mindbodyPmtRefNo, saved.paymentId);
        }
      }
      for (const item of chunk) {
        markProcessed(state, "saleLineItems");
        await flushProgressIfDue(importJobId, state, "saleLineItems");
      }
    } catch (error) {
      await runWithConcurrency(chunk, IMPORT_WRITE_CONCURRENCY, async (item) => {
        try {
          const [saved] = await db
            .insert(studioPaymentLineItem)
            .values(item.values)
            .onConflictDoNothing()
            .returning({
              id: studioPaymentLineItem.id,
              externalId: studioPaymentLineItem.externalId,
              mindbodyPmtRefNo: studioPaymentLineItem.mindbodyPmtRefNo,
              paymentId: studioPaymentLineItem.paymentId,
              clientId: studioPaymentLineItem.clientId,
            });
          if (saved?.externalId) state.saleLineItemIdsByExternalId.set(saved.externalId, saved.id);
          if (saved?.clientId) state.saleLineItemClientIdsById.set(saved.id, saved.clientId);
          if (saved?.mindbodyPmtRefNo) {
            state.saleLineItemIdsByMindbodyPmtRefNo.set(saved.mindbodyPmtRefNo, saved.id);
            if (saved.paymentId) state.paymentIdsByMindbodyPmtRefNo.set(saved.mindbodyPmtRefNo, saved.paymentId);
          }
          markProcessed(state, "saleLineItems");
        } catch (rowError) {
          markFailed(state, "saleLineItems", {
            fileName: dataset.file.name,
            row: item.rowNumber,
            entity: "saleLineItem",
            error:
              rowError instanceof Error
                ? rowError.message
                : error instanceof Error
                  ? error.message
                  : "Unknown sale line item insert error",
          });
        }
        await flushProgressIfDue(importJobId, state, "saleLineItems");
      });
    }
  }

  for (const chunk of chunks(lineItemUpdates, IMPORT_WRITE_CHUNK_SIZE)) {
    try {
      const savedLineItems = await db
        .insert(studioPaymentLineItem)
        .values(chunk.map((item) => ({ id: item.id, ...item.values })))
        .onConflictDoUpdate({
          target: [studioPaymentLineItem.organizationId, studioPaymentLineItem.externalId],
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
        })
        .returning({
          id: studioPaymentLineItem.id,
          externalId: studioPaymentLineItem.externalId,
          mindbodyPmtRefNo: studioPaymentLineItem.mindbodyPmtRefNo,
          paymentId: studioPaymentLineItem.paymentId,
          clientId: studioPaymentLineItem.clientId,
        });
      for (const saved of savedLineItems) {
        if (saved.externalId) state.saleLineItemIdsByExternalId.set(saved.externalId, saved.id);
        if (saved.clientId) state.saleLineItemClientIdsById.set(saved.id, saved.clientId);
        if (saved.mindbodyPmtRefNo) {
          state.saleLineItemIdsByMindbodyPmtRefNo.set(saved.mindbodyPmtRefNo, saved.id);
          if (saved.paymentId) state.paymentIdsByMindbodyPmtRefNo.set(saved.mindbodyPmtRefNo, saved.paymentId);
        }
      }
      for (const item of chunk) {
        markProcessed(state, "saleLineItems");
        await flushProgressIfDue(importJobId, state, "saleLineItems");
      }
    } catch (error) {
      for (const item of chunk) {
        markFailed(state, "saleLineItems", {
          fileName: dataset.file.name,
          row: item.rowNumber,
          entity: "saleLineItem",
          error: error instanceof Error ? error.message : "Unknown sale line item update error",
        });
      }
    }
  }

  await updatePaymentsFromSaleLineItems(paymentPatchById);
}

async function importVisitPaymentLinks(
  state: ImportState,
  dataset: CsvDataset,
  importJobId: string,
): Promise<void> {
  markEntityTotal(state, "visitPaymentLinks", dataset.rows.length);
  if (!state.dryRun) {
    await preloadExistingBookingPaymentLinks(state, dataset.rows);
  }

  const linkInserts: Array<{
    key: string;
    values: typeof studioBookingPayment.$inferInsert;
    rowNumber: number;
  }> = [];

  for (const [index, row] of dataset.rows.entries()) {
    try {
      const visitRefNo = readField(row, "VisitRefNo");
      const mindbodyPmtRefNo = readField(row, "PmtRefNo");
      if (!visitRefNo || !mindbodyPmtRefNo) {
        throw new Error("Visit payment link is missing VisitRefNo or PmtRefNo");
      }
      const key = `${visitRefNo}|${mindbodyPmtRefNo}`;
      if (state.bookingPaymentKeys.has(key)) {
        markProcessed(state, "visitPaymentLinks");
        await flushProgressIfDue(importJobId, state, "visitPaymentLinks");
        continue;
      }
      const bookingId = state.bookingIdsByVisitRefNo.get(visitRefNo) ?? null;
      if (!bookingId) throw new Error("No matching booking found for visit payment link");
      const paymentId = state.paymentIdsByMindbodyPmtRefNo.get(mindbodyPmtRefNo) ?? null;
      const lineItemId = state.saleLineItemIdsByMindbodyPmtRefNo.get(mindbodyPmtRefNo) ?? null;
      const classCreditId = state.classCreditIdsByPaymentRefNo.get(mindbodyPmtRefNo) ?? null;

      if (state.dryRun) {
        markProcessed(state, "visitPaymentLinks");
      } else {
        state.bookingPaymentKeys.add(key);
        linkInserts.push({
          key,
          rowNumber: index + 2,
          values: {
            id: createId(),
            organizationId: state.organizationId,
            locationId: state.locationId,
            bookingId,
            paymentId,
            lineItemId,
            classCreditId,
            visitRefNo,
            mindbodyPmtRefNo,
            metadata: rowMetadata(row, dataset.file.name),
            updatedAt: now(),
          },
        });
      }
    } catch (error) {
      markFailed(state, "visitPaymentLinks", {
        fileName: dataset.file.name,
        row: index + 2,
        entity: "visitPaymentLink",
        error: error instanceof Error ? error.message : "Unknown visit payment link import error",
      });
    }
    await flushProgressIfDue(importJobId, state, "visitPaymentLinks");
  }

  for (const chunk of chunks(linkInserts, IMPORT_WRITE_CHUNK_SIZE)) {
    try {
      await db
        .insert(studioBookingPayment)
        .values(chunk.map((item) => item.values))
        .onConflictDoNothing();
      for (const item of chunk) {
        state.bookingPaymentKeys.add(item.key);
        markProcessed(state, "visitPaymentLinks");
        await flushProgressIfDue(importJobId, state, "visitPaymentLinks");
      }
    } catch (error) {
      await runWithConcurrency(chunk, IMPORT_WRITE_CONCURRENCY, async (item) => {
        try {
          await db.insert(studioBookingPayment).values(item.values).onConflictDoNothing();
          state.bookingPaymentKeys.add(item.key);
          markProcessed(state, "visitPaymentLinks");
        } catch (rowError) {
          markFailed(state, "visitPaymentLinks", {
            fileName: dataset.file.name,
            row: item.rowNumber,
            entity: "visitPaymentLink",
            error:
              rowError instanceof Error
                ? rowError.message
                : error instanceof Error
                  ? error.message
                  : "Unknown visit payment link insert error",
          });
        }
        await flushProgressIfDue(importJobId, state, "visitPaymentLinks");
      });
    }
  }
}

async function importAccountBalances(
  state: ImportState,
  dataset: CsvDataset,
  importJobId: string,
): Promise<void> {
  markEntityTotal(state, "accountBalances", dataset.rows.length);
  if (!state.dryRun) {
    await preloadExistingClientIds(state, dataset.rows);
    await preloadExistingPayments(
      state,
      dataset.rows.map(
        (row) => `mindbody-account-balance-${readField(row, "MBSystemID", "BarcodeID")}`,
      ),
    );
  }

  const syntheticProductId =
    !state.dryRun && dataset.rows.some((row) => (parseMoney(readField(row, "Balance")) ?? 0) !== 0)
      ? await ensureSyntheticProduct(state, "Payment on account", "ACCOUNT_CREDIT")
      : null;
  const balancePaymentInserts: Array<{
    id: string;
    values: typeof studioPayment.$inferInsert;
    externalId: string;
    rowNumber: number;
  }> = [];

  for (const [index, row] of dataset.rows.entries()) {
    try {
      const balance = parseMoney(readField(row, "Balance")) ?? 0;
      if (balance === 0) {
        markProcessed(state, "accountBalances");
        await flushProgressIfDue(importJobId, state, "accountBalances");
        continue;
      }
      const clientId = await findClientId(state, row);
      if (!clientId) throw new Error("No matching client found for account balance");
      const externalId = `mindbody-account-balance-${readField(row, "MBSystemID", "BarcodeID")}`;
      const existingId = state.paymentIdsByExternalId.get(externalId) ?? null;

      if (!state.dryRun && !existingId) {
        const id = createId();
        state.paymentIdsByExternalId.set(externalId, id);
        balancePaymentInserts.push({
          id,
          externalId,
          rowNumber: index + 2,
          values: {
            id,
            organizationId: state.organizationId,
            locationId: resolveLocationId(state, row),
            clientId,
            productId: syntheticProductId,
            externalId,
            amount: balance.toString(),
            currency: "GBP",
            status: "SUCCEEDED",
            type: "POS",
            description: "Imported Mindbody payment on account balance",
            metadata: rowMetadata(row, dataset.file.name),
            updatedAt: now(),
          },
        });
      } else {
        markProcessed(state, "accountBalances");
      }
    } catch (error) {
      markFailed(state, "accountBalances", {
        fileName: dataset.file.name,
        row: index + 2,
        entity: "accountBalance",
        error: error instanceof Error ? error.message : "Unknown account balance import error",
      });
    }
    await flushProgressIfDue(importJobId, state, "accountBalances");
  }

  for (const chunk of chunks(balancePaymentInserts, IMPORT_WRITE_CHUNK_SIZE)) {
    try {
      await db
        .insert(studioPayment)
        .values(chunk.map((item) => item.values))
        .onConflictDoNothing();
      for (const item of chunk) {
        state.paymentIdsByExternalId.set(item.externalId, item.id);
        markProcessed(state, "accountBalances");
        await flushProgressIfDue(importJobId, state, "accountBalances");
      }
    } catch (error) {
      await runWithConcurrency(chunk, IMPORT_WRITE_CONCURRENCY, async (item) => {
        try {
          await db.insert(studioPayment).values(item.values).onConflictDoNothing();
          state.paymentIdsByExternalId.set(item.externalId, item.id);
          markProcessed(state, "accountBalances");
        } catch (rowError) {
          markFailed(state, "accountBalances", {
            fileName: dataset.file.name,
            row: item.rowNumber,
            entity: "accountBalance",
            error:
              rowError instanceof Error
                ? rowError.message
                : error instanceof Error
                  ? error.message
                  : "Unknown account balance insert error",
          });
        }
        await flushProgressIfDue(importJobId, state, "accountBalances");
      });
    }
  }
}

async function ensureSyntheticProduct(
  state: ImportState,
  name: string,
  type: typeof studioProduct.$inferInsert.type,
): Promise<string | null> {
  const externalId = `system-${slugify(name)}`;
  if (state.productIdsByExternalId.has(externalId)) {
    return state.productIdsByExternalId.get(externalId) ?? null;
  }

  const existing = await db.query.studioProduct.findFirst({
    where: and(eq(studioProduct.organizationId, state.organizationId), eq(studioProduct.externalId, externalId)),
    columns: { id: true, type: true },
  });
  if (existing) {
    state.productIdsByExternalId.set(externalId, existing.id);
    state.productTypesById.set(existing.id, existing.type);
    return existing.id;
  }
  if (state.dryRun) return null;
  const [saved] = await db
    .insert(studioProduct)
    .values({
          id: createId(),
          organizationId: state.organizationId,
      locationId: state.locationId,
          externalId,
      name,
      type,
      category: "Imported revenue",
      price: "0",
          currency: "GBP",
          updatedAt: now(),
    })
    .returning({ id: studioProduct.id });
  state.productIdsByExternalId.set(externalId, saved.id);
  state.productTypesById.set(saved.id, type ?? "OTHER");
  return saved.id;
}

async function importNotes(state: ImportState, dataset: CsvDataset, entity: string): Promise<void> {
  markEntityTotal(state, entity, dataset.rows.length);
  if (!state.dryRun) await preloadExistingClientIds(state, dataset.rows);

  const noteInserts: Array<{
    values: typeof note.$inferInsert;
    rowNumber: number;
  }> = [];

  for (const [index, row] of dataset.rows.entries()) {
    try {
      const clientId = await findClientId(state, row);
      const content =
        readField(row, "Notes", "ContactLog") ||
        [readField(row, "ContactName"), readField(row, "ContactMethod"), readField(row, "ContactType")].filter(Boolean).join(" - ");
      if (!clientId || !content) {
        throw new Error("No matching client or note content found");
      }
      const externalRef = readField(row, "LogID", "VisitRefNo");
      const noteContent = externalRef ? `[Mindbody ${externalRef}] ${content}` : content;
      if (state.dryRun) {
        markProcessed(state, entity);
      } else {
        noteInserts.push({
          rowNumber: index + 2,
          values: {
            id: createId(),
            organizationId: state.organizationId,
            locationId: resolveLocationId(state, row),
            clientId,
            content: noteContent,
            createdAt: parseDate(readField(row, "ContactDate")) ?? now(),
            updatedAt: now(),
          },
        });
      }
    } catch (error) {
      markFailed(state, entity, {
        fileName: dataset.file.name,
        row: index + 2,
        entity,
        error: error instanceof Error ? error.message : "Unknown note import error",
      });
    }
  }

  for (const chunk of chunks(noteInserts, IMPORT_WRITE_CHUNK_SIZE)) {
    try {
      await db.insert(note).values(chunk.map((item) => item.values)).onConflictDoNothing();
      for (const item of chunk) markProcessed(state, entity);
    } catch (error) {
      await runWithConcurrency(chunk, IMPORT_WRITE_CONCURRENCY, async (item) => {
        try {
          await db.insert(note).values(item.values).onConflictDoNothing();
          markProcessed(state, entity);
        } catch (rowError) {
          markFailed(state, entity, {
            fileName: dataset.file.name,
            row: item.rowNumber,
            entity,
            error:
              rowError instanceof Error
                ? rowError.message
                : error instanceof Error
                  ? error.message
                  : "Unknown note insert error",
          });
        }
      });
    }
  }
}

async function importAppointmentNotes(state: ImportState, dataset: CsvDataset): Promise<void> {
  markEntityTotal(state, "appointmentNotes", dataset.rows.length);
  if (!state.dryRun) await preloadExistingClientIds(state, dataset.rows);

  const noteInserts: Array<{
    values: typeof note.$inferInsert;
    rowNumber: number;
  }> = [];

  for (const [index, row] of dataset.rows.entries()) {
    try {
      const visitRef = readField(row, "VisitRefNo");
      const clientId = state.visitClientIdsByVisitRef.get(visitRef) ?? (await findClientId(state, row));
      const content = readField(row, "Notes");
      if (!clientId || !content) throw new Error("No matching client or appointment note content found");
      if (state.dryRun) {
        markProcessed(state, "appointmentNotes");
      } else {
        noteInserts.push({
          rowNumber: index + 2,
          values: {
            id: createId(),
            organizationId: state.organizationId,
            locationId: state.locationId,
            clientId,
            content: `[Mindbody appointment ${visitRef}] ${content}`,
            updatedAt: now(),
          },
        });
      }
    } catch (error) {
      markFailed(state, "appointmentNotes", {
        fileName: dataset.file.name,
        row: index + 2,
        entity: "appointmentNote",
        error: error instanceof Error ? error.message : "Unknown appointment note import error",
      });
    }
  }

  for (const chunk of chunks(noteInserts, IMPORT_WRITE_CHUNK_SIZE)) {
    try {
      await db.insert(note).values(chunk.map((item) => item.values)).onConflictDoNothing();
      for (const item of chunk) markProcessed(state, "appointmentNotes");
    } catch (error) {
      await runWithConcurrency(chunk, IMPORT_WRITE_CONCURRENCY, async (item) => {
        try {
          await db.insert(note).values(item.values).onConflictDoNothing();
          markProcessed(state, "appointmentNotes");
        } catch (rowError) {
          markFailed(state, "appointmentNotes", {
            fileName: dataset.file.name,
            row: item.rowNumber,
            entity: "appointmentNote",
            error:
              rowError instanceof Error
                ? rowError.message
                : error instanceof Error
                  ? error.message
                  : "Unknown appointment note insert error",
          });
        }
      });
    }
  }
}

async function importRelationships(state: ImportState, dataset: CsvDataset): Promise<void> {
  markEntityTotal(state, "relationships", dataset.rows.length);
  if (!state.dryRun) {
    await preloadExistingClientIds(
      state,
      dataset.rows.flatMap((row) => [
        {
          MBSystemID: readField(row, "MBSystemID1"),
          BarcodeID: readField(row, "BarcodeID1"),
        },
        {
          MBSystemID: readField(row, "MBSystemID2"),
          BarcodeID: readField(row, "BarcodeID2"),
        },
      ]),
    );
  }

  const relationshipInserts: Array<{
    household: typeof clientHousehold.$inferInsert;
    members: Array<typeof clientHouseholdMember.$inferInsert>;
    rowNumber: number;
  }> = [];

  for (const [index, row] of dataset.rows.entries()) {
    try {
      const firstClientId = await findClientId(state, {
        MBSystemID: readField(row, "MBSystemID1"),
        BarcodeID: readField(row, "BarcodeID1"),
      });
      const secondClientId = await findClientId(state, {
        MBSystemID: readField(row, "MBSystemID2"),
        BarcodeID: readField(row, "BarcodeID2"),
      });
      if (!firstClientId || !secondClientId) throw new Error("Relationship clients were not found");
      if (state.dryRun) {
        markProcessed(state, "relationships");
      } else {
        const householdName = [readField(row, "LastName1"), readField(row, "LastName2")]
          .filter(Boolean)
          .join(" / ") || `Mindbody relationship ${readField(row, "RelationID")}`;
        const householdId = createId();
        relationshipInserts.push({
          rowNumber: index + 2,
          household: {
            id: householdId,
            organizationId: state.organizationId,
            locationId: state.locationId,
            name: householdName,
            primaryContactId: firstClientId,
            notes: readField(row, "RelName1", "RelName2") || null,
            updatedAt: now(),
          },
          members: [
            {
              id: createId(),
              householdId,
              clientId: firstClientId,
              role: "PRIMARY",
              relationship: readField(row, "RelName1") || null,
              updatedAt: now(),
            },
            {
              id: createId(),
              householdId,
              clientId: secondClientId,
              role: "MEMBER",
              relationship: readField(row, "RelName2") || null,
              updatedAt: now(),
            },
          ],
        });
      }
    } catch (error) {
      markFailed(state, "relationships", {
        fileName: dataset.file.name,
        row: index + 2,
        entity: "relationship",
        error: error instanceof Error ? error.message : "Unknown relationship import error",
      });
    }
  }

  for (const chunk of chunks(relationshipInserts, IMPORT_WRITE_CHUNK_SIZE)) {
    try {
      await db
        .insert(clientHousehold)
        .values(chunk.map((item) => item.household))
        .onConflictDoNothing();
      await db
        .insert(clientHouseholdMember)
        .values(chunk.flatMap((item) => item.members))
        .onConflictDoNothing();
      for (const item of chunk) markProcessed(state, "relationships");
    } catch (error) {
      await runWithConcurrency(chunk, IMPORT_WRITE_CONCURRENCY, async (item) => {
        try {
          await db.insert(clientHousehold).values(item.household).onConflictDoNothing();
          await db.insert(clientHouseholdMember).values(item.members).onConflictDoNothing();
          markProcessed(state, "relationships");
        } catch (rowError) {
          markFailed(state, "relationships", {
            fileName: dataset.file.name,
            row: item.rowNumber,
            entity: "relationship",
            error:
              rowError instanceof Error
                ? rowError.message
                : error instanceof Error
                  ? error.message
                  : "Unknown relationship insert error",
          });
        }
      });
    }
  }
}

function numericBasenameRef(path: string): string {
  return path.match(/(\d+)(?=\.[^.]+$)/)?.[1] ?? "";
}

function numericSegmentAfter(path: string, segmentName: string): string {
  const segments = normalizeZipEntryPath(path).split("/");
  const segmentIndex = segments.findIndex((segment) => segment.toLowerCase() === segmentName.toLowerCase());
  const candidate = segmentIndex >= 0 ? segments[segmentIndex + 1] ?? "" : "";
  return /^\d+$/.test(candidate) ? candidate : "";
}

function signedWaiverClientRef(path: string): string {
  return importFileName(path).match(/signedwaiver_(\d+)/)?.[1] ?? "";
}

function parseDateParts(parts: {
  year: string;
  month: string;
  day: string;
  hour?: string;
  minute?: string;
  second?: string;
}): Date | null {
  const date = new Date(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour ?? "0"),
    Number(parts.minute ?? "0"),
    Number(parts.second ?? "0"),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function waiverSignedAtFromPath(path: string): Date | null {
  const fileName = importFileName(path);
  const signedWaiverMatch = fileName.match(
    /signedwaiver_\d+_(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})/,
  );
  if (signedWaiverMatch) {
    return parseDateParts({
      year: signedWaiverMatch[1] ?? "",
      month: signedWaiverMatch[2] ?? "",
      day: signedWaiverMatch[3] ?? "",
      hour: signedWaiverMatch[4],
      minute: signedWaiverMatch[5],
      second: signedWaiverMatch[6],
    });
  }

  const brandedMatch = fileName.match(
    /liabilitywaiversignature-(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/,
  );
  if (brandedMatch) {
    return parseDateParts({
      year: brandedMatch[1] ?? "",
      month: brandedMatch[2] ?? "",
      day: brandedMatch[3] ?? "",
      hour: brandedMatch[4],
      minute: brandedMatch[5],
      second: brandedMatch[6],
    });
  }

  return null;
}

function documentTypeForImportPath(
  kind: MindbodyFileKind,
  path: string,
): typeof clientDocument.$inferInsert.documentType {
  const fileName = importFileName(path);
  if (kind === "saleImage") return "SALE_IMAGE";
  if (kind === "contractSignature" || fileName.includes("contractsignature")) return "CONTRACT_SIGNATURE";
  if (fileName.includes("waiver") || fileName.includes("liability")) return "WAIVER";
  return "PROFILE_FILE";
}

function documentRefsForPath(path: string, kind: MindbodyFileKind): {
  clientRef: string;
  membershipRef: string;
  saleRef: string;
} {
  const basenameRef = numericBasenameRef(path);
  if (kind === "saleImage") {
    return { clientRef: "", membershipRef: "", saleRef: basenameRef };
  }
  if (kind === "contractSignature") {
    return { clientRef: "", membershipRef: basenameRef, saleRef: "" };
  }
  return {
    clientRef: signedWaiverClientRef(path) || numericSegmentAfter(path, "files") || basenameRef,
    membershipRef: "",
    saleRef: "",
  };
}

async function preloadExistingSaleLineItemsByRefs(
  state: ImportState,
  refs: string[],
): Promise<void> {
  const uniqueRefs = uniqueNonEmpty(refs);
  await runWithConcurrency(
    chunks(uniqueRefs, IMPORT_LOOKUP_CHUNK_SIZE),
    IMPORT_LOOKUP_CONCURRENCY,
    async (chunk) => {
      const lineItems = await db
        .select({
          id: studioPaymentLineItem.id,
          externalId: studioPaymentLineItem.externalId,
          mindbodyPmtRefNo: studioPaymentLineItem.mindbodyPmtRefNo,
          paymentId: studioPaymentLineItem.paymentId,
          clientId: studioPaymentLineItem.clientId,
        })
        .from(studioPaymentLineItem)
        .where(
          and(
            eq(studioPaymentLineItem.organizationId, state.organizationId),
            or(
              inArray(studioPaymentLineItem.externalId, chunk),
              inArray(studioPaymentLineItem.mindbodyPmtRefNo, chunk),
            ),
          ),
        );

      for (const lineItem of lineItems) {
        if (lineItem.externalId) state.saleLineItemIdsByExternalId.set(lineItem.externalId, lineItem.id);
        if (lineItem.mindbodyPmtRefNo) {
          state.saleLineItemIdsByMindbodyPmtRefNo.set(lineItem.mindbodyPmtRefNo, lineItem.id);
        }
        if (lineItem.paymentId && lineItem.mindbodyPmtRefNo) {
          state.paymentIdsByMindbodyPmtRefNo.set(lineItem.mindbodyPmtRefNo, lineItem.paymentId);
        }
        if (lineItem.clientId) state.saleLineItemClientIdsById.set(lineItem.id, lineItem.clientId);
      }
    },
  );
}

async function ensureMindbodyWaiverTemplate(state: ImportState): Promise<string> {
  if (state.mindbodyWaiverTemplateId) return state.mindbodyWaiverTemplateId;

  const existing = await db.query.waiverTemplate.findFirst({
    where: and(
      eq(waiverTemplate.organizationId, state.organizationId),
      state.locationId ? eq(waiverTemplate.locationId, state.locationId) : undefined,
      eq(waiverTemplate.name, MINDBODY_WAIVER_TEMPLATE_NAME),
    ),
    columns: { id: true },
  });

  if (existing) {
    state.mindbodyWaiverTemplateId = existing.id;
    return existing.id;
  }

  const [created] = await db
    .insert(waiverTemplate)
    .values({
      id: createId(),
      organizationId: state.organizationId,
      locationId: state.locationId,
      name: MINDBODY_WAIVER_TEMPLATE_NAME,
      content:
        "Imported from Mindbody liability waiver PDFs. The original signed PDF is stored as a client document.",
      isRequired: true,
      isActive: true,
      version: 1,
      createdAt: now(),
      updatedAt: now(),
    })
    .returning({ id: waiverTemplate.id });

  if (!created) {
    throw new Error("Could not create Mindbody waiver template.");
  }

  state.mindbodyWaiverTemplateId = created.id;
  return created.id;
}

function waiverSignatureKey(clientId: string, templateId: string, signedAt: Date): string {
  return `${clientId}:${templateId}:${signedAt.toISOString()}`;
}

async function preloadExistingWaiverSignatures(
  state: ImportState,
  templateId: string,
  clientIds: string[],
): Promise<void> {
  const uniqueClientIds = uniqueNonEmpty(clientIds);
  await runWithConcurrency(
    chunks(uniqueClientIds, IMPORT_LOOKUP_CHUNK_SIZE),
    IMPORT_LOOKUP_CONCURRENCY,
    async (chunk) => {
      const signatures = await db
        .select({
          clientId: waiverSignature.clientId,
          signedAt: waiverSignature.signedAt,
        })
        .from(waiverSignature)
        .where(
          and(
            eq(waiverSignature.templateId, templateId),
            inArray(waiverSignature.clientId, chunk),
          ),
        );

      for (const signature of signatures) {
        state.waiverSignatureKeys.add(
          waiverSignatureKey(signature.clientId, templateId, signature.signedAt),
        );
      }
    },
  );
}

async function importDocuments(state: ImportState, files: UploadedImportFile[]): Promise<void> {
  const importableFiles = files.filter((file) => {
    const path = importPathFor(file);
    return shouldImportMindbodyDocument(path, classifyMindbodyFileName(path));
  });
  markEntityTotal(state, "documents", importableFiles.length);
  if (!state.dryRun) {
    const refs = importableFiles.map((file) => {
      const path = importPathFor(file);
      return documentRefsForPath(path, classifyMindbodyFileName(path));
    });

    await preloadExistingClientIds(
      state,
      refs
        .map((ref) => ref.clientRef)
        .filter(Boolean)
        .map((clientRef) => ({
          MBSystemID: clientRef,
          BarcodeID: clientRef,
        })),
    );
    await preloadExistingPayments(state, refs.map((ref) => ref.saleRef));
    await preloadExistingSaleLineItemsByRefs(state, refs.map((ref) => ref.saleRef));
    await preloadExistingClientDocuments(
      state,
      importableFiles.map((file) => {
        const path = importPathFor(file);
        return file.zipEntryPath ? `${file.zipSourceName ?? file.name}:${file.zipEntryPath}` : path;
      }),
    );

    const waiverClientIds = importableFiles.flatMap((file) => {
      const path = importPathFor(file);
      const kind = classifyMindbodyFileName(path);
      if (documentTypeForImportPath(kind, path) !== "WAIVER") return [];
      const ref = documentRefsForPath(path, kind).clientRef;
      const clientId =
        state.clientIdsByMindbodyId.get(ref) ??
        state.clientIdsByBarcodeId.get(ref) ??
        null;
      return clientId ? [clientId] : [];
    });

    if (waiverClientIds.length > 0) {
      const templateId = await ensureMindbodyWaiverTemplate(state);
      await preloadExistingWaiverSignatures(state, templateId, waiverClientIds);
    }

    const membershipIds = uniqueNonEmpty(
      refs.map((ref) => (ref.membershipRef ? state.membershipIdsByContractId.get(ref.membershipRef) ?? "" : "")),
    ).filter((membershipId) => !state.membershipClientIdsById.has(membershipId));

    for (const chunk of chunks(membershipIds, IMPORT_LOOKUP_CHUNK_SIZE)) {
      const memberships = await db
        .select({ id: studioMembership.id, clientId: studioMembership.clientId })
        .from(studioMembership)
        .where(inArray(studioMembership.id, chunk));
      for (const membership of memberships) {
        state.membershipClientIdsById.set(membership.id, membership.clientId);
      }
    }
  }

  const documentInserts: Array<{
    sourcePath: string;
    values: typeof clientDocument.$inferInsert;
  }> = [];
  const waiverSignatureInserts: Array<typeof waiverSignature.$inferInsert> = [];

  for (const file of importableFiles) {
    const path = importPathFor(file);
    const sourcePath = file.zipEntryPath ? `${file.zipSourceName ?? file.name}:${file.zipEntryPath}` : path;
    const kind = classifyMindbodyFileName(path);
    const refs = documentRefsForPath(path, kind);
    const documentType = documentTypeForImportPath(kind, path);
    const membershipId = refs.membershipRef ? state.membershipIdsByContractId.get(refs.membershipRef) ?? null : null;
    const paymentId = refs.saleRef
      ? state.paymentIdsByExternalId.get(refs.saleRef) ??
        state.paymentIdsByMindbodyPmtRefNo.get(refs.saleRef) ??
        null
      : null;
    const paymentLineItemId = refs.saleRef
      ? state.saleLineItemIdsByExternalId.get(refs.saleRef) ??
        state.saleLineItemIdsByMindbodyPmtRefNo.get(refs.saleRef) ??
        null
      : null;
    let clientId: string | null = null;
    if (membershipId) {
      clientId = state.membershipClientIdsById.get(membershipId) ?? null;
    }
    if (!clientId && paymentId) {
      clientId = state.paymentClientIdsById.get(paymentId) ?? null;
    }
    if (!clientId && paymentLineItemId) {
      clientId = state.saleLineItemClientIdsById.get(paymentLineItemId) ?? null;
    }
    if (!clientId && refs.clientRef) {
      clientId =
        state.clientIdsByMindbodyId.get(refs.clientRef) ??
        state.clientIdsByBarcodeId.get(refs.clientRef) ??
        null;
    }

    if (!clientId) {
      state.warnings.push({
        fileName: path,
        fileKind: kind,
        message: "Uploaded document could not be matched to a client yet; file location is preserved in the import job log.",
      });
      markProcessed(state, "documents");
      continue;
    }

    if (!state.dryRun && !state.clientDocumentSourcePaths.has(sourcePath)) {
      state.clientDocumentSourcePaths.add(sourcePath);
      documentInserts.push({
        sourcePath,
        values: {
          id: createId(),
          organizationId: state.organizationId,
          locationId: state.locationId,
          clientId,
          membershipId,
          paymentId,
          paymentLineItemId,
          source: "MINDBODY",
          sourcePath,
          fileName: file.name,
          fileType: file.type ?? null,
          storageUrl: file.zipSourceUrl ?? file.url,
          documentType,
          metadata: {
            importSource: "MINDBODY",
            fileSize: file.size ?? null,
            clientRef: refs.clientRef || null,
            membershipRef: refs.membershipRef || null,
            saleRef: refs.saleRef || null,
            parsedSignedAt: documentType === "WAIVER" ? waiverSignedAtFromPath(path)?.toISOString() ?? null : null,
            parsedClientRef: refs.clientRef || null,
            storageMode: file.zipEntryPath ? "ZIP_ENTRY" : "DIRECT_FILE",
            archiveName: file.zipSourceName ?? null,
            archiveUrl: file.zipSourceUrl ?? null,
            archiveEntryPath: file.zipEntryPath ?? null,
          },
          updatedAt: now(),
        },
      });
    }

    if (!state.dryRun && documentType === "WAIVER") {
      const signedAt = waiverSignedAtFromPath(path) ?? now();
      const templateId = await ensureMindbodyWaiverTemplate(state);
      const signatureKey = waiverSignatureKey(clientId, templateId, signedAt);
      if (!state.waiverSignatureKeys.has(signatureKey)) {
        state.waiverSignatureKeys.add(signatureKey);
        waiverSignatureInserts.push({
          id: createId(),
          templateId,
          clientId,
          signatureData: sourcePath,
          signedAt,
          agreedToTerms: true,
          createdAt: now(),
        });
      }
    }
    markProcessed(state, "documents");
  }

  for (const chunk of chunks(documentInserts, IMPORT_WRITE_CHUNK_SIZE)) {
    try {
      await db
        .insert(clientDocument)
        .values(chunk.map((item) => item.values))
        .onConflictDoNothing();
      for (const item of chunk) state.clientDocumentSourcePaths.add(item.sourcePath);
    } catch (error) {
      await runWithConcurrency(chunk, IMPORT_WRITE_CONCURRENCY, async (item) => {
        try {
          await db.insert(clientDocument).values(item.values).onConflictDoNothing();
          state.clientDocumentSourcePaths.add(item.sourcePath);
        } catch (rowError) {
          state.warnings.push({
            fileName: item.values.fileName,
            fileKind: classifyMindbodyFileName(item.values.fileName),
            message:
              rowError instanceof Error
                ? `Document metadata could not be saved: ${rowError.message}`
                : error instanceof Error
                  ? `Document metadata could not be saved: ${error.message}`
                  : "Document metadata could not be saved.",
          });
        }
      });
    }
  }

  for (const chunk of chunks(waiverSignatureInserts, IMPORT_WRITE_CHUNK_SIZE)) {
    try {
      await db.insert(waiverSignature).values(chunk).onConflictDoNothing();
    } catch (error) {
      await runWithConcurrency(chunk, IMPORT_WRITE_CONCURRENCY, async (item) => {
        try {
          await db.insert(waiverSignature).values(item).onConflictDoNothing();
        } catch (rowError) {
          state.warnings.push({
            fileName: item.signatureData,
            fileKind: "clientFile",
            message:
              rowError instanceof Error
                ? `Waiver signature could not be saved: ${rowError.message}`
                : error instanceof Error
                  ? `Waiver signature could not be saved: ${error.message}`
                  : "Waiver signature could not be saved.",
          });
        }
      });
    }
  }
}

async function notifyImport(
  type: "IMPORT_STARTED" | "IMPORT_COMPLETED" | "IMPORT_FAILED" | "IMPORT_NEEDS_REVIEW",
  state: ImportState,
  importJobId: string,
  message: string,
): Promise<void> {
  await createNotification({
    type,
    title:
      type === "IMPORT_STARTED"
        ? "Import started"
        : type === "IMPORT_COMPLETED"
          ? "Import completed"
          : type === "IMPORT_NEEDS_REVIEW"
            ? "Import needs review"
            : "Import failed",
    message,
    entityType: "import",
    entityId: importJobId,
    organizationId: state.organizationId,
    locationId: state.locationId,
    data: {
      importJobId,
      counters: state.counters,
      warningCount: state.warnings.length,
      errorCount: state.errors.length,
      importedBy: state.importedBy,
    },
  });
}

export async function processMindbodyImportJob(params: {
  importJobId: string;
  organizationId: string;
  alreadyMarkedProcessing?: boolean;
}): Promise<{ success: boolean; counters: ImportCounters; warnings: number; errors: number }> {
  const job = await db.query.importJob.findFirst({
    where: and(eq(importJob.id, params.importJobId), eq(importJob.organizationId, params.organizationId)),
  });
  if (!job) return { success: false, counters: {}, warnings: 0, errors: 1 };

  const config = normalizeConfig(job.importConfig);
  const state: ImportState = {
    organizationId: params.organizationId,
    locationId: job.locationId ?? null,
    importedBy: job.importedBy,
    dryRun: config.dryRun ?? false,
    errors: [],
    warnings: [],
    counters: {},
    clientIdsByMindbodyId: new Map(),
    clientIdsByBarcodeId: new Map(),
    clientIdsByEmail: new Map(),
    locationIdsByExternalId: new Map(),
    locationIdsByName: new Map(),
    instructorIdsByTrainerId: new Map(),
    staffMemberIdsByTrainerId: new Map(),
    productIdsByExternalId: new Map(),
    productIdsBySku: new Map(),
    productTypesById: new Map(),
    membershipIdsByContractId: new Map(),
    membershipClientIdsById: new Map(),
    classCreditIdsByExternalId: new Map(),
    classCreditIdsByPaymentRefNo: new Map(),
    paymentIdsByExternalId: new Map(),
    paymentIdsByMindbodyPmtRefNo: new Map(),
    paymentClientIdsById: new Map(),
    saleLineItemIdsByExternalId: new Map(),
    saleLineItemIdsByMindbodyPmtRefNo: new Map(),
    saleLineItemClientIdsById: new Map(),
    bookingIdsByExternalClientKey: new Map(),
    bookingIdsByVisitRefNo: new Map(),
    bookingPaymentKeys: new Set(),
    classTypeIdsBySlug: new Map(),
    visitClassIdsByKey: new Map(),
    visitClientIdsByVisitRef: new Map(),
    checkInKeys: new Set(),
    clientDocumentSourcePaths: new Set(),
    mindbodyWaiverTemplateId: null,
    waiverSignatureKeys: new Set(),
  };

  try {
    if (!params.alreadyMarkedProcessing && job.status === "PENDING") {
      const [startedJob] = await db
        .update(importJob)
        .set({
          status: "PROCESSING",
          startedAt: job.startedAt ?? now(),
          updatedAt: now(),
        })
        .where(
          and(
            eq(importJob.id, params.importJobId),
            eq(importJob.organizationId, params.organizationId),
            eq(importJob.status, "PENDING"),
          ),
        )
        .returning({ id: importJob.id });

      if (!startedJob) {
        return { success: false, counters: {}, warnings: 0, errors: 0 };
      }
    }

    await notifyImport("IMPORT_STARTED", state, params.importJobId, "Mindbody import has started.").catch(() => undefined);
    const { datasets, documentFiles, warnings } = await fetchCsvDatasets(config.files ?? []);
    state.warnings.push(...warnings);

    const entityCounts: Record<string, number> = {};
    for (const dataset of datasets) {
      entityCounts[dataset.kind] = (entityCounts[dataset.kind] ?? 0) + dataset.rows.length;
    }
    entityCounts.documents = documentFiles.length;

    await db
      .update(importJob)
      .set({
        entityCounts,
        sourceFilenames: (config.files ?? []).map((file) => file.relativePath || file.name),
        missingFields: state.warnings.filter((warning) => warning.headers?.length),
        updatedAt: now(),
      })
      .where(eq(importJob.id, params.importJobId));

    const grouped = datasetsByKind(datasets);
    for (const kind of CSV_KINDS_IN_ORDER) {
      const group = grouped.get(kind) ?? [];
      if (kind === "clients") {
        if (group.length > 0) {
          await importClients(state, datasets, params.importJobId);
          await updateJobProgress(params.importJobId, state);
        }
        continue;
      }

      for (const dataset of group) {
        if (kind === "locations") await importLocations(state, dataset);
        if (kind === "trainers") {
          await importStaffMembers(state, dataset);
          await importTrainers(state, dataset);
        }
        if (kind === "products") await importProducts(state, dataset, params.importJobId);
        if (kind === "clientAutopayContracts") await importContracts(state, dataset, params.importJobId);
        if (kind === "clientPricingOptions") await importPricingOptions(state, dataset, params.importJobId);
        if (kind === "visitData" || kind === "reservationData") await importVisits(state, dataset, params.importJobId);
        if (kind === "payments") await importPayments(state, dataset, params.importJobId);
        if (kind === "clientSales") await importSaleLineItems(state, dataset, params.importJobId);
        if (kind === "visitPaymentLinking") await importVisitPaymentLinks(state, dataset, params.importJobId);
        if (kind === "accountBalances") await importAccountBalances(state, dataset, params.importJobId);
        if (kind === "notes") await importNotes(state, dataset, "notes");
        if (kind === "contactLogs") await importNotes(state, dataset, "contactLogs");
        if (kind === "appointmentNotes") await importAppointmentNotes(state, dataset);
        if (kind === "clientRelationships") await importRelationships(state, dataset);
        await updateJobProgress(params.importJobId, state);
      }
    }

    const activeLocationId = await ensureOnboardingLocationContext(state, config.source);
    if (activeLocationId && !job.locationId) {
      await db
        .update(importJob)
        .set({ locationId: activeLocationId, updatedAt: now() })
        .where(eq(importJob.id, params.importJobId));
    }

    await importDocuments(state, documentFiles);
    await updateJobProgress(params.importJobId, state);

    const status = state.errors.length > 0 && state.counters.clients?.processed === 0 ? "FAILED" : "COMPLETED";
    await db
      .update(importJob)
      .set({
        status,
        completedAt: now(),
        errorLog: state.errors.slice(0, 250),
        warningLog: state.warnings.slice(0, 250),
        missingFields: state.warnings.filter((warning) => warning.headers?.length).slice(0, 250),
        updatedAt: now(),
      })
      .where(eq(importJob.id, params.importJobId));

    if (state.warnings.some((warning) => warning.headers?.length)) {
      await notifyImport(
        "IMPORT_NEEDS_REVIEW",
        state,
        params.importJobId,
        "Mindbody import completed with fields preserved in metadata that need first-class mapping review.",
      ).catch(() => undefined);
    }

    await notifyImport(
      status === "COMPLETED" ? "IMPORT_COMPLETED" : "IMPORT_FAILED",
      state,
      params.importJobId,
      status === "COMPLETED" ? "Mindbody import completed." : "Mindbody import failed.",
    ).catch(() => undefined);

    return { success: status === "COMPLETED", counters: state.counters, warnings: state.warnings.length, errors: state.errors.length };
  } catch (error) {
    state.errors.push({
      fileName: "Mindbody import",
      entity: "import",
      error: error instanceof Error ? error.message : "Unknown Mindbody import error",
    });
    await db
      .update(importJob)
      .set({
        status: "FAILED",
        completedAt: now(),
        errorLog: state.errors,
        warningLog: state.warnings,
        updatedAt: now(),
      })
      .where(eq(importJob.id, params.importJobId));
    await notifyImport("IMPORT_FAILED", state, params.importJobId, "Mindbody import failed.").catch(() => undefined);
    return { success: false, counters: state.counters, warnings: state.warnings.length, errors: state.errors.length };
  }
}
