import { z } from "zod";

import { FormFieldType } from "@/db/enums";

export const formBlueprintIdSchema = z.enum([
  "BLANK",
  "LEAD_NURTURE",
  "CLASS_FEEDBACK",
]);

export type FormBlueprintId = z.infer<typeof formBlueprintIdSchema>;

export type FormBlueprint = {
  id: Exclude<FormBlueprintId, "BLANK">;
  name: string;
  description: string;
  successMessage: string;
  isMultiStep: boolean;
  steps: Array<{
    key: string;
    name: string;
    fields: Array<{
      key: string;
      type: FormFieldType;
      label: string;
      placeholder?: string;
      helpText?: string;
      required: boolean;
      options?: string[];
      validation?: Record<string, number>;
    }>;
  }>;
  identity: {
    emailFieldKey: string | null;
    phoneFieldKey: string | null;
    fullNameFieldKey: string | null;
    createIfMissing: boolean;
  } | null;
  automation: {
    emailMarketingConsentFieldKey: string | null;
    smsMarketingConsentFieldKey: string | null;
    followUpConsentFieldKey: string | null;
  };
};

export const FORM_BLUEPRINT_OPTIONS: Array<{
  id: FormBlueprintId;
  name: string;
  description: string;
}> = [
  {
    id: "BLANK",
    name: "Blank form",
    description: "Start with one empty page.",
  },
  {
    id: "LEAD_NURTURE",
    name: "Lead capture and nurture",
    description:
      "Collect member identity, goals, and separate email and SMS permission.",
  },
  {
    id: "CLASS_FEEDBACK",
    name: "Class feedback",
    description:
      "Collect a rating and comments without enrolling someone in marketing.",
  },
];

export const FORM_BLUEPRINTS: Record<
  Exclude<FormBlueprintId, "BLANK">,
  FormBlueprint
> = {
  LEAD_NURTURE: {
    id: "LEAD_NURTURE",
    name: "New member consultation",
    description:
      "Collect contact details, goals, preferences, and channel-specific marketing permission.",
    successMessage:
      "Thanks. The studio team will review your goals and recommend a first session.",
    isMultiStep: true,
    steps: [
      {
        key: "identity",
        name: "About you",
        fields: [
          {
            key: "fullName",
            type: FormFieldType.SHORT_TEXT,
            label: "Full name",
            required: true,
          },
          {
            key: "email",
            type: FormFieldType.EMAIL,
            label: "Email",
            required: true,
          },
          {
            key: "phone",
            type: FormFieldType.PHONE,
            label: "Phone",
            required: true,
          },
        ],
      },
      {
        key: "goals",
        name: "Your goals",
        fields: [
          {
            key: "goals",
            type: FormFieldType.MULTI_SELECT,
            label: "What would you like to improve?",
            required: true,
            options: ["Strength", "Mobility", "Stress", "Energy"],
          },
          {
            key: "goalNotes",
            type: FormFieldType.LONG_TEXT,
            label: "Tell us about your goals",
            placeholder: "Share anything that would help the team",
            required: false,
          },
          {
            key: "preferredTime",
            type: FormFieldType.SELECT,
            label: "Preferred class time",
            required: true,
            options: ["Morning", "Lunch", "Evening", "Weekend"],
          },
        ],
      },
      {
        key: "permission",
        name: "Contact preferences",
        fields: [
          {
            key: "emailMarketingConsent",
            type: FormFieldType.CHECKBOX,
            label: "I agree to receive marketing emails",
            helpText: "Optional. You can unsubscribe at any time.",
            required: false,
          },
          {
            key: "smsMarketingConsent",
            type: FormFieldType.CHECKBOX,
            label: "I agree to receive marketing text messages",
            helpText: "Optional. Message and data rates may apply. Reply STOP to opt out.",
            required: false,
          },
        ],
      },
    ],
    identity: {
      emailFieldKey: "email",
      phoneFieldKey: "phone",
      fullNameFieldKey: "fullName",
      createIfMissing: true,
    },
    automation: {
      emailMarketingConsentFieldKey: "emailMarketingConsent",
      smsMarketingConsentFieldKey: "smsMarketingConsent",
      followUpConsentFieldKey: null,
    },
  },
  CLASS_FEEDBACK: {
    id: "CLASS_FEEDBACK",
    name: "Class feedback",
    description:
      "Collect a class rating, comments, and optional permission for a personal follow-up.",
    successMessage: "Thank you for helping us improve.",
    isMultiStep: false,
    steps: [
      {
        key: "feedback",
        name: "Feedback",
        fields: [
          {
            key: "rating",
            type: FormFieldType.RATING,
            label: "How was your class?",
            required: true,
            validation: { min: 1, max: 5, step: 1 },
          },
          {
            key: "feedback",
            type: FormFieldType.LONG_TEXT,
            label: "What stood out?",
            placeholder: "Share anything that would help the team",
            required: false,
          },
          {
            key: "email",
            type: FormFieldType.EMAIL,
            label: "Email for a reply",
            required: false,
          },
          {
            key: "followUpConsent",
            type: FormFieldType.CHECKBOX,
            label: "The studio may follow up about this feedback",
            helpText: "This does not subscribe you to marketing.",
            required: false,
          },
        ],
      },
    ],
    identity: null,
    automation: {
      emailMarketingConsentFieldKey: null,
      smsMarketingConsentFieldKey: null,
      followUpConsentFieldKey: "followUpConsent",
    },
  },
};
