import { RRule, Frequency } from "rrule";
import { addMinutes, differenceInMinutes } from "date-fns";

/**
 * Recurrence pattern types
 */
export type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY";

export interface RecurrencePattern {
  frequency: RecurrenceFrequency;
  interval: number; // Every N days/weeks/months
  daysOfWeek?: number[]; // For weekly: 0=Sunday, 6=Saturday
  dayOfMonth?: number; // For monthly: 1-31
  endDate?: Date; // When to stop generating
  count?: number; // Or number of occurrences
}

/**
 * Template presets for common scheduling patterns
 */
export const RECURRENCE_TEMPLATES = {
  EVERY_DAY: {
    name: "Every Day",
    description: "Repeats daily",
    pattern: {
      frequency: "DAILY" as RecurrenceFrequency,
      interval: 1,
    },
  },
  EVERY_WEEKDAY: {
    name: "Every Weekday",
    description: "Monday through Friday",
    pattern: {
      frequency: "WEEKLY" as RecurrenceFrequency,
      interval: 1,
      daysOfWeek: [1, 2, 3, 4, 5], // JS days: Mon-Fri
    },
  },
  EVERY_WEEKEND: {
    name: "Every Weekend",
    description: "Saturday and Sunday",
    pattern: {
      frequency: "WEEKLY" as RecurrenceFrequency,
      interval: 1,
      daysOfWeek: [0, 6], // JS days: Sun, Sat
    },
  },
  EVERY_WEEK: {
    name: "Every Week",
    description: "Same day every week",
    pattern: {
      frequency: "WEEKLY" as RecurrenceFrequency,
      interval: 1,
    },
  },
  EVERY_2_WEEKS: {
    name: "Every 2 Weeks",
    description: "Biweekly on the same day",
    pattern: {
      frequency: "WEEKLY" as RecurrenceFrequency,
      interval: 2,
    },
  },
  EVERY_MONTH: {
    name: "Every Month",
    description: "Same date every month",
    pattern: {
      frequency: "MONTHLY" as RecurrenceFrequency,
      interval: 1,
    },
  },
};

/**
 * Convert JavaScript day (0=Sun, 6=Sat) to RRule day (0=Mon, 6=Sun)
 */
function jsToRRuleDay(jsDay: number): number {
  // JS: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  // RRule: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
  return jsDay === 0 ? 6 : jsDay - 1;
}

/**
 * Convert RRule day (0=Mon, 6=Sun) to JavaScript day (0=Sun, 6=Sat)
 */
function rruleToJsDay(rruleDay: number): number {
  // RRule: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
  // JS: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  return rruleDay === 6 ? 0 : rruleDay + 1;
}

/**
 * Convert our RecurrencePattern to RRULE string
 */
export function patternToRRule(
  pattern: RecurrencePattern,
  startDate: Date
): string {
  const frequencyMap: Record<RecurrenceFrequency, Frequency> = {
    DAILY: RRule.DAILY,
    WEEKLY: RRule.WEEKLY,
    MONTHLY: RRule.MONTHLY,
  };

  const options: any = {
    freq: frequencyMap[pattern.frequency],
    interval: pattern.interval,
    dtstart: startDate,
  };

  // Add weekly specific options
  if (pattern.frequency === "WEEKLY" && pattern.daysOfWeek?.length) {
    // Convert JS days to RRule days
    options.byweekday = pattern.daysOfWeek.map(jsToRRuleDay);
  }

  // Add monthly specific options
  if (pattern.frequency === "MONTHLY" && pattern.dayOfMonth) {
    options.bymonthday = pattern.dayOfMonth;
  }

  // Add end condition
  if (pattern.endDate) {
    options.until = pattern.endDate;
  } else if (pattern.count) {
    options.count = pattern.count;
  }

  const rule = new RRule(options);
  return rule.toString();
}

/**
 * Parse RRULE string back to our RecurrencePattern
 */
export function rruleToPattern(rruleString: string): RecurrencePattern | null {
  try {
    const rule = RRule.fromString(rruleString);
    const options = rule.options;

    const frequencyMap: Record<Frequency, RecurrenceFrequency> = {
      [RRule.DAILY]: "DAILY",
      [RRule.WEEKLY]: "WEEKLY",
      [RRule.MONTHLY]: "MONTHLY",
      [RRule.YEARLY]: "MONTHLY", // Fallback
      [RRule.HOURLY]: "DAILY", // Fallback
      [RRule.MINUTELY]: "DAILY", // Fallback
      [RRule.SECONDLY]: "DAILY", // Fallback
    };

    const pattern: RecurrencePattern = {
      frequency: frequencyMap[options.freq],
      interval: options.interval,
    };

    if (options.byweekday?.length) {
      // Convert RRule days back to JS days
      pattern.daysOfWeek = options.byweekday.map((d: any) => {
        const rruleDay = typeof d === "number" ? d : d.weekday;
        return rruleToJsDay(rruleDay);
      });
    }

    if (options.bymonthday?.length) {
      pattern.dayOfMonth = options.bymonthday[0];
    }

    if (options.until) {
      pattern.endDate = options.until;
    } else if (options.count) {
      pattern.count = options.count;
    }

    return pattern;
  } catch (error) {
    console.error("Failed to parse RRULE:", error);
    return null;
  }
}

/**
 * Generate shift dates from recurrence pattern
 */
export interface ShiftOccurrence {
  startTime: Date;
  endTime: Date;
}

export function generateShiftOccurrences(
  originalStartTime: Date,
  originalEndTime: Date,
  rruleString: string,
  maxOccurrences = 100 // Safety limit
): ShiftOccurrence[] {
  try {
    const rule = RRule.fromString(rruleString);
    const shiftDuration = differenceInMinutes(originalEndTime, originalStartTime);

    // Generate occurrence dates
    const occurrenceDates = rule.all((date, i) => i < maxOccurrences);

    // Convert to shift occurrences with same time and duration
    return occurrenceDates.map((date) => {
      // Preserve the time of day from the original shift
      const startTime = new Date(date);
      startTime.setHours(
        originalStartTime.getHours(),
        originalStartTime.getMinutes(),
        0,
        0
      );

      const endTime = addMinutes(startTime, shiftDuration);

      return {
        startTime,
        endTime,
      };
    });
  } catch (error) {
    console.error("Failed to generate shift occurrences:", error);
    return [];
  }
}

/**
 * Get human-readable description of recurrence pattern
 */
export function describeRecurrence(rruleString: string): string {
  try {
    const rule = RRule.fromString(rruleString);
    return rule.toText();
  } catch (error) {
    return "Invalid recurrence pattern";
  }
}

/**
 * Validate recurrence pattern
 */
export function validateRecurrencePattern(
  pattern: RecurrencePattern
): { valid: boolean; error?: string } {
  if (pattern.interval < 1) {
    return { valid: false, error: "Interval must be at least 1" };
  }

  if (pattern.frequency === "WEEKLY" && pattern.daysOfWeek?.length === 0) {
    return {
      valid: false,
      error: "At least one day of week must be selected for weekly recurrence",
    };
  }

  if (
    pattern.frequency === "MONTHLY" &&
    pattern.dayOfMonth &&
    (pattern.dayOfMonth < 1 || pattern.dayOfMonth > 31)
  ) {
    return { valid: false, error: "Day of month must be between 1 and 31" };
  }

  if (pattern.endDate && pattern.count) {
    return {
      valid: false,
      error: "Cannot specify both end date and occurrence count",
    };
  }

  return { valid: true };
}

/**
 * Get the next N occurrences for preview
 */
export function getNextOccurrences(
  startTime: Date,
  endTime: Date,
  rruleString: string,
  count = 5
): ShiftOccurrence[] {
  try {
    const rule = RRule.fromString(rruleString);
    const shiftDuration = differenceInMinutes(endTime, startTime);

    const occurrenceDates = rule.all((date, i) => i < count);

    return occurrenceDates.map((date) => {
      const shiftStart = new Date(date);
      shiftStart.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);

      const shiftEnd = addMinutes(shiftStart, shiftDuration);

      return {
        startTime: shiftStart,
        endTime: shiftEnd,
      };
    });
  } catch (error) {
    console.error("Failed to get next occurrences:", error);
    return [];
  }
}
