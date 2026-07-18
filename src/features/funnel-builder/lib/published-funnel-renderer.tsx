import type { DeviceType } from "@/db/enums";

import { renderBlockTree as renderBlocks } from "./published-funnel-block-renderer";
import {
  containInlineScript,
  escapeHtml,
} from "./published-funnel-sanitization";
import {
  convertStylesToInlineCSS,
  generatePageStyles,
} from "./published-funnel-styles";
import { generateTrackingMarkup } from "./published-funnel-tracking";
import {
  PUBLISHED_FUNNEL_RENDER_POLICY,
  resolveFunnelRenderPolicy,
  type FunnelRenderPolicy,
  type FunnelRenderPolicyInput,
  type PublishedFunnelBlock,
  type PublishedPageData,
} from "./published-funnel-types";

export type {
  FunnelRenderPolicy,
  FunnelRenderPolicyInput,
  PublishedFunnelBlock,
  PublishedPageData,
} from "./published-funnel-types";
export {
  LEGACY_PUBLISHED_FUNNEL_RENDER_POLICY,
  PREVIEW_FUNNEL_RENDER_POLICY,
  PUBLISHED_FUNNEL_RENDER_POLICY,
  resolveFunnelRenderPolicy,
} from "./published-funnel-types";
export { convertStylesToInlineCSS } from "./published-funnel-styles";

export type PublishedFunnelMarkup = {
  content: string;
  runtime: string;
  styles: string;
};

export function generatePublishedFunnelMarkup(
  data: PublishedPageData,
  policyInput:
    | FunnelRenderPolicyInput
    | FunnelRenderPolicy = PUBLISHED_FUNNEL_RENDER_POLICY,
): PublishedFunnelMarkup {
  const policy = resolvePolicy(policyInput);
  const content = renderBlocks(data.page.blocks, null, "DESKTOP", policy);
  const customScript =
    policy.allowCustomScripts &&
    policy.enableTracking &&
    policy.trackingCategories.includes("MARKETING") &&
    data.page.customJs
      ? `<script>${containInlineScript(data.page.customJs)}</script>`
      : "";

  return {
    content,
    runtime: [generateTrackingMarkup(data, policy), customScript]
      .filter(Boolean)
      .join("\n"),
    styles: generatePageStyles(
      data.page.blocks,
      data.page.customCss,
      policy.allowCustomCode,
    ),
  };
}

export function generatePageHead(
  data: PublishedPageData,
  policyInput:
    | FunnelRenderPolicyInput
    | FunnelRenderPolicy = PUBLISHED_FUNNEL_RENDER_POLICY,
): string {
  const markup = generatePublishedFunnelMarkup(data, policyInput);
  return `
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(data.page.metaTitle || data.page.name)}</title>
    ${data.page.metaDescription ? `<meta name="description" content="${escapeHtml(data.page.metaDescription)}" />` : ""}
    ${data.page.metaImage ? `<meta property="og:image" content="${escapeHtml(data.page.metaImage)}" />` : ""}
    <style>${markup.styles}</style>
  `.trim();
}

export function generatePageBody(
  data: PublishedPageData,
  policyInput:
    | FunnelRenderPolicyInput
    | FunnelRenderPolicy = PUBLISHED_FUNNEL_RENDER_POLICY,
): string {
  const markup = generatePublishedFunnelMarkup(data, policyInput);
  return `${markup.content}\n${markup.runtime}`;
}

export function renderBlockTree(
  blocks: PublishedFunnelBlock[],
  parentId: string | null = null,
  deviceType: DeviceType = "DESKTOP",
  policyInput:
    | FunnelRenderPolicyInput
    | FunnelRenderPolicy = PUBLISHED_FUNNEL_RENDER_POLICY,
): string {
  return renderBlocks(blocks, parentId, deviceType, resolvePolicy(policyInput));
}

export function generatePublishedPageHTML(
  data: PublishedPageData,
  policyInput:
    | FunnelRenderPolicyInput
    | FunnelRenderPolicy = PUBLISHED_FUNNEL_RENDER_POLICY,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>${generatePageHead(data, policyInput)}</head>
<body data-aurea-funnel-page>${generatePageBody(data, policyInput)}</body>
</html>`;
}

function resolvePolicy(
  input: FunnelRenderPolicyInput | FunnelRenderPolicy,
): FunnelRenderPolicy {
  return resolveFunnelRenderPolicy({
    allowCustomCode: input.allowCustomCode,
    allowCustomScripts: input.allowCustomScripts,
    enableTracking: input.enableTracking,
    mode: input.mode,
    trackingCategories: input.trackingCategories,
  });
}
