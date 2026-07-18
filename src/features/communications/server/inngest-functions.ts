import { processDueCommunicationProvisioning } from "@/features/communications/server/provisioning";
import { inngest } from "@/inngest/client";
import {
  processManagedResendReceipt,
  recoverManagedResendReceipts,
} from "./resend-webhook-receipts";
import {
  processTwilioWebhookReceipt,
  recoverTwilioWebhookReceipts,
} from "./twilio-webhook-processor";
import { dispatchVoiceCall, recoverVoiceCalls } from "./voice-call-service";
import {
  purgeExpiredVoiceRecordings,
  reconcileAmbiguousVoiceCalls,
  reconcileVoiceCosts,
} from "./voice-reconciliation";
import { purgeExpiredCommunicationReceipts } from "./webhook-retention";
import {
  markStaleEmailDomains,
  reconcileResendPlatformHealth,
  recoverUnknownResendDeliveries,
  projectCommunicationChannelHealth,
  reconcileTwilioInboundSmsCosts,
  reconcileTwilioResources,
  reconcileTwilioSmsCosts,
} from "./health-reconciliation";
import { reconcileExpiredCommunicationEntitlements } from "./profile-service";

export const provisionCommunications = inngest.createFunction(
  {
    id: "provision-communications",
    retries: 0,
    concurrency: { limit: 2 },
  },
  { event: "communications/provisioning.requested" },
  async ({ event, step }) => {
    const organizationId =
      typeof event.data.organizationId === "string"
        ? event.data.organizationId
        : undefined;
    return step.run("process-due-communications-provisioning", () =>
      processDueCommunicationProvisioning({ organizationId }),
    );
  },
);

export const reconcileCommunicationsProvisioning = inngest.createFunction(
  { id: "reconcile-communications-provisioning", retries: 0 },
  { cron: "*/5 * * * *" },
  async ({ step }) =>
    step.run("recover-and-process-communications-provisioning", () =>
      processDueCommunicationProvisioning(),
    ),
);

export const reconcileCommunicationEntitlements = inngest.createFunction(
  { id: "reconcile-communication-entitlements", retries: 2 },
  { cron: "23 * * * *" },
  async ({ step }) =>
    step.run("expire-canceled-communication-entitlements", () =>
      reconcileExpiredCommunicationEntitlements(),
    ),
);

export const processManagedResendWebhook = inngest.createFunction(
  { id: "process-managed-resend-webhook", retries: 4 },
  { event: "communications/resend-webhook.received" },
  async ({ event, step }) => {
    if (typeof event.data.receiptId !== "string") {
      return { status: "INVALID_EVENT" };
    }
    return step.run("process-managed-resend-receipt", () =>
      processManagedResendReceipt(event.data.receiptId),
    );
  },
);

export const recoverManagedResendWebhooks = inngest.createFunction(
  { id: "recover-managed-resend-webhooks", retries: 0 },
  { cron: "*/5 * * * *" },
  async ({ step }) =>
    step.run("recover-managed-resend-receipts", () =>
      recoverManagedResendReceipts(),
    ),
);

export const processTwilioWebhook = inngest.createFunction(
  { id: "process-twilio-webhook", retries: 4 },
  { event: "communications/twilio-webhook.received" },
  async ({ event, step }) => {
    if (typeof event.data.receiptId !== "string") {
      return { status: "INVALID_EVENT" };
    }
    return step.run("process-twilio-webhook-receipt", () =>
      processTwilioWebhookReceipt(event.data.receiptId),
    );
  },
);

export const recoverTwilioWebhooks = inngest.createFunction(
  { id: "recover-twilio-webhooks", retries: 0 },
  { cron: "*/5 * * * *" },
  async ({ step }) =>
    step.run("recover-twilio-webhook-receipts", () =>
      recoverTwilioWebhookReceipts(),
    ),
);

export const processVoiceCall = inngest.createFunction(
  { id: "process-voice-call", retries: 4, concurrency: { limit: 5 } },
  { event: "communications/voice-call.requested" },
  async ({ event, step }) => {
    if (typeof event.data.voiceCallId !== "string") {
      return { status: "INVALID_EVENT" };
    }
    return step.run("dispatch-voice-call", () =>
      dispatchVoiceCall(event.data.voiceCallId),
    );
  },
);

export const recoverPendingVoiceCalls = inngest.createFunction(
  { id: "recover-pending-voice-calls", retries: 0 },
  { cron: "*/5 * * * *" },
  async ({ step }) =>
    step.run("recover-pending-voice-calls", () => recoverVoiceCalls()),
);

export const reconcileVoiceUsage = inngest.createFunction(
  { id: "reconcile-voice-usage", retries: 2, concurrency: { limit: 1 } },
  { cron: "17 * * * *" },
  async ({ step }) => {
    const ambiguousCalls = await step.run(
      "reconcile-ambiguous-voice-calls",
      () => reconcileAmbiguousVoiceCalls(),
    );
    const costs = await step.run("reconcile-voice-costs", () =>
      reconcileVoiceCosts(),
    );
    return { ambiguousCalls, costs };
  },
);

export const purgeVoiceRecordings = inngest.createFunction(
  { id: "purge-voice-recordings", retries: 2, concurrency: { limit: 1 } },
  { cron: "43 2 * * *" },
  async ({ step }) =>
    step.run("purge-expired-voice-recordings", () =>
      purgeExpiredVoiceRecordings(),
    ),
);

export const purgeCommunicationReceipts = inngest.createFunction(
  { id: "purge-communication-receipts", retries: 2 },
  { cron: "11 3 * * *" },
  async ({ step }) =>
    step.run("purge-expired-communication-receipts", () =>
      purgeExpiredCommunicationReceipts(),
    ),
);

export const reconcileCommunicationHealth = inngest.createFunction(
  {
    id: "reconcile-communication-health",
    retries: 1,
    concurrency: { limit: 1 },
  },
  { cron: "7 * * * *" },
  async ({ step }) => {
    const staleDomains = await step.run("mark-stale-domains", () =>
      markStaleEmailDomains(),
    );
    const resendAccounts = await step.run(
      "reconcile-resend-platform-health",
      () => reconcileResendPlatformHealth(),
    );
    const recoveredResendDeliveries = await step.run(
      "recover-unknown-resend-deliveries",
      () => recoverUnknownResendDeliveries(),
    );
    const twilioAccounts = await step.run("reconcile-twilio-resources", () =>
      reconcileTwilioResources(),
    );
    const smsCosts = await step.run("reconcile-twilio-sms-costs", () =>
      reconcileTwilioSmsCosts(),
    );
    const inboundSmsCosts = await step.run(
      "reconcile-twilio-inbound-sms-costs",
      () => reconcileTwilioInboundSmsCosts(),
    );
    const projectedProfiles = await step.run(
      "project-communication-channel-health",
      () => projectCommunicationChannelHealth(),
    );
    return {
      staleDomains,
      resendAccounts,
      recoveredResendDeliveries,
      twilioAccounts,
      smsCosts,
      inboundSmsCosts,
      projectedProfiles,
    };
  },
);
