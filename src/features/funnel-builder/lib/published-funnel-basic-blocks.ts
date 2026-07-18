import type { FunnelBlockType } from "@/db/enums";

import {
  getBlockTrackingAttributes,
  htmlAttributes,
} from "./published-funnel-block-attributes";
import {
  containInlineScript,
  escapeHtml,
  sanitizeCustomHtml,
  sanitizePublicUrl,
  sanitizeRichText,
} from "./published-funnel-sanitization";
import type {
  FunnelRenderPolicy,
  PublishedFunnelBlock,
} from "./published-funnel-types";

type BasicBlockInput = {
  block: PublishedFunnelBlock;
  childrenHtml: string;
  className: string;
  policy: FunnelRenderPolicy;
  props: Record<string, unknown>;
};

const CONTAINER_TYPES = new Set<FunnelBlockType>([
  "CONTAINER",
  "ONE_COLUMN",
  "TWO_COLUMN",
  "THREE_COLUMN",
  "SECTION",
  "CARD",
  "FEATURE_GRID",
]);
const INPUT_TYPES = new Set([
  "date",
  "email",
  "number",
  "password",
  "search",
  "tel",
  "text",
  "time",
  "url",
]);

export function renderBasicBlock(input: BasicBlockInput): string | null {
  const { block, childrenHtml, className, policy, props } = input;
  const classAttribute = `class="${className}"`;
  const eventAttributes = getBlockTrackingAttributes(
    block,
    policy.enableTracking,
  );

  if (CONTAINER_TYPES.has(block.type)) {
    return `<div ${classAttribute}>${childrenHtml}</div>`;
  }

  switch (block.type) {
    case "HEADING": {
      const requestedTag = String(props.tag ?? "h1").toLowerCase();
      const tag = /^h[1-6]$/.test(requestedTag) ? requestedTag : "h1";
      return `<${tag} ${classAttribute}>${escapeHtml(String(props.text ?? "Heading"))}</${tag}>`;
    }
    case "PARAGRAPH":
      return `<p ${classAttribute}>${escapeHtml(String(props.text ?? ""))}</p>`;
    case "LABEL":
      return `<label ${classAttribute}>${escapeHtml(String(props.text ?? props.label ?? ""))}</label>`;
    case "RICH_TEXT":
      return `<div ${classAttribute}>${sanitizeRichText(String(props.content ?? ""))}</div>`;
    case "IMAGE": {
      const src = sanitizePublicUrl(props.src, "media");
      if (!src) return "";
      return `<img ${classAttribute} src="${escapeHtml(src)}" alt="${escapeHtml(String(props.alt ?? ""))}" loading="lazy" decoding="async" />`;
    }
    case "VIDEO": {
      const src = sanitizePublicUrl(props.src, "media");
      if (!src) return "";
      return `<video ${htmlAttributes([
        classAttribute,
        `src="${escapeHtml(src)}"`,
        props.controls === false ? null : "controls",
        props.autoplay === true ? "autoplay muted playsinline" : null,
        props.loop === true ? "loop" : null,
      ])}></video>`;
    }
    case "ICON":
      return `<span ${classAttribute} aria-hidden="true">${escapeHtml(String(props.icon ?? ""))}</span>`;
    case "BUTTON": {
      const text = escapeHtml(String(props.text ?? "Click me"));
      const href = sanitizePublicUrl(props.href);
      return href
        ? `<a ${htmlAttributes([classAttribute, eventAttributes])} href="${escapeHtml(href)}">${text}</a>`
        : `<button ${htmlAttributes([classAttribute, eventAttributes])} type="button">${text}</button>`;
    }
    case "INPUT": {
      const requestedType = String(props.type ?? "text").toLowerCase();
      const type = INPUT_TYPES.has(requestedType) ? requestedType : "text";
      return `<input ${htmlAttributes([
        classAttribute,
        `type="${type}"`,
        `name="${escapeHtml(String(props.name ?? ""))}"`,
        `placeholder="${escapeHtml(String(props.placeholder ?? ""))}"`,
        props.required === true ? "required" : null,
      ])} />`;
    }
    case "TEXTAREA":
      return `<textarea ${htmlAttributes([
        classAttribute,
        `name="${escapeHtml(String(props.name ?? ""))}"`,
        `placeholder="${escapeHtml(String(props.placeholder ?? ""))}"`,
        props.required === true ? "required" : null,
      ])}></textarea>`;
    case "SELECT": {
      const options = normalizeOptions(props.options)
        .map(
          (option) =>
            `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`,
        )
        .join("");
      return `<select ${classAttribute} name="${escapeHtml(String(props.name ?? ""))}">${options}</select>`;
    }
    case "CHECKBOX":
      return `<input ${htmlAttributes([
        classAttribute,
        'type="checkbox"',
        `name="${escapeHtml(String(props.name ?? ""))}"`,
        props.required === true ? "required" : null,
        props.checked === true ? "checked" : null,
      ])} />`;
    case "FORM": {
      const action = sanitizePublicUrl(props.action) ?? "#";
      const method =
        String(props.method ?? "POST").toUpperCase() === "GET" ? "GET" : "POST";
      return `<form ${htmlAttributes([
        classAttribute,
        eventAttributes,
        `action="${escapeHtml(action)}"`,
        `method="${method}"`,
      ])}>${childrenHtml}</form>`;
    }
    case "FAQ":
      return `<details ${classAttribute}><summary>${escapeHtml(String(props.question ?? "Question"))}</summary><p>${escapeHtml(String(props.answer ?? "Answer"))}</p></details>`;
    case "TESTIMONIAL":
      return `<figure ${classAttribute}><blockquote>${escapeHtml(String(props.quote ?? ""))}</blockquote><figcaption><strong>${escapeHtml(String(props.author ?? ""))}</strong>${props.role ? `, ${escapeHtml(String(props.role))}` : ""}</figcaption></figure>`;
    case "PRICING":
      return renderPricingBlock(classAttribute, props);
    case "IFRAME": {
      const src = sanitizePublicUrl(props.src, "media");
      if (!src) return "";
      return `<iframe ${classAttribute} src="${escapeHtml(src)}" title="${escapeHtml(String(props.title ?? "Embedded content"))}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-forms allow-popups allow-scripts"></iframe>`;
    }
    case "CUSTOM_HTML":
      return `<div ${classAttribute}>${sanitizeCustomHtml(String(props.html ?? ""))}</div>`;
    case "SCRIPT":
      return policy.allowCustomCode
        ? `<script>${containInlineScript(String(props.script ?? props.code ?? ""))}</script>`
        : "";
    default:
      return null;
  }
}

function normalizeOptions(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  return String(value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function renderPricingBlock(
  classAttribute: string,
  props: Record<string, unknown>,
): string {
  const features = normalizeOptions(props.features)
    .map((feature) => `<li>${escapeHtml(feature)}</li>`)
    .join("");
  return `<section ${classAttribute}><h3>${escapeHtml(String(props.title ?? ""))}</h3><p>${escapeHtml(String(props.price ?? ""))}</p><ul>${features}</ul></section>`;
}
