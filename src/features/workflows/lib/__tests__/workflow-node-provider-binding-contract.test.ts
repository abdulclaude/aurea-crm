import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const bindings = [
  {
    nodeType: "ONEDRIVE_EXECUTION",
    dialog: "src/features/nodes/executions/components/onedrive/dialog.tsx",
    executor: "src/features/nodes/executions/components/onedrive/executor.ts",
  },
  {
    nodeType: "ONEDRIVE_TRIGGER",
    dialog:
      "src/features/nodes/triggers/components/onedrive-trigger/dialog.tsx",
    executor:
      "src/features/nodes/triggers/components/onedrive-trigger/executor.ts",
  },
  {
    nodeType: "OUTLOOK_EXECUTION",
    dialog: "src/features/nodes/executions/components/outlook/dialog.tsx",
    executor: "src/features/nodes/executions/components/outlook/executor.ts",
  },
  {
    nodeType: "OUTLOOK_TRIGGER",
    dialog: "src/features/nodes/triggers/components/outlook-trigger/dialog.tsx",
    executor:
      "src/features/nodes/triggers/components/outlook-trigger/executor.ts",
  },
  {
    nodeType: "SLACK_SEND_MESSAGE",
    dialog:
      "src/features/nodes/executions/components/slack-send-message/dialog.tsx",
    executor:
      "src/features/nodes/executions/components/slack-send-message/executor.ts",
  },
] as const;

describe("workflow node provider binding contract", () => {
  for (const binding of bindings) {
    it(`requires an exact account for ${binding.nodeType}`, () => {
      const dialog = readFileSync(binding.dialog, "utf8");
      const executor = readFileSync(binding.executor, "utf8");

      assert.match(
        dialog,
        /providerAccountId:\s*z\.string\(\)\.trim\(\)\.min\(1,/,
      );
      assert.match(dialog, /<WorkflowProviderAccountSelect/);
      assert.ok(dialog.includes(`nodeType={NodeType.${binding.nodeType}}`));
      assert.match(executor, /providerAccountId:\s*data\.providerAccountId/);
      assert.match(
        executor,
        /requiredScopes:\s*providerBinding\.requiredScopes/,
      );
      assert.doesNotMatch(
        executor,
        /MICROSOFT_REQUIRED_SCOPES|SLACK_REQUIRED_SCOPES/,
      );
    });
  }

  it("exposes the OneDrive file filter used by the trigger runtime", () => {
    const dialog = readFileSync(bindings[1].dialog, "utf8");
    assert.match(dialog, /filePattern:\s*z\.string\(\)\.optional\(\)/);
    assert.match(dialog, /name="filePattern"/);
  });

  it("saves Outlook sender while retaining legacy runtime compatibility", () => {
    const dialog = readFileSync(bindings[3].dialog, "utf8");
    const executor = readFileSync(bindings[3].executor, "utf8");
    const node = readFileSync(
      "src/features/nodes/triggers/components/outlook-trigger/node.tsx",
      "utf8",
    );

    assert.match(dialog, /sender:\s*z\.string\(\)\.optional\(\)/);
    assert.doesNotMatch(dialog, /name="from"/);
    assert.match(executor, /resolveOutlookTriggerSender\(data\)/);
    assert.match(node, /delete nextData\.from/);
  });

  for (const subscription of [
    {
      name: "OneDrive",
      path: "src/features/onedrive/server/subscriptions.ts",
    },
    {
      name: "Outlook",
      path: "src/features/outlook/server/subscriptions.ts",
    },
  ] as const) {
    it(`keeps ${subscription.name} subscriptions bound to exact node accounts`, () => {
      const source = readFileSync(subscription.path, "utf8");

      assert.match(
        source,
        /providerAccountId:\s*workflowNode\.providerAccountId/,
      );
      assert.match(
        source,
        /eq\(workflowNode\.providerAccountId, scope\.providerAccountId\)/,
      );
      assert.match(source, /removeUnused[A-Za-z]+Watches/);
      assert.match(source, /providerAccountId:\s*input\.providerAccountId/);
      assert.match(source, /requiredScopes:\s*providerBinding\.requiredScopes/);
      assert.match(
        source,
        /expectedOrganizationId:\s*input\.nodeScope\.organizationId/,
      );
      assert.match(
        source,
        /expectedLocationId:\s*input\.nodeScope\.locationId/,
      );
      assert.doesNotMatch(source, /allowInherited:\s*false/);
    });
  }
});
