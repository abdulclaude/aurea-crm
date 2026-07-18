import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ASSISTANT_INTENT_POLICIES,
  getAssistantIntentPolicy,
  messageConfirmsCommand,
} from "../action-policy";
import { getAvailableIntents } from "@/lib/ai/intent-router";

describe("assistant action policy", () => {
  it("defines a fail-closed policy for every model-routable handler", () => {
    const routedHandlers = new Set(
      getAvailableIntents().map((intent) => intent.handler),
    );
    assert.deepEqual(
      [...routedHandlers].sort(),
      Object.keys(ASSISTANT_INTENT_POLICIES).sort(),
    );
    assert.equal(getAssistantIntentPolicy("futureMutation"), null);
  });

  it("maps intents to the existing domain capability boundary", () => {
    assert.equal(getAssistantIntentPolicy("generateWorkflow")?.capability, "workflow.manage");
    assert.equal(getAssistantIntentPolicy("listWorkflows")?.capability, "workflow.view");
    assert.equal(getAssistantIntentPolicy("createClient")?.capability, "customer.manage");
    assert.equal(getAssistantIntentPolicy("sendEmail")?.capability, "messaging.send");
    assert.equal(getAssistantIntentPolicy("showClients")?.capability, "customer.view");
  });

  it("accepts only an exact slash-command token as confirmation", () => {
    assert.equal(messageConfirmsCommand("/create-client Jane", "/create-client"), true);
    assert.equal(messageConfirmsCommand(" /create-client Jane", "/create-client"), true);
    assert.equal(messageConfirmsCommand("/create-client-anything", "/create-client"), false);
    assert.equal(messageConfirmsCommand("create a client", "/create-client"), false);
  });
});
