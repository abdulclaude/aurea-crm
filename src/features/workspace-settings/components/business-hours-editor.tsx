"use client";

import { Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  workspaceDays,
  type WorkspaceBusinessHours,
} from "@/features/workspace-settings/operations-contracts";

import { BusinessHoursTimeSelect } from "./business-hours-time-select";

const dayLabels: Record<(typeof workspaceDays)[number], string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

export function BusinessHoursEditor(props: {
  value: WorkspaceBusinessHours | null;
  effectiveValue: WorkspaceBusinessHours;
  allowInheritance: boolean;
  disabled: boolean;
  onChange: (value: WorkspaceBusinessHours | null) => void;
}): React.JSX.Element {
  const hours = props.value ?? props.effectiveValue;
  const inherited = props.allowInheritance && props.value === null;
  const updateDay = (
    day: (typeof workspaceDays)[number],
    intervals: WorkspaceBusinessHours[typeof day],
  ): void => props.onChange({ ...hours, [day]: intervals });

  return (
    <div className="space-y-3 border-b border-black/5 py-4 dark:border-white/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-xs font-medium">Business hours</Label>
            <Badge variant="secondary" className="text-[10px] font-normal">
              {inherited || !props.allowInheritance
                ? "Organization default"
                : "Location override"}
            </Badge>
          </div>
          <p className="text-xs text-primary/65">
            Appointment creation is limited to these local operating windows.
          </p>
        </div>
        {props.allowInheritance ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={props.disabled}
            onClick={() =>
              props.onChange(inherited ? structuredClone(hours) : null)
            }
          >
            {inherited ? "Override hours" : "Use organization hours"}
          </Button>
        ) : null}
      </div>

      <div className="divide-y divide-black/5 border-y border-black/5 dark:divide-white/5 dark:border-white/5">
        {workspaceDays.map((day) => {
          const intervals = hours[day];
          return (
            <div
              key={day}
              className="grid gap-3 py-3 md:grid-cols-[120px_minmax(0,1fr)]"
            >
              <div className="flex items-center gap-2">
                <Switch
                  id={`operations-hours-${day}`}
                  checked={intervals.length > 0}
                  disabled={props.disabled || inherited}
                  onCheckedChange={(checked) =>
                    updateDay(
                      day,
                      checked
                        ? [{ opensAtMinutes: 540, closesAtMinutes: 1020 }]
                        : [],
                    )
                  }
                />
                <Label htmlFor={`operations-hours-${day}`} className="text-xs">
                  {dayLabels[day]}
                </Label>
              </div>
              {intervals.length === 0 ? (
                <p className="self-center text-xs text-primary/55">Closed</p>
              ) : (
                <div className="space-y-2">
                  {intervals.map((interval, index) => (
                    <div
                      key={`${day}-${index}`}
                      className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_32px] items-center gap-2"
                    >
                      <BusinessHoursTimeSelect
                        label={`${dayLabels[day]} opening time ${index + 1}`}
                        value={interval.opensAtMinutes}
                        disabled={props.disabled || inherited}
                        maximum={1439}
                        onChange={(value) =>
                          updateDay(
                            day,
                            intervals.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, opensAtMinutes: value }
                                : item,
                            ),
                          )
                        }
                      />
                      <BusinessHoursTimeSelect
                        label={`${dayLabels[day]} closing time ${index + 1}`}
                        value={interval.closesAtMinutes}
                        disabled={props.disabled || inherited}
                        minimum={1}
                        onChange={(value) =>
                          updateDay(
                            day,
                            intervals.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, closesAtMinutes: value }
                                : item,
                            ),
                          )
                        }
                      />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              disabled={props.disabled || inherited}
                              onClick={() =>
                                updateDay(
                                  day,
                                  intervals.filter(
                                    (_, itemIndex) => itemIndex !== index,
                                  ),
                                )
                              }
                            >
                              <Trash2 className="size-4" />
                              <span className="sr-only">Remove interval</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Remove interval</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  ))}
                  {intervals.length < 3 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={props.disabled || inherited}
                      onClick={() =>
                        updateDay(day, [
                          ...intervals,
                          { opensAtMinutes: 1080, closesAtMinutes: 1200 },
                        ])
                      }
                    >
                      <Plus className="size-4" /> Add interval
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
