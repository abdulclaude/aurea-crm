import { createHash } from "node:crypto";

export type PublicationJsonValue =
  | string
  | number
  | boolean
  | null
  | PublicationJsonValue[]
  | { [key: string]: PublicationJsonValue };

export function canonicalPublicationValue(
  value: unknown,
): PublicationJsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(
        "Publication snapshots cannot contain non-finite numbers.",
      );
    }
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(canonicalPublicationValue);
  }

  if (typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    const result: { [key: string]: PublicationJsonValue } = {};
    for (const [key, entryValue] of entries) {
      result[key] = canonicalPublicationValue(entryValue);
    }
    return result;
  }

  throw new TypeError(
    `Unsupported publication snapshot value: ${typeof value}`,
  );
}

export function canonicalPublicationJson(value: unknown): string {
  return JSON.stringify(canonicalPublicationValue(value));
}

export function createPublicationContentHash(value: unknown): string {
  return createHash("sha256")
    .update(canonicalPublicationJson(value), "utf8")
    .digest("hex");
}
