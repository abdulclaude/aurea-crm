import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTerminologyDictionary,
  mergeScopedOverrides,
  macroIsAvailable,
  selectScopedOverride,
  visibleFaqEntries,
} from "@/features/content-settings/lib/runtime-content";

test("terminology packs keep materially different workspace language isolated", () => {
  const studio = buildTerminologyDictionary({
    kind: "TERMINOLOGY_PACK",
    terms: [
      { key: "customer", label: "Member", pluralLabel: "Members" },
      { key: "appointment", label: "Class", pluralLabel: "Classes" },
    ],
  });
  const clinic = buildTerminologyDictionary({
    kind: "TERMINOLOGY_PACK",
    terms: [
      { key: "customer", label: "Client", pluralLabel: "Clients" },
      { key: "appointment", label: "Session", pluralLabel: "Sessions" },
    ],
  });

  assert.equal(studio.customer?.label, "Member");
  assert.equal(clinic.customer?.label, "Client");
  assert.notDeepEqual(studio, clinic);
});

test("location content overrides only matching organization keys", () => {
  const candidates = [
    { key: "default", locationId: null, value: "Organization default" },
    { key: "default", locationId: "clinic", value: "Clinic override" },
    { key: "shared", locationId: null, value: "Shared organization item" },
  ];

  assert.equal(
    selectScopedOverride(candidates, "clinic")?.value,
    "Clinic override",
  );
  assert.deepEqual(
    mergeScopedOverrides(candidates, "clinic")
      .sort((left, right) => left.key.localeCompare(right.key))
      .map((candidate) => candidate.value),
    ["Clinic override", "Shared organization item"],
  );
  assert.equal(
    selectScopedOverride(candidates, "studio")?.value,
    "Organization default",
  );
});

test("FAQ and macro runtime helpers expose only published-ready content", () => {
  const entries = visibleFaqEntries({
    kind: "FAQ_COLLECTION",
    entries: [
      {
        id: "hidden",
        question: "Hidden",
        answer: "Draft",
        sortOrder: 0,
        isVisible: false,
      },
      {
        id: "second",
        question: "Second",
        answer: "Answer",
        sortOrder: 2,
        isVisible: true,
      },
      {
        id: "first",
        question: "First",
        answer: "Answer",
        sortOrder: 1,
        isVisible: true,
      },
    ],
  });

  assert.deepEqual(entries.map((entry) => entry.id), ["first", "second"]);
  assert.equal(
    macroIsAvailable({
      channel: "INBOX",
      payload: {
        kind: "MESSAGE_MACRO",
        content: "Thanks for contacting us.",
        channel: "INBOX",
        tags: ["support"],
        isActive: true,
      },
    }),
    true,
  );
  assert.equal(
    macroIsAvailable({
      channel: "SMS",
      payload: {
        kind: "MESSAGE_MACRO",
        content: "Thanks for contacting us.",
        channel: "INBOX",
        tags: ["support"],
        isActive: true,
      },
    }),
    false,
  );
});
