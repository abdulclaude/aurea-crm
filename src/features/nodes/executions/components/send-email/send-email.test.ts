import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { sendEmailFormSchema } from "./config";

describe("send email workflow action", () => {
  it("supports a client-bound recipient and a direct templated recipient", () => {
    assert.equal(
      sendEmailFormSchema.parse({
        clientId: "{{triggerData.clientId}}",
        subject: "Welcome",
        html: "<p>Hello</p>",
        purpose: "MARKETING",
        variableName: "welcomeEmail",
      }).variableName,
      "welcomeEmail",
    );
    assert.equal(
      sendEmailFormSchema.parse({
        to: "{{triggerData.email}}",
        subject: "Update",
        html: "<p>Your update</p>",
        purpose: "TRANSACTIONAL",
        variableName: "updateEmail",
      }).variableName,
      "updateEmail",
    );
  });

  it("requires a recipient and keeps client lookup tenant-scoped", () => {
    assert.throws(() =>
      sendEmailFormSchema.parse({
        subject: "Missing recipient",
        html: "<p>Hello</p>",
        purpose: "MARKETING",
        variableName: "sentEmail",
      }),
    );

    const executorSource = readFileSync(
      path.join(
        process.cwd(),
        "src/features/nodes/executions/components/send-email/executor.ts",
      ),
      "utf8",
    );
    assert.match(
      executorSource,
      /eq\(client\.organizationId, scope\.organizationId\)/,
    );
    assert.match(executorSource, /eq\(client\.locationId, scope\.locationId\)/);
    assert.match(
      executorSource,
      /workflow-email:\$\{scope\.executionId\}:\$\{nodeId\}/,
    );
    assert.match(executorSource, /purpose: data\.purpose/);
  });

  it("requires an explicit purpose so marketing suppressions are enforced", () => {
    assert.throws(() =>
      sendEmailFormSchema.parse({
        to: "person@example.com",
        subject: "Update",
        html: "<p>Hello</p>",
        variableName: "sentEmail",
      }),
    );

    const deliverySource = readFileSync(
      path.join(
        process.cwd(),
        "src/features/delivery/server/transactional-email.ts",
      ),
      "utf8",
    );
    const suppressionSource = readFileSync(
      path.join(process.cwd(), "src/features/delivery/server/outbox.ts"),
      "utf8",
    );
    assert.match(deliverySource, /purpose: input\.purpose/);
    assert.match(suppressionSource, /input\.purpose === "MARKETING"/);
    assert.match(suppressionSource, /eq\(client\.emailUnsubscribed, true\)/);
  });
});
