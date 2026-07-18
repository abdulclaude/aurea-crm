import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  consumePublicationQuotaCounters,
  createPublicationQuotaCounters,
  normalizePublicationQuotaPurgeBatchSize,
  PublicationQuotaExceededError,
  publicationQuotaWindowStart,
} from "@/features/publications/lib/publication-quota-contract";
import { createPublicFormSubmissionToken } from "@/features/publications/public/form-submission-token";

const quotaInput = {
  organizationId: "organization-1",
  targetId: "target-1",
  action: "FORM_SUBMISSION",
  subject: "203.0.113.7",
  secret: "q".repeat(48),
  subjectLimit: 8,
  globalLimit: 240,
};

describe("publication request quota contract", () => {
  it("does not let repeated fresh form tokens evade the subject ceiling", async () => {
    const previousSecret = process.env.PUBLIC_FORM_SUBMISSION_SECRET;
    process.env.PUBLIC_FORM_SUBMISSION_SECRET = "f".repeat(48);
    try {
      const counts = new Map<string, number>();
      const tokens = new Set<string>();
      const consume = async (counter: { subjectKeyHash: string; limit: number }) => {
        const current = counts.get(counter.subjectKeyHash) ?? 0;
        if (current >= counter.limit) return false;
        counts.set(counter.subjectKeyHash, current + 1);
        return true;
      };

      for (let index = 0; index < 8; index += 1) {
        const token = createPublicFormSubmissionToken({
          targetId: "target-1",
          versionId: "version-1",
          formId: "form-1",
        });
        assert.ok(token);
        tokens.add(token);
        await consumePublicationQuotaCounters(
          createPublicationQuotaCounters(quotaInput),
          600,
          consume,
        );
      }
      assert.equal(tokens.size, 8);

      const ninthToken = createPublicFormSubmissionToken({
        targetId: "target-1",
        versionId: "version-1",
        formId: "form-1",
      });
      assert.ok(ninthToken);
      assert.equal(tokens.has(ninthToken), false);
      await assert.rejects(
        consumePublicationQuotaCounters(
          createPublicationQuotaCounters(quotaInput),
          600,
          consume,
        ),
        PublicationQuotaExceededError,
      );
    } finally {
      if (previousSecret === undefined) {
        delete process.env.PUBLIC_FORM_SUBMISSION_SECRET;
      } else {
        process.env.PUBLIC_FORM_SUBMISSION_SECRET = previousSecret;
      }
    }
  });

  it("uses scoped HMAC keys and a shared per-target global counter", () => {
    const first = createPublicationQuotaCounters(quotaInput);
    const repeat = createPublicationQuotaCounters(quotaInput);
    const otherSubject = createPublicationQuotaCounters({
      ...quotaInput,
      subject: "203.0.113.8",
    });
    const otherTarget = createPublicationQuotaCounters({
      ...quotaInput,
      targetId: "target-2",
    });

    assert.deepEqual(first, repeat);
    assert.notEqual(first[0]?.subjectKeyHash, otherSubject[0]?.subjectKeyHash);
    assert.equal(first[1]?.subjectKeyHash, otherSubject[1]?.subjectKeyHash);
    assert.notEqual(first[1]?.subjectKeyHash, otherTarget[1]?.subjectKeyHash);
    assert.equal(first[0]?.subjectKeyHash.includes(quotaInput.subject), false);
    assert.match(first[0]?.subjectKeyHash ?? "", /^[a-f0-9]{64}$/);
  });

  it("places all nodes in the same deterministic distributed window", () => {
    assert.equal(
      publicationQuotaWindowStart(
        new Date("2026-07-14T12:09:59.999Z"),
        600,
      ).toISOString(),
      "2026-07-14T12:00:00.000Z",
    );
  });

  it("keeps scheduled expiry cleanup bounded", () => {
    assert.equal(normalizePublicationQuotaPurgeBatchSize(250), 250);
    assert.equal(normalizePublicationQuotaPurgeBatchSize(50_000), 1_000);
    assert.equal(normalizePublicationQuotaPurgeBatchSize(0), 1);
    assert.equal(normalizePublicationQuotaPurgeBatchSize(Number.NaN), 1_000);
  });
});
