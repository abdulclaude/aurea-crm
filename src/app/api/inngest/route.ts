import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { executeWorkflow } from "@/inngest/functions";
import {
  mindbodyFullSync,
  mindbodyClientsSync,
  mindbodyClassesSync,
  mindbodyClientSync,
  mindbodyScheduledSync,
} from "@/inngest/functions/mindbody-sync";
import { processTrackingEvents } from "@/inngest/functions/process-tracking-events";
import { processStudioImport } from "@/inngest/functions/studio-import";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    executeWorkflow,
    mindbodyFullSync,
    mindbodyClientsSync,
    mindbodyClassesSync,
    mindbodyClientSync,
    mindbodyScheduledSync,
    processTrackingEvents,
    processStudioImport,
  ],
});
