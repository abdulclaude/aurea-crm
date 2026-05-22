import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  sql,
  type SQL,
} from "drizzle-orm";
import { db, dbPool } from "@/db/client";
import type { JsonValue } from "@/db/json";
import {
  adSpend,
  anonymousUserProfiles,
  client,
  connection,
  deal,
  execution,
  funnel,
  funnelBlock,
  funnelBreakpoint,
  funnelEvent,
  funnelPage,
  funnelSession,
  funnelWebVital,
  instructorDocument,
  invoice,
  invoiceLineItem,
  invoiceReminder,
  invoiceTemplate,
  location,
  locationMember,
  node,
  organization,
  pipeline,
  pipelineStage,
  recurringInvoice,
  recurringInvoiceGeneration,
  smartSection,
  timeLog,
  workflows,
} from "@/db/schema";

export { db, dbPool };

type Table =
  | typeof adSpend
  | typeof anonymousUserProfiles
  | typeof client
  | typeof connection
  | typeof deal
  | typeof execution
  | typeof funnel
  | typeof funnelBlock
  | typeof funnelBreakpoint
  | typeof funnelEvent
  | typeof funnelPage
  | typeof funnelSession
  | typeof funnelWebVital
  | typeof instructorDocument
  | typeof invoice
  | typeof invoiceLineItem
  | typeof invoiceReminder
  | typeof invoiceTemplate
  | typeof location
  | typeof locationMember
  | typeof node
  | typeof organization
  | typeof pipeline
  | typeof pipelineStage
  | typeof recurringInvoice
  | typeof recurringInvoiceGeneration
  | typeof smartSection
  | typeof timeLog
  | typeof workflows;

type AdSpendTable = typeof adSpend;
type AnonymousUserProfilesTable = typeof anonymousUserProfiles;
type ClientTable = typeof client;
type ConnectionTable = typeof connection;
type DealTable = typeof deal;
type ExecutionTable = typeof execution;
type FunnelTable = typeof funnel;
type FunnelBlockTable = typeof funnelBlock;
type FunnelBreakpointTable = typeof funnelBreakpoint;
type FunnelEventTable = typeof funnelEvent;
type FunnelPageTable = typeof funnelPage;
type FunnelSessionTable = typeof funnelSession;
type FunnelWebVitalTable = typeof funnelWebVital;
type InstructorDocumentTable = typeof instructorDocument;
type InvoiceTable = typeof invoice;
type InvoiceLineItemTable = typeof invoiceLineItem;
type InvoiceReminderTable = typeof invoiceReminder;
type InvoiceTemplateTable = typeof invoiceTemplate;
type LocationTable = typeof location;
type LocationMemberTable = typeof locationMember;
type NodeTable = typeof node;
type OrganizationTable = typeof organization;
type PipelineTable = typeof pipeline;
type PipelineStageTable = typeof pipelineStage;
type RecurringInvoiceTable = typeof recurringInvoice;
type RecurringInvoiceGenerationTable = typeof recurringInvoiceGeneration;
type SmartSectionTable = typeof smartSection;
type TimeLogTable = typeof timeLog;
type WorkflowsTable = typeof workflows;
type CompatWorkflowNode = Omit<RowOf<NodeTable>, "data"> & { data: JsonValue };

type ColumnMap = Record<string, unknown>;
type JsonLike =
  | string
  | number
  | boolean
  | null
  | Date
  | JsonLike[]
  | { [key: string]: JsonLike };
type WhereInput = Record<string, unknown>;
type OrderInput = Record<string, unknown> | Array<Record<string, unknown>>;
type ModelArgs = {
  where?: WhereInput;
  data?: Record<string, unknown>;
  create?: Record<string, unknown>;
  update?: Record<string, unknown>;
  orderBy?: OrderInput;
  take?: number;
  skip?: number;
  cursor?: Record<string, unknown>;
  select?: Record<string, unknown>;
  include?: Record<string, unknown>;
  distinct?: string[];
};
type CountArgs = { where?: WhereInput };
type GroupByArgs = {
  by: string[];
  where?: WhereInput;
  orderBy?: OrderInput;
  take?: number;
  _count?: Record<string, boolean>;
  _sum?: Record<string, boolean>;
  _avg?: Record<string, boolean>;
};
type AggregateArgs = { where?: WhereInput; _sum?: Record<string, boolean> };
type DeleteArgs = { where?: WhereInput };
type UpsertArgs = ModelArgs & { create: Record<string, unknown>; update: Record<string, unknown> };

type RowOf<T> = T extends { $inferSelect: infer Row } ? Row : never;
type WriteOf<T> = T extends { $inferInsert: infer Row } ? Row : never;

type CompatRow<T> = RowOf<T> & {
  _count?: Record<string, number>;
  _sum?: Record<string, string | number | null>;
  _avg?: Record<string, string | number | null>;
  funnel: RowOf<FunnelTable>;
  funnelPage: RowOf<FunnelPageTable>[];
  funnelBlock: Array<RowOf<FunnelBlockTable> & { funnelBreakpoint: RowOf<FunnelBreakpointTable>[] }>;
  funnelBreakpoint: RowOf<FunnelBreakpointTable>[];
  smartSection?: RowOf<SmartSectionTable> | null;
  smartSectionInstance?: { smartSection?: RowOf<SmartSectionTable> | null } | null;
  client?: Pick<RowOf<ClientTable>, "id" | "name"> | null;
  location?: RowOf<LocationTable> | null;
  organization?: RowOf<OrganizationTable> | null;
  profile: RowOf<AnonymousUserProfilesTable>;
  sessions: RowOf<FunnelSessionTable>[];
  pipelineStage: RowOf<PipelineStageTable>[] & RowOf<PipelineStageTable>;
  Node: CompatWorkflowNode[];
  Connection: RowOf<ConnectionTable>[];
  instructor: { id: string; name: string; email: string | null; organizationId: string; locationId: string | null; isActive: boolean };
  invoiceTemplate?: RowOf<InvoiceTemplateTable> | null;
  invoiceLineItem: RowOf<InvoiceLineItemTable>[];
  invoiceLineItems?: Array<{ id: string; amount?: string | null; total?: string | null }>;
  invoicePayment?: Array<{ id: string; amount?: string | null }>;
  invoicePayments?: Array<{ id: string; amount?: string | null }>;
  invoiceReminder: Array<{ id: string; sentAt?: Date | null }>;
  invoiceReminders?: Array<{ id: string; sentAt?: Date | null }>;
  timeLogs?: RowOf<TimeLogTable>[];
};

type ModelDelegate<T extends Table> = {
  findMany(args?: ModelArgs): Promise<Array<CompatRow<T>>>;
  findFirst(args?: ModelArgs): Promise<CompatRow<T> | null>;
  findUnique(args?: ModelArgs): Promise<CompatRow<T> | null>;
  findUniqueOrThrow(args?: ModelArgs): Promise<CompatRow<T>>;
  create(args: ModelArgs): Promise<CompatRow<T>>;
  update(args: ModelArgs): Promise<CompatRow<T>>;
  updateMany(args: ModelArgs): Promise<{ count: number }>;
  delete(args: DeleteArgs): Promise<CompatRow<T> | null>;
  deleteMany(args?: DeleteArgs): Promise<{ count: number }>;
  upsert(args: UpsertArgs): Promise<CompatRow<T>>;
  count(args?: CountArgs): Promise<number>;
  aggregate(args?: AggregateArgs): Promise<{ _sum: Record<string, string | number | null> }>;
  groupBy(args: GroupByArgs): Promise<
    Array<
      Record<string, string> & {
        _count: Record<string, number>;
        _sum: Record<string, number | null>;
        _avg: Record<string, number | null>;
      }
    >
  >;
  createMany(args: { data: Array<Record<string, unknown>>; skipDuplicates?: boolean }): Promise<{ count: number }>;
};

type CompatDb = {
  adSpend: ModelDelegate<AdSpendTable>;
  anonymousUserProfile: ModelDelegate<AnonymousUserProfilesTable>;
  client: ModelDelegate<ClientTable>;
  connection: ModelDelegate<ConnectionTable>;
  deal: ModelDelegate<DealTable>;
  execution: ModelDelegate<ExecutionTable>;
  funnel: ModelDelegate<FunnelTable>;
  funnelBlock: ModelDelegate<FunnelBlockTable>;
  funnelBreakpoint: ModelDelegate<FunnelBreakpointTable>;
  funnelEvent: ModelDelegate<FunnelEventTable>;
  funnelPage: ModelDelegate<FunnelPageTable>;
  funnelSession: ModelDelegate<FunnelSessionTable>;
  funnelWebVital: ModelDelegate<FunnelWebVitalTable>;
  instructorDocument: ModelDelegate<InstructorDocumentTable>;
  invoice: ModelDelegate<InvoiceTable>;
  invoiceLineItem: ModelDelegate<InvoiceLineItemTable>;
  invoiceReminder: ModelDelegate<InvoiceReminderTable>;
  invoiceTemplate: ModelDelegate<InvoiceTemplateTable>;
  location: ModelDelegate<LocationTable>;
  locationMember: ModelDelegate<LocationMemberTable>;
  node: ModelDelegate<NodeTable>;
  organization: ModelDelegate<OrganizationTable>;
  pipeline: ModelDelegate<PipelineTable>;
  pipelineStage: ModelDelegate<PipelineStageTable>;
  recurringInvoice: ModelDelegate<RecurringInvoiceTable>;
  recurringInvoiceGeneration: ModelDelegate<RecurringInvoiceGenerationTable>;
  smartSection: ModelDelegate<SmartSectionTable>;
  timeLog: ModelDelegate<TimeLogTable>;
  workflows: ModelDelegate<WorkflowsTable>;
  $transaction<T>(callback: (tx: CompatDb) => Promise<T>): Promise<T>;
  $transaction<T extends readonly Promise<unknown>[]>(queries: T): Promise<{ [K in keyof T]: Awaited<T[K]> }>;
  $queryRaw<T = unknown>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  $disconnect(): Promise<void>;
};
type CompatModelKey = Exclude<keyof CompatDb, "$transaction" | "$disconnect" | "$queryRaw">;

const modelTables = {
  adSpend,
  anonymousUserProfile: anonymousUserProfiles,
  client,
  connection,
  deal,
  execution,
  funnel,
  funnelBlock,
  funnelBreakpoint,
  funnelEvent,
  funnelPage,
  funnelSession,
  funnelWebVital,
  instructorDocument,
  invoice,
  invoiceLineItem,
  invoiceReminder,
  invoiceTemplate,
  location,
  locationMember,
  node,
  organization,
  pipeline,
  pipelineStage,
  recurringInvoice,
  recurringInvoiceGeneration,
  smartSection,
  timeLog,
  workflows,
} satisfies Record<CompatModelKey, Table>;

function tableColumns(table: Table): ColumnMap {
  return table as unknown as ColumnMap;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getColumn(table: Table, key: string): unknown {
  return tableColumns(table)[key];
}

function asSqlColumn(column: unknown): Parameters<typeof eq>[0] {
  return column as Parameters<typeof eq>[0];
}

function normalizeValue(value: unknown): unknown {
  if (isRecord(value) && "increment" in value && typeof value.increment === "number") {
    return sql`${value.increment}`;
  }
  return value;
}

function buildWhere(table: Table, where?: WhereInput): SQL | undefined {
  if (!where) return undefined;

  const conditions: SQL[] = [];
  for (const [key, value] of Object.entries(where)) {
    if (key === "AND" && Array.isArray(value)) {
      const nested = value
        .map((item) => (isRecord(item) ? buildWhere(table, item) : undefined))
        .filter((item): item is SQL => Boolean(item));
      if (nested.length > 0) conditions.push(and(...nested)!);
      continue;
    }
    if (key === "OR" && Array.isArray(value)) {
      const nested = value
        .map((item) => (isRecord(item) ? buildWhere(table, item) : undefined))
        .filter((item): item is SQL => Boolean(item));
      if (nested.length > 0) conditions.push(sql.join(nested, sql` OR `));
      continue;
    }

    const column = getColumn(table, key);
    if (!column) continue;
    const sqlColumn = asSqlColumn(column);

    if (value === null) {
      conditions.push(isNull(sqlColumn));
      continue;
    }

    if (isRecord(value)) {
      if ("not" in value) {
        const notValue = value.not;
        conditions.push(notValue === null ? isNotNull(sqlColumn) : ne(sqlColumn, notValue as never));
      }
      if ("gte" in value) conditions.push(gte(sqlColumn, value.gte as never));
      if ("gt" in value) conditions.push(gt(sqlColumn, value.gt as never));
      if ("lte" in value) conditions.push(lte(sqlColumn, value.lte as never));
      if ("lt" in value) conditions.push(lt(sqlColumn, value.lt as never));
      if ("in" in value && Array.isArray(value.in)) conditions.push(inArray(sqlColumn, value.in as never[]));
      if ("notIn" in value && Array.isArray(value.notIn)) {
        conditions.push(sql`${sqlColumn} NOT IN ${value.notIn}`);
      }
      continue;
    }

    conditions.push(eq(sqlColumn, value as never));
  }

  if (conditions.length === 0) return undefined;
  return and(...conditions);
}

function buildOrder(table: Table, orderBy?: OrderInput): SQL[] {
  if (!orderBy) return [];
  const entries = Array.isArray(orderBy) ? orderBy.flatMap((item) => Object.entries(item)) : Object.entries(orderBy);
  return entries
    .map(([key, direction]) => {
      const column = getColumn(table, key);
      if (!column) return null;
      return direction === "asc" ? asc(asSqlColumn(column)) : desc(asSqlColumn(column));
    })
    .filter((item): item is SQL => Boolean(item));
}

function cleanData<T extends Table>(data: Record<string, unknown>): WriteOf<T> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) output[key] = normalizeValue(value);
  }
  return output as WriteOf<T>;
}

function delegate<T extends Table>(table: T): ModelDelegate<T> {
  const drizzleTable = table as typeof funnel;
  return {
    async findMany(args) {
      const where = buildWhere(table, args?.where);
      const order = buildOrder(table, args?.orderBy);
      let query = db.select().from(drizzleTable).$dynamic();
      if (where) query = query.where(where);
      if (order.length > 0) query = query.orderBy(...order);
      if (typeof args?.skip === "number") query = query.offset(args.skip);
      if (typeof args?.take === "number") query = query.limit(args.take);
      const rows = await query;
      return rows as unknown as Array<CompatRow<T>>;
    },
    async findFirst(args) {
      const rows = await this.findMany({ ...args, take: 1 });
      return rows[0] ?? null;
    },
    async findUnique(args) {
      return this.findFirst(args);
    },
    async findUniqueOrThrow(args) {
      const row = await this.findFirst(args);
      if (!row) throw new Error("Record not found");
      return row;
    },
    async create(args) {
      const [row] = await db
        .insert(drizzleTable)
        .values(cleanData<T>(args.data ?? {}) as unknown as typeof funnel.$inferInsert)
        .returning();
      return row as unknown as CompatRow<T>;
    },
    async update(args) {
      const where = buildWhere(table, args.where);
      const [row] = await db
        .update(drizzleTable)
        .set(cleanData<T>(args.data ?? {}) as unknown as Partial<typeof funnel.$inferInsert>)
        .where(where)
        .returning();
      return row as unknown as CompatRow<T>;
    },
    async updateMany(args) {
      const where = buildWhere(table, args.where);
      const rows = await db
        .update(drizzleTable)
        .set(cleanData<T>(args.data ?? {}) as unknown as Partial<typeof funnel.$inferInsert>)
        .where(where)
        .returning();
      return { count: rows.length };
    },
    async delete(args) {
      const where = buildWhere(table, args.where);
      const [row] = await db.delete(drizzleTable).where(where).returning();
      return (row as unknown as CompatRow<T> | undefined) ?? null;
    },
    async deleteMany(args) {
      const where = buildWhere(table, args?.where);
      const rows = await db.delete(drizzleTable).where(where).returning();
      return { count: rows.length };
    },
    async upsert(args) {
      const existing = await this.findFirst({ where: args.where });
      if (existing) {
        return this.update({ where: args.where, data: args.update });
      }
      return this.create({ data: args.create });
    },
    async count(args) {
      const where = buildWhere(table, args?.where);
      const [row] = await db
        .select({ value: count() })
        .from(drizzleTable)
        .where(where);
      return row?.value ?? 0;
    },
    async aggregate(args) {
      const where = buildWhere(table, args?.where);
      const fields = Object.keys(args?._sum ?? {});
      const selected = Object.fromEntries(
        fields.map((field) => {
          const column = getColumn(table, field);
          return [field, column ? sql<string | number | null>`sum(${asSqlColumn(column)})` : sql<null>`null`];
        }),
      );
      const [row] = await db.select(selected as Record<string, SQL>).from(drizzleTable).where(where);
      return { _sum: (row ?? {}) as Record<string, string | number | null> };
    },
    async groupBy(args) {
      const where = buildWhere(table, args.where);
      const selected = Object.fromEntries(
        args.by.map((field) => {
          const column = getColumn(table, field);
          return [field, column ? asSqlColumn(column) : sql<null>`null`];
        }),
      );
      let query = db.select(selected as Record<string, SQL>).from(drizzleTable).$dynamic();
      if (where) query = query.where(where);
      const groupColumns = args.by
        .map((field) => getColumn(table, field))
        .filter((column): column is unknown => Boolean(column))
        .map((column) => asSqlColumn(column));
      if (groupColumns.length > 0) {
        query = query.groupBy(...(groupColumns as Parameters<typeof query.groupBy>));
      }
      const rows = await query;
      return rows as unknown as Array<
        Record<string, string> & {
          _count: Record<string, number>;
          _sum: Record<string, number | null>;
          _avg: Record<string, number | null>;
        }
      >;
    },
    async createMany(args) {
      if (args.data.length === 0) return { count: 0 };
      const rows = await db
        .insert(drizzleTable)
        .values(args.data.map((item) => cleanData<T>(item)) as unknown as Array<typeof funnel.$inferInsert>)
        .returning();
      return { count: rows.length };
    },
  };
}

const compat = Object.fromEntries(
  Object.entries(modelTables).map(([name, table]) => [name, delegate(table)]),
) as unknown as Omit<CompatDb, "$transaction" | "$disconnect" | "$queryRaw">;

export const legacyDb: CompatDb = {
  ...compat,
  async $transaction<T>(input: ((tx: CompatDb) => Promise<T>) | Promise<T>[]) {
    if (Array.isArray(input)) {
      return Promise.all(input);
    }
    return db.transaction(async () => input(legacyDb));
  },
  async $queryRaw<T = unknown>() {
    return [] as T;
  },
  async $disconnect() {
    await dbPool.end();
  },
};

export default legacyDb;
