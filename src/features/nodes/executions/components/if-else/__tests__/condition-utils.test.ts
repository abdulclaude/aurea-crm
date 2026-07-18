import assert from "node:assert/strict";
import test from "node:test";

import {
  describeIfElseConfig,
  evaluateIfElseConfig,
} from "../condition-utils";
import { createIfElseCondition, normalizeIfElseConfig } from "../schema";

test("legacy conditions upgrade without changing their branch result", () => {
  const legacy = {
    variableName: "attendanceCheck",
    leftOperand: "{{trigger.attendanceCount}}",
    operator: "equals",
    rightOperand: "3",
  };

  const upgraded = normalizeIfElseConfig(legacy);
  assert.equal(upgraded.version, 2);
  assert.equal(upgraded.conditions.length, 1);
  assert.equal(
    evaluateIfElseConfig(upgraded, {
      variables: { trigger: { attendanceCount: 3 } },
    }).result,
    true,
  );
});

test("all and any modes evaluate multiple typed conditions", () => {
  const conditions = [
    createIfElseCondition({
      id: "attendance",
      leftOperand: "{{trigger.attendanceCount}}",
      operator: "greaterThanOrEqual",
      rightOperand: "3",
      valueType: "number",
    }),
    createIfElseCondition({
      id: "active",
      leftOperand: "{{trigger.membershipActive}}",
      operator: "equals",
      rightOperand: "true",
      valueType: "boolean",
    }),
  ];
  const context = {
    variables: {
      trigger: { attendanceCount: 4, membershipActive: false },
    },
  };

  assert.equal(
    evaluateIfElseConfig(
      {
        version: 2,
        actionName: "Ready for member offer",
        variableName: "eligible",
        matchMode: "all",
        conditions,
      },
      context,
    ).result,
    false,
  );
  assert.equal(
    evaluateIfElseConfig(
      {
        version: 2,
        actionName: "Ready for member offer",
        variableName: "eligible",
        matchMode: "any",
        conditions,
      },
      context,
    ).result,
    true,
  );
});

test("missing variables fail closed instead of counting as empty", () => {
  const config = {
    version: 2 as const,
    actionName: "Missing phone",
    variableName: "missingPhone",
    matchMode: "all" as const,
    conditions: [
      createIfElseCondition({
        id: "phone",
        leftOperand: "{{trigger.typoPhone}}",
        operator: "isEmpty",
      }),
    ],
  };

  assert.equal(evaluateIfElseConfig(config, { variables: {} }).result, false);
});

test("dates, arrays, and field-to-field comparisons keep their types", () => {
  const config = {
    version: 2 as const,
    actionName: "Booking is ready",
    variableName: "ready",
    matchMode: "all" as const,
    conditions: [
      createIfElseCondition({
        id: "date",
        leftOperand: "{{trigger.bookingDate}}",
        operator: "lessThan",
        rightOperand: "2026-08-01",
        valueType: "date",
      }),
      createIfElseCondition({
        id: "tag",
        leftOperand: "{{trigger.tags}}",
        operator: "contains",
        rightOperand: "VIP",
      }),
      createIfElseCondition({
        id: "credits",
        leftOperand: "{{trigger.creditsRemaining}}",
        operator: "greaterThan",
        rightOperand: "{{trigger.lowCreditThreshold}}",
        rightOperandSource: "field",
        valueType: "number",
      }),
    ],
  };

  assert.equal(
    evaluateIfElseConfig(config, {
      variables: {
        trigger: {
          bookingDate: "2026-07-31T10:00:00.000Z",
          creditsRemaining: 2,
          lowCreditThreshold: 1,
          tags: ["VIP", "Pilates"],
        },
      },
    }).result,
    true,
  );
});

test("node summaries describe configured business intent", () => {
  const description = describeIfElseConfig({
    version: 2,
    actionName: "Milestone reached",
    variableName: "milestone",
    matchMode: "all",
    conditions: [
      createIfElseCondition({
        id: "attendance",
        leftOperand: "{{trigger.attendanceCount}}",
        leftLabel: "Trigger / Attendance count",
        operator: "greaterThanOrEqual",
        rightOperand: "3",
        valueType: "number",
      }),
    ],
  });

  assert.equal(description, "Trigger / Attendance count is at least 3");
});
