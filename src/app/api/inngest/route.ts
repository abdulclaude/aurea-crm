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
  ],
});
