import { inngest } from "@/inngest/client";
import { db } from "@/db";
import { campaign as campaignTable, campaignRecipient, unsubscribeToken } from "@/db/schema";
import { and, eq, lte } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { Resend } from "resend";
import { renderCampaignEmail, getFirstName } from "@/features/campaigns/lib/render-email";
import { buildClientWhereClause } from "@/features/campaigns/server/routers";
import type { EmailContent, EmailDesign, SegmentFilter, CampaignVariables } from "@/features/campaigns/types";
import { randomBytes } from "crypto";

// Helper to generate secure tokens
function generateToken(): string {
  return randomBytes(32).toString("hex");
}

// Get the Resend client
function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(process.env.RESEND_API_KEY);
}

// Main campaign sending function
export const sendCampaign = inngest.createFunction(
  {
    id: "send-campaign",
    retries: 3,
  },
  { event: "campaign/send" },
  async ({ event, step }) => {
    const { campaignId, organizationId, locationId } = event.data;

    // Step 1: Get campaign details
    const selectedCampaign = await step.run("get-campaign", async () => {
      return db.query.campaign.findFirst({
        where: eq(campaignTable.id, campaignId),
        with: {
          emailDomain: true,
          emailTemplate: true,
        },
      });
    });

    if (!selectedCampaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    // Step 2: Update campaign status to SENDING
    await step.run("update-status-sending", async () => {
      return db
        .update(campaignTable)
        .set({ status: "SENDING", updatedAt: new Date() })
        .where(eq(campaignTable.id, campaignId));
    });

    // Step 3: Get clients based on segment
    const clients = await step.run("get-clients", async () => {
      const where = buildClientWhereClause(
        organizationId,
        locationId,
        selectedCampaign.segmentType,
        selectedCampaign.segmentFilter as SegmentFilter | undefined
      );

      return db.query.client.findMany({
        where,
        columns: {
          id: true,
          name: true,
          email: true,
          companyName: true,
        },
      });
    });

    if (clients.length === 0) {
      await step.run("update-status-sent-no-recipients", async () => {
        return db
          .update(campaignTable)
          .set({
            status: "SENT",
            sentAt: new Date(),
            totalRecipients: 0,
            updatedAt: new Date(),
          })
          .where(eq(campaignTable.id, campaignId));
      });

      return { success: true, sent: 0, message: "No clients to send to" };
    }

    // Step 4: Create campaign recipients
    await step.run("create-recipients", async () => {
      const recipientData = clients.map((client) => ({
        id: createId(),
        campaignId,
        clientId: client.id,
        status: "PENDING" as const,
        updatedAt: new Date(),
      }));

      await db.insert(campaignRecipient).values(recipientData).onConflictDoNothing();
    });

    // Step 5: Determine the from address
    const fromAddress = await step.run("determine-from-address", async () => {
      let fromName = selectedCampaign.fromName;
      let fromEmail = selectedCampaign.fromEmail;
      let domain = selectedCampaign.emailDomain?.domain;

      if (!domain) {
        // Fall back to system default
        domain = process.env.RESEND_FROM_EMAIL?.split("@")[1] || "example.com";
        fromEmail = fromEmail || "noreply";
      }

      if (!fromName) {
        fromName = selectedCampaign.emailDomain?.defaultFromName || "Newsletter";
      }

      if (!fromEmail) {
        fromEmail = selectedCampaign.emailDomain?.defaultFromEmail || "hello";
      }

      return {
        from: `${fromName} <${fromEmail}@${domain}>`,
        replyTo: selectedCampaign.replyTo || selectedCampaign.emailDomain?.defaultReplyTo || undefined,
      };
    });

    // Step 6: Send emails in batches
    const BATCH_SIZE = 50; // Resend allows up to 100 emails per batch
    const batches = [];
    for (let i = 0; i < clients.length; i += BATCH_SIZE) {
      batches.push(clients.slice(i, i + BATCH_SIZE));
    }

    let totalSent = 0;
    let totalFailed = 0;

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      const batchResults = await step.run(`send-batch-${batchIndex}`, async () => {
        const resend = getResendClient();
        const results: { clientId: string; success: boolean; resendEmailId?: string; error?: string }[] = [];

        // Send emails one by one (for personalization and tracking)
        for (const client of batch) {
          try {
            // Generate unsubscribe token
            const token = generateToken();
            const unsubscribeUrl = `${process.env.APP_URL || "http://localhost:3000"}/unsubscribe?token=${token}`;

            // Store unsubscribe token
            await db.insert(unsubscribeToken).values({
              id: createId(),
              clientId: client.id,
              campaignId,
              token,
              expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            });

            // Prepare variables for template
            const variables: CampaignVariables = {
              name: client.name,
              firstName: getFirstName(client.name),
              email: client.email!,
              companyName: client.companyName || undefined,
              unsubscribe_url: unsubscribeUrl,
            };

            const subject = selectedCampaign.subject
              .replace(/\{\{client\.firstName\}\}/g, variables.firstName)
              .replace(/\{\{client\.name\}\}/g, variables.name);

            if (selectedCampaign.resendTemplateId) {
              const templateVariables = {
                "client.name": variables.name,
                "client.firstName": variables.firstName,
                "client.email": variables.email,
                "client.companyName": variables.companyName || "",
                client_name: variables.name,
                client_first_name: variables.firstName,
                client_email: variables.email,
                client_company_name: variables.companyName || "",
                unsubscribe_url: variables.unsubscribe_url,
                view_in_browser_url: variables.view_in_browser_url || "",
              };

              const { data, error } = await resend.emails.send({
                from: fromAddress.from,
                to: client.email!,
                replyTo: fromAddress.replyTo,
                subject,
                template: {
                  id: selectedCampaign.resendTemplateId,
                  variables: templateVariables,
                },
              });

              if (error) {
                results.push({ clientId: client.id, success: false, error: error.message });
              } else {
                results.push({ clientId: client.id, success: true, resendEmailId: data?.id });
              }
              continue;
            }

            // Render email
            const content = selectedCampaign.content as EmailContent;
            const design = (selectedCampaign.emailTemplate?.design as EmailDesign | null) || undefined;

            const { html, text } = await renderCampaignEmail({
              content,
              design,
              variables,
            });

            // Send email via Resend
            const { data, error } = await resend.emails.send({
              from: fromAddress.from,
              to: client.email!,
              replyTo: fromAddress.replyTo,
              subject,
              html,
              text,
            });

            if (error) {
              results.push({ clientId: client.id, success: false, error: error.message });
            } else {
              results.push({ clientId: client.id, success: true, resendEmailId: data?.id });
            }
          } catch (err) {
            results.push({
              clientId: client.id,
              success: false,
              error: err instanceof Error ? err.message : "Unknown error",
            });
          }
        }

        return results;
      });

      // Update recipient statuses
      await step.run(`update-recipients-${batchIndex}`, async () => {
        for (const result of batchResults) {
          if (result.success) {
            await db
              .update(campaignRecipient)
              .set({
                status: "SENT",
                resendEmailId: result.resendEmailId,
                updatedAt: new Date(),
              })
              .where(and(eq(campaignRecipient.campaignId, campaignId), eq(campaignRecipient.clientId, result.clientId)));
            totalSent++;
          } else {
            await db
              .update(campaignRecipient)
              .set({
                status: "FAILED",
                updatedAt: new Date(),
              })
              .where(and(eq(campaignRecipient.campaignId, campaignId), eq(campaignRecipient.clientId, result.clientId)));
            totalFailed++;
          }
        }
      });

      // Add a small delay between batches to avoid rate limiting
      if (batchIndex < batches.length - 1) {
        await step.sleep("batch-delay", "1s");
      }
    }

    // Step 7: Update campaign status to SENT
    await step.run("update-status-sent", async () => {
      return db
        .update(campaignTable)
        .set({
          status: "SENT",
          sentAt: new Date(),
          totalRecipients: clients.length,
          delivered: totalSent, // Initially set to sent, webhooks will update later
          updatedAt: new Date(),
        })
        .where(eq(campaignTable.id, campaignId));
    });

    return {
      success: true,
      campaignId,
      totalRecipients: clients.length,
      sent: totalSent,
      failed: totalFailed,
    };
  }
);

// Scheduled job to check for campaigns that need to be sent
export const checkScheduledCampaigns = inngest.createFunction(
  {
    id: "check-scheduled-campaigns",
  },
  { cron: "*/5 * * * *" }, // Every 5 minutes
  async ({ step }) => {
    // Find campaigns that are scheduled and due
    const dueCampaigns = await step.run("get-due-campaigns", async () => {
      return db.query.campaign.findMany({
        where: and(eq(campaignTable.status, "SCHEDULED"), lte(campaignTable.scheduledAt, new Date())),
        columns: {
          id: true,
          organizationId: true,
          locationId: true,
        },
      });
    });

    if (dueCampaigns.length === 0) {
      return { triggered: 0 };
    }

    // Trigger send for each due campaign
    for (const dueCampaign of dueCampaigns) {
      await step.run(`trigger-campaign-${dueCampaign.id}`, async () => {
        await db
          .update(campaignTable)
          .set({ status: "QUEUED", updatedAt: new Date() })
          .where(eq(campaignTable.id, dueCampaign.id));

        // Send event to trigger the campaign
        await inngest.send({
          name: "campaign/send",
          data: {
            campaignId: dueCampaign.id,
            organizationId: dueCampaign.organizationId,
            locationId: dueCampaign.locationId,
          },
        });
      });
    }

    return { triggered: dueCampaigns.length };
  }
);
