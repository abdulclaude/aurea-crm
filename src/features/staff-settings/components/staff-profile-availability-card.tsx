import * as React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { StaffOperationsPolicyValues } from "@/features/staff-settings/contracts";

type OperationsPolicyUpdate = <Key extends keyof StaffOperationsPolicyValues>(
  key: Key,
  value: StaffOperationsPolicyValues[Key],
) => void;

function availabilityModeFrom(
  value: string,
): StaffOperationsPolicyValues["availabilityMode"] {
  return value === "ROTA_REQUIRED" ? "ROTA_REQUIRED" : "AVAILABILITY_REQUIRED";
}

function ToggleField(props: {
  id: string;
  label: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0">
      <Label htmlFor={props.id} className="text-xs font-medium">
        {props.label}
      </Label>
      <Switch
        id={props.id}
        checked={props.checked}
        disabled={props.disabled}
        onCheckedChange={props.onCheckedChange}
      />
    </div>
  );
}

export function StaffProfileAvailabilityCard(props: {
  values: StaffOperationsPolicyValues;
  disabled: boolean;
  onUpdate: OperationsPolicyUpdate;
}): React.JSX.Element {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-sm">Profile and availability</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ToggleField
          id="public-instructor-profile-default"
          label="New instructor profiles are public by default"
          checked={props.values.publicInstructorProfilesByDefault}
          disabled={props.disabled}
          onCheckedChange={(checked) =>
            props.onUpdate("publicInstructorProfilesByDefault", checked)
          }
        />
        <ToggleField
          id="staff-availability-edits"
          label="Staff can edit their availability"
          checked={props.values.staffCanEditAvailability}
          disabled={props.disabled}
          onCheckedChange={(checked) =>
            props.onUpdate("staffCanEditAvailability", checked)
          }
        />
        <div className="space-y-2">
          <Label htmlFor="staff-availability-mode" className="text-xs">
            Scheduling source
          </Label>
          <Select
            value={props.values.availabilityMode}
            disabled={props.disabled}
            onValueChange={(value) =>
              props.onUpdate("availabilityMode", availabilityModeFrom(value))
            }
          >
            <SelectTrigger id="staff-availability-mode" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AVAILABILITY_REQUIRED">
                Availability required
              </SelectItem>
              <SelectItem value="ROTA_REQUIRED">Rota required</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ToggleField
          id="shift-swap-approval"
          label="Shift swaps require approval"
          checked={props.values.shiftSwapRequiresApproval}
          disabled={props.disabled}
          onCheckedChange={(checked) =>
            props.onUpdate("shiftSwapRequiresApproval", checked)
          }
        />
        <ToggleField
          id="time-off-approval"
          label="Time off requires approval"
          checked={props.values.timeOffRequiresApproval}
          disabled={props.disabled}
          onCheckedChange={(checked) =>
            props.onUpdate("timeOffRequiresApproval", checked)
          }
        />
      </CardContent>
    </Card>
  );
}
