import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";

const CASES = [
  {
    directory: "executions/components/gmail",
    nodeType: "GMAIL_EXECUTION",
  },
  {
    directory: "executions/components/gmail-send-email",
    nodeType: "GMAIL_SEND_EMAIL",
  },
  {
    directory: "executions/components/gmail-reply-to-email",
    nodeType: "GMAIL_REPLY_TO_EMAIL",
  },
  {
    directory: "executions/components/gmail-search-emails",
    nodeType: "GMAIL_SEARCH_EMAILS",
  },
  {
    directory: "executions/components/gmail-add-label",
    nodeType: "GMAIL_ADD_LABEL",
  },
  {
    directory: "triggers/components/gmail-trigger",
    nodeType: "GMAIL_TRIGGER",
  },
] as const;

function readSource(relativePath: string): string {
  return readFileSync(
    path.join(process.cwd(), "src/features/nodes", relativePath),
    "utf8",
  );
}

describe("Google mail workflow provider bindings", () => {
  it("requires and persists a selected provider account in every dialog", () => {
    for (const entry of CASES) {
      const dialog = readSource(`${entry.directory}/dialog.tsx`);
      const node = readSource(`${entry.directory}/node.tsx`);

      assert.match(
        dialog,
        /requiredWorkflowProviderBindingSchema\.extend\(/,
        `${entry.nodeType} must require a provider account`,
      );
      assert.match(dialog, /name="providerAccountId"/);
      assert.match(dialog, /<WorkflowProviderAccountSelect/);
      assert.match(dialog, new RegExp(`nodeType=\\{NodeType\\.${entry.nodeType}\\}`));
      assert.match(dialog, /providerAccountId: defaultValues\??\.providerAccountId \|\| ""/);
      assert.match(node, /data:\s*\{\s*\.\.\.node\.data,\s*\.\.\.values,/s);
    }
  });

  it("resolves the immutable account with registry scopes before Gmail calls", () => {
    for (const entry of CASES) {
      const executor = readSource(`${entry.directory}/executor.ts`);

      assert.match(executor, /resolveGoogleMailProviderGrant\(\{/);
      assert.match(
        executor,
        new RegExp(`nodeType: NodeType\\.${entry.nodeType}`),
      );
      assert.match(executor, /providerAccountId: data\.providerAccountId/);
      assert.doesNotMatch(executor, /GMAIL_REQUIRED_SCOPES/);
      assert.doesNotMatch(executor, /auth\.api\.getAccessToken/);
    }
  });

  it("uses the registry as the scope authority without account fallback", () => {
    const helper = readSource("lib/resolve-google-mail-provider-grant.ts");

    assert.match(helper, /requiredWorkflowProviderBindingSchema\.safeParse\(/);
    assert.match(helper, /throw new NonRetriableError\(/);
    assert.match(helper, /getWorkflowProviderBindingSpec\(input\.nodeType\)/);
    assert.match(helper, /providerAccountId: binding\.data\.providerAccountId/);
    assert.match(helper, /requiredScopes: spec\.requiredScopes/);
    assert.doesNotMatch(helper, /isDefault|chooseDefaultProviderAccount/);
  });
});
