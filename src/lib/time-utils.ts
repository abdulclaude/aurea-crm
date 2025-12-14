/**
 * Centralized time and duration utilities for the application.
 * Provides consistent handling of time calculations across rotas, time logs, and invoicing.
 */

// ============================================================================
// Duration Calculations
// ============================================================================

/**
 * Calculate duration in minutes between two dates
 */
export function calculateDuration(startTime: Date, endTime: Date): number {
  const ms = endTime.getTime() - startTime.getTime();
  return Math.floor(ms / 1000 / 60); // minutes
}

/**
 * Calculate duration in hours between two dates (decimal)
 */
export function calculateDurationHours(startTime: Date, endTime: Date): number {
  const minutes = calculateDuration(startTime, endTime);
  return minutes / 60;
}

/**
 * Calculate billable minutes after subtracting break duration
 */
export function calculateBillableMinutes(
  totalMinutes: number,
  breakDuration?: number | null
): number {
  return breakDuration ? Math.max(0, totalMinutes - breakDuration) : totalMinutes;
}

/**
 * Calculate billable hours after subtracting break duration
 */
export function calculateBillableHours(
  totalMinutes: number,
  breakDuration?: number | null
): number {
  return calculateBillableMinutes(totalMinutes, breakDuration) / 60;
}

// ============================================================================
// Amount Calculations
// ============================================================================

/**
 * Calculate total amount based on duration and hourly rate
 */
export function calculateTotalAmount(
  durationMinutes: number,
  hourlyRate: number,
  breakDuration?: number | null
): number {
  const billableMinutes = calculateBillableMinutes(durationMinutes, breakDuration);
  const billableHours = billableMinutes / 60;
  return Number((billableHours * hourlyRate).toFixed(2));
}

/**
 * Calculate scheduled value for a rota
 */
export function calculateScheduledValue(
  startTime: Date,
  endTime: Date,
  hourlyRate: number | null
): { hours: number; value: number | null } {
  const hours = calculateDurationHours(startTime, endTime);
  const value = hourlyRate ? Number((hours * hourlyRate).toFixed(2)) : null;
  return { hours, value };
}

// ============================================================================
// Formatting
// ============================================================================

/**
 * Format duration in minutes to a human-readable string
 * Examples: "2h 30m", "45m", "3h"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 0) return "0m";
  
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Format duration as decimal hours
 * Example: "2.5 hours"
 */
export function formatDurationDecimal(minutes: number, includeUnit = true): string {
  const hours = Number((minutes / 60).toFixed(2));
  return includeUnit ? `${hours} hours` : hours.toString();
}

/**
 * Format duration as HH:MM
 * Example: "02:30"
 */
export function formatDurationHHMM(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

/**
 * Format amount as currency
 */
export function formatCurrency(
  amount: number,
  currency = "USD",
  locale = "en-US"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ============================================================================
// Parsing
// ============================================================================

/**
 * Parse duration string to minutes
 * Supports: "2h 30m", "2:30", "2.5", "150m", "2h"
 */
export function parseDuration(input: string): number | null {
  if (!input) return null;

  const trimmed = input.trim().toLowerCase();

  // Format: "2h 30m" or "2h" or "30m"
  const hmMatch = trimmed.match(/^(\d+)h\s*(\d+)?m?$/);
  if (hmMatch) {
    const hours = parseInt(hmMatch[1], 10) || 0;
    const mins = parseInt(hmMatch[2], 10) || 0;
    return hours * 60 + mins;
  }

  // Format: "30m" only
  const mOnlyMatch = trimmed.match(/^(\d+)m$/);
  if (mOnlyMatch) {
    return parseInt(mOnlyMatch[1], 10);
  }

  // Format: "2:30" (HH:MM)
  const colonMatch = trimmed.match(/^(\d+):(\d{2})$/);
  if (colonMatch) {
    const hours = parseInt(colonMatch[1], 10);
    const mins = parseInt(colonMatch[2], 10);
    return hours * 60 + mins;
  }

  // Format: "2.5" (decimal hours)
  const decimalMatch = trimmed.match(/^(\d+\.?\d*)$/);
  if (decimalMatch) {
    const hours = parseFloat(decimalMatch[1]);
    return Math.round(hours * 60);
  }

  return null;
}

// ============================================================================
// Time Window Utilities
// ============================================================================

/**
 * Check if a time falls within a scheduled window with tolerance
 */
export function isWithinTolerance(
  actual: Date,
  scheduled: Date,
  toleranceMinutes: number
): boolean {
  const diffMs = Math.abs(actual.getTime() - scheduled.getTime());
  const diffMinutes = diffMs / 1000 / 60;
  return diffMinutes <= toleranceMinutes;
}

/**
 * Calculate the difference in minutes between two times
 */
export function timeDifferenceMinutes(time1: Date, time2: Date): number {
  return Math.abs(time1.getTime() - time2.getTime()) / 1000 / 60;
}

/**
 * Check if two time ranges overlap
 */
export function doTimeRangesOverlap(
  range1Start: Date,
  range1End: Date,
  range2Start: Date,
  range2End: Date
): boolean {
  return range1Start < range2End && range1End > range2Start;
}

/**
 * Get the overlap duration between two time ranges in minutes
 */
export function getOverlapDuration(
  range1Start: Date,
  range1End: Date,
  range2Start: Date,
  range2End: Date
): number {
  if (!doTimeRangesOverlap(range1Start, range1End, range2Start, range2End)) {
    return 0;
  }

  const overlapStart = new Date(Math.max(range1Start.getTime(), range2Start.getTime()));
  const overlapEnd = new Date(Math.min(range1End.getTime(), range2End.getTime()));

  return calculateDuration(overlapStart, overlapEnd);
}

// ============================================================================
// Date Helpers
// ============================================================================

/**
 * Get start of day for a given date
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get end of day for a given date
 */
export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Check if two dates are on the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// ============================================================================
// Auto-Approval Utilities
// ============================================================================

/**
 * Configuration for auto-approval tolerance
 */
export interface AutoApprovalConfig {
  tolerancePercent: number; // e.g., 0.10 for 10%
  minToleranceMinutes: number; // Minimum tolerance in minutes
}

export const DEFAULT_AUTO_APPROVAL_CONFIG: AutoApprovalConfig = {
  tolerancePercent: 0.10, // 10%
  minToleranceMinutes: 15,
};

/**
 * Calculate the tolerance in minutes for auto-approval
 */
export function calculateAutoApprovalTolerance(
  scheduledDurationMinutes: number,
  config: AutoApprovalConfig = DEFAULT_AUTO_APPROVAL_CONFIG
): number {
  const percentTolerance = scheduledDurationMinutes * config.tolerancePercent;
  return Math.max(percentTolerance, config.minToleranceMinutes);
}

/**
 * Check if a time log is eligible for auto-approval based on matching rota
 */
export function isEligibleForAutoApproval(
  timeLog: {
    startTime: Date;
    endTime: Date;
    duration: number;
  },
  rota: {
    startTime: Date;
    endTime: Date;
  },
  config: AutoApprovalConfig = DEFAULT_AUTO_APPROVAL_CONFIG
): { eligible: boolean; reasons: string[] } {
  const scheduledDuration = calculateDuration(rota.startTime, rota.endTime);
  const tolerance = calculateAutoApprovalTolerance(scheduledDuration, config);

  const startDiff = timeDifferenceMinutes(timeLog.startTime, rota.startTime);
  const endDiff = timeDifferenceMinutes(timeLog.endTime, rota.endTime);
  const durationDiff = Math.abs(timeLog.duration - scheduledDuration);

  const reasons: string[] = [];

  if (startDiff > tolerance) {
    reasons.push(`Start time off by ${Math.round(startDiff)} minutes (tolerance: ${Math.round(tolerance)} min)`);
  }
  if (endDiff > tolerance) {
    reasons.push(`End time off by ${Math.round(endDiff)} minutes (tolerance: ${Math.round(tolerance)} min)`);
  }
  if (durationDiff > tolerance) {
    reasons.push(`Duration off by ${Math.round(durationDiff)} minutes (tolerance: ${Math.round(tolerance)} min)`);
  }

  return {
    eligible: reasons.length === 0,
    reasons,
  };
}

// ============================================================================
// Overtime Calculations
// ============================================================================

/**
 * Calculate overtime hours based on standard hours threshold
 */
export function calculateOvertime(
  totalHours: number,
  standardHoursPerDay = 8
): { regular: number; overtime: number } {
  if (totalHours <= standardHoursPerDay) {
    return { regular: totalHours, overtime: 0 };
  }
  return {
    regular: standardHoursPerDay,
    overtime: totalHours - standardHoursPerDay,
  };
}

/**
 * Calculate weekly overtime
 */
export function calculateWeeklyOvertime(
  totalWeeklyHours: number,
  standardHoursPerWeek = 40
): { regular: number; overtime: number } {
  if (totalWeeklyHours <= standardHoursPerWeek) {
    return { regular: totalWeeklyHours, overtime: 0 };
  }
  return {
    regular: standardHoursPerWeek,
    overtime: totalWeeklyHours - standardHoursPerWeek,
  };
}
