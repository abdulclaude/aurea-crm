import "server-only";

import { createHash } from "node:crypto";

import type { db } from "@/db";
import { demoDataRecord } from "@/db/schema";
import type {
  DemoDataProfile,
  DemoDataProfileConfig,
} from "@/features/demo-data/contracts";

export type DemoDataTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

export type DemoSeedContext = {
  organizationId: string;
  locationId: string;
  actorUserId: string;
  currency: string;
  timezone: string;
  referenceDate: Date;
  runId: string;
  profile: DemoDataProfile;
  profileConfig: DemoDataProfileConfig;
};

export type DemoRecordRef = {
  recordType: string;
  recordId: string;
};

export type DemoPackResult = {
  counts: Record<string, number>;
  records: DemoRecordRef[];
};

export function deterministicDemoId(
  runId: string,
  kind: string,
  index: string | number,
): string {
  const hex = createHash("sha256")
    .update(`${runId}:${kind}:${index}`)
    .digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function demoMetadata(
  context: Pick<DemoSeedContext, "runId" | "profile">,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    source: "aurea-demo-data",
    demoRunId: context.runId,
    demoProfile: context.profile,
    ...extra,
  };
}

export function recordRefs(
  recordType: string,
  rows: ReadonlyArray<{ id: string }>,
): DemoRecordRef[] {
  return rows.map((row) => ({ recordType, recordId: row.id }));
}

export function mergePackResults(
  results: readonly DemoPackResult[],
): DemoPackResult {
  return {
    counts: Object.assign({}, ...results.map((result) => result.counts)),
    records: results.flatMap((result) => result.records),
  };
}

export async function insertDemoRecordRegistry(
  tx: DemoDataTransaction,
  runId: string,
  records: readonly DemoRecordRef[],
): Promise<void> {
  const uniqueRecords = [
    ...new Map(
      records.map((record) => [
        `${record.recordType}:${record.recordId}`,
        record,
      ]),
    ).values(),
  ];
  for (let offset = 0; offset < uniqueRecords.length; offset += 500) {
    const chunk = uniqueRecords.slice(offset, offset + 500);
    await tx.insert(demoDataRecord).values(
      chunk.map((record) => ({
        id: deterministicDemoId(
          runId,
          "demo-record",
          `${record.recordType}:${record.recordId}`,
        ),
        runId,
        recordType: record.recordType,
        recordId: record.recordId,
      })),
    );
  }
}
