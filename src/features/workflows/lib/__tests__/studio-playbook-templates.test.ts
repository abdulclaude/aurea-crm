import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { NodeType } from "@/db/enums";
import { studioPlaybookTemplates } from "@/features/workflows/lib/studio-playbook-templates";

describe("studio playbook templates", () => {
  it("contains all twelve audited playbook graphs with unique identities", () => {
    assert.equal(studioPlaybookTemplates.length, 12);
    assert.equal(
      new Set(studioPlaybookTemplates.map(({ slug }) => slug)).size,
      12,
    );
    assert.equal(
      new Set(studioPlaybookTemplates.map(({ name }) => name)).size,
      12,
    );
  });

  it("has one trigger, valid edges, and only available first-party nodes", () => {
    for (const template of studioPlaybookTemplates) {
      const keys = new Set(template.nodes.map(({ key }) => key));
      const triggers = template.nodes.filter(({ type }) =>
        type.endsWith("_TRIGGER"),
      );
      assert.equal(triggers.length, 1, template.slug);
      for (const edge of template.connections) {
        assert.ok(keys.has(edge.from), `${template.slug}:${edge.from}`);
        assert.ok(keys.has(edge.to), `${template.slug}:${edge.to}`);
      }
    }
  });

  it("preserves task and timing structure for the audited playbooks", () => {
    const welcome = studioPlaybookTemplates.find(
      ({ slug }) => slug === "playbook-new-lead-welcome-series",
    );
    const cancellation = studioPlaybookTemplates.find(
      ({ slug }) => slug === "playbook-membership-cancellation-follow-up",
    );
    const hundred = studioPlaybookTemplates.find(
      ({ slug }) => slug === "playbook-100-class-milestone",
    );

    assert.equal(welcome?.nodes.length, 9);
    assert.equal(cancellation?.nodes.length, 7);
    assert.equal(hundred?.nodes.length, 3);
    assert.equal(
      studioPlaybookTemplates
        .flatMap(({ nodes }) => nodes)
        .filter(({ type }) => type === NodeType.CREATE_TASK).length,
      5,
    );
  });
});
