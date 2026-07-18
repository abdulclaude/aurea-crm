import assert from "node:assert/strict";
import test from "node:test";

import {
  authorizeUploadScope,
  UploadAuthorizationError,
  UPLOAD_ROUTE_POLICIES,
} from "@/features/uploads/upload-policy";

const exactScope = {
  userId: "user-a",
  organizationId: "org-a",
  locationId: "location-a",
};

test("every upload route has an explicit authorization policy", () => {
  assert.deepEqual(Object.keys(UPLOAD_ROUTE_POLICIES).sort(), [
    "instructorDocument",
    "instructorProfilePhoto",
    "invoiceDocument",
    "mindbodyImportFile",
    "orgLogo",
    "profilePicture",
    "waiverDocument",
    "workspaceLogo",
  ]);
});

test("uploads reject unauthenticated and incomplete tenant scope", async () => {
  const allow = async () => true;
  await assert.rejects(
    authorizeUploadScope({
      route: "profilePicture",
      session: { userId: null, organizationId: null, locationId: null },
      checkCapability: allow,
    }),
    (error) =>
      error instanceof UploadAuthorizationError &&
      error.reason === "UNAUTHENTICATED",
  );
  await assert.rejects(
    authorizeUploadScope({
      route: "instructorDocument",
      session: { ...exactScope, locationId: null },
      checkCapability: allow,
    }),
    (error) =>
      error instanceof UploadAuthorizationError &&
      error.reason === "LOCATION_REQUIRED",
  );
});

test("sensitive uploads require the route capability in exact scope", async () => {
  await assert.rejects(
    authorizeUploadScope({
      route: "mindbodyImportFile",
      session: exactScope,
      checkCapability: async ({ capability, organizationId, locationId }) =>
        capability === "provider.manage" &&
        organizationId === "org-a" &&
        locationId === "wrong-location",
    }),
    (error) =>
      error instanceof UploadAuthorizationError &&
      error.reason === "CAPABILITY_DENIED",
  );

  const authorized = await authorizeUploadScope({
    route: "instructorProfilePhoto",
    session: exactScope,
    checkCapability: async ({ capability, organizationId, locationId }) =>
      capability === "team.manage" &&
      organizationId === "org-a" &&
      locationId === "location-a",
  });
  assert.deepEqual(authorized, {
    ...exactScope,
    uploadRoute: "instructorProfilePhoto",
  });
});

test("onboarding and self-profile uploads remain authenticated user scoped", async () => {
  for (const route of ["orgLogo", "profilePicture"] as const) {
    const authorized = await authorizeUploadScope({
      route,
      session: {
        userId: "user-a",
        organizationId: null,
        locationId: null,
      },
      checkCapability: async () => false,
    });
    assert.equal(authorized.userId, "user-a");
    assert.equal(authorized.organizationId, null);
    assert.equal(authorized.locationId, null);
  }
});
