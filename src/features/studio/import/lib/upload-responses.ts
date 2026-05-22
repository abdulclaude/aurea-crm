type UploadResponseRecord = {
  url?: string;
  ufsUrl?: string;
  key?: string;
  fileKey?: string;
  serverData?: {
    url?: string;
    ufsUrl?: string;
    uploadKey?: string;
    key?: string;
    fileKey?: string;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function uploadUrl(value: unknown): string {
  if (!isRecord(value)) return "";
  const record = value as UploadResponseRecord;
  return (
    record.ufsUrl ||
    record.url ||
    record.serverData?.ufsUrl ||
    record.serverData?.url ||
    ""
  );
}

export function uploadKey(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  const record = value as UploadResponseRecord;
  return (
    record.key ||
    record.fileKey ||
    record.serverData?.uploadKey ||
    record.serverData?.key ||
    record.serverData?.fileKey
  );
}
