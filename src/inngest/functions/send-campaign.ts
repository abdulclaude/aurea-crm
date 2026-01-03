import { inngest } from "@/inngest/client";
import prisma from "@/lib/db";
import { Resend } from "resend";
import { renderCampaignEmail, getFirstName } from "@/features/campaigns/lib/render-email";
import { buildContactWhereClause } from "@/features/campaigns/server/routers";
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
    const { campaignId, organizationId, subaccountId } = event.data;

    // Step 1: Get campaign details
    const campaign = await step.run("get-campaign", async () => {
      return prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          emailDomain: true,
          template: true,
        },
      });
    });

    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    // Step 2: Update campaign status to SENDING
    await step.run("update-status-sending", async () => {
      return prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "SENDING" },
      });
    });

    // Step 3: Get contacts based on segment
    const contacts = await step.run("get-contacts", async () => {
      const where = buildContactWhereClause(
        organizationId,
        subaccountId,
        campaign.segmentType,
        campaign.segmentFilter as SegmentFilter | undefined
      );

      return prisma.contact.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          companyName: true,
        },
      });
    });

    if (contacts.length === 0) {
      await step.run("update-status-sent-no-recipients", async () => {
        return prisma.campaign.update({
          where: { id: campaignId },
          data: {
            status: "SENT",
            sentAt: new Date(),
            totalRecipients: 0,
          },
        });
      });

      return { success: true, sent: 0, message: "No contacts to send to" };
    }

    // Step 4: Create campaign recipients
    await step.run("create-recipients", async () => {
      const recipientData = contacts.map((contact) => ({
        campaignId,
        contactId: contact.id,
        status: "PENDING" as const,
      }));

      await prisma.campaignRecipient.createMany({
        data: recipientData,
        skipDuplicates: true,
      });
    });

    // Step 5: Determine the from address
    const fromAddress = await step.run("determine-from-address", async () => {
      let fromName = campaign.fromName;
      let fromEmail = campaign.fromEmail;
      let domain = campaign.emailDomain?.domain;

      if (!domain) {
        // Fall back to system default
        domain = process.env.RESEND_FROM_EMAIL?.split("@")[1] || "example.com";
        fromEmail = fromEmail || "noreply";
      }

      if (!fromName) {
        fromName = campaign.emailDomain?.defaultFromName || "Newsletter";
      }

      if (!fromEmail) {
        fromEmail = campaign.emailDomain?.defaultFromEmail || "hello";
      }

      return {
        from: `${fromName} <${fromEmail}@${domain}>`,
        replyTo: campaign.replyTo || campaign.emailDomain?.defaultReplyTo || undefined,
      };
    });

    // Step 6: Send emails in batches
    const BATCH_SIZE = 50; // Resend allows up to 100 emails per batch
    const batches = [];
    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      batches.push(contacts.slice(i, i + BATCH_SIZE));
    }

    let totalSent = 0;
    let totalFailed = 0;

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      const batchResults = await step.run(`send-batch-${batchIndex}`, async () => {
        const resend = getResendClient();
        const results: { contactId: string; success: boolean; resendEmailId?: string; error?: string }[] = [];

        // Send emails one by one (for personalization and tracking)
        for (const contact of batch) {
          try {
            // Generate unsubscribe token
            const token = generateToken();
            const unsubscribeUrl = `${process.env.APP_URL || "http://localhost:3000"}/unsubscribe?token=${token}`;

            // Store unsubscribe token
            await prisma.unsubscribeToken.create({
              data: {
                contactId: contact.id,
                campaignId,
                token,
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
              },
            });

            // Prepare variables for template
            const variables: CampaignVariables = {
              name: contact.name,
              firstName: getFirstName(contact.name),
              email: contact.email!,
              companyName: contact.companyName || undefined,
              unsubscribe_url: unsubscribeUrl,
            };

            const subject = campaign.subject
              .replace(/\{\{contact\.firstName\}\}/g, variables.firstName)
              .replace(/\{\{contact\.name\}\}/g, variables.name);

            if (campaign.resendTemplateId) {
              const templateVariables = {
                "contact.name": variables.name,
                "contact.firstName": variables.firstName,
                "contact.email": variables.email,
                "contact.companyName": variables.companyName || "",
                contact_name: variables.name,
                contact_first_name: variables.firstName,
                contact_email: variables.email,
                contact_company_name: variables.companyName || "",
                unsubscribe_url: variables.unsubscribe_url,
                view_in_browser_url: variables.view_in_browser_url || "",
              };

              const { data, error } = await resend.emails.send({
                from: fromAddress.from,
                to: contact.email!,
                replyTo: fromAddress.replyTo,
                subject,
                template: {
                  id: campaign.resendTemplateId,
                  variables: templateVariables,
                },
              });

              if (error) {
                results.push({ contactId: contact.id, success: false, error: error.message });
              } else {
                results.push({ contactId: contact.id, success: true, resendEmailId: data?.id });
              }
              continue;
            }

            // Render email
            const content = campaign.content as unknown as EmailContent;
            const design = (campaign.template?.design as unknown as EmailDesign) || undefined;

            const { html, text } = await renderCampaignEmail({
              content,
              design,
              variables,
            });

            // Send email via Resend
            const { data, error } = await resend.emails.send({
              from: fromAddress.from,
              to: contact.email!,
              replyTo: fromAddress.replyTo,
              subject,
              html,
              text,
            });

            if (error) {
              results.push({ contactId: contact.id, success: false, error: error.message });
            } else {
              results.push({ contactId: contact.id, success: true, resendEmailId: data?.id });
            }
          } catch (err) {
            results.push({
              contactId: contact.id,
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
            await prisma.campaignRecipient.updateMany({
              where: {
                campaignId,
                contactId: result.contactId,
              },
              data: {
                status: "SENT",
                resendEmailId: result.resendEmailId,
              },
            });
            totalSent++;
          } else {
            await prisma.campaignRecipient.updateMany({
              where: {
                campaignId,
                contactId: result.contactId,
              },
              data: {
                status: "FAILED",
              },
            });
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
      return prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: "SENT",
          sentAt: new Date(),
          totalRecipients: contacts.length,
          delivered: totalSent, // Initially set to sent, webhooks will update later
        },
      });
    });

    return {
      success: true,
      campaignId,
      totalRecipients: contacts.length,
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
      return prisma.campaign.findMany({
        where: {
          status: "SCHEDULED",
          scheduledAt: { lte: new Date() },
        },
        select: {
          id: true,
          organizationId: true,
          subaccountId: true,
        },
      });
    });

    if (dueCampaigns.length === 0) {
      return { triggered: 0 };
    }

    // Trigger send for each due campaign
    for (const campaign of dueCampaigns) {
      await step.run(`trigger-campaign-${campaign.id}`, async () => {
        // Update status to QUEUED
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { status: "QUEUED" },
        });

        // Send event to trigger the campaign
        await inngest.send({
          name: "campaign/send",
          data: {
            campaignId: campaign.id,
            organizationId: campaign.organizationId,
            subaccountId: campaign.subaccountId,
          },
        });
      });
    }

    return { triggered: dueCampaigns.length };
  }
);
