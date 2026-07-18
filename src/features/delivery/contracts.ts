export const DELIVERY_CHANNELS = ["EMAIL", "SMS", "APP"] as const;
export type DeliveryChannel = (typeof DELIVERY_CHANNELS)[number];

// Voice calls have their own runtime and ledger, but share the persisted channel
// enum so operational read models can report them without treating them as outbox
// deliveries.
export const STORED_COMMUNICATION_CHANNELS = [
  "EMAIL",
  "SMS",
  "VOICE",
  "APP",
] as const;
export type StoredCommunicationChannel =
  (typeof STORED_COMMUNICATION_CHANNELS)[number];

export function isDeliveryChannel(
  channel: StoredCommunicationChannel,
): channel is DeliveryChannel {
  return channel !== "VOICE";
}

export const DELIVERY_PURPOSES = [
  "MARKETING",
  "TRANSACTIONAL",
  "ONE_TO_ONE",
  "SYSTEM",
] as const;
export type DeliveryPurpose = (typeof DELIVERY_PURPOSES)[number];

export const DELIVERY_PROVIDERS = [
  "RESEND",
  "GMAIL",
  "OUTLOOK",
  "TWILIO",
  "VONAGE",
  "MESSAGEBIRD",
  "INTERNAL",
] as const;
export type DeliveryProvider = (typeof DELIVERY_PROVIDERS)[number];

export const OUTBOUND_DELIVERY_STATUSES = [
  "QUEUED",
  "SENDING",
  "ACCEPTED",
  "DELIVERED",
  "BOUNCED",
  "SUPPRESSED",
  "CANCELLED",
  "DEAD_LETTER",
  "UNKNOWN",
] as const;
export type OutboundDeliveryStatus =
  (typeof OUTBOUND_DELIVERY_STATUSES)[number];

export const COMMUNICATION_SUPPRESSION_SCOPES = ["MARKETING", "ALL"] as const;
export type CommunicationSuppressionScope =
  (typeof COMMUNICATION_SUPPRESSION_SCOPES)[number];

export const PROVIDER_EVENT_KINDS = [
  "SENT",
  "ACCEPTED",
  "DELIVERED",
  "BOUNCED",
  "DELAYED",
  "OPENED",
  "CLICKED",
  "READ",
  "COMPLAINED",
] as const;
export type ProviderEventKind = (typeof PROVIDER_EVENT_KINDS)[number];
