import {
  faqCollectionPayloadSchema,
  messageMacroPayloadSchema,
  terminologyPackPayloadSchema,
  type ContentLibraryPayload,
} from "@/features/content-settings/contracts";

export type TerminologyDictionary = Record<
  string,
  { label: string; pluralLabel: string }
>;

export function buildTerminologyDictionary(
  payload: unknown,
): TerminologyDictionary {
  const parsed = terminologyPackPayloadSchema.parse(payload);
  return Object.fromEntries(
    parsed.terms.map((term) => [
      term.key,
      { label: term.label, pluralLabel: term.pluralLabel },
    ]),
  );
}

export function visibleFaqEntries(payload: unknown) {
  return faqCollectionPayloadSchema
    .parse(payload)
    .entries.filter((entry) => entry.isVisible)
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export function macroIsAvailable(input: {
  payload: unknown;
  channel: "EMAIL" | "SMS" | "INBOX";
}): boolean {
  const macro = messageMacroPayloadSchema.parse(input.payload);
  return macro.isActive &&
    (macro.channel === "ALL" || macro.channel === input.channel);
}

export function cloneContentPayload(
  payload: ContentLibraryPayload,
): ContentLibraryPayload {
  return structuredClone(payload);
}

export function selectScopedOverride<T extends { locationId: string | null }>(
  candidates: readonly T[],
  locationId: string | null,
): T | null {
  if (locationId) {
    const location = candidates.find(
      (candidate) => candidate.locationId === locationId,
    );
    if (location) return location;
  }
  return candidates.find((candidate) => candidate.locationId === null) ?? null;
}

export function mergeScopedOverrides<
  T extends { key: string; locationId: string | null },
>(candidates: readonly T[], locationId: string | null): T[] {
  const byKey = new Map<string, T>();
  for (const candidate of candidates) {
    const existing = byKey.get(candidate.key);
    if (
      !existing ||
      (locationId !== null && candidate.locationId === locationId)
    ) {
      byKey.set(candidate.key, candidate);
    }
  }
  return [...byKey.values()];
}
