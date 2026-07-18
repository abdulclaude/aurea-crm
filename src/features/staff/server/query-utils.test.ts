import assert from "node:assert/strict";
import test from "node:test";

import { readStaffEmploymentType } from "./query-utils";

test("reads explicit employee and contractor metadata", () => {
  assert.equal(
    readStaffEmploymentType({ employmentType: "EMPLOYEE" }),
    "EMPLOYEE",
  );
  assert.equal(
    readStaffEmploymentType({ employmentType: "CONTRACTOR" }),
    "CONTRACTOR",
  );
});

test("maps Mindbody employment flags without inventing a default", () => {
  assert.equal(
    readStaffEmploymentType({ IndependentContractor: "true" }),
    "CONTRACTOR",
  );
  assert.equal(readStaffEmploymentType({ Employee: "yes" }), "EMPLOYEE");
  assert.equal(readStaffEmploymentType({}, "EMP-001"), "EMPLOYEE");
  assert.equal(readStaffEmploymentType(null, "EMP-002"), "EMPLOYEE");
  assert.equal(readStaffEmploymentType({}), null);
  assert.equal(readStaffEmploymentType(null), null);
});
