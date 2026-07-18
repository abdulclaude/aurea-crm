export function formatAutomationLabel(value: string): string {
  return value
    .replace(/_TRIGGER$/, "")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
