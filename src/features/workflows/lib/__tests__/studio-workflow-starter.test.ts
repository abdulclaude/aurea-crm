import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { NodeType } from "@/db/enums";
import {
  buildClassBookingWorkflowStarter,
  buildClassSeriesBookingWorkflowStarter,
  buildFormSubmissionWorkflowStarter,
  buildPricingPurchaseWorkflowStarter,
  buildServiceBookingWorkflowStarter,
} from "@/features/workflows/lib/studio-workflow-starter";

describe("studio workflow starters", () => {
  it("creates a class booking trigger scoped to the selected service", () => {
    const starter = buildServiceBookingWorkflowStarter({
      id: "service-reformer",
      name: "Reformer Flow",
    });

    assert.equal(starter.name, "Reformer Flow booking automation");
    assert.equal(starter.initialNode.type, NodeType.CLASS_BOOKED_TRIGGER);
    assert.deepEqual(starter.initialNode.data, {
      variableName: "bookedClass",
      serviceTypeIds: ["service-reformer"],
      serviceTypeNames: ["Reformer Flow"],
    });
  });

  it("uses the same generic contract for a materially different service", () => {
    const starter = buildServiceBookingWorkflowStarter({
      id: "service-breathwork",
      name: "Breathwork Private",
    });

    assert.deepEqual(starter.initialNode.data.serviceTypeIds, [
      "service-breathwork",
    ]);
    assert.deepEqual(starter.initialNode.data.serviceTypeNames, [
      "Breathwork Private",
    ]);
  });

  it("creates a booking trigger for one exact class occurrence", () => {
    const starter = buildClassBookingWorkflowStarter({
      id: "class-friday-0900",
      name: "Friday Reformer",
    });

    assert.equal(starter.name, "Friday Reformer booking automation");
    assert.deepEqual(starter.initialNode.data, {
      variableName: "bookedClass",
      classId: "class-friday-0900",
      className: "Friday Reformer",
    });
  });

  it("creates a booking trigger for a recurring class series", () => {
    const starter = buildClassSeriesBookingWorkflowStarter({
      id: "series-weekday",
      name: "Weekday Reformer",
    });

    assert.equal(starter.name, "Weekday Reformer series booking automation");
    assert.deepEqual(starter.initialNode.data, {
      variableName: "bookedClass",
      classSeriesIds: ["series-weekday"],
      classSeriesNames: ["Weekday Reformer"],
    });
  });

  it("creates a purchase trigger scoped to the selected pricing option", () => {
    const starter = buildPricingPurchaseWorkflowStarter({
      id: "pricing-unlimited",
      name: "Unlimited Monthly",
    });

    assert.equal(starter.name, "Unlimited Monthly purchase automation");
    assert.equal(
      starter.initialNode.type,
      NodeType.PRICING_OPTION_PURCHASED_TRIGGER,
    );
    assert.deepEqual(starter.initialNode.data, {
      variableName: "purchase",
      pricingOptionIds: ["pricing-unlimited"],
      pricingOptionNames: ["Unlimited Monthly"],
    });
  });

  it("reuses the pricing starter contract for a one-time intro offer", () => {
    const starter = buildPricingPurchaseWorkflowStarter({
      id: "pricing-intro",
      name: "Three Class Intro",
    });

    assert.deepEqual(starter.initialNode.data.pricingOptionIds, [
      "pricing-intro",
    ]);
    assert.deepEqual(starter.initialNode.data.pricingOptionNames, [
      "Three Class Intro",
    ]);
  });

  it("creates a form response trigger scoped to the selected form", () => {
    const starter = buildFormSubmissionWorkflowStarter({
      id: "form-intake",
      name: "New member intake",
    });

    assert.equal(starter.name, "New member intake response automation");
    assert.equal(starter.initialNode.type, NodeType.FORM_SUBMITTED_TRIGGER);
    assert.deepEqual(starter.initialNode.data, {
      variableName: "formSubmission",
      formId: "form-intake",
      formName: "New member intake",
    });
  });
});
