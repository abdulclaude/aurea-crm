"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Repeat, X, AlertTriangle } from "lucide-react";
import { format, addDays } from "date-fns";
import type {
  RecurrencePattern,
  RecurrenceFrequency,
} from "../lib/recurrence-utils";
import {
  RECURRENCE_TEMPLATES,
  patternToRRule,
  describeRecurrence,
  validateRecurrencePattern,
  getNextOccurrences,
} from "../lib/recurrence-utils";

interface RecurrenceBuilderProps {
  startTime: Date;
  endTime: Date;
  value?: string | null; // RRULE string
  onChange: (rruleString: string | null) => void;
}

const DAYS_OF_WEEK = [
  { value: 1, label: "Mon", fullLabel: "Monday" },
  { value: 2, label: "Tue", fullLabel: "Tuesday" },
  { value: 3, label: "Wed", fullLabel: "Wednesday" },
  { value: 4, label: "Thu", fullLabel: "Thursday" },
  { value: 5, label: "Fri", fullLabel: "Friday" },
  { value: 6, label: "Sat", fullLabel: "Saturday" },
  { value: 0, label: "Sun", fullLabel: "Sunday" },
];

export function RecurrenceBuilder({
  startTime,
  endTime,
  value,
  onChange,
}: RecurrenceBuilderProps) {
  const [enabled, setEnabled] = useState(!!value);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("WEEKLY");
  const [interval, setInterval] = useState(1);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([
    startTime.getDay(),
  ]);
  const [dayOfMonth, setDayOfMonth] = useState(startTime.getDate());
  const [endType, setEndType] = useState<"never" | "date" | "count">("never");
  const [endDate, setEndDate] = useState<string>(
    format(addDays(new Date(), 90), "yyyy-MM-dd")
  );
  const [count, setCount] = useState(10);

  // Update RRULE when pattern changes
  useEffect(() => {
    if (!enabled) {
      onChange(null);
      return;
    }

    const pattern: RecurrencePattern = {
      frequency,
      interval,
      ...(frequency === "WEEKLY" && { daysOfWeek }),
      ...(frequency === "MONTHLY" && { dayOfMonth }),
      ...(endType === "date" && { endDate: new Date(endDate) }),
      ...(endType === "count" && { count }),
    };

    const validation = validateRecurrencePattern(pattern);
    if (!validation.valid) {
      return;
    }

    const rrule = patternToRRule(pattern, startTime);
    onChange(rrule);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enabled,
    frequency,
    interval,
    daysOfWeek,
    dayOfMonth,
    endType,
    endDate,
    count,
    startTime,
    // onChange intentionally excluded to prevent infinite loop
  ]);

  const handleTemplateSelect = (templateKey: keyof typeof RECURRENCE_TEMPLATES) => {
    const template = RECURRENCE_TEMPLATES[templateKey];
    const pattern = template.pattern;

    setFrequency(pattern.frequency);
    setInterval(pattern.interval);

    if ("daysOfWeek" in pattern && pattern.daysOfWeek) {
      setDaysOfWeek(pattern.daysOfWeek);
    } else if (pattern.frequency === "WEEKLY") {
      setDaysOfWeek([startTime.getDay()]);
    }

    if (pattern.frequency === "MONTHLY") {
      setDayOfMonth(startTime.getDate());
    }
  };

  const toggleDayOfWeek = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const currentRRule = enabled && value ? value : null;
  const preview = currentRRule
    ? getNextOccurrences(startTime, endTime, currentRRule, 3)
    : [];

  // Check if selected date matches the recurrence pattern
  const selectedDayOfWeek = startTime.getDay();
  const dateMatchesPattern =
    frequency === "DAILY" ||
    (frequency === "WEEKLY" && daysOfWeek.includes(selectedDayOfWeek)) ||
    (frequency === "MONTHLY" && dayOfMonth === startTime.getDate());

  if (!enabled) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Recurring Shift</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEnabled(true)}
          >
            <Repeat className="h-4 w-4 mr-2" />
            Add Recurrence
          </Button>
        </div>
        <p className="text-sm text-primary/60">
          This shift will occur once on{" "}
          {format(startTime, "EEEE, MMMM d, yyyy")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Recurring Shift</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setEnabled(false);
            onChange(null);
          }}
        >
          <X className="h-4 w-4 mr-1" />
          Remove
        </Button>
      </div>

      {/* Templates */}
      <div className="space-y-2">
        <Label className="text-sm">Quick Templates</Label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(RECURRENCE_TEMPLATES).map(([key, template]) => (
            <Button
              key={key}
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                handleTemplateSelect(key as keyof typeof RECURRENCE_TEMPLATES)
              }
            >
              {template.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Frequency */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Repeats</Label>
          <Select
            value={frequency}
            onValueChange={(val) => setFrequency(val as RecurrenceFrequency)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DAILY">Daily</SelectItem>
              <SelectItem value="WEEKLY">Weekly</SelectItem>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Every</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={99}
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
              className="w-20"
            />
            <span className="text-sm text-primary/60">
              {frequency === "DAILY"
                ? interval === 1
                  ? "day"
                  : "days"
                : frequency === "WEEKLY"
                  ? interval === 1
                    ? "week"
                    : "weeks"
                  : interval === 1
                    ? "month"
                    : "months"}
            </span>
          </div>
        </div>
      </div>

      {/* Weekly: Days of week */}
      {frequency === "WEEKLY" && (
        <div className="space-y-2">
          <Label>Repeat on</Label>
          <div className="flex gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <Button
                key={day.value}
                type="button"
                variant={daysOfWeek.includes(day.value) ? "default" : "outline"}
                size="sm"
                className="w-12"
                onClick={() => toggleDayOfWeek(day.value)}
              >
                {day.label}
              </Button>
            ))}
          </div>
          {daysOfWeek.length === 0 && (
            <p className="text-sm text-red-500">
              Select at least one day of the week
            </p>
          )}
        </div>
      )}

      {/* Monthly: Day of month */}
      {frequency === "MONTHLY" && (
        <div className="space-y-2">
          <Label>On day</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={31}
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(Number(e.target.value))}
              className="w-20"
            />
            <span className="text-sm text-primary/60">of the month</span>
          </div>
        </div>
      )}

      {/* Warning if date doesn't match pattern */}
      {!dateMatchesPattern && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            The selected date ({format(startTime, "EEEE, MMM d")}) doesn't match this recurrence pattern.
            The first occurrence will be on{" "}
            {preview.length > 0 ? format(preview[0].startTime, "EEEE, MMM d, yyyy") : "a future date"}.
          </AlertDescription>
        </Alert>
      )}

      {/* End condition */}
      <div className="space-y-2">
        <Label>Ends</Label>
        <Select value={endType} onValueChange={(val: any) => setEndType(val)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="never">Never</SelectItem>
            <SelectItem value="date">On date</SelectItem>
            <SelectItem value="count">After occurrences</SelectItem>
          </SelectContent>
        </Select>

        {endType === "date" && (
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={format(addDays(startTime, 1), "yyyy-MM-dd")}
          />
        )}

        {endType === "count" && (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={365}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-24"
            />
            <span className="text-sm text-primary/60">occurrences</span>
          </div>
        )}
      </div>

      {/* Preview */}
      {currentRRule && preview.length > 0 && (
        <Card className="bg-muted">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-2">
              <Repeat className="h-4 w-4 mt-0.5 text-primary/60" />
              <div className="flex-1">
                <p className="text-sm font-medium mb-2">
                  {describeRecurrence(currentRRule)}
                </p>
                <div className="space-y-1">
                  <p className="text-xs text-primary/60 font-medium">
                    Next occurrences:
                  </p>
                  {preview.map((occurrence, idx) => (
                    <div
                      key={idx}
                      className="text-xs flex items-center gap-2 text-primary/80"
                    >
                      <Calendar className="h-3 w-3" />
                      <span>
                        {format(occurrence.startTime, "EEE, MMM d, yyyy")} •{" "}
                        {format(occurrence.startTime, "h:mm a")} -{" "}
                        {format(occurrence.endTime, "h:mm a")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
