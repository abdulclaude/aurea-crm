import type { FormFixtures, GrowthBuildScope, GrowthPackFixtures } from "./types";
import { before, DAY_MS, safeEmail, safePhone } from "./shared";

export function buildFormFixtures(scope: GrowthBuildScope): FormFixtures {
  const { context, clients, id } = scope;
  const { organizationId, locationId, referenceDate } = context;
const publishedFormId = id("form", "consultation");
const feedbackFormId = id("form", "feedback");
const forms: GrowthPackFixtures["forms"] = [
  {
    id: publishedFormId,
    organizationId,
    locationId,
    name: "New member consultation",
    description: "A three-step consultation for goals, preferences, and consent.",
    status: "PUBLISHED",
    isMultiStep: true,
    showProgress: true,
    successMessage: "Thanks. The studio team will review your goals and recommend a first session.",
    publishedAt: before(referenceDate, 120),
    updatedAt: before(referenceDate, 12),
  },
  {
    id: feedbackFormId,
    organizationId,
    locationId,
    name: "Class feedback",
    description: "A short draft feedback form.",
    status: "DRAFT",
    isMultiStep: false,
    showProgress: false,
    successMessage: "Thank you for helping us improve.",
    updatedAt: before(referenceDate, 4),
  },
];
const stepDefinitions = [
  { formId: publishedFormId, name: "About you", order: 0 },
  { formId: publishedFormId, name: "Your goals", order: 1 },
  { formId: publishedFormId, name: "Preferences", order: 2 },
  { formId: feedbackFormId, name: "Feedback", order: 0 },
];
const formSteps: GrowthPackFixtures["formSteps"] = stepDefinitions.map((step, index) => ({
  id: id("form-step", index),
  ...step,
  updatedAt: before(referenceDate, 12),
}));
const fieldDefinitions = [
  [0, "SHORT_TEXT", "Full name", true, []],
  [0, "EMAIL", "Email", true, []],
  [0, "PHONE", "Phone", true, []],
  [1, "MULTI_SELECT", "What would you like to improve?", true, ["Strength", "Mobility", "Stress", "Energy"]],
  [1, "LONG_TEXT", "Tell us about your goals", false, []],
  [1, "RATING", "Current energy level", false, []],
  [2, "SELECT", "Preferred class time", true, ["Morning", "Lunch", "Evening", "Weekend"]],
  [2, "RADIO", "Experience level", true, ["New", "Some experience", "Regular practice"]],
  [2, "CHECKBOX", "I agree to receive marketing emails", false, []],
  [2, "CHECKBOX", "I agree to receive marketing text messages", false, []],
  [3, "RATING", "How was your class?", true, []],
  [3, "LONG_TEXT", "What stood out?", false, []],
  [3, "CHECKBOX", "May we follow up?", false, []],
] as const;
const formFields: GrowthPackFixtures["formFields"] = fieldDefinitions.map(
  ([stepIndex, type, label, required, options], index) => ({
    id: id("form-field", index),
    stepId: formSteps[stepIndex]?.id ?? formSteps[0]?.id ?? "",
    type,
    label,
    placeholder: type === "LONG_TEXT" ? "Share anything that would help the team" : null,
    helpText: type === "CHECKBOX" ? "Your preference can be changed later." : null,
    required,
    validation: type === "RATING" ? { min: 1, max: 5, step: 1 } : {},
    options: [...options],
    order: index,
    updatedAt: before(referenceDate, 12),
  }),
);
const consultationFields = formFields.filter((field) =>
  formSteps.slice(0, 3).some((step) => step.id === field.stepId),
);
const fieldIdByLabel = new Map(
  formFields.map((field) => [field.label, field.id]),
);
const consultationForm = forms.find((item) => item.id === publishedFormId);
if (consultationForm) {
  consultationForm.crmResolutionConfig = {
    enabled: true,
    matchBy: "EMAIL_OR_PHONE",
    createIfMissing: true,
    updateExisting: "FILL_EMPTY",
    emailFieldId: fieldIdByLabel.get("Email") ?? null,
    phoneFieldId: fieldIdByLabel.get("Phone") ?? null,
    fullNameFieldId: fieldIdByLabel.get("Full name") ?? null,
    firstNameFieldId: null,
    lastNameFieldId: null,
  };
  consultationForm.automationConfig = {
    version: 1,
    emailMarketingConsentFieldId:
      fieldIdByLabel.get("I agree to receive marketing emails") ?? null,
    smsMarketingConsentFieldId:
      fieldIdByLabel.get("I agree to receive marketing text messages") ?? null,
    followUpConsentFieldId: null,
  };
}
const feedbackForm = forms.find((item) => item.id === feedbackFormId);
if (feedbackForm) {
  feedbackForm.automationConfig = {
    version: 1,
    emailMarketingConsentFieldId: null,
    smsMarketingConsentFieldId: null,
    followUpConsentFieldId: fieldIdByLabel.get("May we follow up?") ?? null,
  };
}
const formSubmissions: GrowthPackFixtures["formSubmissions"] = [];
const formSubmissionCount = context.profile === "QA_EXHAUSTIVE" ? 180 : 80;
const sources = [
  ["google", "cpc", "studio-reset-search"],
  ["facebook", "paid_social", "mobility-intro"],
  ["instagram", "organic", "studio-stories"],
  ["newsletter", "email", "weekly-rhythm"],
  [null, null, null],
] as const;
for (let index = 0; index < formSubmissionCount; index += 1) {
  const client = clients[index % clients.length] ?? clients[0];
  if (!client) throw new Error("A form submission client was not available.");
  const source = sources[index % sources.length] ?? sources[0];
  const data: Record<string, unknown> = {};
  for (const field of consultationFields) {
    if (field.label === "Full name") data[field.id] = client.name;
    else if (field.label === "Email") data[field.id] = safeEmail(client, index);
    else if (field.label === "Phone") data[field.id] = safePhone(client, index);
    else if (field.type === "MULTI_SELECT") data[field.id] = index % 2 === 0 ? ["Mobility", "Energy"] : ["Strength"];
    else if (field.type === "SELECT") data[field.id] = ["Morning", "Evening", "Weekend"][index % 3];
    else if (field.type === "RADIO") data[field.id] = ["New", "Some experience", "Regular practice"][index % 3];
    else if (field.type === "CHECKBOX") data[field.id] = true;
    else if (field.type === "RATING") data[field.id] = (index % 5) + 1;
    else data[field.id] = "Build a consistent practice that supports everyday movement.";
  }
  formSubmissions.push({
    id: id("form-submission", index),
    formId: publishedFormId,
    organizationId,
    locationId,
    data,
    clientId: index % 5 === 0 ? null : client.id,
    utmSource: source?.[0] ?? null,
    utmMedium: source?.[1] ?? null,
    utmCampaign: source?.[2] ?? null,
    referrer: source?.[0] ? `https://${source[0]}.example.invalid/` : null,
    retentionExpiresAt: new Date(before(referenceDate, index % 180).getTime() + 365 * DAY_MS),
    submittedAt: before(referenceDate, index % 180, index % 12),
  });
}


  return { forms, formSteps, formFields, formSubmissions, publishedFormId };
}
