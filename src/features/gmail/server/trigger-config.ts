import { z } from "zod";

import type { GmailTriggerConfig } from "./messages";
import type { GmailTriggerNode } from "./subscription-store";

const gmailTriggerConfigSchema = z.object({
  variableName: z.string().optional(),
  labelId: z.string().optional(),
  query: z.string().optional(),
  includeSpamTrash: z.boolean().optional(),
  maxResults: z.number().optional(),
});

export function parseGmailTriggerConfig(value: unknown): GmailTriggerConfig {
  const parsed = gmailTriggerConfigSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

export function gmailTriggerVariableName(value?: string | null): string {
  if (!value) return "gmailTrigger";
  const trimmed = value.trim();
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)
    ? trimmed
    : "gmailTrigger";
}

export function gmailTriggerLabelSet(nodes: GmailTriggerNode[]): string[] {
  return Array.from(
    new Set(
      nodes.map(
        (node) => parseGmailTriggerConfig(node.data).labelId?.trim() || "INBOX",
      ),
    ),
  );
}
