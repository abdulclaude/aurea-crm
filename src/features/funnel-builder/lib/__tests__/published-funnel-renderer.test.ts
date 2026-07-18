import assert from "node:assert/strict";
import test from "node:test";

import {
  generatePublishedPageHTML,
  LEGACY_PUBLISHED_FUNNEL_RENDER_POLICY,
  PREVIEW_FUNNEL_RENDER_POLICY,
  PUBLISHED_FUNNEL_RENDER_POLICY,
  renderBlockTree,
  resolveFunnelRenderPolicy,
  type PublishedFunnelBlock,
  type PublishedPageData,
} from "@/features/funnel-builder/lib/published-funnel-renderer";
import {
  sanitizeCustomHtml,
  sanitizePublicUrl,
  sanitizeRichText,
} from "@/features/funnel-builder/lib/published-funnel-sanitization";
import { generatePageStyles } from "@/features/funnel-builder/lib/published-funnel-styles";
import { generateTrackingMarkup } from "@/features/funnel-builder/lib/published-funnel-tracking";

const now = new Date("2026-07-13T12:00:00.000Z");

test("sanitizes rich text and custom HTML while preserving safe content", () => {
  const richText = sanitizeRichText(
    '<p>Hello <strong>world</strong><script>alert(1)</script><a href="javascript:alert(1)" onclick="alert(2)">link</a></p>',
  );
  assert.match(richText, /<strong>world<\/strong>/);
  assert.doesNotMatch(richText, /script|javascript|onclick/i);

  const customHtml = sanitizeCustomHtml(
    '<section class="layout"><img src="https://cdn.example.com/image.jpg" onerror="alert(1)"><iframe src="https://evil.example"></iframe></section>',
  );
  assert.match(customHtml, /class="layout"/);
  assert.match(customHtml, /loading="lazy"/);
  assert.doesNotMatch(customHtml, /onerror|iframe/i);
});

test("accepts only explicit public URL protocols", () => {
  assert.equal(
    sanitizePublicUrl("https://example.com/path"),
    "https://example.com/path",
  );
  assert.equal(sanitizePublicUrl("/checkout"), "/checkout");
  assert.equal(sanitizePublicUrl("#pricing"), "#pricing");
  assert.equal(
    sanitizePublicUrl("mailto:team@example.com"),
    "mailto:team@example.com",
  );
  assert.equal(sanitizePublicUrl("javascript:alert(1)"), null);
  assert.equal(
    sanitizePublicUrl("data:text/html,<script>alert(1)</script>"),
    null,
  );
  assert.equal(sanitizePublicUrl("//untrusted.example"), null);
  assert.equal(sanitizePublicUrl("mailto:team@example.com", "media"), null);
});

test("preview policy cannot enable tracking or custom code", () => {
  assert.deepEqual(
    resolveFunnelRenderPolicy({
      allowCustomCode: true,
      enableTracking: true,
      mode: "preview",
    }),
    {
      allowCustomCode: false,
      allowCustomScripts: false,
      enableTracking: false,
      mode: "preview",
      trackingCategories: [],
    },
  );
});

test("skips invisible blocks and sanitizes stored block content", () => {
  const blocks = [
    createBlock({
      id: "rich",
      props: {
        content:
          '<p>Safe</p><img src=x onerror="alert(1)"><script>alert(2)</script>',
      },
      type: "RICH_TEXT",
    }),
    createBlock({
      id: "hidden",
      props: { text: "Hidden" },
      type: "PARAGRAPH",
      visible: false,
    }),
    createBlock({
      id: "unsafe-link",
      props: { href: "javascript:alert(1)", text: "Continue" },
      type: "BUTTON",
    }),
    createBlock({
      id: "custom",
      props: { html: '<div onclick="alert(1)">Custom</div>' },
      type: "CUSTOM_HTML",
    }),
  ];

  const html = renderBlockTree(
    blocks,
    null,
    "DESKTOP",
    PREVIEW_FUNNEL_RENDER_POLICY,
  );
  assert.match(html, /<p>Safe<\/p>/);
  assert.match(html, /<button[^>]*>Continue<\/button>/);
  assert.match(html, />Custom<\/div>/);
  assert.doesNotMatch(html, /Hidden|onerror|onclick|javascript|<script>alert/i);
});

test("generates responsive styles without unsafe CSS values", () => {
  const block = createBlock({
    breakpoints: [
      createBreakpoint("TABLET", { fontSize: 18 }),
      createBreakpoint("MOBILE", { fontSize: 14 }),
    ],
    styles: {
      backgroundImage: "url(javascript:alert(1))",
      color: "#123456",
      fontSize: 24,
    },
  });
  const css = generatePageStyles([block], ".custom { color: red; }", false);
  assert.match(css, /font-size: 24px/);
  assert.match(css, /max-width: 1024px/);
  assert.match(css, /max-width: 767px/);
  assert.doesNotMatch(css, /javascript|\.custom/);
});

test("preview suppresses all tracking and custom code", () => {
  const data = createPageData();
  const tracking = generateTrackingMarkup(data, PREVIEW_FUNNEL_RENDER_POLICY);
  const html = generatePublishedPageHTML(data, PREVIEW_FUNNEL_RENDER_POLICY);

  assert.equal(tracking, "");
  assert.doesNotMatch(html, /googletagmanager|facebook\.com\/tr|initAurea/);
  assert.doesNotMatch(
    html,
    /custom-provider-ran|custom-page-ran|custom-css-marker/,
  );
});

test("legacy public routes suppress tracking until consent is managed", () => {
  const data = createPageData();
  const tracking = generateTrackingMarkup(
    data,
    LEGACY_PUBLISHED_FUNNEL_RENDER_POLICY,
  );

  assert.equal(tracking, "");
});

test("published tracking is safe and custom providers require explicit policy", () => {
  const data = createPageData();
  const safeDefault = generateTrackingMarkup(
    data,
    PUBLISHED_FUNNEL_RENDER_POLICY,
  );
  assert.match(safeDefault, /googletagmanager/);
  assert.doesNotMatch(safeDefault, /initAurea|aurea-tracking-sdk/);
  assert.doesNotMatch(safeDefault, /custom-provider-ran/);
  assert.doesNotMatch(safeDefault, /<\/script><img/i);

  const customCodePolicy = resolveFunnelRenderPolicy({
    allowCustomCode: true,
    mode: "published",
  });
  const customEnabled = generateTrackingMarkup(data, customCodePolicy);
  assert.match(customEnabled, /custom-provider-ran/);

  const customPage = generatePublishedPageHTML(data, customCodePolicy);
  assert.match(customPage, /custom-page-ran/);
  assert.match(customPage, /custom-css-marker/);
});

test("tracking categories isolate analytics from marketing and custom scripts", () => {
  const data = createPageData();
  const analyticsOnly = resolveFunnelRenderPolicy({
    allowCustomCode: true,
    allowCustomScripts: false,
    mode: "published",
    trackingCategories: ["ANALYTICS"],
  });
  const html = generatePublishedPageHTML(data, analyticsOnly);

  assert.match(html, /googletagmanager/);
  assert.doesNotMatch(
    html,
    /facebook\.com\/tr|analytics\.tiktok\.com|custom-provider-ran|custom-page-ran/,
  );
  assert.match(html, /custom-css-marker/);
});

function createBlock(
  overrides: Partial<PublishedFunnelBlock> = {},
): PublishedFunnelBlock {
  return {
    breakpoints: [],
    createdAt: now,
    id: "block-1",
    locked: false,
    order: 0,
    pageId: "page-1",
    parentBlockId: null,
    props: {},
    smartSectionId: null,
    smartSectionInstanceId: null,
    styles: {},
    targetWorkflowId: null,
    trackingEvent: null,
    type: "PARAGRAPH",
    updatedAt: now,
    visible: true,
    ...overrides,
  };
}

function createBreakpoint(
  device: "TABLET" | "MOBILE",
  styles: Record<string, unknown>,
): PublishedFunnelBlock["breakpoints"][number] {
  return {
    blockId: "block-1",
    createdAt: now,
    device,
    id: `breakpoint-${device.toLowerCase()}`,
    styles,
    updatedAt: now,
  };
}

function createPageData(): PublishedPageData {
  return {
    page: {
      blocks: [
        createBlock({
          props: { content: "<p>Body<script>alert(1)</script></p>" },
          type: "RICH_TEXT",
        }),
      ],
      createdAt: now,
      customCss: ".custom-css-marker { color: red; }",
      customJs: "window.customPageRan = 'custom-page-ran';",
      funnelId: "funnel-1",
      id: "page-1",
      isPublished: true,
      metaDescription: "Description",
      metaImage: null,
      metaTitle: "Title",
      name: "Landing page",
      order: 0,
      slug: "landing",
      updatedAt: now,
    },
    pixelIntegrations: [
      {
        createdAt: now,
        enabled: true,
        funnelId: "funnel-1",
        id: "pixel-google",
        metadata: null,
        pixelId: "G-12345</script><img src=x onerror=alert(1)>",
        provider: "GOOGLE_ANALYTICS",
        updatedAt: now,
      },
      {
        createdAt: now,
        enabled: true,
        funnelId: "funnel-1",
        id: "pixel-custom",
        metadata: { script: "window.customProvider = 'custom-provider-ran';" },
        pixelId: "custom",
        provider: "CUSTOM",
        updatedAt: now,
      },
    ],
  };
}
