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
  reindexLocation,
} from "@/inngest/channels/embedding-sync";
import {
  mindbodyFullSync,
  mindbodyClientsSync,
  mindbodyClassesSync,
  mindbodyClientSync,
  mindbodyScheduledSync,
} from "@/inngest/functions/mindbody-sync";
import { sendRotaMagicLinks } from "@/inngest/functions/send-rota-magic-links";
import { processTrackingEvents } from "@/inngest/functions/process-tracking-events";
import { cleanupOldEvents } from "@/inngest/functions/cleanup-old-events";
import { dataRetentionCleanup } from "@/inngest/functions/data-retention";
import { sendCampaign, checkScheduledCampaigns } from "@/inngest/functions/send-campaign";
import { sendMembershipWelcomeEmail, checkMembershipExpiry } from "@/inngest/functions/studio-automations";
import { processStudioImport } from "@/inngest/functions/studio-import";
import { sendClassReminders } from "@/inngest/functions/send-class-reminders";
import { autoPromoteWaitlist, expireWaitlistNotifications } from "@/inngest/functions/auto-promote-waitlist";
import { detectNoShows, dailyNoShowSummary } from "@/inngest/functions/detect-no-shows";
import { calculateChurnScores } from "@/inngest/functions/calculate-churn-scores";
import {
  runBirthdayWorkflowTriggers,
  runRetentionAutomations,
} from "@/inngest/functions/run-retention-automations";
import { processSmsQueue } from "@/inngest/functions/process-sms-queue";

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
    reindexLocation,
    mindbodyFullSync,
    mindbodyClientsSync,
    mindbodyClassesSync,
    mindbodyClientSync,
    mindbodyScheduledSync,
    sendRotaMagicLinks,
    processTrackingEvents,
    cleanupOldEvents,
    dataRetentionCleanup,
    sendCampaign,
    checkScheduledCampaigns,
    sendMembershipWelcomeEmail,
    checkMembershipExpiry,
    processStudioImport,
    sendClassReminders,
    autoPromoteWaitlist,
    expireWaitlistNotifications,
    detectNoShows,
    dailyNoShowSummary,
    calculateChurnScores,
    runRetentionAutomations,
    runBirthdayWorkflowTriggers,
    processSmsQueue,
  ],
});
