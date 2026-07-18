import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("payslip data integrity", () => {
  const generator = source("src/features/payroll/lib/payslip-generator.ts");
  const router = source("src/features/payroll/server/router.ts");

  it("renders materialized payroll rates instead of the mutable instructor rate", () => {
    assert.match(generator, /payrollInstructor\.regularPay/);
    assert.match(generator, /payrollInstructor\.regularHours/);
    assert.match(generator, /payrollInstructor\.overtimePay/);
    assert.doesNotMatch(generator, /Number\(instructor\.hourlyRate\)/);
  });

  it("requires sensitive-pay access and scopes payslip lookup", () => {
    assert.equal(router.match(/capability: "compensation\.view"/g)?.length, 2);
    assert.match(generator, /payrollRun\.organizationId/);
    assert.match(generator, /payrollRun\.locationId/);
  });
});
