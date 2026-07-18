"use client";

import * as React from "react";
import { allTimezones, useTimezoneSelect } from "react-timezone-select";

import type { WorkspaceRegionalValues } from "@/features/workspace-settings/contracts";
import {
  DATE_FORMAT_OPTIONS,
  LOCALE_OPTIONS,
  TIME_FORMAT_OPTIONS,
  WEEK_START_OPTIONS,
} from "@/features/workspace-settings/constants";
import { resolvedRegionalValues } from "@/features/workspace-settings/lib/regional-settings";
import type { WorkspaceRegionalSettingsView } from "@/features/workspace-settings/server/model";

import { RegionalFieldRow } from "./regional-field-row";

function withCurrentOption(
  options: Array<{ value: string; label: string }>,
  current: string | null,
): Array<{ value: string; label: string }> {
  if (!current || options.some((option) => option.value === current)) return options;
  return [{ value: current, label: current }, ...options];
}

export function RegionalSettingsFields(props: {
  settings: WorkspaceRegionalSettingsView;
  values: WorkspaceRegionalValues;
  disabled: boolean;
  onChange: (values: WorkspaceRegionalValues) => void;
}): React.JSX.Element {
  const effective = resolvedRegionalValues(props.settings.effective);
  const organizationEffective = resolvedRegionalValues(
    props.settings.organizationEffective,
  );
  const isLocation = props.settings.scope.locationId !== null;
  const { options: rawTimezoneOptions } = useTimezoneSelect({
    labelStyle: "original",
    timezones: allTimezones,
  });
  const timezoneOptions = rawTimezoneOptions.map((option) => ({
    value: option.value,
    label: String(option.label),
  }));
  const currencyOptions = React.useMemo(() => {
    const displayNames = new Intl.DisplayNames([effective.locale], { type: "currency" });
    return Intl.supportedValuesOf("currency").map((currency) => ({
      value: currency,
      label: `${currency} - ${displayNames.of(currency) ?? currency}`,
    }));
  }, [effective.locale]);
  const setField = <Key extends keyof WorkspaceRegionalValues>(
    key: Key,
    value: WorkspaceRegionalValues[Key],
  ): void => props.onChange({ ...props.values, [key]: value });
  const shared = {
    allowInheritance: isLocation,
    disabled: props.disabled,
  };

  return (
    <>
      <RegionalFieldRow
        {...shared}
        id="regional-timezone"
        label="Timezone"
        description="Controls local scheduling and business-day boundaries."
        value={props.values.timezone}
        effectiveValue={isLocation ? organizationEffective.timezone : effective.timezone}
        source={props.settings.effective.timezone.source}
        options={withCurrentOption(timezoneOptions, props.values.timezone)}
        onChange={(value) => setField("timezone", value)}
      />
      <RegionalFieldRow
        {...shared}
        id="regional-locale"
        label="Locale"
        description="Controls names, separators, and workspace-authored output."
        value={props.values.locale}
        effectiveValue={isLocation ? organizationEffective.locale : effective.locale}
        source={props.settings.effective.locale.source}
        options={withCurrentOption([...LOCALE_OPTIONS], props.values.locale)}
        onChange={(value) => setField("locale", value)}
      />
      <RegionalFieldRow
        {...shared}
        id="regional-currency"
        label="Default currency"
        description="Used by reports and supported price creation when no currency is supplied."
        value={props.values.currency}
        effectiveValue={isLocation ? organizationEffective.currency : effective.currency}
        source={props.settings.effective.currency.source}
        options={withCurrentOption(currencyOptions, props.values.currency)}
        onChange={(value) => setField("currency", value)}
      />
      <RegionalFieldRow
        {...shared}
        id="regional-week-start"
        label="Week starts on"
        description="Controls calendar presentation and reporting week buckets."
        value={props.values.weekStart}
        effectiveValue={isLocation ? organizationEffective.weekStart : effective.weekStart}
        source={props.settings.effective.weekStart.source}
        options={[...WEEK_START_OPTIONS]}
        onChange={(value) => setField("weekStart", value as WorkspaceRegionalValues["weekStart"])}
      />
      <RegionalFieldRow
        {...shared}
        id="regional-date-format"
        label="Date format"
        description="Controls date ordering in workspace-authored output."
        value={props.values.dateFormat}
        effectiveValue={isLocation ? organizationEffective.dateFormat : effective.dateFormat}
        source={props.settings.effective.dateFormat.source}
        options={[...DATE_FORMAT_OPTIONS]}
        onChange={(value) => setField("dateFormat", value as WorkspaceRegionalValues["dateFormat"])}
      />
      <RegionalFieldRow
        {...shared}
        id="regional-time-format"
        label="Time format"
        description="Controls 12-hour or 24-hour display in workspace-authored output."
        value={props.values.timeFormat}
        effectiveValue={isLocation ? organizationEffective.timeFormat : effective.timeFormat}
        source={props.settings.effective.timeFormat.source}
        options={[...TIME_FORMAT_OPTIONS]}
        onChange={(value) => setField("timeFormat", value as WorkspaceRegionalValues["timeFormat"])}
      />
    </>
  );
}
