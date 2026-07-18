import { getExecutor } from "@/features/executions/lib/executor-registry";
import type { Realtime } from "@inngest/realtime";
import { inngest } from "./client";
import { ExecutionStatus, NodeType } from "@/db/enums";
import { db } from "@/db";
import { and, eq, isNull } from "drizzle-orm";
import {
  client,
  execution as executionTable,
  workflowEnrollment,
  workflows,
} from "@/db/schema";
import { topologicalSort } from "./utils";
import { NonRetriableError } from "inngest";
import { createNotification } from "@/lib/notifications";
import { recordAutomationEventsForExecution } from "@/features/executions/server/automation-events";
import { workflowMatchesExecutionSnapshot } from "@/features/executions/lib/workflow-execution-scope";
import type { JsonValue } from "@/db/json";
import { getWorkflowProviderReadinessIssues } from "@/features/workflows/server/workflow-provider-readiness";
import { getWorkflowActivationIssues } from "@/features/workflows/lib/workflow-activation-policy";
import {
  parseWorkflowBehavior,
  workflowEnrollmentClientId,
} from "@/features/workflows/lib/workflow-behavior";

function hasRealtimePublish(
  value: unknown,
): value is { publish: Realtime.PublishFn } {
  return (
    typeof value === "object" &&
    value !== null &&
    "publish" in value &&
    typeof value.publish === "function"
  );
}

import { httpRequestChannel } from "./channels/http-request";
import { manualTriggerChannel } from "./channels/manual-trigger";
import { googleFormTriggerChannel } from "./channels/google-form-trigger";
import { googleCalendarTriggerChannel } from "./channels/google-calendar-trigger";
import { gmailTriggerChannel } from "./channels/gmail-trigger";
import { telegramTriggerChannel } from "./channels/telegram-trigger";
import { stripeTriggerChannel } from "./channels/stripe-trigger";
import { geminiChannel } from "./channels/gemini";
import { discordChannel } from "./channels/discord";
import { slackChannel } from "./channels/slack";
import { googleCalendarChannel } from "./channels/google-calendar";
import { googleCalendarCreateEventChannel } from "./channels/google-calendar-create-event";
import { googleCalendarUpdateEventChannel } from "./channels/google-calendar-update-event";
import { googleCalendarDeleteEventChannel } from "./channels/google-calendar-delete-event";
import { gmailChannel } from "./channels/gmail";
import { gmailSendEmailChannel } from "./channels/gmail-send-email";
import { gmailReplyToEmailChannel } from "./channels/gmail-reply-to-email";
import { gmailSearchEmailsChannel } from "./channels/gmail-search-emails";
import { gmailAddLabelChannel } from "./channels/gmail-add-label";
import { googleDriveUploadFileChannel } from "./channels/google-drive-upload-file";
import { googleDriveDownloadFileChannel } from "./channels/google-drive-download-file";
import { googleDriveMoveFileChannel } from "./channels/google-drive-move-file";
import { googleDriveDeleteFileChannel } from "./channels/google-drive-delete-file";
import { googleDriveCreateFolderChannel } from "./channels/google-drive-create-folder";
import { googleFormReadResponsesChannel } from "./channels/google-form-read-responses";
import { telegramChannel } from "./channels/telegram";
import { waitChannel } from "./channels/wait";
import { createClientChannel } from "./channels/create-client";
import { updateClientChannel } from "./channels/update-client";
import { deleteClientChannel } from "./channels/delete-client";
import { createDealChannel } from "./channels/create-deal";
import { updateDealChannel } from "./channels/update-deal";
import { deleteDealChannel } from "./channels/delete-deal";
import { updatePipelineChannel } from "./channels/update-pipeline";
import { clientCreatedTriggerChannel } from "./channels/client-created-trigger";
import { clientUpdatedTriggerChannel } from "./channels/client-updated-trigger";
import { clientFieldChangedTriggerChannel } from "./channels/client-field-changed-trigger";
import { birthdayTriggerChannel } from "./channels/birthday-trigger";
import { formSubmittedTriggerChannel } from "./channels/form-submitted-trigger";
import { pricingOptionPurchasedTriggerChannel } from "./channels/pricing-option-purchased-trigger";
import { clientInactivityTriggerChannel } from "./channels/client-inactivity-trigger";
import { clientDeletedTriggerChannel } from "./channels/client-deleted-trigger";
import { clientTypeChangedTriggerChannel } from "./channels/client-type-changed-trigger";
import { clientLifecycleStageChangedTriggerChannel } from "./channels/client-lifecycle-stage-changed-trigger";
import { ifElseChannel } from "./channels/if-else";
import { setVariableChannel } from "./channels/set-variable";
import { stopWorkflowChannel } from "./channels/stop-workflow";
import { switchChannel } from "./channels/switch";
import { loopChannel } from "./channels/loop";
import { bundleWorkflowChannel } from "./channels/bundle-workflow";
import { outlookChannel } from "./channels/outlook";
import { outlookTriggerChannel } from "./channels/outlook-trigger";
import { oneDriveChannel } from "./channels/onedrive";
import { oneDriveTriggerChannel } from "./channels/onedrive-trigger";
import { dealCreatedTriggerChannel } from "./channels/deal-created-trigger";
import { dealUpdatedTriggerChannel } from "./channels/deal-updated-trigger";
import { dealDeletedTriggerChannel } from "./channels/deal-deleted-trigger";
import { dealStageChangedTriggerChannel } from "./channels/deal-stage-changed-trigger";
import { slackSendMessageChannel } from "./channels/slack-send-message";
import { findClientsChannel } from "./channels/find-clients";
import { addTagToClientChannel } from "./channels/add-tag-to-client";
import { removeTagFromClientChannel } from "./channels/remove-tag-from-client";
import { classBookedTriggerChannel } from "./channels/class-booked-trigger";
import { classCancelledTriggerChannel } from "./channels/class-cancelled-trigger";
import { memberCheckedInTriggerChannel } from "./channels/member-checked-in-trigger";
import { memberNoShowTriggerChannel } from "./channels/member-no-show-trigger";
import { membershipCreatedTriggerChannel } from "./channels/membership-created-trigger";
import { membershipExpiringTriggerChannel } from "./channels/membership-expiring-trigger";
import { membershipCancelledTriggerChannel } from "./channels/membership-cancelled-trigger";
import { waitlistSpotOpenedTriggerChannel } from "./channels/waitlist-spot-opened-trigger";
import { introOfferRedeemedTriggerChannel } from "./channels/intro-offer-redeemed-trigger";
import { introOfferCompletedTriggerChannel } from "./channels/intro-offer-completed-trigger";
import { referralConvertedTriggerChannel } from "./channels/referral-converted-trigger";
import { memberClassCountTriggerChannel } from "./channels/member-class-count-trigger";
import { clientTagAddedTriggerChannel } from "./channels/client-tag-added-trigger";
import { clientTagRemovedTriggerChannel } from "./channels/client-tag-removed-trigger";
import { studioPaymentSucceededTriggerChannel } from "./channels/studio-payment-succeeded-trigger";
import { studioPaymentFailedTriggerChannel } from "./channels/studio-payment-failed-trigger";
import { sendClassReminderChannel } from "./channels/send-class-reminder";
import { awardLoyaltyPointsChannel } from "./channels/award-loyalty-points";
import { calculateChurnScoreChannel } from "./channels/calculate-churn-score";
import { sendSmsChannel } from "./channels/send-sms";
import { sendEmailChannel } from "./channels/send-email";
import { createTaskChannel } from "./channels/create-task";
import { studioBookingActionChannel } from "./channels/studio-booking-action";
export const executeWorkflow = inngest.createFunction(
  {
    id: "execute-workflow",
    retries: 0,
    onFailure: async ({ event }) => {
      const failedEventId = event.data.event.id;
      if (!failedEventId) {
        throw new NonRetriableError("Failed workflow event ID is missing.");
      }

      const failedWorkflowId = (event.data as Record<string, unknown>)
        .workflowId;
      const [execution] = await db
        .update(executionTable)
        .set({
          status: ExecutionStatus.FAILED,
          error: event.data.error.message,
          errorStack: event.data.error.stack,
        })
        .where(
          and(
            eq(executionTable.inngestEventId, failedEventId),
            eq(executionTable.status, ExecutionStatus.RUNNING),
            typeof failedWorkflowId === "string"
              ? eq(executionTable.workflowId, failedWorkflowId)
              : undefined,
          ),
        )
        .returning();

      if (!execution) {
        return null;
      }

      const workflowId =
        ((event.data as Record<string, unknown>).workflowId as
          | string
          | undefined) ?? execution.workflowId;

      if (workflowId) {
        const workflow = await db.query.workflows.findFirst({
          where: eq(workflows.id, workflowId),
          columns: {
            id: true,
            name: true,
            organizationId: true,
            locationId: true,
          },
        });

        if (workflow && workflow.organizationId) {
          try {
            await createNotification({
              type: "WORKFLOW_FAILED",
              title: "Workflow failed",
              message: `Workflow ${workflow.name} failed to execute`,
              entityType: "workflow",
              entityId: workflow.id,
              organizationId: workflow.organizationId,
              locationId: workflow.locationId ?? undefined,
              data: {
                error: event.data.error.message,
                executionId: execution.id,
              },
            });
          } catch (error) {
            console.error("Failed to notify workflow failure:", error);
          }
        }
      }

      return execution;
    },
  },
  {
    event: "workflows/execute.workflow",
    channels: [
      httpRequestChannel(),
      manualTriggerChannel(),
      googleFormTriggerChannel(),
      googleCalendarTriggerChannel(),
      gmailTriggerChannel(),
      telegramTriggerChannel(),
      stripeTriggerChannel(),
      geminiChannel(),
      discordChannel(),
      slackChannel(),
      googleCalendarChannel(),
      googleCalendarCreateEventChannel(),
      googleCalendarUpdateEventChannel(),
      googleCalendarDeleteEventChannel(),
      gmailChannel(),
      gmailSendEmailChannel(),
      gmailReplyToEmailChannel(),
      gmailSearchEmailsChannel(),
      gmailAddLabelChannel(),
      googleDriveUploadFileChannel(),
      googleDriveDownloadFileChannel(),
      googleDriveMoveFileChannel(),
      googleDriveDeleteFileChannel(),
      googleDriveCreateFolderChannel(),
      googleFormReadResponsesChannel(),
      telegramChannel(),
      waitChannel(),
      createClientChannel(),
      updateClientChannel(),
      deleteClientChannel(),
      createDealChannel(),
      updateDealChannel(),
      deleteDealChannel(),
      updatePipelineChannel(),
      clientCreatedTriggerChannel(),
      clientUpdatedTriggerChannel(),
      clientFieldChangedTriggerChannel(),
      birthdayTriggerChannel(),
      formSubmittedTriggerChannel(),
      pricingOptionPurchasedTriggerChannel(),
      clientInactivityTriggerChannel(),
      clientDeletedTriggerChannel(),
      clientTypeChangedTriggerChannel(),
      clientLifecycleStageChangedTriggerChannel(),
      ifElseChannel(),
      setVariableChannel(),
      stopWorkflowChannel(),
      switchChannel(),
      loopChannel(),
      bundleWorkflowChannel(),
      outlookChannel(),
      outlookTriggerChannel(),
      oneDriveChannel(),
      oneDriveTriggerChannel(),
      dealCreatedTriggerChannel(),
      dealUpdatedTriggerChannel(),
      dealDeletedTriggerChannel(),
      dealStageChangedTriggerChannel(),
      slackSendMessageChannel(),
      findClientsChannel(),
      addTagToClientChannel(),
      removeTagFromClientChannel(),
      classBookedTriggerChannel(),
      classCancelledTriggerChannel(),
      memberCheckedInTriggerChannel(),
      memberNoShowTriggerChannel(),
      membershipCreatedTriggerChannel(),
      membershipExpiringTriggerChannel(),
      membershipCancelledTriggerChannel(),
      waitlistSpotOpenedTriggerChannel(),
      introOfferRedeemedTriggerChannel(),
      introOfferCompletedTriggerChannel(),
      referralConvertedTriggerChannel(),
      memberClassCountTriggerChannel(),
      clientTagAddedTriggerChannel(),
      clientTagRemovedTriggerChannel(),
      studioPaymentSucceededTriggerChannel(),
      studioPaymentFailedTriggerChannel(),
      sendClassReminderChannel(),
      awardLoyaltyPointsChannel(),
      calculateChurnScoreChannel(),
      sendSmsChannel(),
      sendEmailChannel(),
      createTaskChannel(),
      studioBookingActionChannel(),
    ],
  },
  async (args) => {
    if (!hasRealtimePublish(args)) {
      throw new NonRetriableError("Realtime publisher is missing.");
    }

    const { event, step, publish } = args;
    const inngestEventId = event.id;
    const workflowId = event.data.workflowId;

    if (!inngestEventId) {
      throw new NonRetriableError("Event ID is missing.");
    }

    if (!workflowId) {
      throw new NonRetriableError("Workflow ID is missing.");
    }

    const executionClaim = await step.run("create-execution", async () => {
      const expectedOrganizationId = event.data.expectedOrganizationId;
      const expectedLocationId = event.data.expectedLocationId;
      if (
        expectedOrganizationId !== undefined &&
        (typeof expectedOrganizationId !== "string" ||
          (expectedLocationId !== null &&
            expectedLocationId !== undefined &&
            typeof expectedLocationId !== "string"))
      ) {
        throw new NonRetriableError("Expected workflow scope is invalid.");
      }
      const workflowMeta = await db.query.workflows.findFirst({
        where: eq(workflows.id, workflowId),
        columns: {
          archived: true,
          isBundle: true,
          isTemplate: true,
          organizationId: true,
          locationId: true,
          behaviorConfig: true,
        },
        with: {
          nodes: {
            columns: {
              id: true,
              type: true,
              data: true,
              credentialId: true,
              providerAccountId: true,
            },
          },
          connections: {
            columns: { fromNodeId: true, toNodeId: true },
          },
        },
      });

      if (!workflowMeta) {
        throw new NonRetriableError("Workflow not found.");
      }

      if (!workflowMeta.organizationId) {
        throw new NonRetriableError(
          "Workflow execution requires an organization scope.",
        );
      }

      if (
        typeof expectedOrganizationId === "string" &&
        (workflowMeta.organizationId !== expectedOrganizationId ||
          workflowMeta.locationId !== (expectedLocationId ?? null))
      ) {
        throw new NonRetriableError(
          "Workflow does not match the expected execution scope.",
        );
      }

      if (workflowMeta.isTemplate || workflowMeta.archived) {
        throw new NonRetriableError(
          "Archived workflows and templates cannot be executed.",
        );
      }

      const readinessIssues = [
        ...getWorkflowActivationIssues(workflowMeta),
        ...(await getWorkflowProviderReadinessIssues({
          nodes: workflowMeta.nodes,
          organizationId: workflowMeta.organizationId,
          locationId: workflowMeta.locationId,
        })),
      ];
      if (readinessIssues.length > 0) {
        throw new NonRetriableError(readinessIssues.join(" "));
      }

      const behavior = parseWorkflowBehavior(workflowMeta.behaviorConfig);
      const enrollmentClientId = workflowEnrollmentClientId(
        event.data.initialData,
      );
      const executionOrganizationId = workflowMeta.organizationId;
      const executionLocationId = workflowMeta.locationId;
      return db.transaction(async (tx) => {
        const [createdExecution] = await tx
          .insert(executionTable)
          .values({
            id: crypto.randomUUID(),
            workflowId,
            inngestEventId,
            organizationId: executionOrganizationId,
            locationId: executionLocationId,
            startedAt: new Date(),
          })
          .onConflictDoNothing({ target: executionTable.inngestEventId })
          .returning();

        if (!createdExecution) {
          const [existingExecution] = await tx
            .select()
            .from(executionTable)
            .where(eq(executionTable.inngestEventId, inngestEventId))
            .limit(1);
          if (
            !existingExecution ||
            existingExecution.workflowId !== workflowId
          ) {
            throw new NonRetriableError(
              "Workflow execution idempotency key belongs to another workflow.",
            );
          }
          return {
            execution: existingExecution,
            duplicate: true,
            skipped: false,
          };
        }

        if (behavior.enrollment === "ONCE_PER_MEMBER" && enrollmentClientId) {
          const [scopedClient] = await tx
            .select({ id: client.id })
            .from(client)
            .where(
              and(
                eq(client.id, enrollmentClientId),
                eq(client.organizationId, executionOrganizationId),
                executionLocationId
                  ? eq(client.locationId, executionLocationId)
                  : isNull(client.locationId),
              ),
            )
            .limit(1);
          if (!scopedClient) {
            throw new NonRetriableError(
              "Workflow enrollment member does not match the workflow scope.",
            );
          }
          const [enrollment] = await tx
            .insert(workflowEnrollment)
            .values({
              id: crypto.randomUUID(),
              workflowId,
              executionId: createdExecution.id,
              organizationId: executionOrganizationId,
              locationId: executionLocationId,
              clientId: scopedClient.id,
            })
            .onConflictDoNothing({
              target: [
                workflowEnrollment.workflowId,
                workflowEnrollment.clientId,
              ],
            })
            .returning({ id: workflowEnrollment.id });
          if (!enrollment) {
            const [skippedExecution] = await tx
              .update(executionTable)
              .set({
                status: ExecutionStatus.SUCCESS,
                completedAt: new Date(),
                output: {
                  skipped: true,
                  reason: "ONCE_PER_MEMBER",
                  clientId: scopedClient.id,
                },
              })
              .where(eq(executionTable.id, createdExecution.id))
              .returning();
            return {
              execution: skippedExecution ?? createdExecution,
              duplicate: false,
              skipped: true,
            };
          }
        }

        return {
          execution: createdExecution,
          duplicate: false,
          skipped: false,
        };
      });
    });

    if (executionClaim.duplicate) {
      return {
        workflowId,
        result: executionClaim.execution.output ?? {},
        duplicate: true,
      };
    }

    if (executionClaim.skipped) {
      return {
        workflowId,
        result: executionClaim.execution.output ?? {},
        skipped: true,
      };
    }

    const execution = executionClaim.execution;

    const { workflow, userId } = await step.run(
      "prepare-workflow",
      async () => {
        const workflowRecord = await db.query.workflows.findFirst({
          where: eq(workflows.id, workflowId),
          with: {
            nodes: true,
            connections: true,
          },
        });

        if (!workflowRecord) {
          throw new NonRetriableError("Workflow not found.");
        }

        if (!workflowMatchesExecutionSnapshot(workflowRecord, execution)) {
          throw new NonRetriableError(
            "Workflow scope changed after execution was created.",
          );
        }

        const workflow = {
          ...workflowRecord,
          Node: workflowRecord.nodes.map((workflowNode) => {
            const rawData = workflowNode.data;
            const data: Record<string, unknown> =
              typeof rawData === "object" &&
              rawData !== null &&
              !Array.isArray(rawData)
                ? { ...rawData }
                : {};
            if (workflowNode.providerAccountId) {
              data.providerAccountId = workflowNode.providerAccountId;
            } else {
              delete data.providerAccountId;
            }
            return {
              ...workflowNode,
              data: data as JsonValue,
            };
          }),
          Connection: workflowRecord.connections,
        };

        return {
          workflow,
          userId: workflow.userId,
        };
      },
    );

    //  initialize context with any initial data from the trigger
    let context: Record<string, unknown> = event.data.initialData || {};

    // Track node-level context contributions for bundle workflows
    const nodeLevelContext = new Map<string, Record<string, unknown>>();

    // Get topologically sorted nodes for execution order
    const sortedNodes = topologicalSort(workflow.Node, workflow.Connection);

    // Build adjacency map for conditional branching
    const adjacencyMap = new Map<
      string,
      Array<{ toNodeId: string; fromOutput: string }>
    >();
    for (const conn of workflow.Connection) {
      if (!adjacencyMap.has(conn.fromNodeId)) {
        adjacencyMap.set(conn.fromNodeId, []);
      }
      adjacencyMap.get(conn.fromNodeId)!.push({
        toNodeId: conn.toNodeId,
        fromOutput: conn.fromOutput,
      });
    }

    // Track which nodes are reachable based on conditional branches
    const reachableNodes = new Set<string>();

    // Find trigger node (first in sorted order with no incoming connections)
    const targetNodeIds = new Set(workflow.Connection.map((c) => c.toNodeId));
    const triggerNode = sortedNodes.find((node) => !targetNodeIds.has(node.id));

    if (!triggerNode) {
      throw new NonRetriableError("No trigger node found in workflow");
    }

    reachableNodes.add(triggerNode.id);

    // Execute nodes in topological order
    for (const node of sortedNodes) {
      // Skip if not reachable (due to conditional branching)
      if (!reachableNodes.has(node.id)) {
        continue;
      }

      // Check if workflow should stop
      if (context.shouldStop) {
        break;
      }

      // Capture context before node execution
      const contextBefore = { ...context };

      // Execute the node
      const executor = getExecutor(node.type as NodeType);
      context = await executor({
        data: node.data as Record<string, unknown>,
        nodeId: node.id,
        userId,
        scope: {
          executionId: execution.id,
          rootWorkflowId: workflow.id,
          workflowId: workflow.id,
          organizationId: execution.organizationId,
          locationId: execution.locationId,
          workflowPath: [workflow.id],
        },
        context,
        step,
        publish,
        nodeLevelContext,
        // Pass parent workflow metadata for bundle workflows
        parentWorkflow: {
          workflowId: workflow.id,
          workflowName: workflow.name,
          isBundle: workflow.isBundle,
        },
      });

      // Track what this node added to the context
      // This captures the node's contribution for bundle workflows to reference
      const nodeContribution: Record<string, unknown> = {};

      // Find new/changed values in context.variables
      if (context.variables && typeof context.variables === "object") {
        const contextBeforeVars =
          (contextBefore.variables as Record<string, unknown>) || {};
        const contextAfterVars = context.variables as Record<string, unknown>;

        for (const [key, value] of Object.entries(contextAfterVars)) {
          if (contextBeforeVars[key] !== value) {
            nodeContribution[key] = value;
          }
        }
      }

      // Store this node's contribution using node name (more user-friendly than ID)
      nodeLevelContext.set(node.name, nodeContribution);

      // Determine next nodes to mark as reachable
      const nextConnections = adjacencyMap.get(node.id) || [];

      // Handle conditional branching nodes
      if (
        node.type === NodeType.IF_ELSE ||
        node.type === NodeType.SWITCH ||
        node.type === NodeType.LOOP
      ) {
        // Check if there's a branchToFollow in context
        const branchToFollow = context.branchToFollow as string | undefined;

        if (branchToFollow) {
          // Only mark nodes connected via the matching branch as reachable
          for (const conn of nextConnections) {
            if (conn.fromOutput === branchToFollow) {
              reachableNodes.add(conn.toNodeId);
            }
          }

          // Clear the branch indicator
          delete context.branchToFollow;
        } else {
          // Fallback: use variable-based branch (for IF/ELSE compatibility)
          const nodeConfig = node.data as Record<string, unknown>;
          const variableName = nodeConfig.variableName as string;
          const branchResult = (
            context.variables as Record<string, Record<string, unknown>>
          )?.[variableName]?.branchToFollow;

          if (branchResult) {
            for (const conn of nextConnections) {
              if (conn.fromOutput === branchResult) {
                reachableNodes.add(conn.toNodeId);
              }
            }
          }
        }
      } else {
        // For regular nodes, mark all connected nodes as reachable
        for (const conn of nextConnections) {
          reachableNodes.add(conn.toNodeId);
        }
      }
    }

    const completedExecution = await step.run("update-execution", async () => {
      const [updatedExecution] = await db
        .update(executionTable)
        .set({
          status: ExecutionStatus.SUCCESS,
          completedAt: new Date(),
          output: context,
        })
        .where(
          and(
            eq(executionTable.inngestEventId, inngestEventId),
            eq(executionTable.workflowId, workflowId),
          ),
        )
        .returning();

      return updatedExecution;
    });

    await step.run("record-automation-events", async () => {
      return recordAutomationEventsForExecution({
        executionId: completedExecution.id ?? execution.id,
        workflow,
        triggerNode,
        context,
      });
    });

    return { workflowId, result: context };
  },
);
