import type { DeliveryPurpose } from "@/features/delivery/contracts";
import { renderCommunicationRuleContent } from "@/features/communications/lib/rule-rendering";
import type { CommunicationRuleSnapshot } from "@/features/communications/server/control-service";

export const CLASS_REMINDER_EVENT_KEY = "studio.class.reminder";

export type ClassReminderRule = {
  id: string;
  versionId: string;
  channel: "EMAIL" | "SMS";
  purpose: DeliveryPurpose;
  subject: string | null;
  textBody: string | null;
  htmlBody: string | null;
  scheduledFor: Date;
  immutableSnapshot: CommunicationRuleSnapshot;
};

export type ClassReminderRecipient = {
  bookingId: string;
  clientId: string;
  name: string;
  firstName: string | null;
  email: string | null;
  phone: string | null;
  mobilePhone: string | null;
  notificationPrefs: unknown;
};

export type ClassReminderDetails = {
  id: string;
  name: string;
  startTime: Date;
  endTime: Date;
  instructorName: string | null;
  location: string | null;
};

export type ClassReminderPlan = {
  bookingId: string;
  clientId: string;
  channel: "EMAIL" | "SMS";
  destination: string;
  purpose: DeliveryPurpose;
  subject: string | null;
  textBody: string;
  htmlBody: string | null;
  availableAt: Date;
  idempotencyKey: string;
  communicationRule: {
    ruleId: string;
    versionId: string;
    snapshot: CommunicationRuleSnapshot;
  };
};

function channelAllowed(
  notificationPrefs: unknown,
  channel: "EMAIL" | "SMS",
): boolean {
  if (
    !notificationPrefs ||
    typeof notificationPrefs !== "object" ||
    Array.isArray(notificationPrefs)
  ) {
    return true;
  }
  const key = channel === "EMAIL" ? "email" : "sms";
  return !(
    key in notificationPrefs &&
    (notificationPrefs as Record<string, unknown>)[key] === false
  );
}

function variables(
  studioClass: ClassReminderDetails,
  recipient: ClassReminderRecipient,
): Record<string, string> {
  return {
    "class.id": studioClass.id,
    "class.name": studioClass.name,
    "class.startTime": studioClass.startTime.toISOString(),
    "class.endTime": studioClass.endTime.toISOString(),
    "class.instructorName": studioClass.instructorName ?? "",
    "class.location": studioClass.location ?? "",
    "client.id": recipient.clientId,
    "client.name": recipient.name,
    "client.firstName": recipient.firstName ?? recipient.name,
    "customer.id": recipient.clientId,
    "customer.name": recipient.name,
  };
}

export function buildClassReminderPlans(input: {
  studioClass: ClassReminderDetails;
  recipients: readonly ClassReminderRecipient[];
  rules: readonly ClassReminderRule[];
}): ClassReminderPlan[] {
  const plans: ClassReminderPlan[] = [];
  for (const recipient of input.recipients) {
    for (const rule of input.rules) {
      if (!channelAllowed(recipient.notificationPrefs, rule.channel)) continue;
      const destination =
        rule.channel === "EMAIL"
          ? recipient.email
          : (recipient.mobilePhone ?? recipient.phone);
      if (!destination) continue;
      const rendered = renderCommunicationRuleContent({
        subject: rule.subject,
        textBody: rule.textBody,
        htmlBody: rule.htmlBody,
        variables: variables(input.studioClass, recipient),
      });
      if (rule.channel === "EMAIL" && !rendered.subject) continue;
      const textBody = rendered.textBody ?? "";
      if (!textBody && !rendered.htmlBody) continue;
      plans.push({
        bookingId: recipient.bookingId,
        clientId: recipient.clientId,
        channel: rule.channel,
        destination,
        purpose: rule.purpose,
        subject: rendered.subject,
        textBody,
        htmlBody: rendered.htmlBody,
        availableAt: rule.scheduledFor,
        idempotencyKey: [
          "class-reminder",
          input.studioClass.id,
          recipient.bookingId,
          rule.channel.toLowerCase(),
          input.studioClass.startTime.toISOString(),
        ].join(":"),
        communicationRule: {
          ruleId: rule.id,
          versionId: rule.versionId,
          snapshot: rule.immutableSnapshot,
        },
      });
    }
  }
  return plans;
}
