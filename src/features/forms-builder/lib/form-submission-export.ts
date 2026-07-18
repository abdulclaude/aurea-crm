export type FormSubmissionExportField = { id: string; label: string };

export type FormSubmissionExportRow = {
  id: string;
  submittedAt: Date;
  retentionExpiresAt: Date | null;
  utmSource: string | null;
  utmCampaign: string | null;
  client: { name: string; email: string | null } | null;
  data: unknown;
};

export function buildFormSubmissionCsv(input: {
  fields: readonly FormSubmissionExportField[];
  rows: readonly FormSubmissionExportRow[];
}): string {
  const header = [
    "Submission ID",
    "Submitted at",
    "Retention expires at",
    "Client name",
    "Client email",
    "Source",
    "Campaign",
    ...input.fields.map((field) => `${field.label} [${field.id}]`),
  ];
  const lines = [header.map(csvCell).join(",")];
  for (const row of input.rows) {
    const values = responseValues(row.data);
    lines.push(
      [
        row.id,
        row.submittedAt.toISOString(),
        row.retentionExpiresAt?.toISOString() ?? "",
        row.client?.name ?? "",
        row.client?.email ?? "",
        row.utmSource ?? "",
        row.utmCampaign ?? "",
        ...input.fields.map((field) => serializeValue(values[field.id])),
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return `${lines.join("\r\n")}\r\n`;
}

function responseValues(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function serializeValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function csvCell(value: string): string {
  const protectedValue = /^[\t\r\n ]*[=+@-]/.test(value) ? `'${value}` : value;
  return `"${protectedValue.replaceAll('"', '""')}"`;
}
