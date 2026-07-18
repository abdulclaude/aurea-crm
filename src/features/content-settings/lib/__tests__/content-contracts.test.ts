import assert from "node:assert/strict";
import test from "node:test";

import {
  contentLibraryPayloadSchema,
  createContentLibraryItemSchema,
} from "@/features/content-settings/contracts";

test("content contracts reject ambiguous terminology and FAQ identities", () => {
  assert.equal(
    contentLibraryPayloadSchema.safeParse({
      kind: "TERMINOLOGY_PACK",
      terms: [
        { key: "customer", label: "Member", pluralLabel: "Members" },
        { key: "customer", label: "Client", pluralLabel: "Clients" },
      ],
    }).success,
    false,
  );
  assert.equal(
    contentLibraryPayloadSchema.safeParse({
      kind: "FAQ_COLLECTION",
      entries: [
        { id: "same", question: "One?", answer: "One", sortOrder: 0 },
        { id: "same", question: "Two?", answer: "Two", sortOrder: 1 },
      ],
    }).success,
    false,
  );
});

test("materially different public profiles remain typed configuration", () => {
  const studio = createContentLibraryItemSchema.parse({
    name: "Studio profile",
    key: "studio-profile",
    payload: {
      kind: "PUBLIC_PROFILE",
      slug: "studio-profile",
      displayName: "The Studio",
      email: "hello@example.com",
      bookingUrl: "https://example.com/classes",
    },
  });
  const clinic = createContentLibraryItemSchema.parse({
    name: "Clinic profile",
    key: "clinic-profile",
    payload: {
      kind: "PUBLIC_PROFILE",
      slug: "clinic-profile",
      displayName: "The Clinic",
      phone: "+442000000000",
      websiteUrl: "https://clinic.example.com",
      address: { countryCode: "GB" },
    },
  });

  assert.equal(studio.payload.kind, "PUBLIC_PROFILE");
  assert.equal(clinic.payload.kind, "PUBLIC_PROFILE");
  assert.notDeepEqual(studio.payload, clinic.payload);
});
