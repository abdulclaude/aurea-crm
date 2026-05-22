import { UTApi } from "uploadthing/server";

import type { UploadedImportFile } from "@/features/studio/import/lib/mindbody-csv";

export type UploadThingDeleteResult = {
  keys: string[];
  deletedCount: number;
};

type UploadThingFileReference = Pick<
  UploadedImportFile,
  "url" | "uploadKey" | "zipSourceUrl"
> & {
  key?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function uploadThingKeyFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    if (!hostname.endsWith("utfs.io") && !hostname.includes("uploadthing")) {
      return null;
    }

    const key = parsed.pathname.split("/").filter(Boolean).at(-1);
    return key ? decodeURIComponent(key) : null;
  } catch {
    return null;
  }
}

export function uploadedFilesFromImportConfig(
  importConfig: unknown,
): UploadThingFileReference[] {
  if (!isRecord(importConfig) || !Array.isArray(importConfig.files)) return [];

  return importConfig.files.flatMap((file) => {
    if (!isRecord(file)) return [];
    const url = stringValue(file, "url");
    if (!url) return [];

    return [
      {
        url,
        uploadKey: stringValue(file, "uploadKey"),
        key: stringValue(file, "key"),
        zipSourceUrl: stringValue(file, "zipSourceUrl"),
      },
    ];
  });
}

export async function deleteUploadThingFiles(
  files: UploadThingFileReference[],
): Promise<UploadThingDeleteResult> {
  const keys = Array.from(
    new Set(
      files.flatMap((file) => {
        const explicitKey = file.uploadKey ?? file.key;
        const sourceKey = file.zipSourceUrl
          ? uploadThingKeyFromUrl(file.zipSourceUrl)
          : null;
        const urlKey = uploadThingKeyFromUrl(file.url);
        return [explicitKey, sourceKey, urlKey].filter(
          (key): key is string => Boolean(key),
        );
      }),
    ),
  );

  if (keys.length === 0) {
    return { keys: [], deletedCount: 0 };
  }

  const result = await new UTApi().deleteFiles(keys);
  if (!result.success) {
    throw new Error("UploadThing did not delete the requested files.");
  }

  return { keys, deletedCount: result.deletedCount };
}
