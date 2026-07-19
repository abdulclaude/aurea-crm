import type { NotificationType } from "./contracts";

export type NotificationAudience = "operator" | "instructor";

export type NotificationGroupId =
  | "workflows"
  | "campaigns"
  | "communications"
  | "clients"
  | "deals"
  | "tasks"
  | "notes"
  | "invoices"
  | "bookings"
  | "pipelines"
  | "team"
  | "imports"
  | "class-bookings"
  | "schedule"
  | "substitutions"
  | "earnings";

export type NotificationEventDefinition = {
  type: NotificationType;
  label: string;
  description: string;
  audience: NotificationAudience;
  groupId: NotificationGroupId;
  supportsEmail: boolean;
};

export const NOTIFICATION_GROUPS = [
  {
    id: "workflows",
    title: "Workflows",
    description: "Workflow lifecycle and execution health.",
  },
  {
    id: "campaigns",
    title: "Campaigns",
    description: "Campaign scheduling, delivery, and cancellation.",
  },
  {
    id: "communications",
    title: "Communications",
    description: "Email domain and communication-provider readiness.",
  },
  {
    id: "clients",
    title: "Clients",
    description: "Client record creation and changes.",
  },
  {
    id: "deals",
    title: "Deals",
    description: "Deal progress, stage changes, and closure.",
  },
  {
    id: "tasks",
    title: "Tasks",
    description: "Assignments, due dates, and completion.",
  },
  {
    id: "notes",
    title: "Notes",
    description: "Mentions in client and workspace notes.",
  },
  {
    id: "invoices",
    title: "Invoices",
    description: "Invoice delivery, reminders, payments, and cancellation.",
  },
  {
    id: "bookings",
    title: "Bookings",
    description: "Appointment creation, changes, cancellation, and payment.",
  },
  {
    id: "pipelines",
    title: "Pipelines",
    description: "Pipeline structure and lifecycle changes.",
  },
  {
    id: "team",
    title: "Team",
    description: "Invitations, roles, membership, and presence.",
  },
  {
    id: "imports",
    title: "Imports",
    description: "Import progress, failures, and mapping review.",
  },
  {
    id: "class-bookings",
    title: "Class bookings",
    description: "Class bookings, cancellations, and waitlists.",
  },
  {
    id: "schedule",
    title: "Schedule",
    description:
      "Class timing, changes, cancellation, and attendance summaries.",
  },
  {
    id: "substitutions",
    title: "Substitutions",
    description: "Cover requests and substitution decisions.",
  },
  {
    id: "earnings",
    title: "Earnings",
    description: "Payout initiation and completion.",
  },
] as const satisfies readonly {
  id: NotificationGroupId;
  title: string;
  description: string;
}[];

const event = (
  type: NotificationType,
  label: string,
  description: string,
  audience: NotificationAudience,
  groupId: NotificationGroupId,
  supportsEmail = false,
): NotificationEventDefinition => ({
  type,
  label,
  description,
  audience,
  groupId,
  supportsEmail,
});

export const NOTIFICATION_EVENTS = [
  event(
    "WORKFLOW_CREATED",
    "Workflow created",
    "A team member creates a workflow.",
    "operator",
    "workflows",
  ),
  event(
    "WORKFLOW_UPDATED",
    "Workflow updated",
    "A workflow is modified.",
    "operator",
    "workflows",
  ),
  event(
    "WORKFLOW_DELETED",
    "Workflow deleted",
    "A workflow is removed.",
    "operator",
    "workflows",
  ),
  event(
    "WORKFLOW_ARCHIVED",
    "Workflow archived",
    "A workflow is archived.",
    "operator",
    "workflows",
  ),
  event(
    "WORKFLOW_RESTORED",
    "Workflow restored",
    "An archived workflow is restored.",
    "operator",
    "workflows",
  ),
  event(
    "WORKFLOW_FAILED",
    "Workflow failed",
    "A workflow execution fails.",
    "operator",
    "workflows",
  ),
  event(
    "CAMPAIGN_CREATED",
    "Campaign created",
    "A campaign is created.",
    "operator",
    "campaigns",
  ),
  event(
    "CAMPAIGN_UPDATED",
    "Campaign updated",
    "A campaign is modified.",
    "operator",
    "campaigns",
  ),
  event(
    "CAMPAIGN_SCHEDULED",
    "Campaign scheduled",
    "A campaign is scheduled.",
    "operator",
    "campaigns",
  ),
  event(
    "CAMPAIGN_SENT",
    "Campaign sent",
    "A campaign finishes sending.",
    "operator",
    "campaigns",
  ),
  event(
    "CAMPAIGN_CANCELLED",
    "Campaign cancelled",
    "A scheduled campaign is cancelled.",
    "operator",
    "campaigns",
  ),
  event(
    "EMAIL_DOMAIN_VERIFIED",
    "Email domain verified",
    "An email sending domain finishes verification.",
    "operator",
    "communications",
  ),
  event(
    "CLIENT_CREATED",
    "Client created",
    "A client is added.",
    "operator",
    "clients",
  ),
  event(
    "CLIENT_UPDATED",
    "Client updated",
    "A client record is modified.",
    "operator",
    "clients",
  ),
  event(
    "CLIENT_DELETED",
    "Client deleted",
    "A client is removed.",
    "operator",
    "clients",
  ),
  event(
    "DEAL_CREATED",
    "Deal created",
    "A deal is created.",
    "operator",
    "deals",
    true,
  ),
  event(
    "DEAL_UPDATED",
    "Deal updated",
    "A deal is modified.",
    "operator",
    "deals",
  ),
  event(
    "DEAL_DELETED",
    "Deal deleted",
    "A deal is removed.",
    "operator",
    "deals",
  ),
  event(
    "DEAL_STAGE_CHANGED",
    "Deal stage changed",
    "A deal moves to another stage.",
    "operator",
    "deals",
  ),
  event(
    "DEAL_CLOSED",
    "Deal closed",
    "A deal is won or lost.",
    "operator",
    "deals",
    true,
  ),
  event(
    "TASK_ASSIGNED",
    "Task assigned",
    "A task is assigned to you.",
    "operator",
    "tasks",
  ),
  event(
    "TASK_COMPLETED",
    "Task completed",
    "An assigned task is completed.",
    "operator",
    "tasks",
  ),
  event(
    "TASK_DUE_SOON",
    "Task due soon",
    "A task is approaching its due date.",
    "operator",
    "tasks",
  ),
  event(
    "TASK_OVERDUE",
    "Task overdue",
    "A task passes its due date.",
    "operator",
    "tasks",
  ),
  event(
    "NOTE_MENTION",
    "Note mention",
    "A team member mentions you in a note.",
    "operator",
    "notes",
  ),
  event(
    "INVOICE_PAID",
    "Invoice paid",
    "An invoice is paid.",
    "operator",
    "invoices",
    true,
  ),
  event(
    "INVOICE_SENT",
    "Invoice sent",
    "An invoice is sent.",
    "operator",
    "invoices",
    true,
  ),
  event(
    "INVOICE_REMINDER_SENT",
    "Reminder sent",
    "An invoice reminder is sent.",
    "operator",
    "invoices",
  ),
  event(
    "INVOICE_PAYMENT_RECORDED",
    "Payment recorded",
    "A payment is recorded against an invoice.",
    "operator",
    "invoices",
  ),
  event(
    "INVOICE_CANCELLED",
    "Invoice cancelled",
    "An invoice is cancelled.",
    "operator",
    "invoices",
  ),
  event(
    "BOOKING_CREATED",
    "Booking created",
    "An appointment booking is created.",
    "operator",
    "bookings",
    true,
  ),
  event(
    "BOOKING_RESCHEDULED",
    "Booking rescheduled",
    "An appointment booking is rescheduled.",
    "operator",
    "bookings",
  ),
  event(
    "BOOKING_CANCELLED",
    "Booking cancelled",
    "An appointment booking is cancelled.",
    "operator",
    "bookings",
  ),
  event(
    "BOOKING_PAID",
    "Booking paid",
    "A booking payment is completed.",
    "operator",
    "bookings",
    true,
  ),
  event(
    "PIPELINE_CREATED",
    "Pipeline created",
    "A pipeline is created.",
    "operator",
    "pipelines",
    true,
  ),
  event(
    "PIPELINE_UPDATED",
    "Pipeline updated",
    "A pipeline is modified.",
    "operator",
    "pipelines",
  ),
  event(
    "PIPELINE_DELETED",
    "Pipeline deleted",
    "A pipeline is removed.",
    "operator",
    "pipelines",
  ),
  event(
    "INVITE_SENT",
    "Invitation sent",
    "A workspace invitation is sent.",
    "operator",
    "team",
    true,
  ),
  event(
    "INVITE_ACCEPTED",
    "Invitation accepted",
    "A recipient accepts an invitation.",
    "operator",
    "team",
    true,
  ),
  event(
    "INVITE_DECLINED",
    "Invitation declined",
    "A recipient declines an invitation.",
    "operator",
    "team",
  ),
  event(
    "MEMBER_ROLE_CHANGED",
    "Role changed",
    "A team member's role changes.",
    "operator",
    "team",
  ),
  event(
    "MEMBER_REMOVED",
    "Member removed",
    "A team member is removed.",
    "operator",
    "team",
  ),
  event(
    "MEMBER_ONLINE",
    "Member online",
    "A team member comes online.",
    "operator",
    "team",
  ),
  event(
    "MEMBER_OFFLINE",
    "Member offline",
    "A team member goes offline.",
    "operator",
    "team",
  ),
  event(
    "IMPORT_STARTED",
    "Import started",
    "A data import starts processing.",
    "operator",
    "imports",
  ),
  event(
    "IMPORT_COMPLETED",
    "Import completed",
    "Imported records become available.",
    "operator",
    "imports",
  ),
  event(
    "IMPORT_FAILED",
    "Import failed",
    "A data import cannot be completed.",
    "operator",
    "imports",
  ),
  event(
    "IMPORT_NEEDS_REVIEW",
    "Mapping review",
    "Imported fields need schema mapping review.",
    "operator",
    "imports",
  ),
  event(
    "CLASS_BOOKING_NEW",
    "New booking",
    "A member books one of your classes.",
    "instructor",
    "class-bookings",
  ),
  event(
    "CLASS_BOOKING_CANCELLED",
    "Booking cancelled",
    "A member cancels a class booking.",
    "instructor",
    "class-bookings",
  ),
  event(
    "CLASS_WAITLIST_JOINED",
    "Waitlist joined",
    "A member joins a class waitlist.",
    "instructor",
    "class-bookings",
  ),
  event(
    "CLASS_STARTING_SOON",
    "Class starting soon",
    "A class is about to start.",
    "instructor",
    "schedule",
  ),
  event(
    "CLASS_STARTED",
    "Class started",
    "A class officially starts.",
    "instructor",
    "schedule",
  ),
  event(
    "CLASS_CANCELLED",
    "Class cancelled",
    "A class is cancelled.",
    "instructor",
    "schedule",
  ),
  event(
    "CLASS_SCHEDULE_CHANGED",
    "Schedule changed",
    "A class time or room changes.",
    "instructor",
    "schedule",
  ),
  event(
    "NO_SHOW_SUMMARY",
    "No-show summary",
    "A class attendance summary is ready.",
    "instructor",
    "schedule",
  ),
  event(
    "SUBSTITUTION_REQUESTED",
    "Cover requested",
    "You receive a class cover request.",
    "instructor",
    "substitutions",
  ),
  event(
    "SUBSTITUTION_ACCEPTED",
    "Cover accepted",
    "A substitution request is accepted.",
    "instructor",
    "substitutions",
  ),
  event(
    "SUBSTITUTION_DECLINED",
    "Cover declined",
    "A substitution request is declined.",
    "instructor",
    "substitutions",
  ),
  event(
    "PAYOUT_SENT",
    "Payout sent",
    "A payout is initiated.",
    "instructor",
    "earnings",
  ),
  event(
    "PAYOUT_COMPLETED",
    "Payout completed",
    "A payout completes successfully.",
    "instructor",
    "earnings",
  ),
] as const satisfies readonly NotificationEventDefinition[];

export const INSTRUCTOR_NOTIFICATION_TYPES: ReadonlySet<NotificationType> =
  new Set(
    NOTIFICATION_EVENTS.filter((item) => item.audience === "instructor").map(
      (item) => item.type,
    ),
  );

export const EMAIL_NOTIFICATION_TYPES: ReadonlySet<NotificationType> = new Set(
  NOTIFICATION_EVENTS.filter((item) => item.supportsEmail).map(
    (item) => item.type,
  ),
);

export function getNotificationGroups(audience: NotificationAudience) {
  return NOTIFICATION_GROUPS.map((group) => ({
    ...group,
    events: NOTIFICATION_EVENTS.filter(
      (item) => item.audience === audience && item.groupId === group.id,
    ),
  })).filter((group) => group.events.length > 0);
}
