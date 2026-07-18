import { NonRetriableError } from "inngest";
import { z } from "zod";

import {
  dispatchPublicFormWorkflow,
  findPendingPublicFormWorkflowReceipts,
  PublicFormWorkflowDispatchTerminalError,
} from "@/features/publications/server/form-workflow-dispatch";
import { deleteExpiredPublicationRequestQuotas } from "@/features/publications/server/publication-request-quota";
import { deleteExpiredFunnelTelemetryQuotas } from "@/features/external-funnels/server/telemetry-quota";
import { deleteExpiredPublicFormSubmissions } from "@/features/publications/server/form-submission-retention";
import { inngest } from "@/inngest/client";
import {
  dispatchFormSubmittedWorkflows,
  findPendingFormSubmittedWorkflowDispatches,
} from "@/features/workflows/server/form-submitted-trigger-service";

const receiptEventSchema = z.object({ receiptId: z.string().min(1).max(128) });
const submissionEventSchema = z.object({
  submissionId: z.string().min(1).max(128),
});

export const dispatchFormSubmittedWorkflowTrigger = inngest.createFunction(
  { id: "dispatch-form-submitted-workflow-trigger", retries: 5 },
  { event: "workflows/form-submitted.dispatch" },
  async ({ event, step }) => {
    const { submissionId } = submissionEventSchema.parse(event.data);
    return step.run("dispatch-form-submitted-trigger", () =>
      dispatchFormSubmittedWorkflows(submissionId),
    );
  },
);

export const recoverFormSubmittedWorkflowTriggers = inngest.createFunction(
  { id: "recover-form-submitted-workflow-triggers", retries: 2 },
  { cron: "*/5 * * * *" },
  async ({ step }) => {
    const submissionIds = await step.run(
      "find-pending-form-submitted-triggers",
      () => findPendingFormSubmittedWorkflowDispatches(),
    );
    if (submissionIds.length > 0) {
      await step.sendEvent(
        "retry-pending-form-submitted-triggers",
        submissionIds.map((submissionId) => ({
          name: "workflows/form-submitted.dispatch" as const,
          id: `form-submitted-recovery:${submissionId}:${Date.now()}`,
          data: { submissionId },
        })),
      );
    }
    return { recovered: submissionIds.length };
  },
);

export const dispatchPublicFormSubmissionWorkflow = inngest.createFunction(
  { id: "dispatch-public-form-submission-workflow", retries: 5 },
  { event: "publications/form.submission.accepted" },
  async ({ event, step }) => {
    const { receiptId } = receiptEventSchema.parse(event.data);
    try {
      return await step.run("dispatch-form-workflow", () =>
        dispatchPublicFormWorkflow(receiptId),
      );
    } catch (error) {
      if (error instanceof PublicFormWorkflowDispatchTerminalError) {
        throw new NonRetriableError(error.message);
      }
      throw error;
    }
  },
);

export const recoverPublicFormSubmissionWorkflows = inngest.createFunction(
  { id: "recover-public-form-submission-workflows", retries: 2 },
  { cron: "*/5 * * * *" },
  async ({ step }) => {
    const receiptIds = await step.run("find-pending-form-workflows", () =>
      findPendingPublicFormWorkflowReceipts(),
    );
    if (receiptIds.length > 0) {
      await step.sendEvent(
        "retry-pending-form-workflows",
        receiptIds.map((receiptId) => ({
          name: "publications/form.submission.accepted" as const,
          id: `public-form-submission-recovery:${receiptId}:${Date.now()}`,
          data: { receiptId },
        })),
      );
    }
    return { recovered: receiptIds.length };
  },
);

export const purgeExpiredPublicationRequestQuotas = inngest.createFunction(
  { id: "purge-expired-publication-request-quotas", retries: 2 },
  { cron: "17 * * * *" },
  async ({ step }) => {
    const publicationDeleted = await step.run(
      "delete-expired-publication-quotas",
      () => deleteExpiredPublicationRequestQuotas(),
    );
    const telemetryDeleted = await step.run(
      "delete-expired-funnel-telemetry-quotas",
      () => deleteExpiredFunnelTelemetryQuotas(),
    );
    return { publicationDeleted, telemetryDeleted };
  },
);

export const purgeExpiredPublicFormResponses = inngest.createFunction(
  { id: "purge-expired-public-form-responses", retries: 2 },
  { cron: "43 * * * *" },
  async ({ step }) => {
    const deleted = await step.run("delete-expired-public-form-responses", () =>
      deleteExpiredPublicFormSubmissions(),
    );
    return { deleted };
  },
);
