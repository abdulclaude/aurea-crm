import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const googleFormTriggerConfigSchema = z.object({
  variableName: z
    .string()
    .trim()
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/)
    .default("googleForm"),
  webhookSecret: z.string().min(32).max(200),
});

export const googleFormPayloadSchema = z
  .object({
    formId: z.unknown().optional(),
    formTitle: z.unknown().optional(),
    responseId: z.unknown().optional(),
    timestamp: z.unknown().optional(),
    respondentEmail: z.unknown().optional(),
    responses: z.unknown().optional(),
  })
  .passthrough();

export function googleFormWebhookSecretMatches(
  provided: string,
  expected: string,
): boolean {
  const providedHash = createHash("sha256").update(provided).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(providedHash, expectedHash);
}

export function googleFormWebhookEventId(
  workflowId: string,
  rawBody: string,
): string {
  const digest = createHash("sha256")
    .update(workflowId)
    .update("\u0000")
    .update(rawBody)
    .digest("hex");
  return `google-form:${digest}`;
}
