import { FormFieldType } from "@/db/enums";

export type FormFieldPreset = {
  id: string;
  label: string;
  description: string;
  group: "Contact" | "Questions" | "Choice" | "Date and time" | "Advanced";
  type: FormFieldType;
  defaultLabel: string;
  placeholder?: string;
  options?: string[];
  required?: boolean;
  disabledReason?: string;
};

export const FORM_FIELD_PRESETS: FormFieldPreset[] = [
  {
    id: "first_name",
    label: "First name",
    description: "A member's first name",
    group: "Contact",
    type: FormFieldType.SHORT_TEXT,
    defaultLabel: "First name",
    placeholder: "Enter first name",
    required: true,
  },
  {
    id: "last_name",
    label: "Last name",
    description: "A member's last name",
    group: "Contact",
    type: FormFieldType.SHORT_TEXT,
    defaultLabel: "Last name",
    placeholder: "Enter last name",
    required: true,
  },
  {
    id: "email",
    label: "Email",
    description: "Validated email address",
    group: "Contact",
    type: FormFieldType.EMAIL,
    defaultLabel: "Email",
    placeholder: "member@example.com",
    required: true,
  },
  {
    id: "phone",
    label: "Phone number",
    description: "Member phone number",
    group: "Contact",
    type: FormFieldType.PHONE,
    defaultLabel: "Phone number",
    placeholder: "+44 7700 900000",
  },
  {
    id: "shipping_address",
    label: "Shipping address",
    description: "A complete postal address",
    group: "Contact",
    type: FormFieldType.LONG_TEXT,
    defaultLabel: "Shipping address",
    placeholder: "Street, city, postcode and country",
  },
  {
    id: "short_text",
    label: "Short text",
    description: "One line of text",
    group: "Questions",
    type: FormFieldType.SHORT_TEXT,
    defaultLabel: "Question",
  },
  {
    id: "long_text",
    label: "Long text",
    description: "A longer written response",
    group: "Questions",
    type: FormFieldType.LONG_TEXT,
    defaultLabel: "Tell us more",
  },
  {
    id: "number",
    label: "Number",
    description: "A numeric answer",
    group: "Questions",
    type: FormFieldType.NUMBER,
    defaultLabel: "Number",
  },
  {
    id: "url",
    label: "Website",
    description: "A validated web address",
    group: "Questions",
    type: FormFieldType.URL,
    defaultLabel: "Website",
    placeholder: "https://",
  },
  {
    id: "dropdown",
    label: "Dropdown",
    description: "Choose one option from a menu",
    group: "Choice",
    type: FormFieldType.SELECT,
    defaultLabel: "Choose an option",
    options: ["Option 1", "Option 2"],
  },
  {
    id: "multiple_choice",
    label: "Multiple choice",
    description: "Choose one visible option",
    group: "Choice",
    type: FormFieldType.RADIO,
    defaultLabel: "Choose one",
    options: ["Option 1", "Option 2"],
  },
  {
    id: "multi_select",
    label: "Checkbox group",
    description: "Choose one or more options",
    group: "Choice",
    type: FormFieldType.MULTI_SELECT,
    defaultLabel: "Choose all that apply",
    options: ["Option 1", "Option 2"],
  },
  {
    id: "checkbox",
    label: "Checkbox",
    description: "A single yes or no choice",
    group: "Choice",
    type: FormFieldType.CHECKBOX,
    defaultLabel: "I agree",
  },
  {
    id: "email_opt_in",
    label: "Email marketing opt-in",
    description: "Explicit email consent",
    group: "Choice",
    type: FormFieldType.CHECKBOX,
    defaultLabel: "I agree to receive marketing emails",
  },
  {
    id: "sms_opt_in",
    label: "SMS marketing opt-in",
    description: "Explicit SMS consent",
    group: "Choice",
    type: FormFieldType.CHECKBOX,
    defaultLabel: "I agree to receive marketing text messages",
  },
  {
    id: "birthday",
    label: "Birthday",
    description: "A member's date of birth",
    group: "Date and time",
    type: FormFieldType.DATE,
    defaultLabel: "Birthday",
  },
  {
    id: "date",
    label: "Date",
    description: "A calendar date",
    group: "Date and time",
    type: FormFieldType.DATE,
    defaultLabel: "Date",
  },
  {
    id: "time",
    label: "Time",
    description: "A time of day",
    group: "Date and time",
    type: FormFieldType.TIME,
    defaultLabel: "Time",
  },
  {
    id: "date_time",
    label: "Date and time",
    description: "A combined date and time",
    group: "Date and time",
    type: FormFieldType.DATETIME,
    defaultLabel: "Date and time",
  },
  {
    id: "rating",
    label: "Rating",
    description: "A one-to-five rating",
    group: "Advanced",
    type: FormFieldType.RATING,
    defaultLabel: "How would you rate this?",
  },
  {
    id: "slider",
    label: "Slider",
    description: "Choose a value along a range",
    group: "Advanced",
    type: FormFieldType.SLIDER,
    defaultLabel: "Choose a value",
  },
  {
    id: "signature",
    label: "Signature",
    description: "Capture a legally meaningful signature",
    group: "Advanced",
    type: FormFieldType.SIGNATURE,
    defaultLabel: "Signature",
    disabledReason: "Requires configured signature storage and retention",
  },
  {
    id: "file_upload",
    label: "File upload",
    description: "Collect a document or image",
    group: "Advanced",
    type: FormFieldType.FILE_UPLOAD,
    defaultLabel: "Upload a file",
    disabledReason: "Requires configured file storage and retention",
  },
  {
    id: "payment",
    label: "Payment",
    description: "Collect payment through a scoped provider",
    group: "Advanced",
    type: FormFieldType.PAYMENT,
    defaultLabel: "Payment",
    disabledReason: "Requires an organization-owned payment connection",
  },
];

export const EDITABLE_FORM_FIELD_TYPES = [
  FormFieldType.SHORT_TEXT,
  FormFieldType.LONG_TEXT,
  FormFieldType.EMAIL,
  FormFieldType.PHONE,
  FormFieldType.NUMBER,
  FormFieldType.URL,
  FormFieldType.DATE,
  FormFieldType.TIME,
  FormFieldType.DATETIME,
  FormFieldType.SELECT,
  FormFieldType.RADIO,
  FormFieldType.CHECKBOX,
  FormFieldType.MULTI_SELECT,
  FormFieldType.RATING,
  FormFieldType.SLIDER,
] as const;

export function formFieldTypeLabel(type: FormFieldType): string {
  return (
    {
      SHORT_TEXT: "Short text",
      LONG_TEXT: "Long text",
      EMAIL: "Email",
      PHONE: "Phone number",
      NUMBER: "Number",
      URL: "Website",
      DATE: "Date",
      TIME: "Time",
      DATETIME: "Date and time",
      SELECT: "Dropdown",
      RADIO: "Multiple choice",
      CHECKBOX: "Checkbox",
      MULTI_SELECT: "Checkbox group",
      FILE_UPLOAD: "File upload",
      RATING: "Rating",
      SLIDER: "Slider",
      SIGNATURE: "Signature",
      PAYMENT: "Payment",
    } satisfies Record<FormFieldType, string>
  )[type];
}

export function choiceField(type: FormFieldType): boolean {
  const types: readonly FormFieldType[] = [
    FormFieldType.SELECT,
    FormFieldType.RADIO,
    FormFieldType.MULTI_SELECT,
  ];
  return types.includes(type);
}

export function numericField(type: FormFieldType): boolean {
  const types: readonly FormFieldType[] = [
    FormFieldType.NUMBER,
    FormFieldType.RATING,
    FormFieldType.SLIDER,
  ];
  return types.includes(type);
}
