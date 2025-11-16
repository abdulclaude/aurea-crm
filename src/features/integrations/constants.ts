const GOOGLE_BASE_SCOPES = ["openid", "email", "profile"];

export const GOOGLE_CALENDAR_REQUIRED_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
];

export const GMAIL_REQUIRED_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
];

export const GOOGLE_FULL_REQUIRED_SCOPES = Array.from(
  new Set([...GOOGLE_CALENDAR_REQUIRED_SCOPES, ...GMAIL_REQUIRED_SCOPES])
);

export const GOOGLE_CALENDAR_SCOPES = [
  ...GOOGLE_BASE_SCOPES,
  ...GOOGLE_CALENDAR_REQUIRED_SCOPES,
];

export const GMAIL_SCOPES = [...GOOGLE_BASE_SCOPES, ...GMAIL_REQUIRED_SCOPES];

export const GOOGLE_FULL_SCOPES = [
  ...GOOGLE_BASE_SCOPES,
  ...GOOGLE_FULL_REQUIRED_SCOPES,
];

const parseOptionalScopes = (value?: string) =>
  value
    ?.split(",")
    .map((scope) => scope.trim())
    .filter(Boolean) ?? [];

export const WHATSAPP_REQUIRED_SCOPES = [
  "whatsapp_business_management",
  "whatsapp_business_messaging",
];

export const WHATSAPP_SCOPES = [
  ...WHATSAPP_REQUIRED_SCOPES,
  ...parseOptionalScopes(process.env.FACEBOOK_OPTIONAL_SCOPES),
];
