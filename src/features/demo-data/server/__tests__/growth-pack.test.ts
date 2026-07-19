import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEMO_DATA_PROFILE_CONFIG } from "@/features/demo-data/contracts";
import {
  buildGrowthPackFixtures,
  TERMINAL_DELIVERY_STATUSES,
  type GrowthPackClient,
} from "@/features/demo-data/server/packs/growth-pack";
import type { DemoSeedContext } from "@/features/demo-data/server/types";

const context: DemoSeedContext = {
  organizationId: "organization-demo",
  locationId: "location-demo",
  actorUserId: "user-demo",
  currency: "GBP",
  timezone: "Europe/London",
  referenceDate: new Date("2026-07-14T12:00:00.000Z"),
  runId: "demo-run-growth-pack",
  profile: "SHOWCASE",
  profileConfig: DEMO_DATA_PROFILE_CONFIG.SHOWCASE,
};

const clients: GrowthPackClient[] = Array.from({ length: 150 }, (_, index) => ({
  id: `client-${index}`,
  name: `Demo Member ${index + 1}`,
  email: `member-${index + 1}@demo.invalid`,
  phone: `+4477009${String(index).padStart(5, "0")}`,
}));

function fixtures() {
  return buildGrowthPackFixtures(context, { clients });
}

describe("growth demo fixtures", () => {
  it("keeps every third-party fixture disconnected, scoped, and secret-free", () => {
    const data = fixtures();

    assert.equal(data.providers.length, 2);
    for (const provider of data.providers) {
      assert.equal(provider.organizationId, context.organizationId);
      assert.equal(provider.locationId, context.locationId);
      assert.equal(provider.environment, "test");
      assert.equal(provider.status, "DISCONNECTED");
      assert.equal(provider.isDefault, false);
      assert.deepEqual(provider.capabilities, []);
      assert.equal(provider.externalAccountId, undefined);
      assert.equal(provider.encryptedSecret, undefined);
      assert.equal(provider.encryptedWebhookSecret, undefined);
    }
    assert.ok(data.domains.every((domain) => domain.domain.endsWith(".invalid")));
    assert.ok(data.domains.every((domain) => domain.status !== "VERIFIED"));
    assert.ok(data.routes.every((route) => route.isActive === false && route.isDefault === false));
    assert.ok(data.smsConfigs.every((config) => config.isActive === false));
    assert.ok(data.publicationTargets.every((target) => target.domainHost === null));
    assert.ok(data.publicationTargets.every((target) => target.domainStatus === "NOT_CONFIGURED"));
  });

  it("uses only terminal delivery, receipt, SMS, campaign-run, and execution states", () => {
    const data = fixtures();
    const terminalDeliveries = new Set<string>(TERMINAL_DELIVERY_STATUSES);

    assert.ok(data.deliveries.every((delivery) => terminalDeliveries.has(delivery.status ?? "")));
    assert.ok(data.receipts.every((receipt) => ["PROCESSED", "IGNORED", "FAILED", "DEAD_LETTER"].includes(receipt.status ?? "")));
    assert.ok(data.smsMessages.every((message) => ["SENT", "DELIVERED", "FAILED", "UNDELIVERED"].includes(message.status ?? "")));
    assert.ok(data.campaignRuns.every((run) => ["COMPLETED", "PARTIAL", "FAILED", "CANCELLED"].includes(run.status ?? "")));
    assert.ok(data.executions.every((execution) => ["SUCCESS", "FAILED"].includes(execution.status ?? "")));
    assert.ok(data.workflowRows.every((workflow) => workflow.archived === true || workflow.isTemplate === true));
    assert.ok(data.nodes.every((workflowNode) => workflowNode.credentialId === null));
  });

  it("keeps campaign aggregates, recipient history, and delivery links coherent", () => {
    const data = fixtures();
    const deliveryIds = new Set(data.deliveries.map((delivery) => delivery.id));

    for (const campaign of data.campaigns) {
      const recipients = data.recipients.filter((recipient) => recipient.campaignId === campaign.id);
      assert.equal(campaign.totalRecipients, recipients.length);
      assert.equal(campaign.opened, recipients.filter((recipient) => ["OPENED", "CLICKED"].includes(recipient.status ?? "")).length);
      assert.equal(campaign.clicked, recipients.filter((recipient) => recipient.status === "CLICKED").length);
      assert.equal(campaign.bounced, recipients.filter((recipient) => recipient.status === "BOUNCED").length);
      assert.equal(campaign.complained, recipients.filter((recipient) => recipient.status === "COMPLAINED").length);
      assert.equal(campaign.unsubscribed, recipients.filter((recipient) => recipient.status === "UNSUBSCRIBED").length);
    }
    assert.ok(data.recipients.every((recipient) => recipient.deliveryId && deliveryIds.has(recipient.deliveryId)));
    assert.ok(data.campaignRuns.every((run) => run.queued === 0));
    assert.ok(data.deliveries.every((delivery) => delivery.providerAccountId && delivery.providerAccountRef === delivery.providerAccountId));
  });

  it("populates pagination and materially different configurations", () => {
    const data = fixtures();

    assert.ok(data.conversations.length > 30);
    assert.ok(data.smsMessages.length > 50);
    assert.ok(data.formSubmissions.length > 50);
    assert.ok(data.adSpendRows.length >= 2_000);
    assert.equal(new Set(data.adSpendRows.map((row) => row.platform)).size, 3);
    assert.equal(new Set(data.workflowRows.map((workflow) => `${workflow.archived}:${workflow.isTemplate}`)).size >= 2, true);
    assert.equal(new Set(data.forms.map((item) => `${item.status}:${item.isMultiStep}`)).size >= 2, true);
  });

  it("keeps forms and publications safe for public rendering", () => {
    const data = fixtures();
    const blockedFieldTypes = new Set(["FILE_UPLOAD", "SIGNATURE", "PAYMENT"]);

    assert.ok(data.formFields.every((field) => !blockedFieldTypes.has(field.type)));
    assert.ok(data.publicationVersions.every((version) => /^[a-f0-9]{64}$/.test(version.contentHash)));
    assert.ok(data.formSubmissions.every((submission) => submission.ipAddress === undefined && submission.userAgent === undefined));
  });

  it("keeps ad metrics mathematically consistent", () => {
    const data = fixtures();

    for (const row of data.adSpendRows.slice(0, 100)) {
      const spend = Number(row.spend);
      const revenue = Number(row.revenue);
      assert.equal(
        Number(row.cpc).toFixed(2),
        (spend / (row.clicks ?? 1)).toFixed(2),
      );
      assert.equal(Number(row.roas).toFixed(2), (revenue / spend).toFixed(2));
    }
  });
});
