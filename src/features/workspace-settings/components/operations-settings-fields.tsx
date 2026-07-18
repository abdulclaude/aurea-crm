"use client";

import { Separator } from "@/components/ui/separator";
import {
  workspaceScheduleSlotMinutes,
  type WorkspaceOperationsValues,
} from "@/features/workspace-settings/operations-contracts";
import { resolvedOperationsValues } from "@/features/workspace-settings/lib/operations-settings";
import type { WorkspaceOperationsSettingsView } from "@/features/workspace-settings/server/operations-model";

import { BusinessHoursEditor } from "./business-hours-editor";
import { OperationsSelectRow } from "./operations-select-row";

const DISPLAY_TIME_OPTIONS = Array.from({ length: 49 }, (_, index) => ({
  value: String(index * 30),
  label:
    index === 48
      ? "24:00"
      : `${String(Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`,
}));
const BOOLEAN_OPTIONS = [
  { value: "true", label: "Enabled" },
  { value: "false", label: "Disabled" },
] as const;

export function OperationsSettingsFields(props: {
  settings: WorkspaceOperationsSettingsView;
  values: WorkspaceOperationsValues;
  disabled: boolean;
  onChange: (values: WorkspaceOperationsValues) => void;
}): React.JSX.Element {
  const isLocation = props.settings.scope.locationId !== null;
  const effective = resolvedOperationsValues(props.settings.effective);
  const organization = resolvedOperationsValues(
    props.settings.organizationEffective,
  );
  const setField = <Key extends keyof WorkspaceOperationsValues>(
    key: Key,
    value: WorkspaceOperationsValues[Key],
  ): void => props.onChange({ ...props.values, [key]: value });
  const inherited = (value: string): string =>
    `Use organization default (${value})`;
  const boolValue = (value: boolean | null): string | null =>
    value === null ? null : String(value);

  return (
    <div>
      <BusinessHoursEditor
        value={props.values.businessHours}
        effectiveValue={
          isLocation ? organization.businessHours : effective.businessHours
        }
        allowInheritance={isLocation}
        disabled={props.disabled}
        onChange={(value) => setField("businessHours", value)}
      />

      <SectionLabel
        title="Schedule display"
        description="Set stable default bounds for calendar views. Events remain visible outside these bounds."
      />
      <OperationsSelectRow
        id="operations-schedule-start"
        label="Day starts at"
        description="Earliest hour shown when the schedule has no earlier event."
        value={
          props.values.scheduleStartMinutes === null
            ? null
            : String(props.values.scheduleStartMinutes)
        }
        source={props.settings.effective.scheduleStartMinutes.source}
        inheritedLabel={inherited(
          formatMinutes(organization.scheduleStartMinutes),
        )}
        options={DISPLAY_TIME_OPTIONS.slice(0, -1)}
        allowInheritance={isLocation}
        disabled={props.disabled}
        onChange={(value) =>
          setField(
            "scheduleStartMinutes",
            value === null ? null : Number(value),
          )
        }
      />
      <OperationsSelectRow
        id="operations-schedule-end"
        label="Day ends at"
        description="Latest hour shown by default in day and week views."
        value={
          props.values.scheduleEndMinutes === null
            ? null
            : String(props.values.scheduleEndMinutes)
        }
        source={props.settings.effective.scheduleEndMinutes.source}
        inheritedLabel={inherited(
          formatMinutes(organization.scheduleEndMinutes),
        )}
        options={DISPLAY_TIME_OPTIONS.slice(1)}
        allowInheritance={isLocation}
        disabled={props.disabled}
        onChange={(value) =>
          setField("scheduleEndMinutes", value === null ? null : Number(value))
        }
      />
      <OperationsSelectRow
        id="operations-schedule-slot"
        label="Calendar interval"
        description="Default granularity for creating and scanning appointments."
        value={
          props.values.scheduleSlotMinutes === null
            ? null
            : String(props.values.scheduleSlotMinutes)
        }
        source={props.settings.effective.scheduleSlotMinutes.source}
        inheritedLabel={inherited(
          `${organization.scheduleSlotMinutes} minutes`,
        )}
        options={workspaceScheduleSlotMinutes.map((value) => ({
          value: String(value),
          label: `${value} minutes`,
        }))}
        allowInheritance={isLocation}
        disabled={props.disabled}
        onChange={(value) => {
          setField(
            "scheduleSlotMinutes",
            value === null
              ? null
              : (workspaceScheduleSlotMinutes.find(
                  (option) => option === Number(value),
                ) ?? null),
          );
        }}
      />

      <SectionLabel
        title="Guest bookings"
        description="Control additional attendees on appointment bookings."
      />
      <OperationsSelectRow
        id="operations-guests-enabled"
        label="Allow guests"
        description="Permit an attendee to include additional guests."
        value={boolValue(props.values.guestBookingEnabled)}
        source={props.settings.effective.guestBookingEnabled.source}
        inheritedLabel={inherited(
          organization.guestBookingEnabled ? "Enabled" : "Disabled",
        )}
        options={BOOLEAN_OPTIONS}
        allowInheritance={isLocation}
        disabled={props.disabled}
        onChange={(value) =>
          setField(
            "guestBookingEnabled",
            value === null ? null : value === "true",
          )
        }
      />
      <OperationsSelectRow
        id="operations-guest-limit"
        label="Maximum guests"
        description="Bound guest-list size for one booking."
        value={
          props.values.maxGuestsPerBooking === null
            ? null
            : String(props.values.maxGuestsPerBooking)
        }
        source={props.settings.effective.maxGuestsPerBooking.source}
        inheritedLabel={inherited(String(organization.maxGuestsPerBooking))}
        options={Array.from({ length: 21 }, (_, value) => ({
          value: String(value),
          label: String(value),
        }))}
        allowInheritance={isLocation}
        disabled={props.disabled}
        onChange={(value) =>
          setField("maxGuestsPerBooking", value === null ? null : Number(value))
        }
      />

      <SectionLabel
        title="Public contact"
        description="Choose which verified workspace details can enter new publication snapshots."
      />
      {(
        [
          ["showPublicEmail", "Email", "Include the public business email."],
          ["showPublicPhone", "Phone", "Include the public business phone."],
          ["showPublicWebsite", "Website", "Include the canonical website."],
          [
            "showPublicAddress",
            "Address",
            "Include the public location address.",
          ],
        ] as const
      ).map(([key, label, description]) => (
        <OperationsSelectRow
          key={key}
          id={`operations-${key}`}
          label={label}
          description={description}
          value={boolValue(props.values[key])}
          source={props.settings.effective[key].source}
          inheritedLabel={inherited(organization[key] ? "Visible" : "Hidden")}
          options={[
            { value: "true", label: "Visible" },
            { value: "false", label: "Hidden" },
          ]}
          allowInheritance={isLocation}
          disabled={props.disabled}
          onChange={(value) =>
            setField(key, value === null ? null : value === "true")
          }
        />
      ))}
    </div>
  );
}

function SectionLabel(props: {
  title: string;
  description: string;
}): React.JSX.Element {
  return (
    <div className="space-y-1 pt-6">
      <Separator className="mb-5" />
      <h3 className="text-xs font-medium text-primary">{props.title}</h3>
      <p className="text-xs text-primary/65">{props.description}</p>
    </div>
  );
}

function formatMinutes(value: number): string {
  if (value === 1440) return "24:00";
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
