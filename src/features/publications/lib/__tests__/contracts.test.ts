import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createPublicationTargetSchema,
  publicationChannelConfigSchema,
} from "@/features/publications/contracts";

const base = {
  sourceKey: "schedule:location:location-a",
  name: "Main schedule",
  slug: "main-schedule",
  themePresetId: null,
  domainHost: null,
};

describe("publication target contracts", () => {
  it("validates each supported channel through its discriminated contract", () => {
    const variants = [
      {
        kind: "FUNNEL",
        channelConfig: { kind: "FUNNEL", allowCustomCode: false },
      },
      { kind: "SCHEDULE", channelConfig: { kind: "SCHEDULE" } },
      { kind: "PRICING", channelConfig: { kind: "PRICING" } },
      { kind: "FORM", channelConfig: { kind: "FORM" } },
      { kind: "GIFT_CARDS", channelConfig: { kind: "GIFT_CARDS" } },
      { kind: "WIDGET", channelConfig: { kind: "WIDGET" } },
    ];
    for (const variant of variants) {
      assert.equal(
        createPublicationTargetSchema.safeParse({
          ...base,
          ...variant,
        }).success,
        true,
        variant.kind,
      );
    }
  });

  it("supports materially different schedule policies without source-specific code", () => {
    const shortWindow = createPublicationTargetSchema.parse({
      ...base,
      kind: "SCHEDULE",
      channelConfig: {
        kind: "SCHEDULE",
        maxDaysAhead: 7,
        classTypeIds: ["pilates"],
        showAvailability: true,
      },
    });
    const broadWindow = createPublicationTargetSchema.parse({
      ...base,
      sourceKey: "schedule:location:location-b",
      name: "All classes",
      slug: "all-classes",
      kind: "SCHEDULE",
      channelConfig: {
        kind: "SCHEDULE",
        maxDaysAhead: 90,
        classTypeIds: [],
        showAvailability: false,
      },
    });
    assert.equal(shortWindow.channelConfig.maxDaysAhead, 7);
    assert.equal(broadWindow.channelConfig.maxDaysAhead, 90);
    assert.notDeepEqual(shortWindow.channelConfig, broadWindow.channelConfig);
  });

  it("rejects wildcard widget frame origins", () => {
    for (const origin of [
      "https://*",
      "https://*.example.com",
      "https://%2A.example.com",
    ]) {
      assert.equal(
        createPublicationTargetSchema.safeParse({
          ...base,
          kind: "WIDGET",
          channelConfig: {
            kind: "WIDGET",
            allowedFrameOrigins: [origin],
          },
        }).success,
        false,
        origin,
      );
    }
  });

  it("applies privacy-conscious defaults at the API boundary", () => {
    const parsed = createPublicationTargetSchema.parse({
      ...base,
      kind: "SCHEDULE",
      channelConfig: { kind: "SCHEDULE" },
    });
    assert.equal(parsed.consentConfig.mode, "DISABLED");
    assert.deepEqual(parsed.consentConfig.categories, []);
    assert.equal(parsed.seoConfig.index, true);
    assert.equal(parsed.channelConfig.maxDaysAhead, 30);
  });

  it("keeps native form submissions disabled at the channel boundary", () => {
    const parsed = createPublicationTargetSchema.parse({
      ...base,
      sourceKey: "form:form-a",
      kind: "FORM",
      channelConfig: { kind: "FORM" },
    });
    assert.equal(parsed.channelConfig.submissionMode, "DISABLED");
    assert.match(parsed.channelConfig.responseConsentLabel, /privacy policy/i);
  });

  it("normalizes exact widget frame origins and rejects unsafe values", () => {
    const parsed = publicationChannelConfigSchema.parse({
      kind: "WIDGET",
      allowedFrameOrigins: [
        "https://studio.example.com/",
        "http://localhost:4321/",
      ],
    });
    assert.equal(parsed.kind, "WIDGET");
    if (parsed.kind !== "WIDGET") throw new Error("Expected widget config");
    assert.deepEqual(parsed.allowedFrameOrigins, [
      "https://studio.example.com",
      "http://localhost:4321",
    ]);
    for (const origin of [
      "http://studio.example.com",
      "https://user:pass@studio.example.com",
      "https://studio.example.com/path",
      "javascript:alert(1)",
    ]) {
      assert.equal(
        publicationChannelConfigSchema.safeParse({
          kind: "WIDGET",
          allowedFrameOrigins: [origin],
        }).success,
        false,
        origin,
      );
    }
    assert.equal(
      publicationChannelConfigSchema.safeParse({
        kind: "WIDGET",
        allowedFrameOrigins: [
          "https://studio.example.com",
          "https://studio.example.com/",
        ],
      }).success,
      false,
    );
  });

  it("normalizes legacy form targets without a data migration", () => {
    const parsed = publicationChannelConfigSchema.parse({
      kind: "FORM",
      renderer: "UNAVAILABLE",
    });
    assert.deepEqual(parsed, {
      kind: "FORM",
      submissionMode: "DISABLED",
      responseRetentionDays: 365,
      responseConsentLabel:
        "I agree to the privacy policy and the use of my response.",
      height: 720,
      transparentBackground: false,
      allowedFrameOrigins: [],
    });
  });

  it("rejects executable URLs in SEO and consent configuration", () => {
    assert.throws(() =>
      createPublicationTargetSchema.parse({
        ...base,
        kind: "SCHEDULE",
        seoConfig: { canonicalUrl: "javascript:alert(1)" },
        channelConfig: { kind: "SCHEDULE" },
      }),
    );
  });
});
