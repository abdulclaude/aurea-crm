"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SavedAudienceDefinition } from "@/features/audiences/lib/audience-definition";

type AudienceAttendanceFieldsProps = {
  definition: SavedAudienceDefinition;
  disabled: boolean;
  onChange: (definition: SavedAudienceDefinition) => void;
};

function optionalInteger(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

export function AudienceAttendanceFields({
  definition,
  disabled,
  onChange,
}: AudienceAttendanceFieldsProps) {
  const attendance = definition.attendance;
  const update = (
    values: Partial<SavedAudienceDefinition["attendance"]>,
  ): void =>
    onChange({
      ...definition,
      attendance: { ...attendance, ...values },
    });

  return (
    <div className="grid gap-4 border-t pt-5 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="audience-minimum-visits">Minimum visits</Label>
        <Input
          id="audience-minimum-visits"
          type="number"
          min={0}
          step={1}
          value={attendance.minimumVisits ?? ""}
          disabled={disabled}
          onChange={(event) =>
            update({ minimumVisits: optionalInteger(event.target.value) })
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="audience-maximum-visits">Maximum visits</Label>
        <Input
          id="audience-maximum-visits"
          type="number"
          min={0}
          step={1}
          value={attendance.maximumVisits ?? ""}
          disabled={disabled}
          onChange={(event) =>
            update({ maximumVisits: optionalInteger(event.target.value) })
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="audience-no-visit-days">No visit in days</Label>
        <Input
          id="audience-no-visit-days"
          type="number"
          min={1}
          max={3650}
          step={1}
          value={attendance.noVisitInDays ?? ""}
          disabled={disabled}
          onChange={(event) =>
            update({ noVisitInDays: optionalInteger(event.target.value) })
          }
        />
      </div>
      <div className="space-y-2">
        <Label>Upcoming booking</Label>
        <Select
          value={
            attendance.hasUpcomingBooking === null
              ? "ANY"
              : attendance.hasUpcomingBooking
                ? "YES"
                : "NO"
          }
          disabled={disabled}
          onValueChange={(value) =>
            update({
              hasUpcomingBooking: value === "ANY" ? null : value === "YES",
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ANY">Any booking state</SelectItem>
            <SelectItem value="YES">Has upcoming booking</SelectItem>
            <SelectItem value="NO">No upcoming booking</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
