import { NodeType } from "@/db/enums";

import type { StarterWorkflowTemplate } from "./studio-template-types";
import { connection, node } from "./studio-template-types";

export const studioAttendanceTemplates: StarterWorkflowTemplate[] = [
  {
    slug: "class-booked-confirmation",
    name: "Class booked confirmation",
    description:
      "When a class is booked, tag the booking intent and send a quick confirmation SMS.",
    nodes: [
      node("trigger", NodeType.CLASS_BOOKED_TRIGGER, 0, 0, {
        variableName: "booking",
      }),
      node("tag", NodeType.ADD_TAG_TO_CLIENT, 300, 0, {
        variableName: "bookedMember",
        clientId: "{{booking.clientId}}",
        tag: "class-booked",
      }),
      node("sms", NodeType.SEND_SMS, 600, 0, {
        clientId: "{{booking.clientId}}",
        message:
          "You are booked for {{booking.class.name}}. Reply here if you need help changing the booking.",
      }),
    ],
    connections: [connection("trigger", "tag"), connection("tag", "sms")],
  },
  {
    slug: "waitlist-spot-opened",
    name: "Waitlist spot opened",
    description:
      "When a waitlist spot opens, alert the member immediately and tag the client.",
    nodes: [
      node("trigger", NodeType.WAITLIST_SPOT_OPENED_TRIGGER, 0, 0, {
        variableName: "waitlistSpot",
      }),
      node("tag", NodeType.ADD_TAG_TO_CLIENT, 300, 0, {
        variableName: "waitlistMember",
        clientId: "{{waitlistSpot.clientId}}",
        tag: "waitlist-notified",
      }),
      node("sms", NodeType.SEND_SMS, 600, 0, {
        clientId: "{{waitlistSpot.clientId}}",
        message:
          "A spot just opened in your waitlisted class. Open the app or reply here if you want help claiming it.",
      }),
    ],
    connections: [connection("trigger", "tag"), connection("tag", "sms")],
  },
  {
    slug: "no-show-recovery",
    name: "No-show recovery",
    description:
      "When a member no-shows, tag the profile and send a friendly recovery SMS.",
    nodes: [
      node("trigger", NodeType.MEMBER_NO_SHOW_TRIGGER, 0, 0, {
        variableName: "noShow",
      }),
      node("tag", NodeType.ADD_TAG_TO_CLIENT, 300, 0, {
        variableName: "missedMember",
        clientId: "{{noShow.clientId}}",
        tag: "missed-class",
      }),
      node("sms", NodeType.SEND_SMS, 600, 0, {
        clientId: "{{noShow.clientId}}",
        message:
          "We missed you in {{noShow.class.name}}. Reply if you need help rebooking.",
      }),
    ],
    connections: [connection("trigger", "tag"), connection("tag", "sms")],
  },
  {
    slug: "vip-tag-follow-up",
    name: "VIP tag follow-up",
    description:
      "When tags change and a member becomes VIP, send a high-touch follow-up.",
    nodes: [
      node("trigger", NodeType.CLIENT_TAG_ADDED_TRIGGER, 0, 0, {
        variableName: "tagChange",
        tag: "vip",
      }),
      node("sms", NodeType.SEND_SMS, 300, 0, {
        clientId: "{{tagChange.client.id}}",
        message:
          "You are now marked as VIP at the studio. Reply here whenever you need booking help.",
      }),
    ],
    connections: [
      connection("trigger", "sms"),
    ],
  },
];
