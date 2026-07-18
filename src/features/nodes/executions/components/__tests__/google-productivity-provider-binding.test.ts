import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { NodeType } from "@/db/enums";
import { getWorkflowProviderBindingSpec } from "@/features/workflows/lib/workflow-provider-binding";

const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";
const GOOGLE_DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const GOOGLE_FORMS_RESPONSES_SCOPE =
  "https://www.googleapis.com/auth/forms.responses.readonly";
const GOOGLE_FORMS_BODY_SCOPE =
  "https://www.googleapis.com/auth/forms.body.readonly";

const CASES = [
  {
    directory: "google-calendar",
    nodeType: NodeType.GOOGLE_CALENDAR_EXECUTION,
    scopes: [GOOGLE_CALENDAR_SCOPE],
  },
  {
    directory: "google-calendar-create-event",
    nodeType: NodeType.GOOGLE_CALENDAR_CREATE_EVENT,
    scopes: [GOOGLE_CALENDAR_SCOPE],
  },
  {
    directory: "google-calendar-update-event",
    nodeType: NodeType.GOOGLE_CALENDAR_UPDATE_EVENT,
    scopes: [GOOGLE_CALENDAR_SCOPE],
  },
  {
    directory: "google-calendar-delete-event",
    nodeType: NodeType.GOOGLE_CALENDAR_DELETE_EVENT,
    scopes: [GOOGLE_CALENDAR_SCOPE],
  },
  {
    directory: "google-drive-create-folder",
    nodeType: NodeType.GOOGLE_DRIVE_CREATE_FOLDER,
    scopes: [GOOGLE_DRIVE_FILE_SCOPE],
  },
  {
    directory: "google-drive-delete-file",
    nodeType: NodeType.GOOGLE_DRIVE_DELETE_FILE,
    scopes: [GOOGLE_DRIVE_SCOPE],
  },
  {
    directory: "google-drive-download-file",
    nodeType: NodeType.GOOGLE_DRIVE_DOWNLOAD_FILE,
    scopes: [GOOGLE_DRIVE_SCOPE],
  },
  {
    directory: "google-drive-move-file",
    nodeType: NodeType.GOOGLE_DRIVE_MOVE_FILE,
    scopes: [GOOGLE_DRIVE_SCOPE],
  },
  {
    directory: "google-drive-upload-file",
    nodeType: NodeType.GOOGLE_DRIVE_UPLOAD_FILE,
    scopes: [GOOGLE_DRIVE_FILE_SCOPE],
  },
  {
    directory: "google-form-read-responses",
    nodeType: NodeType.GOOGLE_FORM_READ_RESPONSES,
    scopes: [GOOGLE_FORMS_RESPONSES_SCOPE, GOOGLE_FORMS_BODY_SCOPE],
  },
] as const;

function readNodeSource(
  directory: string,
  file: string,
  area: "executions" | "triggers" = "executions",
): string {
  return readFileSync(
    path.join(
      process.cwd(),
      `src/features/nodes/${area}/components`,
      directory,
      file,
    ),
    "utf8",
  );
}

describe("Google productivity workflow provider bindings", () => {
  it("uses the least-privilege scopes from the shared registry", () => {
    for (const testCase of CASES) {
      const spec = getWorkflowProviderBindingSpec(testCase.nodeType);
      assert.equal(spec.provider, "GOOGLE_WORKSPACE");
      assert.deepEqual(spec.requiredScopes, testCase.scopes);
    }
  });

  it("requires and persists a provider account in every dialog", () => {
    for (const testCase of CASES) {
      const dialog = readNodeSource(testCase.directory, "dialog.tsx");
      const node = readNodeSource(testCase.directory, "node.tsx");

      assert.match(dialog, /requiredWorkflowProviderBindingSchema\.shape\.providerAccountId/);
      assert.match(dialog, /name="providerAccountId"/);
      assert.match(dialog, /<WorkflowProviderAccountSelect/);
      assert.ok(dialog.includes(`nodeType={NodeType.${testCase.nodeType}}`));
      assert.match(dialog, /providerAccountId: defaultValues\.providerAccountId \|\| ""/);
      assert.match(node, /data:\s*\{\s*\.\.\.node\.data,\s*\.\.\.values,/s);
    }
  });

  it("resolves the immutable selected account with registry scopes", () => {
    for (const testCase of CASES) {
      const executor = readNodeSource(testCase.directory, "executor.ts");

      assert.ok(
        executor.includes(
          `getWorkflowProviderBindingSpec(\n  NodeType.${testCase.nodeType},\n)`,
        ),
      );
      assert.match(executor, /providerAccountId: string/);
      assert.match(executor, /providerAccountId: data\.providerAccountId/);
      assert.match(executor, /provider: providerBinding\.provider/);
      assert.match(executor, /requiredScopes: providerBinding\.requiredScopes/);
    }
  });

  it("binds the Google Calendar trigger and scopes calendar discovery", () => {
    const spec = getWorkflowProviderBindingSpec(
      NodeType.GOOGLE_CALENDAR_TRIGGER,
    );
    const dialog = readNodeSource(
      "google-calendar-trigger",
      "dialog.tsx",
      "triggers",
    );
    const node = readNodeSource(
      "google-calendar-trigger",
      "node.tsx",
      "triggers",
    );
    const executor = readNodeSource(
      "google-calendar-trigger",
      "executor.ts",
      "triggers",
    );

    assert.deepEqual(spec.requiredScopes, [GOOGLE_CALENDAR_SCOPE]);
    assert.match(dialog, /requiredWorkflowProviderBindingSchema\.shape\.providerAccountId/);
    assert.match(dialog, /nodeType=\{NodeType\.GOOGLE_CALENDAR_TRIGGER\}/);
    assert.match(dialog, /listGoogleCalendars\.queryOptions\(\{ providerAccountId \}\)/);
    assert.match(node, /providerAccountId: nodeData\.providerAccountId \|\| ""/);
    assert.match(executor, /providerAccountId: data\.providerAccountId/);
    assert.match(executor, /requiredScopes: providerBinding\.requiredScopes/);
  });
});
