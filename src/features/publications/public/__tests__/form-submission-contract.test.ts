import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  publicFormIdempotencyKeySchema,
  publicFormSubmissionBodySchema,
  requestIsSameOrigin,
} from "@/features/publications/public/form-submission-contract";

describe("public form submission request contract", () => {
  it("requires an exact same-origin browser request", () => {
    assert.equal(
      requestIsSameOrigin(
        new Request("https://forms.example.test/api/forms", {
          headers: {
            Origin: "https://forms.example.test",
            "Sec-Fetch-Site": "same-origin",
          },
        }),
      ),
      true,
    );
    assert.equal(
      requestIsSameOrigin(
        new Request("https://forms.example.test/api/forms", {
          headers: { Origin: "https://attacker.example" },
        }),
      ),
      false,
    );
    assert.equal(
      requestIsSameOrigin(
        new Request("https://forms.example.test/api/forms"),
      ),
      false,
    );
  });

  it("bounds fields, values, arrays, and idempotency keys", () => {
    assert.equal(
      publicFormSubmissionBodySchema.safeParse({
        token: "token",
        versionId: "version",
        values: { name: "Ada", consent: true, choices: ["A"] },
        responseConsent: true,
        website: "",
      }).success,
      true,
    );
    assert.equal(
      publicFormSubmissionBodySchema.safeParse({
        token: "token",
        versionId: "version",
        values: { notes: "x".repeat(10_001) },
        responseConsent: true,
      }).success,
      false,
    );
    assert.equal(publicFormIdempotencyKeySchema.safeParse("short").success, false);
    assert.equal(
      publicFormIdempotencyKeySchema.safeParse("stable_request_1234").success,
      true,
    );
  });
});
