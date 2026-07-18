import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  studioBookingActionDefaults,
  studioBookingActionFormSchema,
} from "../config";

describe("studio class action configuration", () => {
  it("exposes only replay-safe attendance and waitlist actions", () => {
    for (const operation of [
      "CHECK_IN",
      "MARK_NO_SHOW",
      "JOIN_WAITLIST",
      "LEAVE_WAITLIST",
    ]) {
      assert.equal(
        studioBookingActionFormSchema.safeParse({
          ...studioBookingActionDefaults(),
          operation,
        }).success,
        true,
        operation,
      );
    }
    for (const operation of ["BOOK", "CANCEL"]) {
      assert.equal(
        studioBookingActionFormSchema.safeParse({
          ...studioBookingActionDefaults(),
          operation,
        }).success,
        false,
        operation,
      );
    }
  });

  it("supports fixed studio resources and prior-node variables", () => {
    assert.equal(
      studioBookingActionFormSchema.safeParse({
        ...studioBookingActionDefaults(),
        classSource: "SELECTED",
        classId: "class-1",
        className: "Morning reformer",
        clientSource: "SELECTED",
        clientId: "client-1",
        clientName: "Alex Member",
      }).success,
      true,
    );
    assert.equal(
      studioBookingActionFormSchema.safeParse({
        ...studioBookingActionDefaults(),
        classId: "{{firstClass.id}}",
        clientId: "{{formSubmission.clientId}}",
      }).success,
      true,
    );
  });
});
