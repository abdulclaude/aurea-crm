import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { customerFieldDefinitionValuesSchema } from "../../contracts";
import {
  fieldTypeUsesOptions,
  normalizeCustomerFieldDefinition,
} from "../customer-field-definition";

describe("customer field definitions", () => {
  it("normalizes stable keys without altering typed options", () => {
    const values = customerFieldDefinitionValuesSchema.parse({
      key: "fitness_goal",
      label: " Fitness goal ",
      description: " ",
      fieldType: "SELECT",
      options: ["Strength", "Mobility"],
    });
    assert.deepEqual(normalizeCustomerFieldDefinition(values), {
      ...values,
      key: "fitness_goal",
      label: "Fitness goal",
      description: null,
    });
  });

  it("only permits options for select types", () => {
    assert.equal(fieldTypeUsesOptions("SELECT"), true);
    assert.equal(fieldTypeUsesOptions("MULTI_SELECT"), true);
    assert.equal(fieldTypeUsesOptions("TEXT"), false);
    assert.equal(
      customerFieldDefinitionValuesSchema.safeParse({
        key: "opt_in",
        label: "Opt in",
        fieldType: "BOOLEAN",
        options: ["Yes"],
      }).success,
      false,
    );
  });
});
