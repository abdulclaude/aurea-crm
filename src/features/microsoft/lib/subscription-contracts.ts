import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { z } from "zod";

export const MAX_MICROSOFT_NOTIFICATION_BYTES = 262_144;

export const microsoftValidationTokenSchema = z.string().min(1).max(4_096);

export const microsoftResourceDataSchema = z
  .object({
    id: z.string().min(1).max(512).optional(),
    "@odata.id": z.string().min(1).max(2_048).optional(),
    "@odata.etag": z.string().min(1).max(1_024).optional(),
    "@odata.type": z.string().min(1).max(512).optional(),
  })
  .passthrough();

export const microsoftChangeNotificationSchema = z
  .object({
    id: z.string().min(1).max(512).optional(),
    subscriptionId: z.string().min(1).max(512),
    subscriptionExpirationDateTime: z.string().max(128).optional(),
    clientState: z.string().min(1).max(255),
    changeType: z.string().min(1).max(128),
    resource: z.string().min(1).max(4_096),
    tenantId: z.string().min(1).max(512).optional(),
    resourceData: microsoftResourceDataSchema.optional(),
  })
  .passthrough();

export const microsoftChangeNotificationCollectionSchema = z.object({
  value: z.array(microsoftChangeNotificationSchema).max(1_000),
});

export type MicrosoftChangeNotification = z.infer<
  typeof microsoftChangeNotificationSchema
>;

export type MicrosoftVerifiedChangeNotification = {
  id?: string;
  subscriptionId: string;
  subscriptionExpirationDateTime?: string;
  changeType: string;
  resource: string;
  tenantId?: string;
  resourceData?: z.infer<typeof microsoftResourceDataSchema>;
};

export type MicrosoftSubscriptionKind = "outlook" | "onedrive";

export type MicrosoftSubscriptionScope = {
  organizationId: string;
  locationId: string | null;
  providerAccountId: string;
  userId?: string | null;
};

export type MicrosoftSubscriptionSyncInput = Omit<
  MicrosoftSubscriptionScope,
  "providerAccountId"
> & {
  providerAccountId?: string | null;
};

export function generateMicrosoftClientState(): string {
  return randomBytes(32).toString("base64url");
}

export function hashMicrosoftClientState(clientState: string): string {
  return createHash("sha256").update(clientState).digest("hex");
}

export function microsoftClientStateMatches(
  clientState: string,
  expectedHash: string,
): boolean {
  if (!/^[a-f0-9]{64}$/i.test(expectedHash)) return false;

  const actual = Buffer.from(hashMicrosoftClientState(clientState), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function buildMicrosoftNotificationId(
  kind: MicrosoftSubscriptionKind,
  notification: MicrosoftVerifiedChangeNotification,
): string {
  const identity = [
    notification.subscriptionId,
    notification.id ?? "",
    notification.changeType,
    notification.resource,
    notification.resourceData?.id ?? "",
    notification.resourceData?.["@odata.id"] ?? "",
    notification.resourceData?.["@odata.etag"] ?? "",
  ].join("\u001f");
  const digest = createHash("sha256").update(identity).digest("hex");
  return `microsoft:${kind}:${digest}`;
}
