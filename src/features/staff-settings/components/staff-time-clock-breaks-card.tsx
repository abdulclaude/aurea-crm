import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StaffOperationsPolicyValues } from "@/features/staff-settings/contracts";

type OperationsPolicyUpdate = <Key extends keyof StaffOperationsPolicyValues>(
  key: Key,
  value: StaffOperationsPolicyValues[Key],
) => void;

function approvalModeFrom(
  value: string,
): StaffOperationsPolicyValues["timeEntryApprovalMode"] {
  return value === "AUTO_APPROVE" ? "AUTO_APPROVE" : "MANAGER_REQUIRED";
}

function roundingMinutesFrom(
  value: string,
): StaffOperationsPolicyValues["timeClockRoundingMinutes"] {
  if (value === "1") return 1;
  if (value === "5") return 5;
  if (value === "6") return 6;
  if (value === "10") return 10;
  if (value === "15") return 15;
  return 30;
}

export function StaffTimeClockBreaksCard(props: {
  values: StaffOperationsPolicyValues;
  canManage: boolean;
  disabled: boolean;
  isPending: boolean;
  changeNote: string;
  onChangeNote: (value: string) => void;
  onUpdate: OperationsPolicyUpdate;
  onPublish: () => Promise<void>;
}): React.JSX.Element {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-sm">Time clock and breaks</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="time-clock-rounding" className="text-xs">
            Clock rounding
          </Label>
          <Select
            value={String(props.values.timeClockRoundingMinutes)}
            disabled={props.disabled}
            onValueChange={(value) =>
              props.onUpdate(
                "timeClockRoundingMinutes",
                roundingMinutesFrom(value),
              )
            }
          >
            <SelectTrigger id="time-clock-rounding" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 5, 6, 10, 15, 30].map((minutes) => (
                <SelectItem key={minutes} value={String(minutes)}>
                  {minutes} minute{minutes === 1 ? "" : "s"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="time-entry-approval" className="text-xs">
            Time entry approval
          </Label>
          <Select
            value={props.values.timeEntryApprovalMode}
            disabled={props.disabled}
            onValueChange={(value) =>
              props.onUpdate("timeEntryApprovalMode", approvalModeFrom(value))
            }
          >
            <SelectTrigger id="time-entry-approval" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MANAGER_REQUIRED">Manager required</SelectItem>
              <SelectItem value="AUTO_APPROVE">Auto approve</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="break-threshold" className="text-xs">
            Break threshold minutes
          </Label>
          <Input
            id="break-threshold"
            type="number"
            min={1}
            max={1440}
            value={props.values.breakRequiredAfterMinutes ?? ""}
            disabled={props.disabled}
            onChange={(event) =>
              props.onUpdate(
                "breakRequiredAfterMinutes",
                event.target.value === "" ? null : Number(event.target.value),
              )
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="minimum-break" className="text-xs">
            Minimum break minutes
          </Label>
          <Input
            id="minimum-break"
            type="number"
            min={0}
            max={240}
            value={props.values.minimumBreakMinutes}
            disabled={props.disabled}
            onChange={(event) =>
              props.onUpdate(
                "minimumBreakMinutes",
                Number(event.target.value || 0),
              )
            }
          />
        </div>
      </CardContent>
      {props.canManage ? (
        <CardFooter className="justify-between gap-4 border-t">
          <Input
            aria-label="Change note"
            value={props.changeNote}
            maxLength={240}
            placeholder="Change note"
            disabled={props.isPending}
            onChange={(event) => props.onChangeNote(event.target.value)}
          />
          <Button
            type="button"
            onClick={props.onPublish}
            disabled={props.isPending}
          >
            {props.isPending ? "Publishing" : "Publish"}
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
