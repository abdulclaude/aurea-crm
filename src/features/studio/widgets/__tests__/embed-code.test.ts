import assert from "node:assert/strict";
import test from "node:test";

import { buildPublishedWidgetEmbed } from "@/features/studio/widgets/embed-code";

test("embed code uses immutable published height and safe iframe attributes", () => {
  const previousUrl = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = "https://crm.example.test/config";
  try {
    const embed = buildPublishedWidgetEmbed({
      organizationSlug: "studio-one",
      widget: {
        id: "widget-1",
        organizationId: "org-1",
        locationId: "location-1",
        name: 'Studio "Main"',
        type: "SCHEDULE",
        config: {},
        isActive: true,
        createdAt: new Date("2026-07-14T10:00:00.000Z"),
        updatedAt: new Date("2026-07-14T10:00:00.000Z"),
      },
      target: {
        sourceId: "widget-1",
        slug: "website-schedule",
        snapshot: {
          schemaVersion: 1,
          source: {},
          channelConfig: {
            kind: "WIDGET",
            height: 720,
            transparentBackground: false,
            allowedFrameOrigins: ["https://www.studio-one.test"],
          },
        },
      },
    });
    assert.ok(embed);
    assert.equal(
      embed.previewUrl,
      "https://crm.example.test/p/studio-one/website-schedule",
    );
    assert.match(embed.iframeCode, /height="720"/);
    assert.match(embed.iframeCode, /title="Studio &quot;Main&quot; schedule"/);
    assert.match(embed.iframeCode, /referrerpolicy="no-referrer"/);
    assert.match(embed.iframeCode, / loading="lazy" /);
    assert.match(embed.iframeCode, / sandbox><\/iframe>$/);
    assert.doesNotMatch(embed.iframeCode, /widget-1/);
  } finally {
    if (previousUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = previousUrl;
    }
  }
});

test("instructor embeds use the same publication-only security contract", () => {
  const embed = buildPublishedWidgetEmbed({
    organizationSlug: "studio-two",
    widget: { name: 'Team "North"', type: "INSTRUCTORS" },
    target: {
      slug: "instructor-team",
      snapshot: {
        schemaVersion: 1,
        source: {},
        channelConfig: {
          kind: "WIDGET",
          height: 640,
          allowedFrameOrigins: ["https://studio-two.example.test"],
        },
      },
    },
  });
  assert.ok(embed);
  assert.match(embed.previewUrl, /\/p\/studio-two\/instructor-team$/);
  assert.match(embed.iframeCode, /Team &quot;North&quot; instructors/);
  assert.match(embed.iframeCode, /height="640"/);
});

test("membership embeds stay read-only and publication-backed", () => {
  const embed = buildPublishedWidgetEmbed({
    organizationSlug: "studio-three",
    widget: { name: "Studio plans", type: "MEMBERSHIP" },
    target: {
      slug: "membership-plans",
      snapshot: {
        schemaVersion: 1,
        source: {},
        channelConfig: {
          kind: "WIDGET",
          allowedFrameOrigins: ["https://studio-three.example.test"],
        },
      },
    },
  });
  assert.ok(embed);
  assert.match(embed.previewUrl, /\/p\/studio-three\/membership-plans$/);
  assert.match(embed.iframeCode, /Studio plans memberships/);
  assert.doesNotMatch(embed.iframeCode, /checkout|stripe|provider/i);
});

test("booking embeds permit only user-initiated provider popups", () => {
  const embed = buildPublishedWidgetEmbed({
    organizationSlug: "studio-four",
    widget: { name: "Consultations", type: "BOOKING" },
    target: {
      slug: "consultations",
      snapshot: {
        schemaVersion: 1,
        source: {},
        channelConfig: {
          kind: "WIDGET",
          allowedFrameOrigins: ["https://studio-four.example.test"],
        },
      },
    },
  });
  assert.ok(embed);
  assert.match(embed.iframeCode, /Consultations appointments/);
  assert.match(
    embed.iframeCode,
    /sandbox="allow-popups allow-popups-to-escape-sandbox"/,
  );
  assert.doesNotMatch(embed.iframeCode, /allow-scripts|allow-same-origin/);
});

test("intro offer embeds launch only immutable published pricing destinations", () => {
  const embed = buildPublishedWidgetEmbed({
    organizationSlug: "studio-five",
    widget: { name: "First visit", type: "INTRO_OFFER" },
    target: {
      slug: "intro-offers",
      snapshot: {
        schemaVersion: 1,
        source: {},
        channelConfig: {
          kind: "WIDGET",
          allowedFrameOrigins: ["https://studio-five.example.test"],
        },
      },
    },
  });
  assert.ok(embed);
  assert.match(embed.iframeCode, /First visit intro offers/);
  assert.match(
    embed.iframeCode,
    /sandbox="allow-popups allow-popups-to-escape-sandbox"/,
  );
  assert.doesNotMatch(embed.iframeCode, /allow-scripts|stripe/);
});

test("on-demand embeds remain script-free and publication-backed", () => {
  const embed = buildPublishedWidgetEmbed({
    organizationSlug: "studio-six",
    widget: { name: "Free classes", type: "ON_DEMAND" },
    target: {
      slug: "free-classes",
      snapshot: {
        schemaVersion: 1,
        source: {},
        channelConfig: {
          kind: "WIDGET",
          allowedFrameOrigins: ["https://studio-six.example.test"],
        },
      },
    },
  });
  assert.ok(embed);
  assert.match(embed.iframeCode, /Free classes on-demand videos/);
  assert.match(embed.iframeCode, / sandbox><\/iframe>$/);
  assert.doesNotMatch(embed.iframeCode, /allow-scripts|allow-popups|provider/);
});

test("event embeds stay discovery-only without popup permissions", () => {
  const embed = buildPublishedWidgetEmbed({
    organizationSlug: "studio-six",
    widget: { name: "Workshops", type: "EVENT" },
    target: {
      slug: "workshops",
      snapshot: {
        schemaVersion: 1,
        source: {},
        channelConfig: {
          kind: "WIDGET",
          allowedFrameOrigins: ["https://studio-six.example.test"],
        },
      },
    },
  });
  assert.ok(embed);
  assert.match(embed.iframeCode, /Workshops events/);
  assert.match(embed.iframeCode, / sandbox><\/iframe>$/);
  assert.doesNotMatch(embed.iframeCode, /allow-popups|allow-scripts/);
});

test("referral embeds remain read-only without popup or script permissions", () => {
  const embed = buildPublishedWidgetEmbed({
    organizationSlug: "studio-seven",
    widget: { name: "Refer a friend", type: "REFERRAL" },
    target: {
      slug: "referral-program",
      snapshot: {
        schemaVersion: 1,
        source: {},
        channelConfig: {
          kind: "WIDGET",
          allowedFrameOrigins: ["https://studio-seven.example.test"],
        },
      },
    },
  });
  assert.ok(embed);
  assert.match(embed.iframeCode, /Refer a friend referral program/);
  assert.match(embed.iframeCode, / sandbox><\/iframe>$/);
  assert.doesNotMatch(embed.iframeCode, /allow-popups|allow-scripts|code=/i);
});
