import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.ENCRYPTION_KEY ??= "delivery-content-test-key";

describe("protected email content", () => {
  it("keeps bearer links out of the durable plaintext payload", async () => {
    const { materializeEmailContent, protectEmailContent } =
      await import("@/features/delivery/server/protected-email-content");
    const magicLink =
      "https://app.example.test/instructor-signup?token=secret-bearer-token";
    const protectedContent = protectEmailContent({
      html: `<a href="${magicLink}">Set up account</a>`,
      text: magicLink,
    });

    assert.equal(
      JSON.stringify(protectedContent).includes("secret-bearer-token"),
      false,
    );

    const materialized = materializeEmailContent({
      channel: "EMAIL",
      subject: "Set up your account",
      ...protectedContent,
    });
    assert.equal(materialized.html?.includes(magicLink), true);
    assert.equal(materialized.text, magicLink);
    assert.equal(materialized.protectedContent, undefined);
  });
});
