import { getExecutor } from "@/features/executions/lib/executor-registry";
import { inngest } from "./client";
import { ExecutionStatus, NodeType } from "@prisma/client";
import prisma from "@/lib/db";
import { topologicalSort } from "./utils";
import { NonRetriableError } from "inngest";

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
import { createContactChannel } from "./channels/create-contact";
import { updateContactChannel } from "./channels/update-contact";
import { deleteContactChannel } from "./channels/delete-contact";
import { createDealChannel } from "./channels/create-deal";
import { updateDealChannel } from "./channels/update-deal";
import { deleteDealChannel } from "./channels/delete-deal";
import { updatePipelineChannel } from "./channels/update-pipeline";
import { contactCreatedTriggerChannel } from "./channels/contact-created-trigger";
import { contactUpdatedTriggerChannel } from "./channels/contact-updated-trigger";
import { contactFieldChangedTriggerChannel } from "./channels/contact-field-changed-trigger";
import { contactDeletedTriggerChannel } from "./channels/contact-deleted-trigger";
import { contactTypeChangedTriggerChannel } from "./channels/contact-type-changed-trigger";
import { contactLifecycleStageChangedTriggerChannel } from "./channels/contact-lifecycle-stage-changed-trigger";
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
import { findContactsChannel } from "./channels/find-contacts";
import { addTagToContactChannel } from "./channels/add-tag-to-contact";
import { removeTagFromContactChannel } from "./channels/remove-tag-from-contact";
import {
  processGoogleCalendarSubscription,
  renewExpiringGoogleCalendarSubscriptions,
} from "@/features/google-calendar/server/subscriptions";
import {
  mindbodyFullSync,
  mindbodyClientsSync,
  mindbodyClassesSync,
  mindbodyContactSync,
  mindbodyScheduledSync,
} from "./functions/mindbody-sync";
import {
  processGmailNotification,
  renewGmailSubscriptions,
} from "@/features/gmail/server/subscriptions";
import {
  processTelegramUpdate,
  type TelegramUpdate,
} from "@/features/telegram/server/updates";
import {
  processOutlookNotification,
  renewOutlookSubscriptions,
} from "@/features/outlook/server/subscriptions";
import {
  processOneDriveNotification,
  renewOneDriveSubscriptions,
} from "@/features/onedrive/server/subscriptions";
import { sendRotaMagicLinks } from "./functions/send-rota-magic-links";
import { processTrackingEvents } from "./functions/process-tracking-events";
import { cleanupOldEvents } from "./functions/cleanup-old-events";
import { syncAdSpend } from "./functions/sync-ad-spend";

export const executeWorkflow = inngest.createFunction(
  {
    id: "execute-workflow",
    retries: 0,
    onFailure: async ({ event }) => {
      return prisma.execution.update({
        where: {
          inngestEventId: event.data.event.id,
        },
        data: {
          status: ExecutionStatus.FAILED,
          error: event.data.error.message,
          errorStack: event.data.error.stack,
        },
      });
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
      createContactChannel(),
      updateContactChannel(),
      deleteContactChannel(),
      createDealChannel(),
      updateDealChannel(),
      deleteDealChannel(),
      updatePipelineChannel(),
      contactCreatedTriggerChannel(),
      contactUpdatedTriggerChannel(),
      contactFieldChangedTriggerChannel(),
      contactDeletedTriggerChannel(),
      contactTypeChangedTriggerChannel(),
      contactLifecycleStageChangedTriggerChannel(),
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
      findContactsChannel(),
      addTagToContactChannel(),
      removeTagFromContactChannel(),
    ],
  },
  async ({ event, step, publish }) => {
    const inngestEventId = event.id;
    const workflowId = event.data.workflowId;

    if (!inngestEventId) {
      throw new NonRetriableError("Event ID is missing.");
    }

    if (!workflowId) {
      throw new NonRetriableError("Workflow ID is missing.");
    }

    await step.run("create-execution", async () => {
      const workflowMeta = await prisma.workflows.findUnique({
        where: { id: workflowId },
        select: {
          subaccountId: true,
        },
      });

      if (!workflowMeta) {
        throw new NonRetriableError("Workflow not found.");
      }

      return prisma.execution.create({
        data: {
          id: crypto.randomUUID(),
          workflowId,
          inngestEventId,
          subaccountId: workflowMeta.subaccountId,
          startedAt: new Date(),
        },
      });
    });

    const { workflow, userId } = await step.run(
      "prepare-workflow",
      async () => {
        const workflow = await prisma.workflows.findUniqueOrThrow({
          where: { id: workflowId },
          include: {
            Node: true,
            Connection: true,
          },
        });

        return {
          workflow,
          userId: workflow.userId,
        };
      }
    );

    //  initialize context with any initial data from the trigger
    let context: Record<string, unknown> = event.data.initialData || {};

    // Track node-level context contributions for bundle workflows
    const nodeLevelContext = new Map<string, Record<string, unknown>>();

    // Get topologically sorted nodes for execution order
    const sortedNodes = topologicalSort(
      workflow.Node as any,
      workflow.Connection as any
    );

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
          const branchResult = (context.variables as Record<string, any>)?.[
            variableName
          ]?.branchToFollow;

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

    await step.run("update-execution", async () => {
      return prisma.execution.update({
        where: { inngestEventId, workflowId },
        data: {
          status: ExecutionStatus.SUCCESS,
          completedAt: new Date(),
          output: context as any,
        },
      });
    });

    return { workflowId, result: context };
  }
);

export const handleGoogleCalendarNotification = inngest.createFunction(
  { id: "google-calendar-notification", retries: 3 },
  { event: "google-calendar/subscription.notification" },
  async ({ event }) => {
    const subscriptionId = event.data.subscriptionId as string | undefined;
    if (!subscriptionId) {
      return { skipped: true };
    }

    await processGoogleCalendarSubscription(subscriptionId);
    return { subscriptionId };
  }
);

export const renewGoogleCalendarSubscriptions = inngest.createFunction(
  { id: "google-calendar-renewal", retries: 0 },
  { cron: "0 */6 * * *" }, // Run every 6 hours instead of hourly (4x reduction)
  async () => {
    const renewed = await renewExpiringGoogleCalendarSubscriptions();
    return { renewed };
  }
);

export const handleGmailNotification = inngest.createFunction(
  { id: "gmail-notification", retries: 3 },
  { event: "gmail/subscription.notification" },
  async ({ event }) => {
    const subscriptionId = event.data.subscriptionId as string | undefined;
    if (!subscriptionId) {
      return { skipped: true };
    }

    await processGmailNotification({
      subscriptionId,
      historyId: event.data.historyId as string | undefined,
    });
    return { subscriptionId };
  }
);

export const renewGmailSubscriptionWatches = inngest.createFunction(
  { id: "gmail-renewal", retries: 0 },
  { cron: "0 */6 * * *" }, // Run every 6 hours instead of hourly (4x reduction)
  async () => {
    const renewed = await renewGmailSubscriptions();
    return { renewed };
  }
);

export const handleTelegramUpdate = inngest.createFunction(
  { id: "telegram-update", retries: 0 },
  { event: "telegram/update" },
  async ({ event }) => {
    const credentialId = event.data.credentialId as string | undefined;
    const userId = event.data.userId as string | undefined;
    const update = event.data.update as TelegramUpdate | undefined;

    if (!credentialId || !userId || !update) {
      return { skipped: true };
    }

    await processTelegramUpdate({
      credentialId,
      userId,
      update,
    });

    return { credentialId };
  }
);

export const handleOutlookNotification = inngest.createFunction(
  { id: "outlook-notification", retries: 3 },
  { event: "outlook/subscription.notification" },
  async ({ event }) => {
    const subscriptionId = event.data.subscriptionId as string | undefined;
    if (!subscriptionId) {
      return { skipped: true };
    }

    await processOutlookNotification({ subscriptionId });
    return { subscriptionId };
  }
);

export const renewOutlookSubscriptionWatches = inngest.createFunction(
  { id: "outlook-renewal", retries: 0 },
  { cron: "0 */6 * * *" }, // Run every 6 hours instead of hourly (4x reduction)
  async () => {
    const renewed = await renewOutlookSubscriptions();
    return { renewed };
  }
);

export const handleOneDriveNotification = inngest.createFunction(
  { id: "onedrive-notification", retries: 3 },
  { event: "onedrive/subscription.notification" },
  async ({ event }) => {
    const subscriptionId = event.data.subscriptionId as string | undefined;
    if (!subscriptionId) {
      return { skipped: true };
    }

    await processOneDriveNotification({ subscriptionId });
    return { subscriptionId };
  }
);

export const renewOneDriveSubscriptionWatches = inngest.createFunction(
  { id: "onedrive-renewal", retries: 0 },
  { cron: "0 */6 * * *" }, // Run every 6 hours instead of hourly (4x reduction)
  async () => {
    const renewed = await renewOneDriveSubscriptions();
    return { renewed };
  }
);

// Generate recurring invoices
export const generateRecurringInvoices = inngest.createFunction(
  { id: "generate-recurring-invoices", retries: 0 },
  { cron: "0 0 * * *" }, // Run daily at midnight
  async () => {
    const now = new Date();

    // Find all active recurring invoices that are due
    const dueRecurringInvoices = await prisma.recurringInvoice.findMany({
      where: {
        status: "ACTIVE",
        nextRunDate: {
          lte: now,
        },
      },
    });

    const results = {
      processed: 0,
      generated: 0,
      errors: 0,
      details: [] as Array<{ id: string; invoiceNumber?: string; error?: string }>,
    };

    for (const recurring of dueRecurringInvoices) {
      results.processed++;

      try {
        // Check if we've reached the end date
        if (recurring.endDate && now > recurring.endDate) {
          await prisma.recurringInvoice.update({
            where: { id: recurring.id },
            data: { status: "COMPLETED" },
          });
          continue;
        }

        // Generate invoice number
        const { generateInvoiceNumber } = await import(
          "@/features/invoicing/lib/invoice-number-generator"
        );
        const invoiceNumber = await generateInvoiceNumber(
          recurring.organizationId
        );

        // Calculate issue and due dates
        const issueDate = new Date();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + recurring.dueDays);

        // Parse line items from JSON
        const lineItems = recurring.lineItems as Array<{
          description: string;
          quantity: number;
          unitPrice: number;
          amount: number;
        }>;

        // Create the invoice
        const invoice = await prisma.$transaction(async (tx) => {
          // Create invoice
          const newInvoice = await tx.invoice.create({
            data: {
              id: crypto.randomUUID(),
              organizationId: recurring.organizationId,
              subaccountId: recurring.subaccountId,
              invoiceNumber,
              contactId: recurring.contactId,
              contactName: recurring.contactName,
              contactEmail: recurring.contactEmail,
              contactAddress: recurring.contactAddress as any,
              title: `${recurring.name} - ${issueDate.toLocaleDateString()}`,
              status: recurring.autoSend ? "SENT" : "DRAFT",
              billingModel: recurring.billingModel,
              issueDate,
              dueDate,
              subtotal: recurring.subtotal,
              taxRate: recurring.taxRate,
              taxAmount: recurring.taxAmount,
              discountAmount: recurring.discountAmount,
              total: recurring.total,
              amountDue: recurring.total,
              currency: recurring.currency,
              notes: recurring.notes,
              termsConditions: recurring.termsConditions,
              templateId: recurring.templateId,
              createdAt: new Date(),
              updatedAt: new Date(),
              invoiceLineItem: {
                create: lineItems.map((item, index) => ({
                  id: crypto.randomUUID(),
                  description: item.description,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  amount: item.amount,
                  order: index,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                })),
              },
            },
          });

          // Track generation
          await tx.recurringInvoiceGeneration.create({
            data: {
              id: crypto.randomUUID(),
              recurringInvoiceId: recurring.id,
              invoiceId: newInvoice.id,
              periodStart: recurring.lastRunDate || recurring.startDate,
              periodEnd: now,
            },
          });

          // Calculate next run date
          const nextRunDate = calculateNextRunDate({
            startDate: recurring.startDate,
            frequency: recurring.frequency,
            interval: recurring.interval,
            dayOfMonth: recurring.dayOfMonth,
            dayOfWeek: recurring.dayOfWeek,
            lastRunDate: now,
          });

          // Update recurring invoice
          await tx.recurringInvoice.update({
            where: { id: recurring.id },
            data: {
              lastRunDate: now,
              nextRunDate,
              invoicesGenerated: recurring.invoicesGenerated + 1,
            },
          });

          return newInvoice;
        });

        // Send email if auto-send is enabled
        if (recurring.autoSend && recurring.contactEmail) {
          try {
            const { sendInvoiceEmail } = await import("@/lib/email");
            const { generatePDF } = await import(
              "@/features/invoicing/lib/pdf-generator"
            );

            // Load full invoice with template
            const fullInvoice = await prisma.invoice.findUnique({
              where: { id: invoice.id },
              include: {
                invoiceLineItem: { orderBy: { order: "asc" } },
                invoiceTemplate: true,
              },
            });

            if (fullInvoice) {
              // Load organization and subaccount for branding
              const org = await prisma.organization.findUnique({
                where: { id: recurring.organizationId },
              });

              const subaccount = recurring.subaccountId
                ? await prisma.subaccount.findUnique({
                    where: { id: recurring.subaccountId },
                  })
                : null;

              // Use subaccount branding if available, fallback to org branding
              const brandingName = subaccount?.companyName || org?.name || "";
              const brandingEmail =
                subaccount?.businessEmail || org?.businessEmail || "";
              const brandingPhone =
                subaccount?.businessPhone || org?.businessPhone || "";

              // Build address from subaccount or org
              let brandingAddress;
              if (subaccount) {
                brandingAddress = {
                  street: subaccount.addressLine1 || undefined,
                  city: subaccount.city || undefined,
                  state: subaccount.state || undefined,
                  zip: subaccount.postalCode || undefined,
                  country: subaccount.country || undefined,
                };
              } else if (org?.businessAddress) {
                brandingAddress = org.businessAddress as {
                  street?: string;
                  city?: string;
                  state?: string;
                  zip?: string;
                  country?: string;
                };
              }

              const invoiceData = {
                invoiceNumber: fullInvoice.invoiceNumber,
                issueDate: fullInvoice.issueDate,
                dueDate: fullInvoice.dueDate,
                contactName: fullInvoice.contactName,
                contactEmail: fullInvoice.contactEmail,
                contactAddress: fullInvoice.contactAddress
                  ? (fullInvoice.contactAddress as Record<string, unknown>)
                  : null,
                subtotal: fullInvoice.subtotal.toString(),
                taxRate: fullInvoice.taxRate?.toString(),
                taxAmount: fullInvoice.taxAmount.toString(),
                discountAmount: fullInvoice.discountAmount.toString(),
                total: fullInvoice.total.toString(),
                currency: fullInvoice.currency,
                notes: fullInvoice.notes || "",
                termsConditions: fullInvoice.termsConditions || "",
                lineItems: fullInvoice.invoiceLineItem.map((item) => ({
                  description: item.description,
                  quantity: item.quantity.toNumber(),
                  unitPrice: item.unitPrice.toString(),
                  amount: item.amount.toString(),
                })),
                businessName: brandingName,
                businessEmail: brandingEmail,
                businessPhone: brandingPhone,
                businessAddress: brandingAddress,
              };

              const template = fullInvoice.invoiceTemplate || { design: "minimal" };
              const pdfBuffer = await generatePDF(invoiceData as any, template as any);

              const appUrl = process.env.APP_URL || "http://localhost:3000";
              const paymentLink = `${appUrl}/invoices/pay/${fullInvoice.id}`;

              await sendInvoiceEmail({
                to: recurring.contactEmail,
                invoiceNumber: fullInvoice.invoiceNumber,
                contactName: recurring.contactName,
                total: fullInvoice.total.toString(),
                currency: fullInvoice.currency,
                dueDate: fullInvoice.dueDate,
                pdfBuffer,
                paymentLink,
              });

              // Update invoice status to SENT
              await prisma.invoice.update({
                where: { id: invoice.id },
                data: { status: "SENT" },
              });
            }
          } catch (emailError) {
            console.error(
              `Failed to send invoice email for ${invoiceNumber}:`,
              emailError
            );
            // Don't fail the whole job if email fails
          }
        }

        results.generated++;
        results.details.push({
          id: recurring.id,
          invoiceNumber,
        });
      } catch (error) {
        results.errors++;
        results.details.push({
          id: recurring.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        console.error(
          `Failed to generate invoice for recurring invoice ${recurring.id}:`,
          error
        );
      }
    }

    return results;
  }
);

// Helper function to calculate next run date
function calculateNextRunDate(params: {
  startDate: Date;
  frequency: string;
  interval: number;
  dayOfMonth?: number | null;
  dayOfWeek?: number | null;
  lastRunDate?: Date | null;
}): Date {
  const { startDate, frequency, interval, dayOfMonth, dayOfWeek, lastRunDate } =
    params;

  // Start from lastRunDate if available, otherwise from startDate
  const baseDate = lastRunDate || startDate;
  const nextDate = new Date(baseDate);

  switch (frequency) {
    case "DAILY":
      nextDate.setDate(nextDate.getDate() + interval);
      break;

    case "WEEKLY":
      nextDate.setDate(nextDate.getDate() + 7 * interval);
      // Adjust to specific day of week if provided
      if (dayOfWeek !== null && dayOfWeek !== undefined) {
        const currentDay = nextDate.getDay();
        const diff = dayOfWeek - currentDay;
        nextDate.setDate(nextDate.getDate() + diff);
      }
      break;

    case "BIWEEKLY":
      nextDate.setDate(nextDate.getDate() + 14 * interval);
      break;

    case "MONTHLY":
      nextDate.setMonth(nextDate.getMonth() + interval);
      // Adjust to specific day of month if provided
      if (dayOfMonth !== null && dayOfMonth !== undefined) {
        nextDate.setDate(dayOfMonth);
      }
      break;

    case "QUARTERLY":
      nextDate.setMonth(nextDate.getMonth() + 3 * interval);
      if (dayOfMonth !== null && dayOfMonth !== undefined) {
        nextDate.setDate(dayOfMonth);
      }
      break;

    case "SEMIANNUALLY":
      nextDate.setMonth(nextDate.getMonth() + 6 * interval);
      if (dayOfMonth !== null && dayOfMonth !== undefined) {
        nextDate.setDate(dayOfMonth);
      }
      break;

    case "ANNUALLY":
      nextDate.setFullYear(nextDate.getFullYear() + interval);
      if (dayOfMonth !== null && dayOfMonth !== undefined) {
        nextDate.setDate(dayOfMonth);
      }
      break;
  }

  return nextDate;
}

// Send overdue invoice reminders (dunning)
export const sendOverdueInvoiceReminders = inngest.createFunction(
  { id: "send-overdue-invoice-reminders", retries: 0 },
  { cron: "0 9 * * *" }, // Run daily at 9 AM
  async () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Find all unpaid invoices that are overdue
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: {
          in: ["SENT", "PARTIALLY_PAID"],
        },
        dueDate: {
          lt: today,
        },
        contactEmail: {
          not: null,
        },
      },
      include: {
        invoiceLineItem: { orderBy: { order: "asc" } },
        invoiceReminder: {
          where: { isDunning: true },
          orderBy: { sentAt: "desc" },
        },
      },
    });

    const results = {
      processed: 0,
      sent: 0,
      skipped: 0,
      errors: 0,
      details: [] as Array<{
        invoiceNumber: string;
        daysOverdue: number;
        action: string;
        error?: string;
      }>,
    };

    for (const invoice of overdueInvoices) {
      results.processed++;

      try {
        // Calculate days overdue
        const daysOverdue = Math.floor(
          (today.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Load dunning settings (prefer subaccount, fallback to org)
        let dunningSettings: {
          enabled: boolean;
          days: number[];
        } = {
          enabled: true,
          days: [7, 14, 30], // Default schedule
        };

        if (invoice.subaccountId) {
          const subaccount = await prisma.subaccount.findUnique({
            where: { id: invoice.subaccountId },
            select: {
              dunningEnabled: true,
              dunningDays: true,
            },
          });

          if (subaccount) {
            dunningSettings.enabled = subaccount.dunningEnabled;
            if (subaccount.dunningDays) {
              dunningSettings.days = subaccount.dunningDays as number[];
            }
          }
        } else {
          const org = await prisma.organization.findUnique({
            where: { id: invoice.organizationId },
            select: {
              dunningEnabled: true,
              dunningDays: true,
            },
          });

          if (org) {
            dunningSettings.enabled = org.dunningEnabled;
            if (org.dunningDays) {
              dunningSettings.days = org.dunningDays as number[];
            }
          }
        }

        // Skip if dunning is disabled
        if (!dunningSettings.enabled) {
          results.skipped++;
          results.details.push({
            invoiceNumber: invoice.invoiceNumber,
            daysOverdue,
            action: "skipped - dunning disabled",
          });
          continue;
        }

        // Check if we should send a reminder today
        const shouldSendReminder = dunningSettings.days.includes(daysOverdue);

        if (!shouldSendReminder) {
          results.skipped++;
          results.details.push({
            invoiceNumber: invoice.invoiceNumber,
            daysOverdue,
            action: `skipped - not a reminder day (${daysOverdue} days overdue)`,
          });
          continue;
        }

        // Check if we already sent a reminder for this exact day count
        const alreadySent = invoice.invoiceReminder.some(
          (r: any) => r.isDunning && r.daysOverdue === daysOverdue
        );

        if (alreadySent) {
          results.skipped++;
          results.details.push({
            invoiceNumber: invoice.invoiceNumber,
            daysOverdue,
            action: "skipped - reminder already sent for this day",
          });
          continue;
        }

        // Determine reminder level/urgency
        let urgency: "gentle" | "firm" | "urgent";
        if (daysOverdue <= 7) {
          urgency = "gentle";
        } else if (daysOverdue <= 21) {
          urgency = "firm";
        } else {
          urgency = "urgent";
        }

        // Load branding for email
        const org = await prisma.organization.findUnique({
          where: { id: invoice.organizationId },
        });

        const subaccount = invoice.subaccountId
          ? await prisma.subaccount.findUnique({
              where: { id: invoice.subaccountId },
            })
          : null;

        const fromName = subaccount?.companyName || org?.name || "";
        const fromEmail =
          subaccount?.businessEmail || org?.businessEmail || "";

        // Generate email content based on urgency
        const { sendInvoiceReminder } = await import("@/lib/email");
        const { generatePDF } = await import(
          "@/features/invoicing/lib/pdf-generator"
        );

        // Build invoice data for PDF
        const brandingName = subaccount?.companyName || org?.name || "";
        const brandingEmail =
          subaccount?.businessEmail || org?.businessEmail || "";
        const brandingPhone =
          subaccount?.businessPhone || org?.businessPhone || "";

        let brandingAddress;
        if (subaccount) {
          brandingAddress = {
            street: subaccount.addressLine1 || undefined,
            city: subaccount.city || undefined,
            state: subaccount.state || undefined,
            zip: subaccount.postalCode || undefined,
            country: subaccount.country || undefined,
          };
        } else if (org?.businessAddress) {
          brandingAddress = org.businessAddress as {
            street?: string;
            city?: string;
            state?: string;
            zip?: string;
            country?: string;
          };
        }

        const invoiceData = {
          invoiceNumber: invoice.invoiceNumber,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          contactName: invoice.contactName,
          contactEmail: invoice.contactEmail,
          contactAddress: invoice.contactAddress
            ? (invoice.contactAddress as Record<string, unknown>)
            : null,
          subtotal: invoice.subtotal.toString(),
          taxRate: invoice.taxRate?.toString(),
          taxAmount: invoice.taxAmount.toString(),
          discountAmount: invoice.discountAmount.toString(),
          total: invoice.total.toString(),
          currency: invoice.currency,
          notes: invoice.notes || "",
          termsConditions: invoice.termsConditions || "",
          lineItems: invoice.invoiceLineItem.map((item: any) => ({
            description: item.description,
            quantity: item.quantity.toNumber(),
            unitPrice: item.unitPrice.toString(),
            amount: item.amount.toString(),
          })),
          businessName: brandingName,
          businessEmail: brandingEmail,
          businessPhone: brandingPhone,
          businessAddress: brandingAddress,
        };

        const pdfBuffer = await generatePDF(invoiceData as any, { design: "minimal" } as any);

        const appUrl = process.env.APP_URL || "http://localhost:3000";
        const paymentLink = `${appUrl}/invoices/pay/${invoice.id}`;

        // Customize message based on urgency
        let subject: string;
        let message: string;

        if (urgency === "gentle") {
          subject = `Gentle Reminder: Invoice ${invoice.invoiceNumber} is now overdue`;
          message = `Hi ${invoice.contactName},

This is a friendly reminder that invoice ${invoice.invoiceNumber} for ${invoice.currency} ${invoice.amountDue} was due on ${invoice.dueDate.toLocaleDateString()}.

The invoice is now ${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue. We understand that sometimes invoices get overlooked, so we wanted to send a gentle reminder.

You can view and pay the invoice using the link below.`;
        } else if (urgency === "firm") {
          subject = `Payment Required: Invoice ${invoice.invoiceNumber} is ${daysOverdue} days overdue`;
          message = `Hi ${invoice.contactName},

We hope this message finds you well. We wanted to follow up regarding invoice ${invoice.invoiceNumber} for ${invoice.currency} ${invoice.amountDue}, which was due on ${invoice.dueDate.toLocaleDateString()}.

The invoice is now ${daysOverdue} days overdue. We kindly request that you process this payment at your earliest convenience.

If you have any questions or concerns about this invoice, please don't hesitate to reach out.`;
        } else {
          subject = `URGENT: Invoice ${invoice.invoiceNumber} is significantly overdue`;
          message = `Hi ${invoice.contactName},

This is an urgent reminder regarding invoice ${invoice.invoiceNumber} for ${invoice.currency} ${invoice.amountDue}.

The invoice was due on ${invoice.dueDate.toLocaleDateString()} and is now ${daysOverdue} days overdue.

We kindly request immediate payment to avoid any service interruptions or late fees. If payment has already been made, please contact us to confirm.

Please process this payment as soon as possible or contact us to discuss payment arrangements.`;
        }

        // Send the reminder email
        await sendInvoiceReminder({
          to: invoice.contactEmail || "",
          subject,
          message,
          invoiceNumber: invoice.invoiceNumber,
          pdfBuffer,
          paymentLink,
        });

        // Record the reminder in the database
        await prisma.invoiceReminder.create({
          data: {
            id: crypto.randomUUID(),
            invoiceId: invoice.id,
            sentTo: invoice.contactEmail || "",
            subject,
            message,
            isDunning: true,
            daysOverdue,
            createdAt: new Date(),
          },
        });

        results.sent++;
        results.details.push({
          invoiceNumber: invoice.invoiceNumber,
          daysOverdue,
          action: `sent ${urgency} reminder`,
        });

        console.log(
          `Sent ${urgency} dunning reminder for invoice ${invoice.invoiceNumber} (${daysOverdue} days overdue)`
        );
      } catch (error) {
        results.errors++;
        results.details.push({
          invoiceNumber: invoice.invoiceNumber,
          daysOverdue: 0,
          action: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
        console.error(
          `Failed to send dunning reminder for invoice ${invoice.invoiceNumber}:`,
          error
        );
      }
    }

    console.log(
      `Dunning complete: ${results.sent} sent, ${results.skipped} skipped, ${results.errors} errors`
    );
    return results;
  }
);

/**
 * Check for expiring worker documents and send reminders
 * Runs daily at 9am
 */
export const checkExpiringDocuments = inngest.createFunction(
  {
    id: "check-expiring-documents",
    retries: 3,
  },
  { cron: "0 9 * * *" }, // Daily at 9am
  async ({ step }) => {
    const { sendDocumentExpiryReminder } = await import(
      "@/features/workers/lib/worker-emails"
    );

    const results = {
      checked: 0,
      sent: 0,
      errors: 0,
    };

    // Get all documents that:
    // 1. Have an expiry date
    // 2. Are approved
    // 3. Expire within 30 days OR are already expired
    // 4. Haven't had a notification sent in the last 7 days (to avoid spam)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const documents = await prisma.workerDocument.findMany({
      where: {
        expiryDate: {
          lte: thirtyDaysFromNow,
        },
        status: "APPROVED",
        OR: [
          { expiryNotificationSent: false },
          {
            expiryNotificationDate: {
              lte: sevenDaysAgo,
            },
          },
        ],
      },
      include: {
        worker: true,
      },
    });

    console.log(
      `Found ${documents.length} documents requiring expiry notifications`
    );
    results.checked = documents.length;

    for (const document of documents) {
      if (!document.worker.isActive || !document.worker.email) {
        console.log(
          `Skipping document ${document.id} - worker inactive or no email`
        );
        continue;
      }

      const now = new Date();
      const expiryDate = new Date(document.expiryDate!);
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Send notification
      try {
        const portalUrl = `${process.env.APP_URL || "http://localhost:3000"}/portal/${document.worker.id}/documents`;

        await sendDocumentExpiryReminder({
          workerEmail: document.worker.email,
          workerName: document.worker.name,
          documentName: document.name,
          documentType: document.type,
          expiryDate: expiryDate,
          daysUntilExpiry: daysUntilExpiry,
          portalUrl: portalUrl,
        });

        // Update notification flag
        await prisma.workerDocument.update({
          where: { id: document.id },
          data: {
            expiryNotificationSent: true,
            expiryNotificationDate: new Date(),
          },
        });

        results.sent++;
        console.log(
          `Sent expiry notification for document ${document.id} to ${document.worker.email}`
        );

        // Update document status to EXPIRED if past expiry date
        if (daysUntilExpiry < 0 && document.status !== "EXPIRED") {
          await prisma.workerDocument.update({
            where: { id: document.id },
            data: { status: "EXPIRED" },
          });
          console.log(`Updated document ${document.id} status to EXPIRED`);
        }
      } catch (error) {
        results.errors++;
        console.error(
          `Failed to send expiry notification for document ${document.id}:`,
          error
        );
      }
    }

    console.log(
      `Document expiry check complete: ${results.checked} checked, ${results.sent} sent, ${results.errors} errors`
    );
    return results;
  }
);
