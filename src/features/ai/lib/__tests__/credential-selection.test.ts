import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  aiCredentialMatchesExactScope,
  selectAiCredentialCandidate,
} from "../credential-selection";

describe("AI credential selection", () => {
  it("fails closed when no scoped credential exists", () => {
    assert.deepEqual(selectAiCredentialCandidate([]), { status: "missing" });
  });

  it("uses the only exact-scope credential for backwards compatibility", () => {
    assert.deepEqual(
      selectAiCredentialCandidate([{ id: "one", isDefault: false }]),
      {
        status: "selected",
        credential: { id: "one", isDefault: false },
      },
    );
  });

  it("requires an explicit default when multiple credentials share a scope", () => {
    assert.deepEqual(
      selectAiCredentialCandidate([
        { id: "one", isDefault: false },
        { id: "two", isDefault: false },
      ]),
      { status: "ambiguous" },
    );
    assert.deepEqual(
      selectAiCredentialCandidate([
        { id: "one", isDefault: false },
        { id: "two", isDefault: true },
      ]),
      {
        status: "selected",
        credential: { id: "two", isDefault: true },
      },
    );
  });

  it("rejects wrong organization, location, type, and explicit credential id", () => {
    const credential = {
      id: "credential-a",
      organizationId: "org-a",
      locationId: "location-a",
      type: "GEMINI",
    };
    assert.equal(
      aiCredentialMatchesExactScope({
        credential,
        expected: {
          organizationId: "org-a",
          locationId: "location-a",
          type: "GEMINI",
          credentialId: "credential-a",
        },
      }),
      true,
    );
    for (const expected of [
      { organizationId: "org-b", locationId: "location-a", type: "GEMINI" },
      { organizationId: "org-a", locationId: "location-b", type: "GEMINI" },
      { organizationId: "org-a", locationId: "location-a", type: "OPENAI" },
      {
        organizationId: "org-a",
        locationId: "location-a",
        type: "GEMINI",
        credentialId: "credential-b",
      },
    ]) {
      assert.equal(
        aiCredentialMatchesExactScope({ credential, expected }),
        false,
      );
    }
  });

  it("migrates AI logs and workflow nodes with exact credential scope", () => {
    const migration = readFileSync(
      path.join(process.cwd(), "drizzle/0034_scoped_ai_provider_defaults.sql"),
      "utf8",
    );

    assert.match(migration, /AILog_exact_credential_scope/);
    assert.match(migration, /Node_exact_credential_scope/);
    assert.match(
      migration,
      /workflow\."locationId" IS DISTINCT FROM credential\."locationId"/,
    );
    assert.match(migration, /credential_type <> 'TELEGRAM_BOT'/);
  });
});
