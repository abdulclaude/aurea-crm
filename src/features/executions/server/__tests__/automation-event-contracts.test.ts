import assert from "node:assert/strict";
import test from "node:test";

import { AutomationEventType, NodeType } from "@/db/enums";
import {
  automationEventExplorerInputSchema,
  countConvertedSuccessfulExecutions,
  isAutomationConversionEvent,
  summarizeAutomationSignalTypes,
} from "@/features/executions/server/automation-event-contracts";

test("automation event explorer applies bounded defaults and typed filters", () => {
  const input = automationEventExplorerInputSchema.parse({
    eventType: AutomationEventType.LEAD_CONVERTED,
    sourceNodeType: NodeType.CLASS_BOOKED_TRIGGER,
  });
  assert.equal(input.days, 30);
  assert.equal(input.page, 1);
  assert.equal(input.pageSize, 25);
  assert.equal(input.clientSearch, "");
  assert.equal(input.eventType, AutomationEventType.LEAD_CONVERTED);
  assert.equal(input.sourceNodeType, NodeType.CLASS_BOOKED_TRIGGER);
  assert.equal(
    automationEventExplorerInputSchema.safeParse({ days: 366 }).success,
    false,
  );
  assert.equal(
    automationEventExplorerInputSchema.safeParse({ pageSize: 500 }).success,
    false,
  );
  assert.equal(
    automationEventExplorerInputSchema.safeParse({
      clientSearch: "x".repeat(101),
    }).success,
    false,
  );
});

test("conversion classification remains explicit", () => {
  assert.equal(
    isAutomationConversionEvent(AutomationEventType.MEMBERSHIP_SIGNUP),
    true,
  );
  assert.equal(
    isAutomationConversionEvent(AutomationEventType.REFERRAL_CONVERTED),
    true,
  );
  assert.equal(
    isAutomationConversionEvent(AutomationEventType.WORKFLOW_COMPLETED),
    false,
  );
  assert.equal(
    isAutomationConversionEvent(AutomationEventType.PAYMENT_FAILED),
    false,
  );
});

test("converted run rate deduplicates signals and excludes failed runs", () => {
  const successful = new Set(["execution-a", "execution-b"]);
  const converted = countConvertedSuccessfulExecutions(
    [
      {
        executionId: "execution-a",
        type: AutomationEventType.MEMBERSHIP_SIGNUP,
      },
      {
        executionId: "execution-a",
        type: AutomationEventType.LEAD_CONVERTED,
      },
      {
        executionId: "execution-failed",
        type: AutomationEventType.LEAD_CONVERTED,
      },
      {
        executionId: "execution-b",
        type: AutomationEventType.WORKFLOW_COMPLETED,
      },
    ],
    successful,
  );
  assert.equal(converted, 1);
});

test("automation signal summary separates conversion and recovery work", () => {
  assert.deepEqual(
    summarizeAutomationSignalTypes([
      AutomationEventType.MEMBERSHIP_SIGNUP,
      AutomationEventType.INTRO_OFFER_REDEEMED,
      AutomationEventType.INTRO_OFFER_COMPLETED,
      AutomationEventType.CLASS_MILESTONE,
      AutomationEventType.LEAD_CONVERTED,
      AutomationEventType.REFERRAL_CONVERTED,
      AutomationEventType.PAYMENT_FAILED,
      AutomationEventType.NO_SHOW,
      AutomationEventType.MEMBERSHIP_CANCELLED,
      AutomationEventType.WORKFLOW_COMPLETED,
    ]),
    {
      membershipSignupAutomations: 1,
      introOfferAutomations: 2,
      leadToMemberConversions: 1,
      classMilestoneAutomations: 1,
      referralConversions: 1,
      recoverySignals: 3,
    },
  );
});
