import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  requiredWorkspaceRegionalValuesSchema,
  workspaceRegionalValuesSchema,
} from "../../contracts";
import { resolveRegionalCurrency } from "@/lib/regional-context/contracts";
import {
  resolveWorkspaceRegionalSettings,
  resolvedRegionalValues,
} from "../regional-settings";

describe("workspace regional settings", () => {
  it("resolves an organization configuration without identity-specific behavior", () => {
    const effective = resolveWorkspaceRegionalSettings({
      organizationValues: {
        timezone: "Europe/London",
        locale: "en-GB",
        currency: "GBP",
        weekStart: "MONDAY",
        dateFormat: "DAY_MONTH_YEAR",
        timeFormat: "TWENTY_FOUR_HOUR",
      },
      locationValues: null,
      hasLocationScope: false,
      legacyOrganizationCurrency: "USD",
      legacyLocationTimezone: null,
    });

    assert.deepEqual(resolvedRegionalValues(effective), {
      timezone: "Europe/London",
      locale: "en-GB",
      currency: "GBP",
      weekStart: "MONDAY",
      dateFormat: "DAY_MONTH_YEAR",
      timeFormat: "TWENTY_FOUR_HOUR",
    });
    assert.equal(effective.currency.source, "ORGANIZATION_DEFAULT");
  });

  it("mixes location overrides with inherited values field by field", () => {
    const effective = resolveWorkspaceRegionalSettings({
      organizationValues: {
        timezone: "Europe/London",
        locale: "en-GB",
        currency: "GBP",
        weekStart: "MONDAY",
        dateFormat: "DAY_MONTH_YEAR",
        timeFormat: "TWENTY_FOUR_HOUR",
      },
      locationValues: {
        timezone: "Europe/Paris",
        locale: "fr-FR",
        currency: "EUR",
        weekStart: null,
        dateFormat: null,
        timeFormat: null,
      },
      hasLocationScope: true,
      legacyOrganizationCurrency: "USD",
      legacyLocationTimezone: "America/New_York",
    });

    assert.deepEqual(resolvedRegionalValues(effective), {
      timezone: "Europe/Paris",
      locale: "fr-FR",
      currency: "EUR",
      weekStart: "MONDAY",
      dateFormat: "DAY_MONTH_YEAR",
      timeFormat: "TWENTY_FOUR_HOUR",
    });
    assert.equal(effective.timezone.source, "LOCATION_OVERRIDE");
    assert.equal(effective.weekStart.source, "ORGANIZATION_DEFAULT");
  });

  it("uses legacy values only before a versioned scope exists", () => {
    const legacy = resolveWorkspaceRegionalSettings({
      organizationValues: null,
      locationValues: null,
      hasLocationScope: true,
      legacyOrganizationCurrency: "gbp",
      legacyLocationTimezone: "America/New_York",
    });
    assert.equal(legacy.currency.value, "GBP");
    assert.equal(legacy.currency.source, "LEGACY_ORGANIZATION");
    assert.equal(legacy.timezone.source, "LEGACY_LOCATION");

    const explicitInheritance = resolveWorkspaceRegionalSettings({
      organizationValues: null,
      locationValues: {
        timezone: null,
        locale: null,
        currency: null,
        weekStart: null,
        dateFormat: null,
        timeFormat: null,
      },
      hasLocationScope: true,
      legacyOrganizationCurrency: "GBP",
      legacyLocationTimezone: "America/New_York",
    });
    assert.equal(explicitInheritance.timezone.value, "UTC");
    assert.equal(explicitInheritance.timezone.source, "SYSTEM_DEFAULT");
  });

  it("rejects malformed legacy values instead of crashing consumers", () => {
    const effective = resolveWorkspaceRegionalSettings({
      organizationValues: null,
      locationValues: null,
      hasLocationScope: true,
      legacyOrganizationCurrency: "ZZZ",
      legacyLocationTimezone: "Not/A_Timezone",
    });
    assert.equal(effective.currency.value, "USD");
    assert.equal(effective.currency.source, "SYSTEM_DEFAULT");
    assert.equal(effective.timezone.value, "UTC");
    assert.equal(effective.timezone.source, "SYSTEM_DEFAULT");
  });

  it("validates canonical regional values and nullable overrides", () => {
    assert.equal(
      requiredWorkspaceRegionalValuesSchema.safeParse({
        timezone: "Europe/London",
        locale: "en-GB",
        currency: "gbp",
        weekStart: "MONDAY",
        dateFormat: "LOCALE",
        timeFormat: "TWENTY_FOUR_HOUR",
      }).success,
      true,
    );
    assert.equal(
      workspaceRegionalValuesSchema.safeParse({
        timezone: null,
        locale: null,
        currency: null,
        weekStart: null,
        dateFormat: null,
        timeFormat: null,
      }).success,
      true,
    );
    assert.equal(
      requiredWorkspaceRegionalValuesSchema.safeParse({
        timezone: "Not/A_Timezone",
        locale: "invalid_locale",
        currency: "NOPE",
        weekStart: "TUESDAY",
        dateFormat: "LOCALE",
        timeFormat: "TWENTY_FOUR_HOUR",
      }).success,
      false,
    );
  });

  it("uses each workspace currency only when a record has no explicit currency", () => {
    assert.equal(resolveRegionalCurrency(undefined, "EUR"), "EUR");
    assert.equal(resolveRegionalCurrency(null, "USD"), "USD");
    assert.equal(resolveRegionalCurrency("gbp", "EUR"), "GBP");
  });
});
