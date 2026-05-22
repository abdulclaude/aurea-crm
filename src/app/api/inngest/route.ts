import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { executeWorkflow } from "@/inngest/functions";
import { processTrackingEvents } from "@/inngest/functions/process-tracking-events";
import { processStudioImport } from "@/inngest/functions/studio-import";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    executeWorkflow,
    processTrackingEvents,
    processStudioImport,
  ],
});
