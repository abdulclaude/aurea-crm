import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { executeWorkflow } from "@/inngest/functions";
import { processStudioImport } from "@/inngest/functions/studio-import";
import { processCommerceReconciliation } from "@/inngest/functions/commerce-reconciliation";
import {
  purgeStripeEventPayloads,
  retryStripeEventReceipts,
} from "@/inngest/functions/stripe-event-recovery";
import {
  dispatchOutboundDeliveries,
  recoverOutboundDeliveryLeases,
  retryOutboundDeliveries,
} from "@/features/delivery/server/inngest/functions";
import { processTelegramUpdateEvent } from "@/inngest/functions/telegram-update";
import { processGmailNotificationEvent } from "@/inngest/functions/gmail-notification";
import {
  processGoogleCalendarSubscriptionNotification,
  processOneDriveSubscriptionNotification,
  processOutlookSubscriptionNotification,
  reconcileProviderSubscriptions,
} from "@/inngest/functions/provider-subscriptions";
import { reindexLocationEmbeddings } from "@/inngest/functions/reindex-embeddings";
import {
  processInboundInboxReceipt,
  recoverInboundInboxReceipts,
} from "@/inngest/functions/inbound-inbox";
import {
  dispatchPublicFormSubmissionWorkflow,
  dispatchFormSubmittedWorkflowTrigger,
  purgeExpiredPublicFormResponses,
  purgeExpiredPublicationRequestQuotas,
  recoverPublicFormSubmissionWorkflows,
  recoverFormSubmittedWorkflowTriggers,
} from "@/inngest/functions/public-form-submission";
import { collectCancellationChargePayment } from "@/inngest/functions/cancellation-charge-collection";
import { processPaymentRecovery } from "@/inngest/functions/payment-recovery";
import { processMindbodySync } from "@/inngest/functions/mindbody-sync";
import { evaluateScheduledClientInactivityTriggers } from "@/inngest/functions/client-inactivity-triggers";
import { evaluateScheduledStudioTriggers } from "@/inngest/functions/scheduled-studio-triggers";
import {
  dispatchWaitlistOffer,
  recoverWaitlistOffers,
} from "@/inngest/functions/waitlist-offers";
import {
  provisionCommunications,
  reconcileCommunicationsProvisioning,
  processManagedResendWebhook,
  recoverManagedResendWebhooks,
  processTwilioWebhook,
  recoverTwilioWebhooks,
  processVoiceCall,
  recoverPendingVoiceCalls,
  reconcileVoiceUsage,
  purgeVoiceRecordings,
  purgeCommunicationReceipts,
  reconcileCommunicationHealth,
} from "@/features/communications/server/inngest-functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    executeWorkflow,
    processStudioImport,
    processCommerceReconciliation,
    retryStripeEventReceipts,
    purgeStripeEventPayloads,
    dispatchOutboundDeliveries,
    retryOutboundDeliveries,
    recoverOutboundDeliveryLeases,
    processTelegramUpdateEvent,
    processGmailNotificationEvent,
    processGoogleCalendarSubscriptionNotification,
    processOutlookSubscriptionNotification,
    processOneDriveSubscriptionNotification,
    reconcileProviderSubscriptions,
    reindexLocationEmbeddings,
    processInboundInboxReceipt,
    recoverInboundInboxReceipts,
    dispatchPublicFormSubmissionWorkflow,
    dispatchFormSubmittedWorkflowTrigger,
    recoverPublicFormSubmissionWorkflows,
    recoverFormSubmittedWorkflowTriggers,
    purgeExpiredPublicFormResponses,
    purgeExpiredPublicationRequestQuotas,
    collectCancellationChargePayment,
    processPaymentRecovery,
    processMindbodySync,
    evaluateScheduledClientInactivityTriggers,
    evaluateScheduledStudioTriggers,
    dispatchWaitlistOffer,
    recoverWaitlistOffers,
    provisionCommunications,
    reconcileCommunicationsProvisioning,
    processManagedResendWebhook,
    recoverManagedResendWebhooks,
    processTwilioWebhook,
    recoverTwilioWebhooks,
    processVoiceCall,
    recoverPendingVoiceCalls,
    reconcileVoiceUsage,
    purgeVoiceRecordings,
    purgeCommunicationReceipts,
    reconcileCommunicationHealth,
  ],
});
