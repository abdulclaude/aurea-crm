import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const routerSource = readFileSync(
  path.join(
    process.cwd(),
    "src/features/invoicing/server/invoices-router.ts",
  ),
  "utf8",
);

function section(start: string, end: string): string {
  const startIndex = routerSource.indexOf(start);
  const endIndex = routerSource.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `Missing section start: ${start}`);
  assert.notEqual(endIndex, -1, `Missing section end: ${end}`);
  return routerSource.slice(startIndex, endIndex);
}

describe("invoice tenant integrity", () => {
  it("validates all persisted reference types at the exact scope", () => {
    const validator = section(
      "async function requireInvoiceReferences",
      "type InvoiceCommerceFinancials",
    );

    for (const tableName of [
      "client",
      "invoiceTemplate",
      "timeLog",
      "studioProduct",
    ]) {
      assert.match(
        validator,
        new RegExp(`eq\\(${tableName}\\.organizationId, input\\.organizationId\\)`),
      );
      assert.match(
        validator,
        new RegExp(
          `exactInvoiceLocation\\(${tableName}\\.locationId, input\\.locationId\\)`,
        ),
      );
    }

    assert.match(validator, /scopedTimeLogs\.length !== timeLogIds\.length/);
    assert.match(validator, /scopedProducts\.length !== productIds\.length/);
    assert.match(validator, /eq\(studioProduct\.isActive, true\)/);
    assert.match(validator, /isNull\(studioProduct\.deletedAt\)/);
    assert.equal(validator.match(/code: "NOT_FOUND"/g)?.length, 4);
  });

  it("runs create and update reference checks before their first write", () => {
    const createProcedure = section(
      "  create: protectedProcedure",
      "  update: protectedProcedure",
    );
    const updateProcedure = section(
      "  update: protectedProcedure",
      "  updateDocument: protectedProcedure",
    );

    assert.ok(
      createProcedure.indexOf("requireInvoiceReferences(tx") <
        createProcedure.indexOf(".insert(invoice)"),
    );
    assert.ok(
      updateProcedure.indexOf("requireInvoiceReferences(tx") <
        updateProcedure.indexOf(".delete(invoiceLineItem)"),
    );
    assert.match(createProcedure, /clientId: input\.clientId/);
    assert.match(createProcedure, /templateId: input\.templateId/);
    assert.match(createProcedure, /lineItems: input\.lineItems/);
    assert.match(updateProcedure, /clientId: updateData\.clientId/);
    assert.match(updateProcedure, /templateId,/);
    assert.match(updateProcedure, /lineItems,/);
  });

  it("requires a full approved time-log match and repeats the scope on update", () => {
    const procedure = section(
      "  generateFromTimeLogs: protectedProcedure",
      "  // Generate an opaque, expiring payment link",
    );

    assert.match(procedure, /Time log IDs must be unique/);
    assert.match(
      procedure,
      /exactInvoiceLocation\(t\.locationId, ctx\.locationId\)/,
    );
    assert.match(procedure, /eq\(t\.status, "APPROVED"\)/);
    assert.match(
      procedure,
      /timeLogs\.length !== input\.timeLogIds\.length/,
    );

    const finalUpdate = section(
      "const updatedTimeLogs = await tx",
      "        return inv!;",
    );
    assert.match(finalUpdate, /eq\(timeLog\.organizationId, ctx\.orgId!\)/);
    assert.match(
      finalUpdate,
      /exactInvoiceLocation\(timeLog\.locationId, ctx\.locationId\)/,
    );
    assert.match(finalUpdate, /eq\(timeLog\.status, "APPROVED"\)/);
    assert.match(finalUpdate, /isNull\(timeLog\.invoiceId\)/);
    assert.match(finalUpdate, /\.returning\(\{ id: timeLog\.id \}\)/);
    assert.match(
      finalUpdate,
      /updatedTimeLogs\.length !== input\.timeLogIds\.length/,
    );
  });
});
