import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { AutomationEventType, NodeType } from "@/db/enums";
import { buildAutomationEventDrafts } from "@/features/executions/server/automation-event-detection";
import { buildReferralConversionAutomationDispatch } from "@/features/referrals/lib/referral-conversion-automation";
import { studioReferralTemplates } from "@/features/workflows/lib/studio-referral-templates";

const convertedAt = new Date("2026-07-15T12:00:00.000Z");

test("referral conversion dispatch is exact-scoped, stable, and privacy minimized", () => {
  const dispatch = buildReferralConversionAutomationDispatch({
    referralId: "referral-1",
    programId: "program-1",
    organizationId: "org-1",
    locationId: "location-1",
    referrerClientId: "client-referrer",
    refereeClientId: "client-referee",
    convertedAt,
  });

  assert.equal(dispatch.nodeType, NodeType.REFERRAL_CONVERTED_TRIGGER);
  assert.equal(dispatch.organizationId, "org-1");
  assert.equal(dispatch.locationId, "location-1");
  assert.equal(dispatch.idempotencyKey, "referral-converted:referral-1");
  assert.deepEqual(Object.keys(dispatch.triggerData).sort(), [
    "clientId",
    "convertedAt",
    "programId",
    "refereeClientId",
    "referralId",
    "referrerClientId",
    "status",
  ]);
  assert.equal(JSON.stringify(dispatch).includes("email"), false);
  assert.equal(JSON.stringify(dispatch).includes("phone"), false);
  assert.equal(JSON.stringify(dispatch).includes("code"), false);
});

test("automation event detection records referral conversion without contact data", () => {
  const triggerData = {
    referralId: "referral-1",
    programId: "program-1",
    referrerClientId: "client-referrer",
    refereeClientId: "client-referee",
    clientId: "client-referee",
    convertedAt: convertedAt.toISOString(),
    status: "CONVERTED",
  };
  const drafts = buildAutomationEventDrafts({
    workflow: {
      id: "workflow-1",
      name: "Referral follow-up",
      organizationId: "org-1",
      locationId: "location-1",
      Node: [],
    },
    triggerNode: {
      id: "trigger-1",
      type: NodeType.REFERRAL_CONVERTED_TRIGGER,
    },
    context: { triggerData },
    triggerData,
    clientId: "client-referee",
  });

  const referralEvent = drafts.find(
    ({ type }) => type === AutomationEventType.REFERRAL_CONVERTED,
  );
  assert.deepEqual(referralEvent, {
    type: AutomationEventType.REFERRAL_CONVERTED,
    name: "Referral converted",
    clientId: "client-referee",
    entityType: "referral",
    entityId: "referral-1",
    metadata: {
      programId: "program-1",
      referrerClientId: "client-referrer",
    },
  });
});

test("starter template performs internal tagging only", () => {
  assert.equal(studioReferralTemplates.length, 1);
  const [template] = studioReferralTemplates;
  assert.ok(template);
  assert.deepEqual(
    template.nodes.map(({ type }) => type),
    [NodeType.REFERRAL_CONVERTED_TRIGGER, NodeType.ADD_TAG_TO_CLIENT],
  );
});

test("migration adds referral trigger and automation event enum values", () => {
  const sql = readFileSync(
    new URL("../../../../../drizzle/0045_referral_conversion_automation.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /NodeType.+REFERRAL_CONVERTED_TRIGGER/s);
  assert.match(sql, /AutomationEventType.+REFERRAL_CONVERTED/s);
});
