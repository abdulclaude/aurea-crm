export function formatOperationDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function humanizeOperationLabel(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (character) => character.toUpperCase());
}

export function compactProviderId(value: string | null): string {
  if (!value) return "-";
  if (value.length <= 24) return value;
  return `${value.slice(0, 12)}...${value.slice(-8)}`;
}

export function formatIssueDetails(value: Record<string, unknown>): string {
  return Object.entries(value)
    .map(([key, detail]) => {
      const display =
        typeof detail === "string" || typeof detail === "number"
          ? String(detail)
          : JSON.stringify(detail);
      return `${humanizeOperationLabel(key)}: ${display}`;
    })
    .join(", ");
}
