import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { toPublicInstructorProfile } from "../instructor-public-profile";

const source = ["widget-channel-snapshot.ts", "widget-source-data.ts"]
  .map((file) =>
    readFileSync(
      path.join(process.cwd(), "src/features/publications/server", file),
      "utf8",
    ),
  )
  .join("\n");

test("instructor widget snapshots use an exact safe profile projection", () => {
  assert.match(source, /eq\(instructor\.organizationId, scope\.organizationId\)/);
  assert.match(source, /eq\(instructor\.locationId, scope\.locationId\)/);
  assert.match(source, /isNull\(instructor\.locationId\)/);
  assert.match(source, /eq\(instructor\.isActive, true\)/);
  assert.match(source, /eq\(instructor\.isSystem, false\)/);
  for (const privateField of [
    "email",
    "phone",
    "hourlyRate",
    "bankAccountNumber",
    "bankSortCode",
    "nationalInsuranceNumber",
    "stripeAccountId",
    "portalToken",
    "sessionToken",
    "customFields",
  ]) {
    assert.doesNotMatch(source, new RegExp(`instructor\\.${privateField}`));
  }
});

test("membership widget snapshots exclude provider and checkout configuration", () => {
  assert.match(source, /eq\(pricingOption\.type, "MEMBERSHIP"\)/);
  assert.match(source, /eq\(pricingOption\.isPublic, true\)/);
  assert.match(source, /eq\(pricingOption\.isHidden, false\)/);
  for (const privateField of [
    "membershipPlanId",
    "stripePriceId",
    "stripeProductId",
    "providerAccountId",
    "directPurchaseEnabled",
    "buyPagePath",
  ]) {
    assert.doesNotMatch(source, new RegExp(`pricingOption\\.${privateField}`));
  }
});

test("instructor publication drift depends only on configured public fields", () => {
  const config = {
    schemaVersion: 1 as const,
    instructorIds: ["instructor-1"],
    layout: "GRID" as const,
    columns: 3,
    showProfilePhoto: true,
    showBio: true,
    showSpecialties: true,
    showCertifications: false,
  };
  const profile = {
    id: "instructor-1",
    name: "Alex Morgan",
    profilePhoto: "https://cdn.example.test/alex.jpg",
    bio: "Pilates and mobility coach.",
    specialties: [" Pilates ", "Mobility"],
    certifications: ["Private certification"],
    hourlyRate: "65.00",
  };
  const published = toPublicInstructorProfile(profile, config);

  assert.deepEqual(
    toPublicInstructorProfile(
      { ...profile, hourlyRate: "95.00", certifications: ["Changed"] },
      config,
    ),
    published,
  );
  assert.notDeepEqual(
    toPublicInstructorProfile({ ...profile, bio: "Updated public bio." }, config),
    published,
  );
});
