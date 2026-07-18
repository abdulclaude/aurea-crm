export const PROFILE_COUNTS = {
  SHOWCASE: {
    pipelineCount: 2,
    dealCount: 48,
    taskCount: 60,
    noteCount: 96,
    householdCount: 24,
    nonTeachingStaffCount: 4,
    rotaCount: 320,
    timeLogCount: 220,
    timeOffCount: 20,
    shiftSwapCount: 8,
    overtimeCount: 32,
    payrollRunCount: 7,
  },
  QA_EXHAUSTIVE: {
    pipelineCount: 4,
    dealCount: 180,
    taskCount: 240,
    noteCount: 400,
    householdCount: 72,
    nonTeachingStaffCount: 8,
    rotaCount: 1_600,
    timeLogCount: 2_400,
    timeOffCount: 80,
    shiftSwapCount: 40,
    overtimeCount: 300,
    payrollRunCount: 26,
  },
} as const;

export const PIPELINE_DEFINITIONS = [
  {
    name: "Membership Sales",
    description: "New member enquiries through trial and enrolment.",
    stages: [
      "New enquiry",
      "Contacted",
      "Consultation",
      "Trial booked",
      "Proposal",
      "Lost",
      "Won",
    ],
  },
  {
    name: "Corporate Wellness",
    description: "Partnership opportunities for local teams and employers.",
    stages: [
      "Prospecting",
      "Discovery",
      "Programme design",
      "Review",
      "Lost",
      "Won",
    ],
  },
  {
    name: "Private Coaching",
    description: "High-touch coaching packages and renewals.",
    stages: [
      "Lead",
      "Needs review",
      "Session booked",
      "Package offered",
      "Lost",
      "Won",
    ],
  },
  {
    name: "Community Partnerships",
    description: "Events and referral partnerships with local organizations.",
    stages: [
      "Identified",
      "Introduced",
      "Planning",
      "Agreement",
      "Lost",
      "Won",
    ],
  },
] as const;

export const TASK_STATUSES = [
  "TODO",
  "IN_PROGRESS",
  "DONE",
  "CANCELLED",
] as const;
export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const TIME_LOG_STATUSES = [
  "APPROVED",
  "SUBMITTED",
  "DRAFT",
  "REJECTED",
  "INVOICED",
] as const;
export const TIME_OFF_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const;
export const SHIFT_SWAP_STATUSES = [
  "PENDING",
  "INSTRUCTOR_ACCEPTED",
  "INSTRUCTOR_REJECTED",
  "ADMIN_APPROVED",
  "ADMIN_REJECTED",
  "CANCELLED",
  "EXPIRED",
] as const;
export const PAYROLL_STATUSES = [
  "COMPLETED",
  "PROCESSING",
  "APPROVED",
  "PENDING_APPROVAL",
  "FAILED",
  "CANCELLED",
  "DRAFT",
] as const;
