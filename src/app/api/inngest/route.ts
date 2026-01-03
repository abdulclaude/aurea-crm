import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import {
  executeWorkflow,
  handleGoogleCalendarNotification,
  renewGoogleCalendarSubscriptions,
  handleGmailNotification,
  renewGmailSubscriptionWatches,
  handleTelegramUpdate,
} from "@/inngest/functions";
import {
  syncEmbeddingsDaily,
  reindexSubaccount,
} from "@/inngest/channels/embedding-sync";
import {
  mindbodyFullSync,
  mindbodyClientsSync,
  mindbodyClassesSync,
  mindbodyContactSync,
  mindbodyScheduledSync,
} from "@/inngest/functions/mindbody-sync";
import { sendRotaMagicLinks } from "@/inngest/functions/send-rota-magic-links";
import { processTrackingEvents } from "@/inngest/functions/process-tracking-events";
import { cleanupOldEvents } from "@/inngest/functions/cleanup-old-events";
import { dataRetentionCleanup } from "@/inngest/functions/data-retention";
import { sendCampaign, checkScheduledCampaigns } from "@/inngest/functions/send-campaign";

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    executeWorkflow,
    handleGoogleCalendarNotification,
    renewGoogleCalendarSubscriptions,
    handleGmailNotification,
    renewGmailSubscriptionWatches,
    handleTelegramUpdate,
    syncEmbeddingsDaily,
    reindexSubaccount,
    mindbodyFullSync,
    mindbodyClientsSync,
    mindbodyClassesSync,
    mindbodyContactSync,
    mindbodyScheduledSync,
    sendRotaMagicLinks,
    processTrackingEvents,
    cleanupOldEvents,
    dataRetentionCleanup,
    sendCampaign,
    checkScheduledCampaigns,
  ],
});
