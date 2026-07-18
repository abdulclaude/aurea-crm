import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const source = readFileSync(
  path.join(process.cwd(), "src/features/households/server/router.ts"),
  "utf8",
);

function procedureSource(name: string, nextName?: string): string {
  const start = source.indexOf(`  ${name}: protectedProcedure`);
  const end = nextName
    ? source.indexOf(`  ${nextName}: protectedProcedure`, start)
    : source.lastIndexOf("});");

  assert.notEqual(start, -1, `Missing ${name} procedure`);
  assert.notEqual(end, -1, `Missing end of ${name} procedure`);

  return source.slice(start, end);
}

describe("household router authorization", () => {
  it("requires customer view for reads and customer manage for mutations", () => {
    const expectations = [
      ["list", "getForClient", "customer.view"],
      ["getForClient", "create", "customer.view"],
      ["create", "addMember", "customer.manage"],
      ["addMember", "removeMember", "customer.manage"],
      ["removeMember", undefined, "customer.manage"],
    ] as const;

    for (const [name, nextName, capability] of expectations) {
      assert.match(
        procedureSource(name, nextName),
        new RegExp(
          `await requireHouseholdAccess\\(\\s*ctx,\\s*"${capability}",\\s*\\)`,
        ),
        `${name} must require ${capability}`,
      );
    }
  });

  it("binds authorization and data access to the exact active tenant scope", () => {
    assert.match(
      source,
      /const scope = \{\s*organizationId: ctx\.orgId,\s*locationId: ctx\.locationId \?\? null,\s*\}/,
    );
    assert.match(source, /resource: scope/);

    for (const [name, nextName] of [
      ["list", "getForClient"],
      ["getForClient", "create"],
      ["addMember", "removeMember"],
      ["removeMember", undefined],
    ] as const) {
      const procedure = procedureSource(name, nextName);
      assert.match(
        procedure,
        /eq\((?:client|clientHousehold)\.organizationId, organizationId\)/,
      );
      assert.match(
        procedure,
        /locationId\s*\?\s*eq\((?:client|clientHousehold)\.locationId, locationId\)\s*:\s*isNull\((?:client|clientHousehold)\.locationId\)/,
      );
    }
  });

  it("checks permissions before resolving household configuration", () => {
    for (const [name, nextName] of [
      ["list", "getForClient"],
      ["getForClient", "create"],
      ["create", "addMember"],
      ["addMember", "removeMember"],
    ] as const) {
      const procedure = procedureSource(name, nextName);
      const authorization = procedure.indexOf("await requireHouseholdAccess(");
      const configuration = procedure.indexOf(
        "await resolveHouseholdRuntimePolicy(",
      );

      assert.notEqual(authorization, -1);
      assert.notEqual(configuration, -1);
      assert.ok(
        authorization < configuration,
        `${name} must authorize before configuration resolution`,
      );
    }
  });
});
