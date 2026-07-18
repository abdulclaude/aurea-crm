import { NonRetriableError } from "inngest";

const UNSAFE_HEADER_CHARACTER = /[\r\n\0]/;

export function safeGmailHeaderValue(
  label: string,
  value: string,
): string {
  const normalized = value.trim();
  if (!normalized || UNSAFE_HEADER_CHARACTER.test(normalized)) {
    throw new NonRetriableError(`${label} contains an invalid email header value.`);
  }
  return normalized;
}

export function optionalSafeGmailHeaderValue(
  label: string,
  value: string | undefined,
): string | undefined {
  if (!value?.trim()) return undefined;
  return safeGmailHeaderValue(label, value);
}

export function formatGmailAddressList(
  label: string,
  value: string | undefined,
): string | undefined {
  const safeValue = optionalSafeGmailHeaderValue(label, value);
  if (!safeValue) return undefined;
  return safeValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .join(", ");
}

export function formatGmailFromHeader(
  displayName: string | undefined,
  email: string,
): string {
  const safeEmail = safeGmailHeaderValue("Sender email", email);
  const safeDisplayName = optionalSafeGmailHeaderValue(
    "Sender name",
    displayName,
  );
  if (!safeDisplayName) return `From: ${safeEmail}`;
  const quotedName = safeDisplayName
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
  return `From: "${quotedName}" <${safeEmail}>`;
}
