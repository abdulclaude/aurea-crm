import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { NodeType } from "@/db/enums";
import { getNodeDefaultData } from "@/features/nodes/lib/node-default-data";
import { nodeTypeIsAvailable } from "@/features/nodes/lib/node-availability";
import { studioStarterWorkflowTemplates } from "@/features/workflows/lib/studio-starter-templates";

describe("studio node trust contracts", () => {
  it("does not advertise studio nodes without a real producer or side effect", () => {
    for (const nodeType of [
      NodeType.SEND_CLASS_REMINDER,
      NodeType.AWARD_LOYALTY_POINTS,
      NodeType.CALCULATE_CHURN_SCORE,
    ]) {
      assert.equal(nodeTypeIsAvailable(nodeType), false, nodeType);
    }
  });

  it("gives newly added studio triggers an immediately usable variable", () => {
    assert.deepEqual(getNodeDefaultData(NodeType.FORM_SUBMITTED_TRIGGER), {
      variableName: "formSubmission",
    });
    assert.deepEqual(
      getNodeDefaultData(NodeType.PRICING_OPTION_PURCHASED_TRIGGER),
      { variableName: "purchase" },
    );
    assert.deepEqual(getNodeDefaultData(NodeType.CLASS_BOOKED_TRIGGER), {
      variableName: "bookedClass",
    });
  });

  it("defaults class actions to workflow data without hiding fixed resources", () => {
    assert.deepEqual(getNodeDefaultData(NodeType.STUDIO_CLASS_ACTION), {
      operation: "CHECK_IN",
      classSource: "VARIABLE",
      classId: "{{triggerData.classId}}",
      clientSource: "VARIABLE",
      clientId: "{{triggerData.clientId}}",
      variableName: "studioAction",
    });
    assert.equal(nodeTypeIsAvailable(NodeType.STUDIO_CLASS_ACTION), true);
  });

  it("only exposes starter templates whose nodes are available", () => {
    for (const template of studioStarterWorkflowTemplates) {
      for (const templateNode of template.nodes) {
        assert.equal(
          nodeTypeIsAvailable(templateNode.type),
          true,
          `${template.slug}:${templateNode.type}`,
        );
      }
    }
  });
});
