import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  googleFormTriggerConfigSchema,
  googleFormWebhookEventId,
  googleFormWebhookSecretMatches,
} from "../webhook-contract";
import { generateGoogleFormScript } from "@/features/nodes/triggers/components/google-form-trigger/utils";

describe("Google Form webhook contract", () => {
  it("requires a high-entropy trigger secret", () => {
    assert.equal(
      googleFormTriggerConfigSchema.safeParse({
        variableName: "googleForm",
        webhookSecret: "short",
      }).success,
      false,
    );
  });

  it("compares secrets and derives stable scoped idempotency keys", () => {
    const secret = "b2f3ecfb-2af5-4c38-9361-978491a5588d";
    assert.equal(googleFormWebhookSecretMatches(secret, secret), true);
    assert.equal(googleFormWebhookSecretMatches("wrong", secret), false);
    assert.equal(
      googleFormWebhookEventId("workflow-1", '{"responseId":"one"}'),
      googleFormWebhookEventId("workflow-1", '{"responseId":"one"}'),
    );
    assert.notEqual(
      googleFormWebhookEventId("workflow-1", '{"responseId":"one"}'),
      googleFormWebhookEventId("workflow-2", '{"responseId":"one"}'),
    );
  });

  it("places the secret in a request header instead of the webhook URL", () => {
    const script = generateGoogleFormScript(
      "https://crm.example/api/webhooks/google-form?workflowId=workflow-1",
      "b2f3ecfb-2af5-4c38-9361-978491a5588d",
    );
    assert.match(script, /X-Aurea-Webhook-Token/);
    assert.doesNotMatch(script, /workflowId=workflow-1&token=/);
  });
});
