export const STAFF_ROLE_VALUES = [
  "ADMIN",
  "MANAGER",
  "INSTRUCTOR",
  "FRONT_DESK",
] as const;

export type StaffRoleValue = (typeof STAFF_ROLE_VALUES)[number];

export const STAFF_ROLES: Array<{
  value: StaffRoleValue;
  label: string;
  description: string;
}> = [
  {
    value: "ADMIN",
    label: "Admin",
    description: "Full CRM, schedule, reporting, and settings access.",
  },
  {
    value: "MANAGER",
    label: "Manager",
    description: "Day-to-day CRM, team, schedule, and operations access.",
  },
  {
    value: "INSTRUCTOR",
    label: "Instructor",
    description: "Class roster, own schedule, and limited member access.",
  },
  {
    value: "FRONT_DESK",
    label: "Front Desk",
    description: "Check-ins, bookings, inbox, and basic CRM workflows.",
  },
];

export const STAFF_TYPE_VALUES = STAFF_ROLE_VALUES;

export type StaffTypeValue = (typeof STAFF_TYPE_VALUES)[number];

export const STAFF_EMPLOYMENT_TYPE_VALUES = ["EMPLOYEE", "CONTRACTOR"] as const;

export type StaffEmploymentType = (typeof STAFF_EMPLOYMENT_TYPE_VALUES)[number];

export const STAFF_EMPLOYMENT_TYPE_LABELS: Record<StaffEmploymentType, string> =
  {
    EMPLOYEE: "Employee",
    CONTRACTOR: "Contractor",
  };

export const STAFF_TYPE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  INSTRUCTOR: "Instructor",
  FRONT_DESK: "Front Desk",
  TEAM_MEMBER: "Team Member",
  TEACHER: "Instructor",
  APPOINTMENT: "Appointment Staff",
  RESERVATION: "Reservation Staff",
  WORKSHOP: "Workshop Staff",
};

export function isStaffRoleValue(value: string): value is StaffRoleValue {
  return STAFF_ROLE_VALUES.includes(value as StaffRoleValue);
}

export function getStaffRoleLabel(role?: string | null): string {
  if (!role) return "Not set";
  return STAFF_ROLES.find((item) => item.value === role)?.label ?? role;
}

export function getStaffTypeLabel(staffType?: string | null): string {
  if (!staffType) return "Team Member";
  return STAFF_TYPE_LABELS[staffType] ?? staffType.replaceAll("_", " ");
}
