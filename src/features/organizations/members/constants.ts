export const MEMBERS_DEFAULT_SORT = "name.asc";
export const MEMBERS_PAGE_SIZE = 20;

/**
 * STUDIO-LEVEL ROLES
 *
 * Studio = your main account where you manage all locations, billing, scheduling, etc.
 */
export const AGENCY_ROLES = [
  {
    value: "owner",
    label: "Owner",
    description: "Full access to everything",
    permissions: [
      "Billing, subscriptions, integrations",
      "Manage all locations and team",
      "Configure studio-wide settings",
      "Access all locations",
    ],
  },
  {
    value: "admin",
    label: "Admin",
    description: "Almost full access, except billing",
    permissions: [
      "Manage all locations",
      "Edit schedules, automations, templates",
      "Manage studio-wide integrations",
      "Access all locations",
      "Cannot: change billing, delete accounts",
    ],
  },
  {
    value: "manager",
    label: "Manager",
    description: "Access all locations, limited settings",
    permissions: [
      "Access all locations",
      "Run operations across multiple locations",
      "Cannot: change billing, delete accounts, modify studio settings",
    ],
  },
  {
    value: "staff",
    label: "Staff",
    description: "Teach classes and access assigned locations",
    permissions: [
      "Access only assigned locations",
      "View and manage own class schedule",
      "Check in members, view rosters",
      "Cannot: modify studio-level settings",
    ],
  },
  {
    value: "viewer",
    label: "Viewer",
    description: "Read-only access",
    permissions: [
      "Read-only access to all locations",
      "Perfect for accountants or auditors",
      "Cannot make any changes",
    ],
  },
] as const;

/**
 * LOCATION ROLES
 *
 * Location = individual studio location within the organization
 */
export const LOCATION_ROLES = [
  {
    value: "AGENCY",
    label: "Studio team",
    description: "Full access — studio team member managing this location",
    permissions: [
      "Full access to all location features",
      "Manage schedules, members, classes",
      "Studio team member managing this location",
      "Cannot be removed by location admins",
    ],
  },
  {
    value: "ADMIN",
    label: "Admin",
    description: "Full control within this location",
    permissions: [
      "Full control within this location only",
      "Manage team members (except studio team role)",
      "Configure schedules, classes, integrations",
      "Access all members and reporting",
    ],
  },
  {
    value: "MANAGER",
    label: "Manager",
    description: "Manage day-to-day operations and team",
    permissions: [
      "Assign tasks to team members",
      "Edit member profiles and schedules",
      "Manage day-to-day operations",
      "Cannot: modify system settings, manage team",
    ],
  },
  {
    value: "STANDARD",
    label: "Instructor",
    description: "Teach classes and manage own schedule",
    permissions: [
      "View and manage own class schedule",
      "Check in members, view class rosters",
      "Log hours and submit timesheets",
      "Cannot: edit other instructors' schedules",
    ],
  },
  {
    value: "LIMITED",
    label: "Front desk",
    description: "Check-ins, bookings, and basic tasks",
    permissions: [
      "Check in members and manage bookings",
      "View class schedules",
      "Cannot create or modify classes",
      "Limited system access",
    ],
  },
  {
    value: "VIEWER",
    label: "Viewer",
    description: "Read-only access",
    permissions: [
      "Read-only access to location data",
      "Cannot make any changes",
      "Perfect for observers or auditors",
    ],
  },
] as const;

export const ROLE_COLORS = {
  owner: "bg-indigo-500 text-indigo-100 border-black/10",
  admin: "bg-blue-500 text-blue-100 border-black/10",
  manager: "bg-cyan-500 text-cyan-100 border-black/10",
  staff: "bg-green-500 text-green-100 border-black/10",
  viewer: "bg-gray-500 text-gray-100 border-black/10",
  AGENCY: "bg-indigo-500 text-indigo-100 border-black/10",
  ADMIN: "bg-orange-500 text-orange-100 border-black/10",
  MANAGER: "bg-teal-500 text-teal-100 border-black/10",
  STANDARD: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  LIMITED: "bg-yellow-500 text-yellow-100 border-black/10",
  VIEWER: "bg-slate-500 text-slate-100 border-black/10",
} as const;
