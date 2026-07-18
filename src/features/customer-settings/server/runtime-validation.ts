import { TRPCError } from "@trpc/server";

import type {
  CustomerFieldDefinitionValues,
  HouseholdSharingPolicyValues,
} from "@/features/customer-settings/contracts";

export type ActiveCustomerFieldDefinition = Pick<
  CustomerFieldDefinitionValues,
  "key" | "label" | "fieldType" | "isRequired" | "options"
>;

export type ActiveCustomerTagDefinition = { name: string };
export type CustomerFieldValue = string | number | boolean | string[];
export type CustomerFieldValues = Record<string, CustomerFieldValue>;

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function existingCustomerFields(metadata: unknown): CustomerFieldValues {
  const raw = asObject(asObject(metadata).customerFields);
  const values: CustomerFieldValues = {};
  for (const [key, value] of Object.entries(raw)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      (Array.isArray(value) && value.every((item) => typeof item === "string"))
    ) {
      values[key] = value;
    }
  }
  return values;
}

function badField(label: string, message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message: `${label}: ${message}` });
}

function canonicalOption(
  value: unknown,
  definition: ActiveCustomerFieldDefinition,
): string {
  if (typeof value !== "string") {
    return badField(definition.label, "select a valid option.");
  }
  const normalized = value.trim().toLowerCase();
  const option = definition.options.find(
    (candidate) => candidate.toLowerCase() === normalized,
  );
  return option ?? badField(definition.label, "select a valid option.");
}

function coerceFieldValue(
  value: unknown,
  definition: ActiveCustomerFieldDefinition,
): CustomerFieldValue | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  switch (definition.fieldType) {
    case "TEXT":
      return typeof value === "string"
        ? value.trim()
        : badField(definition.label, "enter text.");
    case "NUMBER": {
      const numberValue =
        typeof value === "number"
          ? value
          : typeof value === "string" && value.trim() !== ""
            ? Number(value)
            : Number.NaN;
      return Number.isFinite(numberValue)
        ? numberValue
        : badField(definition.label, "enter a valid number.");
    }
    case "DATE": {
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return badField(definition.label, "use a date in YYYY-MM-DD format.");
      }
      const parsed = new Date(`${value}T00:00:00.000Z`);
      return !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === value
        ? value
        : badField(definition.label, "enter a valid calendar date.");
    }
    case "BOOLEAN":
      if (typeof value === "boolean") return value;
      if (value === "true") return true;
      if (value === "false") return false;
      return badField(definition.label, "choose true or false.");
    case "SELECT":
      return canonicalOption(value, definition);
    case "MULTI_SELECT":
      if (!Array.isArray(value)) {
        return badField(definition.label, "select one or more valid options.");
      }
      return Array.from(
        new Set(value.map((item) => canonicalOption(item, definition))),
      );
  }
}

export function applyCustomerFieldWrite(input: {
  metadata: unknown;
  patch: Record<string, unknown>;
  definitions: ActiveCustomerFieldDefinition[];
  requireAllRequired: boolean;
}): JsonObject {
  const metadata = asObject(input.metadata);
  const definitionsByKey = new Map(
    input.definitions.map((definition) => [definition.key, definition]),
  );
  const unknownKeys = Object.keys(input.patch).filter(
    (key) => !definitionsByKey.has(key),
  );
  if (unknownKeys.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Unknown or archived customer fields: ${unknownKeys.join(", ")}`,
    });
  }

  const customerFields = existingCustomerFields(metadata);
  for (const [key, value] of Object.entries(input.patch)) {
    const definition = definitionsByKey.get(key);
    if (!definition) continue;
    const coerced = coerceFieldValue(value, definition);
    if (coerced === undefined) delete customerFields[key];
    else customerFields[key] = coerced;
  }

  if (input.requireAllRequired) {
    const missing = input.definitions.filter((definition) => {
      if (!definition.isRequired) return false;
      const value = customerFields[definition.key];
      return (
        value === undefined ||
        value === "" ||
        (Array.isArray(value) && value.length === 0)
      );
    });
    if (missing.length > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Required customer fields are missing: ${missing
          .map((definition) => definition.label)
          .join(", ")}`,
      });
    }
  }

  const priorLegacy = asObject(metadata.legacy);
  const nonObjectLegacy =
    input.metadata !== null &&
    input.metadata !== undefined &&
    (typeof input.metadata !== "object" || Array.isArray(input.metadata))
      ? { value: input.metadata }
      : {};
  const topLevelLegacy = Object.fromEntries(
    Object.entries(metadata).filter(
      ([key]) => key !== "customerFields" && key !== "legacy",
    ),
  );
  const legacy = { ...nonObjectLegacy, ...topLevelLegacy, ...priorLegacy };

  return { ...topLevelLegacy, customerFields, legacy };
}

export function canonicalizeCustomerTags(
  requestedTags: string[],
  definitions: ActiveCustomerTagDefinition[],
): string[] {
  const definitionsByName = new Map(
    definitions.map((definition) => [
      definition.name.trim().toLowerCase(),
      definition.name,
    ]),
  );
  const canonical: string[] = [];
  const unknown: string[] = [];
  for (const requested of requestedTags) {
    const match = definitionsByName.get(requested.trim().toLowerCase());
    if (!match) unknown.push(requested);
    else if (!canonical.includes(match)) canonical.push(match);
  }
  if (unknown.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Unknown or archived customer tags: ${unknown.join(", ")}`,
    });
  }
  return canonical;
}

export function validateHouseholdRelationship(
  relationship: string | undefined,
  policy: HouseholdSharingPolicyValues,
): string | null {
  if (!relationship?.trim()) return null;
  const key = relationship.trim();
  if (!policy.relationships.some((definition) => definition.key === key)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Unknown household relationship: ${key}`,
    });
  }
  return key;
}
