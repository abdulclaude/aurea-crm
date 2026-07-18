import type { CommunicationFixtures, GrowthBuildScope, GrowthPackFixtures } from "./types";
import { audienceDefinition, before, emailContent, safeEmail } from "./shared";

type CampaignFixtures = Pick<
  CommunicationFixtures,
  "providers" | "domains" | "templates" | "audiences" | "campaigns" | "campaignRuns" | "deliveries" | "recipients"
>;

export function buildCampaignFixtures(scope: GrowthBuildScope): CampaignFixtures {
  const { context, clients, id, metadata } = scope;
  const { organizationId, locationId, actorUserId, referenceDate, runId } = context;
const resendProviderId = id("provider", "resend");
const smsProviderId = id("provider", "twilio");
const providers: GrowthPackFixtures["providers"] = [
  {
    id: resendProviderId,
    organizationId,
    locationId,
    provider: "RESEND",
    displayName: "Demo email connection",
    environment: "test",
    status: "DISCONNECTED",
    isDefault: false,
    capabilities: [],
    config: metadata({ channel: "EMAIL" }),
    createdByUserId: actorUserId,
    lastErrorCode: "DEMO_DISCONNECTED",
  },
  {
    id: smsProviderId,
    organizationId,
    locationId,
    provider: "TWILIO",
    displayName: "Demo SMS connection",
    environment: "test",
    status: "DISCONNECTED",
    isDefault: false,
    capabilities: [],
    config: metadata({ channel: "SMS" }),
    createdByUserId: actorUserId,
    lastErrorCode: "DEMO_DISCONNECTED",
  },
];
const domainId = id("email-domain", 0);
const domains: GrowthPackFixtures["domains"] = [
  {
    id: domainId,
    organizationId,
    locationId,
    providerAccountId: resendProviderId,
    domain: `${runId.slice(0, 8)}.demo.invalid`,
    status: "PENDING",
    dnsRecords: [],
    defaultFromName: "Aurea Demo Studio",
    defaultFromEmail: "studio@demo.invalid",
    defaultReplyTo: "replies@demo.invalid",
    updatedAt: referenceDate,
  },
];
const templateDefinitions = [
  ["Member welcome", "Welcome to your studio", "Everything you need for a confident first week."],
  ["Weekly schedule", "Your week at the studio", "Classes chosen around energy, recovery, and consistency."],
  ["We miss you", "A gentle invitation back", "A simple way to restart without pressure."],
] as const;
const templates: GrowthPackFixtures["templates"] = templateDefinitions.map(
  ([name, subject, preheader], index) => ({
    id: id("email-template", index),
    organizationId,
    locationId,
    name,
    description: `${name} demo template`,
    type: index === 2 ? "PLAIN" : "MARKETING",
    content: emailContent(subject, preheader, `${preheader} This is historical demo content and cannot be sent.`),
    design: metadata({ templateIndex: index }),
    isSystemTemplate: false,
    updatedAt: before(referenceDate, 120 - index * 12),
  }),
);
const audienceNames = ["Active members", "Win-back members", "Qualified leads"] as const;
const audienceVariants = ["MEMBERS", "WIN_BACK", "LEADS"] as const;
const audiences: GrowthPackFixtures["audiences"] = audienceNames.map((name, index) => ({
  id: id("audience", index),
  organizationId,
  locationId,
  name,
  description: `${name} demo audience`,
  definition: audienceDefinition(audienceVariants[index] ?? "LEADS"),
  schemaVersion: 2,
  createdById: actorUserId,
  updatedById: actorUserId,
  updatedAt: before(referenceDate, 90 - index * 8),
}));

const campaignDefinitions = [
  { name: "September member rhythm", subject: "Build your September rhythm", status: "SENT" as const, daysAgo: 34 },
  { name: "Summer win-back", subject: "Your next class is waiting", status: "SENT" as const, daysAgo: 78 },
  { name: "New lead welcome", subject: "A calm first step", status: "DRAFT" as const, daysAgo: 3 },
];
const sentRecipientCount = Math.min(Math.max(clients.length, 24), 48);
const statusCycle = ["CLICKED", "OPENED", "DELIVERED", "DELIVERED", "BOUNCED", "FAILED", "UNSUBSCRIBED", "COMPLAINED"] as const;
const campaignRows: GrowthPackFixtures["campaigns"] = [];
const campaignRuns: GrowthPackFixtures["campaignRuns"] = [];
const deliveries: GrowthPackFixtures["deliveries"] = [];
const recipients: GrowthPackFixtures["recipients"] = [];
for (const [campaignIndex, definition] of campaignDefinitions.entries()) {
  const campaignId = id("campaign", campaignIndex);
  const content = emailContent(
    definition.subject,
    "Thoughtful studio news, delivered at the right moment.",
    "This historical campaign demonstrates delivery analytics without contacting anyone.",
  );
  const isSent = definition.status === "SENT";
  const campaignRecipients = isSent
    ? Array.from({ length: sentRecipientCount }, (_, index) => {
        const client = clients[(index + campaignIndex * 11) % clients.length] ?? clients[0];
        if (!client) throw new Error("A campaign recipient client was not available.");
        const recipientStatus = statusCycle[(index + campaignIndex) % statusCycle.length] ?? "DELIVERED";
        return { client, index, recipientStatus };
      })
    : [];
  const deliveredCount = campaignRecipients.filter(({ recipientStatus }) =>
    ["CLICKED", "OPENED", "DELIVERED", "UNSUBSCRIBED", "COMPLAINED"].includes(recipientStatus),
  ).length;
  const runIdForCampaign = id("campaign-run", campaignIndex);
  const sentAt = before(referenceDate, definition.daysAgo);
  campaignRows.push({
    id: campaignId,
    organizationId,
    locationId,
    name: definition.name,
    status: definition.status,
    templateId: templates[campaignIndex]?.id ?? templates[0]?.id,
    subject: definition.subject,
    preheaderText: content.preheader,
    content,
    emailDomainId: domainId,
    fromName: "Aurea Demo Studio",
    fromEmail: "studio@demo.invalid",
    replyTo: "replies@demo.invalid",
    savedAudienceId: audiences[campaignIndex]?.id ?? audiences[0]?.id,
    segmentType: "CUSTOM",
    segmentFilter: metadata({ audienceId: audiences[campaignIndex]?.id }),
    sentAt: isSent ? sentAt : undefined,
    totalRecipients: campaignRecipients.length,
    delivered: deliveredCount,
    opened: campaignRecipients.filter(({ recipientStatus }) => ["OPENED", "CLICKED"].includes(recipientStatus)).length,
    clicked: campaignRecipients.filter(({ recipientStatus }) => recipientStatus === "CLICKED").length,
    bounced: campaignRecipients.filter(({ recipientStatus }) => recipientStatus === "BOUNCED").length,
    complained: campaignRecipients.filter(({ recipientStatus }) => recipientStatus === "COMPLAINED").length,
    unsubscribed: campaignRecipients.filter(({ recipientStatus }) => recipientStatus === "UNSUBSCRIBED").length,
    updatedAt: isSent ? sentAt : referenceDate,
  });
  if (!isSent) continue;
  const failedCount = campaignRecipients.filter(({ recipientStatus }) => recipientStatus === "FAILED").length;
  const bouncedCount = campaignRecipients.filter(({ recipientStatus }) => recipientStatus === "BOUNCED").length;
  campaignRuns.push({
    id: runIdForCampaign,
    campaignId,
    organizationId,
    locationId,
    requestedBy: actorUserId,
    status: failedCount + bouncedCount > 0 ? "PARTIAL" : "COMPLETED",
    idempotencyKey: `demo:${runId}:campaign:${campaignIndex}`,
    audienceSnapshot: metadata({ audienceId: audiences[campaignIndex]?.id }),
    contentSnapshot: content,
    senderSnapshot: { providerAccountId: resendProviderId, from: "studio@demo.invalid" },
    totalRecipients: campaignRecipients.length,
    queued: 0,
    accepted: campaignRecipients.length - failedCount,
    delivered: deliveredCount,
    bounced: bouncedCount,
    suppressed: 0,
    failed: failedCount,
    preparedAt: before(sentAt, 0, -1),
    startedAt: sentAt,
    completedAt: new Date(sentAt.getTime() + 4 * 60_000),
    createdAt: before(sentAt, 0, -1),
    updatedAt: new Date(sentAt.getTime() + 4 * 60_000),
  });
  for (const { client, index, recipientStatus } of campaignRecipients) {
    const recipientId = id(`campaign-${campaignIndex}-recipient`, index);
    const deliveryId = id(`campaign-${campaignIndex}-delivery`, index);
    const delivered = ["CLICKED", "OPENED", "DELIVERED", "UNSUBSCRIBED", "COMPLAINED"].includes(recipientStatus);
    const deliveryStatus = recipientStatus === "BOUNCED" ? "BOUNCED" : recipientStatus === "FAILED" ? "DEAD_LETTER" : "DELIVERED";
    const eventAt = new Date(sentAt.getTime() + (index + 1) * 60_000);
    deliveries.push({
      id: deliveryId,
      organizationId,
      locationId,
      clientId: client.id,
      channel: "EMAIL",
      purpose: "MARKETING",
      provider: "RESEND",
      status: deliveryStatus,
      providerAccountId: resendProviderId,
      providerAccountRef: resendProviderId,
      sourceType: "CAMPAIGN_RECIPIENT",
      sourceId: recipientId,
      destination: safeEmail(client, index),
      destinationNormalized: safeEmail(client, index),
      senderRef: { kind: "EMAIL_DOMAIN", id: domainId, fromName: "Aurea Demo Studio", fromEmail: "studio@demo.invalid" },
      payload: { channel: "EMAIL", subject: definition.subject, text: "Historical demo delivery." },
      idempotencyKey: `demo:${runId}:email:${campaignIndex}:${index}`,
      attemptCount: 1,
      maxAttempts: 1,
      acceptedAt: deliveryStatus !== "DEAD_LETTER" ? sentAt : undefined,
      deliveredAt: delivered ? eventAt : undefined,
      bouncedAt: deliveryStatus === "BOUNCED" ? eventAt : undefined,
      openedAt: ["OPENED", "CLICKED"].includes(recipientStatus) ? new Date(eventAt.getTime() + 60_000) : undefined,
      clickedAt: recipientStatus === "CLICKED" ? new Date(eventAt.getTime() + 120_000) : undefined,
      lastFailureClass: deliveryStatus === "DEAD_LETTER" ? "TERMINAL" : undefined,
      lastErrorCode: deliveryStatus === "DEAD_LETTER" ? "DEMO_INVALID_DESTINATION" : undefined,
      lastErrorMessage: deliveryStatus === "DEAD_LETTER" ? "Synthetic terminal failure" : undefined,
      createdAt: sentAt,
      updatedAt: eventAt,
    });
    recipients.push({
      id: recipientId,
      campaignId,
      clientId: client.id,
      runId: runIdForCampaign,
      deliveryId,
      recipientAddress: safeEmail(client, index),
      status: recipientStatus,
      deliveredAt: delivered ? eventAt : undefined,
      openedAt: ["OPENED", "CLICKED"].includes(recipientStatus) ? new Date(eventAt.getTime() + 60_000) : undefined,
      clickedAt: recipientStatus === "CLICKED" ? new Date(eventAt.getTime() + 120_000) : undefined,
      bouncedAt: recipientStatus === "BOUNCED" ? eventAt : undefined,
      complainedAt: recipientStatus === "COMPLAINED" ? eventAt : undefined,
      unsubscribedAt: recipientStatus === "UNSUBSCRIBED" ? eventAt : undefined,
      clickCount: recipientStatus === "CLICKED" ? 1 : 0,
      clickedLinks: recipientStatus === "CLICKED" ? ["https://demo.invalid/schedule"] : [],
      openCount: ["OPENED", "CLICKED"].includes(recipientStatus) ? 1 : 0,
      createdAt: sentAt,
      updatedAt: eventAt,
    });
  }
}


  return {
    providers,
    domains,
    templates,
    audiences,
    campaigns: campaignRows,
    campaignRuns,
    deliveries,
    recipients,
  };
}
