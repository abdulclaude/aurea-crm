import assert from "node:assert/strict";
import test from "node:test";

import { buildPublishedFormEmbed } from "@/features/publications/lib/form-embed-code";

test("form embeds require published exact frame origins and a form sandbox", () => {
  const embed = buildPublishedFormEmbed({
    name: 'Lead form "North"',
    slug: "lead-form",
    organizationSlug: "studio-one",
    snapshot: {
      schemaVersion: 1,
      source: {},
      channelConfig: {
        kind: "FORM",
        height: 760,
        allowedFrameOrigins: ["https://studio.example.com"],
      },
    },
  });

  assert.ok(embed);
  assert.match(embed.previewUrl, /\/p\/studio-one\/lead-form$/);
  assert.match(embed.iframeCode, /height="760"/);
  assert.match(
    embed.iframeCode,
    /sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"/,
  );
  assert.match(embed.iframeCode, /Lead form &quot;North&quot;/);
});

test("form embeds fail closed without an allowed website origin", () => {
  assert.equal(
    buildPublishedFormEmbed({
      name: "Lead form",
      slug: "lead-form",
      organizationSlug: "studio-one",
      snapshot: {
        schemaVersion: 1,
        source: {},
        channelConfig: { kind: "FORM" },
      },
    }),
    null,
  );
});
