import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { NodeType } from "@/db/enums";
import { studioMarketingTemplates } from "@/features/workflows/lib/studio-marketing-templates";
import { studioStarterWorkflowTemplates } from "@/features/workflows/lib/studio-starter-templates";

function templateBySlug(slug: string) {
  const template = studioMarketingTemplates.find((item) => item.slug === slug);
  assert.ok(template, `Missing template: ${slug}`);
  return template;
}

test("marketing starter pack covers all twelve audited automation patterns", () => {
  assert.equal(studioMarketingTemplates.length, 12);
  assert.equal(
    new Set(studioMarketingTemplates.map(({ slug }) => slug)).size,
    studioMarketingTemplates.length,
  );
  assert.equal(
    new Set(studioMarketingTemplates.map(({ name }) => name)).size,
    studioMarketingTemplates.length,
  );

  const starterSlugs = new Set(
    studioStarterWorkflowTemplates.map(({ slug }) => slug),
  );
  assert.equal(starterSlugs.size, studioStarterWorkflowTemplates.length);
  assert.equal(
    new Set(studioStarterWorkflowTemplates.map(({ name }) => name)).size,
    studioStarterWorkflowTemplates.length,
  );
  for (const template of studioMarketingTemplates) {
    assert.ok(starterSlugs.has(template.slug));
  }
});

test("starter installation persists the pack as archived templates", () => {
  const routerSource = readFileSync(
    path.join(process.cwd(), "src/features/workflows/server/routers.ts"),
    "utf8",
  );
  const installProcedure = routerSource.slice(
    routerSource.indexOf("installStudioStarterTemplates"),
    routerSource.indexOf("createWorkflowFromTemplate"),
  );

  assert.match(installProcedure, /isTemplate: true/);
  assert.match(installProcedure, /archived: true/);
});

test("every template has valid graph references and neutral editable data", () => {
  const serialized = JSON.stringify(studioMarketingTemplates);
  assert.doesNotMatch(serialized, /arketa|bxt|pip/i);
  assert.doesNotMatch(serialized, /tagId|locationId/i);

  for (const template of studioMarketingTemplates) {
    const keys = new Set(template.nodes.map(({ key }) => key));
    assert.equal(
      keys.size,
      template.nodes.length,
      `${template.slug}: node keys`,
    );
    for (const edge of template.connections) {
      assert.ok(keys.has(edge.from), `${template.slug}: missing ${edge.from}`);
      assert.ok(keys.has(edge.to), `${template.slug}: missing ${edge.to}`);
    }
    for (const trigger of template.nodes.filter(
      ({ type }) => type === NodeType.PRICING_OPTION_PURCHASED_TRIGGER,
    )) {
      assert.deepEqual(trigger.data.pricingOptionIds, []);
    }
    for (const email of template.nodes.filter(
      ({ type }) => type === NodeType.SEND_EMAIL,
    )) {
      assert.equal(email.data.purpose, "MARKETING");
    }
    for (const templateNode of template.nodes) {
      if (typeof templateNode.data.variableName === "string") {
        assert.match(
          templateNode.data.variableName,
          /^[A-Za-z_$][A-Za-z0-9_$]*$/,
          `${template.slug}: ${templateNode.key} variable`,
        );
      }
    }
  }
});

test("pack proves materially different milestone and inactivity configurations", () => {
  const milestone = templateBySlug("class-count-level-milestone");
  const inactivity = templateBySlug("client-inactivity-add-tag");

  assert.deepEqual(
    milestone.nodes.map(({ type }) => type),
    [NodeType.MEMBER_CLASS_COUNT_TRIGGER, NodeType.ADD_TAG_TO_CLIENT],
  );
  assert.equal(milestone.nodes[0]?.data.targetCount, 2);

  assert.deepEqual(
    inactivity.nodes.map(({ type }) => type),
    [NodeType.CLIENT_INACTIVITY_TRIGGER, NodeType.ADD_TAG_TO_CLIENT],
  );
  assert.equal(inactivity.nodes[0]?.data.days, 90);
});

test("templates use the canonical trigger context contracts", () => {
  const formTag = templateBySlug("form-submission-add-lead-tag");
  const nurture = templateBySlug("form-lead-nurture-journey");
  const pricingTag = templateBySlug("pricing-option-purchased-segment-tag");
  const introPurchase = templateBySlug("intro-pricing-book-first-class");
  const inactivity = templateBySlug("client-inactivity-add-tag");

  assert.equal(
    formTag.nodes.find(({ type }) => type === NodeType.ADD_TAG_TO_CLIENT)?.data
      .clientId,
    "{{formSubmission.submission.clientId}}",
  );
  assert.ok(
    nurture.nodes
      .filter(({ type }) => type === NodeType.IF_ELSE)
      .every(
        ({ data }) =>
          data.clientId === "{{leadSubmission.submission.clientId}}",
      ),
  );
  assert.equal(
    pricingTag.nodes.find(({ type }) => type === NodeType.ADD_TAG_TO_CLIENT)
      ?.data.clientId,
    "{{pricingPurchase.purchase.clientId}}",
  );
  assert.ok(
    introPurchase.nodes
      .filter(({ type }) => type === NodeType.IF_ELSE)
      .every(
        ({ data }) =>
          data.clientId === "{{introPurchase.purchase.clientId}}",
      ),
  );
  assert.equal(
    inactivity.nodes.find(({ type }) => type === NodeType.ADD_TAG_TO_CLIENT)
      ?.data.clientId,
    "{{inactivity.client.id}}",
  );
});

test("journey templates preserve conditions, waits, channels, and tag transitions", () => {
  const leadNurture = templateBySlug("form-lead-nurture-journey");
  const firstClass = templateBySlug("first-class-intro-journey");
  const introPurchase = templateBySlug("intro-pricing-book-first-class");

  for (const template of [leadNurture, firstClass, introPurchase]) {
    const types = new Set(template.nodes.map(({ type }) => type));
    assert.ok(types.has(NodeType.IF_ELSE));
    assert.ok(types.has(NodeType.WAIT));
    assert.ok(types.has(NodeType.SEND_EMAIL));
    assert.ok(types.has(NodeType.SEND_SMS));
    assert.ok(types.has(NodeType.ADD_TAG_TO_CLIENT));
  }

  assert.ok(
    firstClass.nodes.some(
      ({ type }) => type === NodeType.REMOVE_TAG_FROM_CLIENT,
    ),
  );
  assert.ok(
    introPurchase.nodes
      .filter(({ type }) => type === NodeType.IF_ELSE)
      .every(
        ({ data }) =>
          data.clientId === "{{introPurchase.purchase.clientId}}",
      ),
  );
});

test("audited journey replicas preserve every observed node and edge", () => {
  const expected = [
    ["form-lead-nurture-journey", 25, 24],
    ["first-class-intro-journey", 57, 56],
    ["intro-pricing-book-first-class", 16, 15],
  ] as const;

  for (const [slug, nodeCount, edgeCount] of expected) {
    const template = templateBySlug(slug);
    assert.equal(template.nodes.length, nodeCount, `${slug}: node count`);
    assert.equal(
      template.connections.length,
      edgeCount,
      `${slug}: connection count`,
    );
  }
});

test("condition replicas query live tenant-scoped member data", () => {
  for (const slug of [
    "form-lead-nurture-journey",
    "first-class-intro-journey",
    "intro-pricing-book-first-class",
  ]) {
    const conditions = templateBySlug(slug).nodes.filter(
      ({ type }) => type === NodeType.IF_ELSE,
    );
    assert.ok(conditions.length > 0);
    for (const condition of conditions) {
      assert.equal(condition.data.version, 2);
      assert.match(String(condition.data.clientId), /^\{\{.+\}\}$/);
      assert.match(JSON.stringify(condition.data.conditions), /system\./);
    }
  }
});

test("incomplete templates are visibly drafts without outbound messages", () => {
  const drafts = studioMarketingTemplates.filter(({ name }) =>
    name.startsWith("Draft:"),
  );
  assert.equal(drafts.length, 2);

  for (const draft of drafts) {
    const types = draft.nodes.map(({ type }) => type);
    assert.equal(types.includes(NodeType.SEND_EMAIL), false);
    assert.equal(types.includes(NodeType.SEND_SMS), false);
    assert.match(draft.description, /Incomplete/i);
  }
});
