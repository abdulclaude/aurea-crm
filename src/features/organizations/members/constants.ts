export const MEMBERS_DEFAULT_SORT = "name.asc";
export const MEMBERS_PAGE_SIZE = 20;

/**
 * AGENCY-LEVEL ROLES
 *
 * Agency = your main account where your team manages all clients, billing, automations, templates, etc.
 */
export const AGENCY_ROLES = [
  {
    value: "owner",
    label: "Agency Owner",
    description: "Full access to everything",
    permissions: [
      "Billing, subscriptions, Stripe, integrations",
      "Edit/disable accounts",
      "Manage agency team",
      "Access all subaccounts",
      "Equivalent to GHL 'Agency Admin'",
    ],
  },
  {
    value: "admin",
    label: "Agency Admin",
    description: "Almost full access, except billing",
    permissions: [
      "Manage all subaccounts",
      "Edit pipelines, automations, templates",
      "Manage agency-level integrations",
      "Access all subaccounts",
      "Cannot: change billing, delete accounts, modify agency settings",
    ],
  },
  {
    value: "manager",
    label: "Agency Manager",
    description: "Access all subaccounts, limited settings",
    permissions: [
      "Access all subaccounts",
      "Run operations across multiple clients",
      "Cannot: change billing, delete accounts, modify agency settings",
    ],
  },
  {
    value: "staff",
    label: "Agency Staff",
    description: "Access assigned subaccounts only",
    permissions: [
      "Access only assigned subaccounts",
      "Work day-to-day on campaigns, recruitment tasks, rotas",
      "Cannot: modify system-level settings, install global integrations",
    ],
  },
  {
    value: "viewer",
    label: "Agency Viewer",
    description: "Read-only access",
    permissions: [
      "Read-only access to all subaccounts",
      "Perfect for accountants, auditors, temporary contractors",
      "Cannot make any changes",
    ],
  },
] as const;

/**
 * SUBACCOUNT (CLIENT) ROLES
 *
 * Subaccount = individual client workspace within the agency
 */
export const SUBACCOUNT_ROLES = [
  {
    value: "AGENCY",
    label: "Agency Team",
    description: "Full access - Agency team member working on behalf of client",
    permissions: [
      "Full access to all subaccount features",
      "Manage workflows, contacts, deals, pipelines",
      "Agency team member working on client's behalf",
      "Cannot be removed by client admins",
    ],
  },
  {
    value: "ADMIN",
    label: "Subaccount Admin",
    description: "Full control within subaccount",
    permissions: [
      "Full control within this subaccount only",
      "Manage team members (except AGENCY role)",
      "Configure workflows, pipelines, integrations",
      "Access all contacts and deals",
    ],
  },
  {
    value: "MANAGER",
    label: "Manager",
    description: "Assign tasks, edit contacts, manage operations",
    permissions: [
      "Assign tasks to team members",
      "Edit contacts and deals",
      "Manage day-to-day operations",
      "Cannot: modify system settings, manage team",
    ],
  },
  {
    value: "STANDARD",
    label: "Standard User",
    description: "Day-to-day operations (recruiters, sales, etc)",
    permissions: [
      "Day-to-day operations",
      "Create and edit own contacts/deals",
      "Execute workflows",
      "Suitable for recruiters, sales reps, account managers",
    ],
  },
  {
    value: "LIMITED",
    label: "Limited User",
    description: "Field workers, only assigned tasks",
    permissions: [
      "Access only assigned tasks and contacts",
      "Cannot create new records",
      "Perfect for field workers, contractors",
      "Minimal system access",
    ],
  },
  {
    value: "VIEWER",
    label: "Viewer",
    description: "Read-only access",
    permissions: [
      "Read-only access to subaccount data",
      "Cannot make any changes",
      "Perfect for observers, auditors",
    ],
  },
] as const;

// Role badge colors
export const ROLE_COLORS = {
  // Agency roles
  owner: "bg-indigo-500 text-indigo-100 border-black/10",
  admin: "bg-blue-500 text-blue-100 border-black/10",
  manager: "bg-cyan-500 text-cyan-100 border-black/10",
  staff: "bg-green-500 text-green-100 border-black/10",
  viewer: "bg-gray-500 text-gray-100 border-black/10",
  // Subaccount roles
  AGENCY: "bg-indigo-500 text-indigo-100 border-black/10",
  ADMIN: "bg-orange-500 text-orange-100 border-black/10",
  MANAGER: "bg-teal-500 text-teal-100 border-black/10",
  STANDARD: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  LIMITED: "bg-yellow-500 text-yellow-100 border-black/10",
  VIEWER: "bg-slate-500 text-slate-100 border-black/10",
} as const;
