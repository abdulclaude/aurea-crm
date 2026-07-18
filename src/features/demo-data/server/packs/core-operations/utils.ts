import { createHash } from "node:crypto";

import type { DemoSeedContext } from "@/features/demo-data/server/types";

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
) {
  return rows.map((row) => ({ recordType, recordId: row.id }));
}

export function chunk<T>(rows: readonly T[], size = 200): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    result.push(rows.slice(index, index + size));
  }
  return result;
}

export function money(minor: number): string {
  if (!Number.isSafeInteger(minor)) {
    throw new RangeError("Demo money must use integer minor units.");
  }
  const sign = minor < 0 ? "-" : "";
  const absolute = Math.abs(minor);
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
}

export function minorUnits(value: string | number): number {
  const normalized = String(value);
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) throw new RangeError(`Invalid demo money value: ${normalized}`);
  const cents = Number(`${match[2]}${(match[3] ?? "").padEnd(2, "0")}`);
  return match[1] === "-" ? -cents : cents;
}

export function utcDay(
  reference: Date,
  dayOffset: number,
  hour = 9,
  minute = 0,
): Date {
  return new Date(
    Date.UTC(
      reference.getUTCFullYear(),
      reference.getUTCMonth(),
      reference.getUTCDate() + dayOffset,
      hour,
      minute,
    ),
  );
}

export function monthPeriod(reference: Date, monthOffset: number) {
  const start = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + monthOffset, 1),
  );
  const end = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + monthOffset + 1, 1) - 1,
  );
  const paymentDate = new Date(
    Date.UTC(
      reference.getUTCFullYear(),
      reference.getUTCMonth() + monthOffset + 1,
      5,
      12,
    ),
  );
  return { start, end, paymentDate };
}

export function rateMinor(index: number): number {
  return 2_400 + (index % 6) * 250;
}

export function rotaOffsets(total: number): number[] {
  const offsets = [0];
  for (let step = 1; offsets.length < total; step += 1) {
    offsets.push(step);
    if (offsets.length < total) offsets.push(-step);
  }
  return offsets;
}
