import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("module settings mutations require settings management capability", () => {
  const moduleRouter = source("src/features/modules/server/router.ts");

  assert.match(moduleRouter, /capability: "settings\.manage"/);
  assert.equal(
    moduleRouter.match(/await requireModuleManagement\(ctx\);/g)?.length,
    3,
  );
});

test("booking availability and holiday mutations require schedule management", () => {
  const bookingRouter = source(
    "src/features/bookings/server/bookings-router.ts",
  );

  assert.match(bookingRouter, /capability: "schedule\.manage"/);
  assert.equal(
    bookingRouter.match(
      /await requireScheduleManagement\(ctx, \{ organizationId, locationId \}\);/g,
    )?.length,
    7,
  );
});

test("booking calendar reads require schedule view capability", () => {
  const bookingRouter = source(
    "src/features/bookings/server/bookings-router.ts",
  );
  const calendarProcedure = bookingRouter.slice(
    bookingRouter.indexOf("getCalendar: protectedProcedure"),
    bookingRouter.indexOf("getOne: protectedProcedure"),
  );

  assert.match(calendarProcedure, /capability: "schedule\.view"/);
  assert.match(
    calendarProcedure,
    /resource: \{ organizationId, locationId \}/,
  );
});

test("workspace settings reads and writes require settings capabilities", () => {
  const organizationsRouter = source(
    "src/features/organizations/server/routers.ts",
  );
  const workspaceSection = organizationsRouter.slice(
    organizationsRouter.indexOf("updateOrganization: protectedProcedure"),
    organizationsRouter.indexOf("// ── Shared"),
  );

  assert.equal(workspaceSection.match(/capability: "settings\.manage"/g)?.length, 2);
  assert.match(workspaceSection, /capability: "settings\.view"/);
  assert.match(workspaceSection, /resource: \{ organizationId: ctx\.orgId, locationId: ctx\.locationId \}/);
  const updateLocation = workspaceSection.slice(
    workspaceSection.indexOf("updateLocation: protectedProcedure"),
    workspaceSection.indexOf("getWorkspaceDetails: protectedProcedure"),
  );
  assert.doesNotMatch(updateLocation, /timezone/);
});

test("location creation cannot select another tenant or bypass settings management", () => {
  const organizationsRouter = source(
    "src/features/organizations/server/routers.ts",
  );
  const createLocation = organizationsRouter.slice(
    organizationsRouter.indexOf("createLocation: protectedProcedure"),
    organizationsRouter.indexOf("getClients: protectedProcedure"),
  );

  assert.doesNotMatch(createLocation, /organizationId: z\.string/);
  assert.match(createLocation, /const organizationId = ctx\.orgId/);
  assert.match(createLocation, /capability: "settings\.manage"/);
  assert.match(createLocation, /db\.transaction/);
  assert.doesNotMatch(organizationsRouter, /upsertLocation: protectedProcedure/);
});
