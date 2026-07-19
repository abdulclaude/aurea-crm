import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { CAPABILITY_VALUES } from "@/features/permissions/capabilities";
import { SETTINGS_SECTIONS } from "@/features/settings/constants";
import {
  filterSettingsSections,
  getActiveSettingsItemHref,
  getVisibleSettingsSections,
} from "@/features/settings/lib/settings-registry";

const settingsRouteDirectory = path.join(
  process.cwd(),
  "src/app/(dashboard)/settings",
);

function settingsPageHrefs(directory = settingsRouteDirectory): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return settingsPageHrefs(entryPath);
    if (entry.name !== "page.tsx") return [];

    const routeDirectory = path.relative(
      settingsRouteDirectory,
      path.dirname(entryPath),
    );
    return [
      routeDirectory
        ? `/settings/${routeDirectory.split(path.sep).join("/")}`
        : "/settings",
    ];
  });
}

test("settings registry has unique item IDs and destinations", () => {
  const items = SETTINGS_SECTIONS.flatMap((section) => section.items);

  assert.equal(new Set(items.map((item) => item.id)).size, items.length);
  assert.equal(new Set(items.map((item) => item.href)).size, items.length);
  assert.equal(items.every((item) => item.description.length > 0), true);
});

test("communications exposes every operational area as a sidebar item", () => {
  const communications = SETTINGS_SECTIONS.find(
    (section) => section.id === "communications",
  );

  assert.deepEqual(
    communications?.items.slice(0, 8).map((item) => [
      item.title,
      item.href,
    ]),
    [
      ["Email", "/settings/communications/email"],
      ["SMS", "/settings/communications/sms"],
      ["Voice", "/settings/communications/voice"],
      ["Inbox", "/settings/communications/inbox"],
      ["Rules", "/settings/communications/rules"],
      ["Suppressions", "/settings/communications/suppressions"],
      ["Blocklist", "/settings/communications/blocklist"],
      ["Usage", "/settings/communications/usage"],
    ],
  );
});

test("every settings destination resolves to a file-backed route", () => {
  const registeredHrefs = SETTINGS_SECTIONS.flatMap((section) =>
    section.items.map((item) => item.href),
  ).sort();

  const pageHrefs = settingsPageHrefs().sort();
  const legacyRedirects = ["/settings", "/settings/communications"];
  const resolvesToPage = (href: string) =>
    pageHrefs.some((pageHref) => {
      const pattern = new RegExp(
        `^${pageHref.replace(/\[[^/]+\]/g, "[^/]+")}$`,
      );
      return pattern.test(href);
    });

  assert.equal(registeredHrefs.every(resolvesToPage), true);
  for (const pageHref of pageHrefs.filter((href) => !href.includes("["))) {
    if (
      pageHref === "/settings/commerce" ||
      legacyRedirects.includes(pageHref)
    ) {
      continue;
    }
    assert.equal(
      registeredHrefs.includes(pageHref),
      true,
      `missing settings destination for ${pageHref}`,
    );
  }
});

test("instructors only receive personal account settings", () => {
  const sections = getVisibleSettingsSections({
    capabilities: CAPABILITY_VALUES,
    isInstructor: true,
  });

  assert.deepEqual(
    sections.flatMap((section) => section.items.map((item) => item.id)),
    ["profile", "notifications"],
  );
});

test("capability filtering keeps read surfaces and hides sensitive providers", () => {
  const sections = getVisibleSettingsSections({
    capabilities: ["settings.view", "schedule.view"],
    isInstructor: false,
  });
  const itemIds = sections.flatMap((section) =>
    section.items.map((item) => item.id),
  );

  assert.equal(itemIds.includes("workspace-details"), true);
  assert.equal(itemIds.includes("booking-calendar"), true);
  assert.equal(itemIds.includes("provider-accounts"), false);
  assert.equal(itemIds.includes("payment-methods"), false);
});

test("settings search matches item descriptions within the selected section", () => {
  const sections = getVisibleSettingsSections({
    capabilities: CAPABILITY_VALUES,
    isInstructor: false,
  });
  const results = filterSettingsSections({
    sections,
    sectionId: "communications",
    query: "receipts",
  });

  assert.deepEqual(
    results.flatMap((section) => section.items.map((item) => item.id)),
    ["delivery-operations"],
  );
});

test("the longest matching settings destination owns nested active state", () => {
  assert.equal(
    getActiveSettingsItemHref(
      "/settings/payments/operations/example",
      [
        "/settings",
        "/settings/payments",
        "/settings/payments/operations",
      ],
    ),
    "/settings/payments/operations",
  );
  assert.equal(
    getActiveSettingsItemHref("/settings/profile", ["/settings"]),
    null,
  );
  assert.equal(
    getActiveSettingsItemHref("/settings", ["/settings"]),
    "/settings",
  );
});
