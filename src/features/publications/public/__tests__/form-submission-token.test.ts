import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import {
  createPublicFormSubmissionToken,
  fingerprintPublicFormSubmissionToken,
  verifyPublicFormSubmissionToken,
} from "@/features/publications/public/form-submission-token";

const previousSecret = process.env.PUBLIC_FORM_SUBMISSION_SECRET;

before(() => {
  process.env.PUBLIC_FORM_SUBMISSION_SECRET = "f".repeat(48);
});

after(() => {
  if (previousSecret === undefined) {
    delete process.env.PUBLIC_FORM_SUBMISSION_SECRET;
  } else {
    process.env.PUBLIC_FORM_SUBMISSION_SECRET = previousSecret;
  }
});

describe("public form submission token", () => {
  it("binds a form-session nonce to an exact target, version, and form", () => {
    const token = createPublicFormSubmissionToken(
      { targetId: "target-1", versionId: "version-2", formId: "form-3" },
      1_000,
    );
    assert.ok(token);
    assert.deepEqual(verifyPublicFormSubmissionToken(token, 1_001), {
      targetId: "target-1",
      versionId: "version-2",
      formId: "form-3",
      nonce: verifyPublicFormSubmissionToken(token, 1_001)?.nonce,
      issuedAt: 1_000,
      expiresAt: 8_200,
    });
    assert.ok(verifyPublicFormSubmissionToken(token, 8_199));
    assert.equal(verifyPublicFormSubmissionToken(token, 8_200), null);
  });

  it("rejects tampering, future issuance, and an unavailable secret", () => {
    const token = createPublicFormSubmissionToken(
      { targetId: "target-1", versionId: "version-1", formId: "form-1" },
      2_000,
    );
    assert.ok(token);
    const replacement = token.endsWith("x") ? "y" : "x";
    assert.equal(
      verifyPublicFormSubmissionToken(`${token.slice(0, -1)}${replacement}`, 2_001),
      null,
    );
    assert.equal(verifyPublicFormSubmissionToken(token, 1_899), null);

    process.env.PUBLIC_FORM_SUBMISSION_SECRET = "too-short";
    assert.equal(
      createPublicFormSubmissionToken({
        targetId: "target-1",
        versionId: "version-1",
        formId: "form-1",
      }),
      null,
    );
    process.env.PUBLIC_FORM_SUBMISSION_SECRET = "f".repeat(48);
  });

  it("creates stable non-reversible fingerprints without storing tokens", () => {
    const first = fingerprintPublicFormSubmissionToken("token-one");
    const repeat = fingerprintPublicFormSubmissionToken("token-one");
    const second = fingerprintPublicFormSubmissionToken("token-two");
    assert.equal(first, repeat);
    assert.notEqual(first, second);
    assert.match(first, /^[a-f0-9]{64}$/);
  });
});
