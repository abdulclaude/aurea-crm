import { z } from "zod";

export const ROUTE_QA_COMPLETED_STORAGE_KEY =
  "aurea-route-qa-completed-v1";
export const ROUTE_QA_NOTES_STORAGE_KEY = "aurea-route-qa-notes-v1";
export const ROUTE_QA_NOTE_MAX_LENGTH = 4_000;

const notesEnvelopeSchema = z.object({
  version: z.literal(1),
  notes: z.record(z.string(), z.unknown()),
});

export function parseRouteQaCompleted(value: string | null): string[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    const result = z.array(z.unknown()).safeParse(parsed);
    if (!result.success) return [];
    return result.data.filter(
      (item): item is string => typeof item === "string",
    );
  } catch {
    return [];
  }
}

export function parseRouteQaNotes(
  value: string | null,
): Record<string, string> {
  if (!value) return {};

  try {
    const parsed: unknown = JSON.parse(value);
    const result = notesEnvelopeSchema.safeParse(parsed);
    if (!result.success) return {};

    return Object.fromEntries(
      Object.entries(result.data.notes).filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === "string" &&
          entry[1].trim().length > 0 &&
          entry[1].length <= ROUTE_QA_NOTE_MAX_LENGTH,
      ),
    );
  } catch {
    return {};
  }
}

export function serializeRouteQaNotes(
  notes: Readonly<Record<string, string>>,
): string {
  return JSON.stringify({ version: 1, notes });
}

export function writeRouteQaStorage(
  storage: Pick<Storage, "setItem">,
  key: string,
  value: string,
): boolean {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function readRouteQaStorage(
  storage: Pick<Storage, "getItem">,
  key: string,
): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}
