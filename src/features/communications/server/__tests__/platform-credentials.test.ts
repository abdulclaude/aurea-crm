import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getPlatformResendApiCredentials,
  getPlatformResendSenderDefaults,
  getPlatformResendWebhookCredentials,
  PlatformResendConfigurationError,
} from "@/features/communications/server/platform-credentials";

describe("platform Resend configuration", () => {
  it("reports a safe actionable error when the API key is missing", () => {
    assert.throws(
      () => getPlatformResendApiCredentials({}),
      (error) =>
        error instanceof PlatformResendConfigurationError &&
        error.message ===
          "Aurea's managed Resend API key is not configured.",
    );
  });

  it("allows domain provisioning without fallback sender defaults", () => {
    assert.deepEqual(getPlatformResendSenderDefaults({}), {
      fallbackFromEmail: undefined,
      fallbackFromName: undefined,
      fallbackReplyTo: undefined,
    });
  });

  it("requires fallback sender email and name to be configured together", () => {
    assert.throws(
      () =>
        getPlatformResendSenderDefaults({
          AUREA_PLATFORM_RESEND_FALLBACK_FROM_EMAIL:
            "notifications@example.com",
        }),
      (error) =>
        error instanceof PlatformResendConfigurationError &&
        error.message ===
          "Aurea's managed fallback sender configuration is invalid.",
    );
  });

  it("loads the shared webhook secret independently from the API key", () => {
    assert.deepEqual(
      getPlatformResendWebhookCredentials({
        AUREA_PLATFORM_RESEND_WEBHOOK_SECRET: "test-signing-secret",
      }),
      {
        webhookSecret: "test-signing-secret",
        previousWebhookSecret: undefined,
      },
    );
  });
});
