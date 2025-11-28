import { updateVariableReferences } from "../update-variable-references";
import type { Node, Edge } from "@xyflow/react";

describe("updateVariableReferences", () => {
  it("should update variable references in downstream nodes", () => {
    const nodes: Node[] = [
      {
        id: "node1",
        type: "googleFormTrigger",
        position: { x: 0, y: 0 },
        data: { variableName: "form" },
      },
      {
        id: "node2",
        type: "createContact",
        position: { x: 100, y: 100 },
        data: {
          name: "{{form.responses.Name}}",
          email: "{{form.responses.Email}}",
        },
      },
      {
        id: "node3",
        type: "sendEmail",
        position: { x: 200, y: 200 },
        data: {
          to: "{{form.responses.Email}}",
          subject: "Hello {{form.responses.Name}}",
        },
      },
    ];

    const edges: Edge[] = [
      { id: "e1", source: "node1", target: "node2" },
      { id: "e2", source: "node2", target: "node3" },
    ];

    const result = updateVariableReferences(
      "node1",
      "form",
      "googleForm",
      nodes,
      edges
    );

    // node1 should not be updated (it's the source)
    expect(result[0].data).toEqual({ variableName: "form" });

    // node2 should have updated references
    expect(result[1].data).toEqual({
      name: "{{googleForm.responses.Name}}",
      email: "{{googleForm.responses.Email}}",
    });

    // node3 should have updated references
    expect(result[2].data).toEqual({
      to: "{{googleForm.responses.Email}}",
      subject: "Hello {{googleForm.responses.Name}}",
    });
  });

  it("should not update if variable name hasn't changed", () => {
    const nodes: Node[] = [
      {
        id: "node1",
        type: "googleFormTrigger",
        position: { x: 0, y: 0 },
        data: { variableName: "form" },
      },
      {
        id: "node2",
        type: "createContact",
        position: { x: 100, y: 100 },
        data: { name: "{{form.responses.Name}}" },
      },
    ];

    const edges: Edge[] = [{ id: "e1", source: "node1", target: "node2" }];

    const result = updateVariableReferences(
      "node1",
      "form",
      "form",
      nodes,
      edges
    );

    // Should return the same nodes array
    expect(result).toBe(nodes);
  });

  it("should handle nested objects and arrays", () => {
    const nodes: Node[] = [
      {
        id: "node1",
        type: "googleFormTrigger",
        position: { x: 0, y: 0 },
        data: { variableName: "form" },
      },
      {
        id: "node2",
        type: "custom",
        position: { x: 100, y: 100 },
        data: {
          config: {
            nested: {
              field: "{{form.data}}",
            },
          },
          items: ["{{form.item1}}", "{{form.item2}}"],
        },
      },
    ];

    const edges: Edge[] = [{ id: "e1", source: "node1", target: "node2" }];

    const result = updateVariableReferences(
      "node1",
      "form",
      "googleForm",
      nodes,
      edges
    );

    expect(result[1].data).toEqual({
      config: {
        nested: {
          field: "{{googleForm.data}}",
        },
      },
      items: ["{{googleForm.item1}}", "{{googleForm.item2}}"],
    });
  });

  it("should only update exact variable name matches", () => {
    const nodes: Node[] = [
      {
        id: "node1",
        type: "googleFormTrigger",
        position: { x: 0, y: 0 },
        data: { variableName: "form" },
      },
      {
        id: "node2",
        type: "createContact",
        position: { x: 100, y: 100 },
        data: {
          // Should update
          correct: "{{form.data}}",
          // Should NOT update (different variable names)
          formData: "{{formData.value}}",
          platform: "{{platform.name}}",
        },
      },
    ];

    const edges: Edge[] = [{ id: "e1", source: "node1", target: "node2" }];

    const result = updateVariableReferences(
      "node1",
      "form",
      "googleForm",
      nodes,
      edges
    );

    expect(result[1].data).toEqual({
      correct: "{{googleForm.data}}",
      formData: "{{formData.value}}", // Unchanged
      platform: "{{platform.name}}", // Unchanged
    });
  });
});
