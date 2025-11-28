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

// Microsoft scopes
const MICROSOFT_BASE_SCOPES = ["openid", "email", "profile", "offline_access"];

export const MICROSOFT_REQUIRED_SCOPES = [
  "Mail.ReadWrite",
  "Mail.Send",
  "Files.ReadWrite.All",
];

export const MICROSOFT_SCOPES = [
  ...MICROSOFT_BASE_SCOPES,
  ...MICROSOFT_REQUIRED_SCOPES,
];
