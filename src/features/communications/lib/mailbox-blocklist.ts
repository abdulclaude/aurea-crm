import { z } from "zod";

const domainSchema = z
  .string()
  .min(3)
  .max(253)
  .regex(/^(?=.{3,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/);

export function normalizeMailboxBlocklistValue(
  matchType: "ADDRESS" | "DOMAIN",
  value: string,
): string {
  const normalized = value.trim().toLowerCase();
  if (matchType === "ADDRESS") {
    return z.string().email().parse(normalized);
  }
  return domainSchema.parse(normalized.replace(/^@/, ""));
}

export function mailboxEntryMatchesSender(
  entry: { matchType: "ADDRESS" | "DOMAIN"; valueNormalized: string },
  sender: string,
): boolean {
  const normalizedSender = z.string().email().safeParse(sender.trim().toLowerCase());
  if (!normalizedSender.success) return false;
  if (entry.matchType === "ADDRESS") {
    return normalizedSender.data === entry.valueNormalized;
  }
  return normalizedSender.data.split("@")[1] === entry.valueNormalized;
}
