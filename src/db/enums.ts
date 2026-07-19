// Generated from src/db/schema.ts. Keep enum values in sync with Drizzle pgEnum definitions.

export const AILogStatus = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;
export type AILogStatus = (typeof AILogStatus)[keyof typeof AILogStatus];

export const AccessControlProvider = {
  KISI: "KISI",
  BRIVO: "BRIVO",
  SALTO: "SALTO",
  HID: "HID",
  GANTNER: "GANTNER",
  OTHER: "OTHER",
} as const;
export type AccessControlProvider =
  (typeof AccessControlProvider)[keyof typeof AccessControlProvider];

export const AcquisitionStage = {
  INQUIRY: "INQUIRY",
  TRIAL: "TRIAL",
  ACTIVE: "ACTIVE",
  LOST: "LOST",
} as const;
export type AcquisitionStage =
  (typeof AcquisitionStage)[keyof typeof AcquisitionStage];

export const ActivityAction = {
  CREATED: "CREATED",
  UPDATED: "UPDATED",
  DELETED: "DELETED",
  ASSIGNED: "ASSIGNED",
  UNASSIGNED: "UNASSIGNED",
  STAGE_CHANGED: "STAGE_CHANGED",
  STATUS_CHANGED: "STATUS_CHANGED",
  COMPLETED: "COMPLETED",
  ARCHIVED: "ARCHIVED",
  RESTORED: "RESTORED",
} as const;
export type ActivityAction =
  (typeof ActivityAction)[keyof typeof ActivityAction];

export const ActivityType = {
  CLIENT: "CLIENT",
  DEAL: "DEAL",
  WORKFLOW: "WORKFLOW",
  EXECUTION: "EXECUTION",
  PIPELINE: "PIPELINE",
  TASK: "TASK",
  EMAIL: "EMAIL",
  CALL: "CALL",
  MEETING: "MEETING",
  NOTE: "NOTE",
  INSTRUCTOR: "INSTRUCTOR",
  TIME_LOG: "TIME_LOG",
  INVOICE: "INVOICE",
  CREDENTIAL: "CREDENTIAL",
  WEBHOOK: "WEBHOOK",
  INTEGRATION: "INTEGRATION",
  LOCATION: "LOCATION",
  ORGANIZATION: "ORGANIZATION",
  BOOKING: "BOOKING",
  CAMPAIGN: "CAMPAIGN",
} as const;
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

export const AppProvider = {
  GOOGLE_CALENDAR: "GOOGLE_CALENDAR",
  GMAIL: "GMAIL",
  GOOGLE: "GOOGLE",
  TELEGRAM: "TELEGRAM",
  MICROSOFT: "MICROSOFT",
  OUTLOOK: "OUTLOOK",
  ONEDRIVE: "ONEDRIVE",
  MINDBODY: "MINDBODY",
  SLACK: "SLACK",
  DISCORD: "DISCORD",
  GOOGLE_DRIVE: "GOOGLE_DRIVE",
  GOOGLE_FORMS: "GOOGLE_FORMS",
} as const;
export type AppProvider = (typeof AppProvider)[keyof typeof AppProvider];

export const ApprovalStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
} as const;
export type ApprovalStatus =
  (typeof ApprovalStatus)[keyof typeof ApprovalStatus];

export const AutomationEventType = {
  WORKFLOW_COMPLETED: "WORKFLOW_COMPLETED",
  MEMBERSHIP_SIGNUP: "MEMBERSHIP_SIGNUP",
  INTRO_OFFER_REDEEMED: "INTRO_OFFER_REDEEMED",
  INTRO_OFFER_COMPLETED: "INTRO_OFFER_COMPLETED",
  CLASS_MILESTONE: "CLASS_MILESTONE",
  LEAD_CONVERTED: "LEAD_CONVERTED",
  BIRTHDAY: "BIRTHDAY",
  NO_SHOW: "NO_SHOW",
  WAITLIST_SPOT_OPENED: "WAITLIST_SPOT_OPENED",
  MEMBERSHIP_EXPIRING: "MEMBERSHIP_EXPIRING",
  MEMBERSHIP_CANCELLED: "MEMBERSHIP_CANCELLED",
  CLASS_BOOKED: "CLASS_BOOKED",
  CLASS_CANCELLED: "CLASS_CANCELLED",
  TAG_CHANGED: "TAG_CHANGED",
  PAYMENT_SUCCEEDED: "PAYMENT_SUCCEEDED",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  REFERRAL_CONVERTED: "REFERRAL_CONVERTED",
} as const;
export type AutomationEventType =
  (typeof AutomationEventType)[keyof typeof AutomationEventType];

export const BankTransferStatus = {
  PENDING: "PENDING",
  PROOF_UPLOADED: "PROOF_UPLOADED",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
} as const;
export type BankTransferStatus =
  (typeof BankTransferStatus)[keyof typeof BankTransferStatus];

export const BillingInterval = {
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
  QUARTERLY: "QUARTERLY",
  ANNUALLY: "ANNUALLY",
  ONE_TIME: "ONE_TIME",
} as const;
export type BillingInterval =
  (typeof BillingInterval)[keyof typeof BillingInterval];

export const BillingModel = {
  HOURLY: "HOURLY",
  PER_SHIFT: "PER_SHIFT",
  WEEKLY_ROLLUP: "WEEKLY_ROLLUP",
  MONTHLY_ROLLUP: "MONTHLY_ROLLUP",
  RETAINER: "RETAINER",
  PROJECT_MILESTONE: "PROJECT_MILESTONE",
  SUBSCRIPTION: "SUBSCRIPTION",
  CUSTOM: "CUSTOM",
} as const;
export type BillingModel = (typeof BillingModel)[keyof typeof BillingModel];

export const BookingLocationType = {
  CAL_VIDEO: "CAL_VIDEO",
  PHONE: "PHONE",
  IN_PERSON: "IN_PERSON",
  GOOGLE_MEET: "GOOGLE_MEET",
  ZOOM: "ZOOM",
  MS_TEAMS: "MS_TEAMS",
  CUSTOM: "CUSTOM",
} as const;
export type BookingLocationType =
  (typeof BookingLocationType)[keyof typeof BookingLocationType];

export const BookingStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  RESCHEDULED: "RESCHEDULED",
  NO_SHOW: "NO_SHOW",
  COMPLETED: "COMPLETED",
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const CalComWebhookReceiptStatus = {
  PROCESSED: "PROCESSED",
  IGNORED: "IGNORED",
} as const;
export type CalComWebhookReceiptStatus =
  (typeof CalComWebhookReceiptStatus)[keyof typeof CalComWebhookReceiptStatus];

export const CampaignRecipientStatus = {
  PENDING: "PENDING",
  SENT: "SENT",
  DELIVERED: "DELIVERED",
  OPENED: "OPENED",
  CLICKED: "CLICKED",
  BOUNCED: "BOUNCED",
  COMPLAINED: "COMPLAINED",
  UNSUBSCRIBED: "UNSUBSCRIBED",
  FAILED: "FAILED",
} as const;
export type CampaignRecipientStatus =
  (typeof CampaignRecipientStatus)[keyof typeof CampaignRecipientStatus];

export const CampaignSegmentType = {
  ALL: "ALL",
  BY_TYPE: "BY_TYPE",
  BY_TAGS: "BY_TAGS",
  BY_LIFECYCLE: "BY_LIFECYCLE",
  BY_COUNTRY: "BY_COUNTRY",
  CUSTOM: "CUSTOM",
} as const;
export type CampaignSegmentType =
  (typeof CampaignSegmentType)[keyof typeof CampaignSegmentType];

export const CampaignStatus = {
  DRAFT: "DRAFT",
  SCHEDULED: "SCHEDULED",
  QUEUED: "QUEUED",
  SENDING: "SENDING",
  SENT: "SENT",
  PAUSED: "PAUSED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;
export type CampaignStatus =
  (typeof CampaignStatus)[keyof typeof CampaignStatus];

export const CancellationChargeType = {
  LATE_CANCEL: "LATE_CANCEL",
  NO_SHOW: "NO_SHOW",
} as const;
export type CancellationChargeType =
  (typeof CancellationChargeType)[keyof typeof CancellationChargeType];

export const CancellationChargeStatus = {
  PENDING: "PENDING",
  REQUIRES_PAYMENT_METHOD: "REQUIRES_PAYMENT_METHOD",
  PROCESSING: "PROCESSING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
  NO_PAYMENT_DUE: "NO_PAYMENT_DUE",
  WAIVED: "WAIVED",
  PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
  REFUNDED: "REFUNDED",
  DISPUTED: "DISPUTED",
} as const;
export type CancellationChargeStatus =
  (typeof CancellationChargeStatus)[keyof typeof CancellationChargeStatus];

export const CheckInMethod = {
  MANUAL: "MANUAL",
  QR_CODE: "QR_CODE",
  GPS: "GPS",
  BIOMETRIC: "BIOMETRIC",
  NFC: "NFC",
} as const;
export type CheckInMethod = (typeof CheckInMethod)[keyof typeof CheckInMethod];

export const ChurnRiskLevel = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
} as const;
export type ChurnRiskLevel =
  (typeof ChurnRiskLevel)[keyof typeof ChurnRiskLevel];

export const ClassDifficulty = {
  BEGINNER: "BEGINNER",
  INTERMEDIATE: "INTERMEDIATE",
  ADVANCED: "ADVANCED",
  ALL_LEVELS: "ALL_LEVELS",
} as const;
export type ClassDifficulty =
  (typeof ClassDifficulty)[keyof typeof ClassDifficulty];

export const ClassInstanceStatus = {
  SCHEDULED: "SCHEDULED",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED",
  IN_PROGRESS: "IN_PROGRESS",
} as const;
export type ClassInstanceStatus =
  (typeof ClassInstanceStatus)[keyof typeof ClassInstanceStatus];

export const ClientType = {
  LEAD: "LEAD",
  PROSPECT: "PROSPECT",
  CUSTOMER: "CUSTOMER",
  CHURN: "CHURN",
  CLOSED: "CLOSED",
} as const;
export type ClientType = (typeof ClientType)[keyof typeof ClientType];

export const ContentAccessLevel = {
  PUBLIC: "PUBLIC",
  MEMBERS_ONLY: "MEMBERS_ONLY",
  PAID: "PAID",
} as const;
export type ContentAccessLevel =
  (typeof ContentAccessLevel)[keyof typeof ContentAccessLevel];

export const ConversationChannel = {
  SMS: "SMS",
  EMAIL: "EMAIL",
  APP: "APP",
} as const;
export type ConversationChannel =
  (typeof ConversationChannel)[keyof typeof ConversationChannel];

export const ConversationStatus = {
  OPEN: "OPEN",
  DONE: "DONE",
  SNOOZED: "SNOOZED",
} as const;
export type ConversationStatus =
  (typeof ConversationStatus)[keyof typeof ConversationStatus];

export const InboundMessageReceiptStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  PROCESSED: "PROCESSED",
  IGNORED: "IGNORED",
  FAILED: "FAILED",
  DEAD_LETTER: "DEAD_LETTER",
} as const;
export type InboundMessageReceiptStatus =
  (typeof InboundMessageReceiptStatus)[keyof typeof InboundMessageReceiptStatus];

export const CredentialType = {
  ANTHROPIC: "ANTHROPIC",
  GEMINI: "GEMINI",
  OPENAI: "OPENAI",
  TELEGRAM_BOT: "TELEGRAM_BOT",
  MINDBODY: "MINDBODY",
  RESEND: "RESEND",
  CAL_COM: "CAL_COM",
} as const;
export type CredentialType =
  (typeof CredentialType)[keyof typeof CredentialType];

export const DevicePlatform = {
  IOS: "IOS",
  ANDROID: "ANDROID",
  WEB: "WEB",
} as const;
export type DevicePlatform =
  (typeof DevicePlatform)[keyof typeof DevicePlatform];

export const DiscountType = {
  PERCENT: "PERCENT",
  FIXED: "FIXED",
} as const;
export type DiscountType = (typeof DiscountType)[keyof typeof DiscountType];

export const EmailDomainStatus = {
  PENDING: "PENDING",
  VERIFYING: "VERIFYING",
  VERIFIED: "VERIFIED",
  FAILED: "FAILED",
} as const;
export type EmailDomainStatus =
  (typeof EmailDomainStatus)[keyof typeof EmailDomainStatus];

export const EmailTemplateType = {
  MARKETING: "MARKETING",
  ANNOUNCEMENT: "ANNOUNCEMENT",
  PLAIN: "PLAIN",
  CUSTOM: "CUSTOM",
} as const;
export type EmailTemplateType =
  (typeof EmailTemplateType)[keyof typeof EmailTemplateType];

export const ExecutionStatus = {
  RUNNING: "RUNNING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
} as const;
export type ExecutionStatus =
  (typeof ExecutionStatus)[keyof typeof ExecutionStatus];

export const ExternalChannelProvider = {
  RESERVE_WITH_GOOGLE: "RESERVE_WITH_GOOGLE",
  CLASSPASS: "CLASSPASS",
  GYMPASS: "GYMPASS",
  WELLHUB: "WELLHUB",
} as const;
export type ExternalChannelProvider =
  (typeof ExternalChannelProvider)[keyof typeof ExternalChannelProvider];

export const ExternalChannelStatus = {
  DRAFT: "DRAFT",
  PENDING_REVIEW: "PENDING_REVIEW",
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  ERROR: "ERROR",
} as const;
export type ExternalChannelStatus =
  (typeof ExternalChannelStatus)[keyof typeof ExternalChannelStatus];

export const FormFieldType = {
  SHORT_TEXT: "SHORT_TEXT",
  LONG_TEXT: "LONG_TEXT",
  EMAIL: "EMAIL",
  PHONE: "PHONE",
  NUMBER: "NUMBER",
  URL: "URL",
  DATE: "DATE",
  TIME: "TIME",
  DATETIME: "DATETIME",
  SELECT: "SELECT",
  RADIO: "RADIO",
  CHECKBOX: "CHECKBOX",
  MULTI_SELECT: "MULTI_SELECT",
  FILE_UPLOAD: "FILE_UPLOAD",
  RATING: "RATING",
  SLIDER: "SLIDER",
  SIGNATURE: "SIGNATURE",
  PAYMENT: "PAYMENT",
} as const;
export type FormFieldType = (typeof FormFieldType)[keyof typeof FormFieldType];

export const FormStatus = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
} as const;
export type FormStatus = (typeof FormStatus)[keyof typeof FormStatus];

export const HouseholdRole = {
  PRIMARY: "PRIMARY",
  PARTNER: "PARTNER",
  CHILD: "CHILD",
  DEPENDENT: "DEPENDENT",
  MEMBER: "MEMBER",
} as const;
export type HouseholdRole = (typeof HouseholdRole)[keyof typeof HouseholdRole];

export const ImportSource = {
  CSV: "CSV",
  MINDBODY: "MINDBODY",
  GLOFOX: "GLOFOX",
  MOMOYOGA: "MOMOYOGA",
  ZEN_PLANNER: "ZEN_PLANNER",
} as const;
export type ImportSource = (typeof ImportSource)[keyof typeof ImportSource];

export const ImportStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  ROLLED_BACK: "ROLLED_BACK",
} as const;
export type ImportStatus = (typeof ImportStatus)[keyof typeof ImportStatus];

export const InstallmentInterval = {
  WEEKLY: "WEEKLY",
  BIWEEKLY: "BIWEEKLY",
  MONTHLY: "MONTHLY",
} as const;
export type InstallmentInterval =
  (typeof InstallmentInterval)[keyof typeof InstallmentInterval];

export const InstallmentProvider = {
  INTERNAL: "INTERNAL",
  STRIPE: "STRIPE",
  AFFIRM: "AFFIRM",
  KLARNA: "KLARNA",
  CLEARPAY: "CLEARPAY",
  PAYPAL: "PAYPAL",
} as const;
export type InstallmentProvider =
  (typeof InstallmentProvider)[keyof typeof InstallmentProvider];

export const InstructorSubstitutionStatus = {
  OPEN: "OPEN",
  OFFERED: "OFFERED",
  ACCEPTED: "ACCEPTED",
  DECLINED: "DECLINED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
} as const;
export type InstructorSubstitutionStatus =
  (typeof InstructorSubstitutionStatus)[keyof typeof InstructorSubstitutionStatus];

export const IntroOfferRedemptionStatus = {
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  CONVERTED: "CONVERTED",
  CANCELLED: "CANCELLED",
} as const;
export type IntroOfferRedemptionStatus =
  (typeof IntroOfferRedemptionStatus)[keyof typeof IntroOfferRedemptionStatus];

export const IntroOfferType = {
  TRIAL_CLASSES: "TRIAL_CLASSES",
  UNLIMITED_TRIAL: "UNLIMITED_TRIAL",
  DISCOUNTED_PACK: "DISCOUNTED_PACK",
  FREE_CLASS: "FREE_CLASS",
  FIRST_MONTH_DISCOUNT: "FIRST_MONTH_DISCOUNT",
} as const;
export type IntroOfferType =
  (typeof IntroOfferType)[keyof typeof IntroOfferType];

export const InvoiceStatus = {
  DRAFT: "DRAFT",
  SENT: "SENT",
  VIEWED: "VIEWED",
  PAID: "PAID",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  OVERDUE: "OVERDUE",
  CANCELLED: "CANCELLED",
} as const;
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export const InvoiceAccessPurpose = {
  PAY: "PAY",
  VIEW: "VIEW",
} as const;
export type InvoiceAccessPurpose =
  (typeof InvoiceAccessPurpose)[keyof typeof InvoiceAccessPurpose];

export const InvoiceType = {
  SENT: "SENT",
  RECEIVED: "RECEIVED",
} as const;
export type InvoiceType = (typeof InvoiceType)[keyof typeof InvoiceType];

export const LifecycleStage = {
  SUBSCRIBER: "SUBSCRIBER",
  LEAD: "LEAD",
  MQL: "MQL",
  SQL: "SQL",
  OPPORTUNITY: "OPPORTUNITY",
  CUSTOMER: "CUSTOMER",
  EVANGELIST: "EVANGELIST",
} as const;
export type LifecycleStage =
  (typeof LifecycleStage)[keyof typeof LifecycleStage];

export const LoyaltyRewardType = {
  FREE_CLASS: "FREE_CLASS",
  DISCOUNT_PERCENT: "DISCOUNT_PERCENT",
  DISCOUNT_FIXED: "DISCOUNT_FIXED",
  MERCHANDISE: "MERCHANDISE",
  EXPERIENCE: "EXPERIENCE",
} as const;
export type LoyaltyRewardType =
  (typeof LoyaltyRewardType)[keyof typeof LoyaltyRewardType];

export const LoyaltyTier = {
  BRONZE: "BRONZE",
  SILVER: "SILVER",
  GOLD: "GOLD",
  PLATINUM: "PLATINUM",
} as const;
export type LoyaltyTier = (typeof LoyaltyTier)[keyof typeof LoyaltyTier];

export const LoyaltyTransactionType = {
  EARN_CLASS: "EARN_CLASS",
  EARN_PURCHASE: "EARN_PURCHASE",
  EARN_REFERRAL: "EARN_REFERRAL",
  EARN_CHALLENGE: "EARN_CHALLENGE",
  EARN_BONUS: "EARN_BONUS",
  REDEEM: "REDEEM",
  EXPIRE: "EXPIRE",
  ADJUST: "ADJUST",
} as const;
export type LoyaltyTransactionType =
  (typeof LoyaltyTransactionType)[keyof typeof LoyaltyTransactionType];

export const MarketplaceListingStatus = {
  DRAFT: "DRAFT",
  PENDING_REVIEW: "PENDING_REVIEW",
  PUBLISHED: "PUBLISHED",
  PAUSED: "PAUSED",
  REJECTED: "REJECTED",
} as const;
export type MarketplaceListingStatus =
  (typeof MarketplaceListingStatus)[keyof typeof MarketplaceListingStatus];

export const MembershipPlanType = {
  UNLIMITED: "UNLIMITED",
  CLASS_PACK: "CLASS_PACK",
  DROP_IN: "DROP_IN",
  TIME_BASED: "TIME_BASED",
  TIERED: "TIERED",
  INTRO_OFFER: "INTRO_OFFER",
  TRIAL: "TRIAL",
} as const;
export type MembershipPlanType =
  (typeof MembershipPlanType)[keyof typeof MembershipPlanType];

export const MessageDirection = {
  INBOUND: "INBOUND",
  OUTBOUND: "OUTBOUND",
} as const;
export type MessageDirection =
  (typeof MessageDirection)[keyof typeof MessageDirection];

export const ModuleType = {
  TIME_TRACKING: "TIME_TRACKING",
  INVOICING: "INVOICING",
  INVENTORY: "INVENTORY",
  BOOKING_CALENDAR: "BOOKING_CALENDAR",
  DOCUMENT_SIGNING: "DOCUMENT_SIGNING",
  PROJECT_MANAGEMENT: "PROJECT_MANAGEMENT",
  PILATES_STUDIO: "PILATES_STUDIO",
  STUDIO_CORE: "STUDIO_CORE",
} as const;
export type ModuleType = (typeof ModuleType)[keyof typeof ModuleType];

export const NodeType = {
  INITIAL: "INITIAL",
  MANUAL_TRIGGER: "MANUAL_TRIGGER",
  GOOGLE_FORM_TRIGGER: "GOOGLE_FORM_TRIGGER",
  GOOGLE_CALENDAR_TRIGGER: "GOOGLE_CALENDAR_TRIGGER",
  GOOGLE_CALENDAR_EXECUTION: "GOOGLE_CALENDAR_EXECUTION",
  GMAIL_TRIGGER: "GMAIL_TRIGGER",
  GMAIL_EXECUTION: "GMAIL_EXECUTION",
  TELEGRAM_TRIGGER: "TELEGRAM_TRIGGER",
  TELEGRAM_EXECUTION: "TELEGRAM_EXECUTION",
  STRIPE_TRIGGER: "STRIPE_TRIGGER",
  HTTP_REQUEST: "HTTP_REQUEST",
  GEMINI: "GEMINI",
  ANTHROPIC: "ANTHROPIC",
  OPENAI: "OPENAI",
  DISCORD: "DISCORD",
  SLACK: "SLACK",
  WAIT: "WAIT",
  CREATE_CLIENT: "CREATE_CLIENT",
  UPDATE_CLIENT: "UPDATE_CLIENT",
  DELETE_CLIENT: "DELETE_CLIENT",
  CREATE_DEAL: "CREATE_DEAL",
  UPDATE_DEAL: "UPDATE_DEAL",
  DELETE_DEAL: "DELETE_DEAL",
  UPDATE_PIPELINE: "UPDATE_PIPELINE",
  CLIENT_CREATED_TRIGGER: "CLIENT_CREATED_TRIGGER",
  CLIENT_UPDATED_TRIGGER: "CLIENT_UPDATED_TRIGGER",
  CLIENT_FIELD_CHANGED_TRIGGER: "CLIENT_FIELD_CHANGED_TRIGGER",
  CLIENT_DELETED_TRIGGER: "CLIENT_DELETED_TRIGGER",
  CLIENT_TYPE_CHANGED_TRIGGER: "CLIENT_TYPE_CHANGED_TRIGGER",
  CLIENT_LIFECYCLE_STAGE_CHANGED_TRIGGER:
    "CLIENT_LIFECYCLE_STAGE_CHANGED_TRIGGER",
  IF_ELSE: "IF_ELSE",
  SWITCH: "SWITCH",
  LOOP: "LOOP",
  SET_VARIABLE: "SET_VARIABLE",
  STOP_WORKFLOW: "STOP_WORKFLOW",
  BUNDLE_WORKFLOW: "BUNDLE_WORKFLOW",
  OUTLOOK_TRIGGER: "OUTLOOK_TRIGGER",
  OUTLOOK_EXECUTION: "OUTLOOK_EXECUTION",
  ONEDRIVE_TRIGGER: "ONEDRIVE_TRIGGER",
  ONEDRIVE_EXECUTION: "ONEDRIVE_EXECUTION",
  GOOGLE_CALENDAR_EVENT_CREATED: "GOOGLE_CALENDAR_EVENT_CREATED",
  GOOGLE_CALENDAR_EVENT_UPDATED: "GOOGLE_CALENDAR_EVENT_UPDATED",
  GOOGLE_CALENDAR_EVENT_DELETED: "GOOGLE_CALENDAR_EVENT_DELETED",
  GOOGLE_DRIVE_FILE_CREATED: "GOOGLE_DRIVE_FILE_CREATED",
  GOOGLE_DRIVE_FILE_UPDATED: "GOOGLE_DRIVE_FILE_UPDATED",
  GOOGLE_DRIVE_FILE_DELETED: "GOOGLE_DRIVE_FILE_DELETED",
  GOOGLE_DRIVE_FOLDER_CREATED: "GOOGLE_DRIVE_FOLDER_CREATED",
  GOOGLE_CALENDAR_CREATE_EVENT: "GOOGLE_CALENDAR_CREATE_EVENT",
  GOOGLE_CALENDAR_UPDATE_EVENT: "GOOGLE_CALENDAR_UPDATE_EVENT",
  GOOGLE_CALENDAR_DELETE_EVENT: "GOOGLE_CALENDAR_DELETE_EVENT",
  GOOGLE_CALENDAR_FIND_AVAILABLE_TIMES: "GOOGLE_CALENDAR_FIND_AVAILABLE_TIMES",
  GMAIL_SEND_EMAIL: "GMAIL_SEND_EMAIL",
  GMAIL_REPLY_TO_EMAIL: "GMAIL_REPLY_TO_EMAIL",
  GMAIL_SEARCH_EMAILS: "GMAIL_SEARCH_EMAILS",
  GMAIL_ADD_LABEL: "GMAIL_ADD_LABEL",
  GOOGLE_DRIVE_UPLOAD_FILE: "GOOGLE_DRIVE_UPLOAD_FILE",
  GOOGLE_DRIVE_DOWNLOAD_FILE: "GOOGLE_DRIVE_DOWNLOAD_FILE",
  GOOGLE_DRIVE_MOVE_FILE: "GOOGLE_DRIVE_MOVE_FILE",
  GOOGLE_DRIVE_DELETE_FILE: "GOOGLE_DRIVE_DELETE_FILE",
  GOOGLE_DRIVE_CREATE_FOLDER: "GOOGLE_DRIVE_CREATE_FOLDER",
  GOOGLE_FORM_READ_RESPONSES: "GOOGLE_FORM_READ_RESPONSES",
  GOOGLE_FORM_CREATE_RESPONSE: "GOOGLE_FORM_CREATE_RESPONSE",
  OUTLOOK_NEW_EMAIL: "OUTLOOK_NEW_EMAIL",
  OUTLOOK_EMAIL_MOVED: "OUTLOOK_EMAIL_MOVED",
  OUTLOOK_EMAIL_DELETED: "OUTLOOK_EMAIL_DELETED",
  ONEDRIVE_FILE_CREATED: "ONEDRIVE_FILE_CREATED",
  ONEDRIVE_FILE_UPDATED: "ONEDRIVE_FILE_UPDATED",
  ONEDRIVE_FILE_DELETED: "ONEDRIVE_FILE_DELETED",
  OUTLOOK_CALENDAR_EVENT_CREATED: "OUTLOOK_CALENDAR_EVENT_CREATED",
  OUTLOOK_CALENDAR_EVENT_UPDATED: "OUTLOOK_CALENDAR_EVENT_UPDATED",
  OUTLOOK_CALENDAR_EVENT_DELETED: "OUTLOOK_CALENDAR_EVENT_DELETED",
  OUTLOOK_SEND_EMAIL: "OUTLOOK_SEND_EMAIL",
  OUTLOOK_REPLY_TO_EMAIL: "OUTLOOK_REPLY_TO_EMAIL",
  OUTLOOK_MOVE_EMAIL: "OUTLOOK_MOVE_EMAIL",
  OUTLOOK_SEARCH_EMAILS: "OUTLOOK_SEARCH_EMAILS",
  ONEDRIVE_UPLOAD_FILE: "ONEDRIVE_UPLOAD_FILE",
  ONEDRIVE_DOWNLOAD_FILE: "ONEDRIVE_DOWNLOAD_FILE",
  ONEDRIVE_MOVE_FILE: "ONEDRIVE_MOVE_FILE",
  ONEDRIVE_DELETE_FILE: "ONEDRIVE_DELETE_FILE",
  OUTLOOK_CALENDAR_CREATE_EVENT: "OUTLOOK_CALENDAR_CREATE_EVENT",
  OUTLOOK_CALENDAR_UPDATE_EVENT: "OUTLOOK_CALENDAR_UPDATE_EVENT",
  OUTLOOK_CALENDAR_DELETE_EVENT: "OUTLOOK_CALENDAR_DELETE_EVENT",
  SLACK_NEW_MESSAGE: "SLACK_NEW_MESSAGE",
  SLACK_MESSAGE_REACTION: "SLACK_MESSAGE_REACTION",
  SLACK_CHANNEL_JOINED: "SLACK_CHANNEL_JOINED",
  DISCORD_NEW_MESSAGE: "DISCORD_NEW_MESSAGE",
  DISCORD_NEW_REACTION: "DISCORD_NEW_REACTION",
  DISCORD_USER_JOINED: "DISCORD_USER_JOINED",
  TELEGRAM_NEW_MESSAGE: "TELEGRAM_NEW_MESSAGE",
  TELEGRAM_COMMAND_RECEIVED: "TELEGRAM_COMMAND_RECEIVED",
  SLACK_SEND_MESSAGE: "SLACK_SEND_MESSAGE",
  SLACK_UPDATE_MESSAGE: "SLACK_UPDATE_MESSAGE",
  SLACK_SEND_DM: "SLACK_SEND_DM",
  SLACK_UPLOAD_FILE: "SLACK_UPLOAD_FILE",
  DISCORD_SEND_MESSAGE: "DISCORD_SEND_MESSAGE",
  DISCORD_EDIT_MESSAGE: "DISCORD_EDIT_MESSAGE",
  DISCORD_SEND_EMBED: "DISCORD_SEND_EMBED",
  DISCORD_SEND_DM: "DISCORD_SEND_DM",
  TELEGRAM_SEND_MESSAGE: "TELEGRAM_SEND_MESSAGE",
  TELEGRAM_SEND_PHOTO: "TELEGRAM_SEND_PHOTO",
  TELEGRAM_SEND_DOCUMENT: "TELEGRAM_SEND_DOCUMENT",
  FIND_CLIENTS: "FIND_CLIENTS",
  ADD_TAG_TO_CLIENT: "ADD_TAG_TO_CLIENT",
  REMOVE_TAG_FROM_CLIENT: "REMOVE_TAG_FROM_CLIENT",
  DEAL_CREATED_TRIGGER: "DEAL_CREATED_TRIGGER",
  DEAL_UPDATED_TRIGGER: "DEAL_UPDATED_TRIGGER",
  DEAL_DELETED_TRIGGER: "DEAL_DELETED_TRIGGER",
  DEAL_STAGE_CHANGED_TRIGGER: "DEAL_STAGE_CHANGED_TRIGGER",
  MOVE_DEAL_STAGE: "MOVE_DEAL_STAGE",
  ADD_DEAL_NOTE: "ADD_DEAL_NOTE",
  APPOINTMENT_CREATED_TRIGGER: "APPOINTMENT_CREATED_TRIGGER",
  APPOINTMENT_CANCELLED_TRIGGER: "APPOINTMENT_CANCELLED_TRIGGER",
  SCHEDULE_APPOINTMENT: "SCHEDULE_APPOINTMENT",
  UPDATE_APPOINTMENT: "UPDATE_APPOINTMENT",
  CANCEL_APPOINTMENT: "CANCEL_APPOINTMENT",
  STRIPE_PAYMENT_SUCCEEDED: "STRIPE_PAYMENT_SUCCEEDED",
  STRIPE_PAYMENT_FAILED: "STRIPE_PAYMENT_FAILED",
  STRIPE_SUBSCRIPTION_CREATED: "STRIPE_SUBSCRIPTION_CREATED",
  STRIPE_SUBSCRIPTION_UPDATED: "STRIPE_SUBSCRIPTION_UPDATED",
  STRIPE_SUBSCRIPTION_CANCELLED: "STRIPE_SUBSCRIPTION_CANCELLED",
  STRIPE_CREATE_CHECKOUT_SESSION: "STRIPE_CREATE_CHECKOUT_SESSION",
  STRIPE_CREATE_INVOICE: "STRIPE_CREATE_INVOICE",
  STRIPE_SEND_INVOICE: "STRIPE_SEND_INVOICE",
  STRIPE_REFUND_PAYMENT: "STRIPE_REFUND_PAYMENT",
  GEMINI_GENERATE_TEXT: "GEMINI_GENERATE_TEXT",
  GEMINI_SUMMARISE: "GEMINI_SUMMARISE",
  GEMINI_TRANSFORM: "GEMINI_TRANSFORM",
  GEMINI_CLASSIFY: "GEMINI_CLASSIFY",
  EXECUTE_WORKFLOW: "EXECUTE_WORKFLOW",
  BIRTHDAY_TRIGGER: "BIRTHDAY_TRIGGER",
  CLASS_BOOKED_TRIGGER: "CLASS_BOOKED_TRIGGER",
  CLASS_CANCELLED_TRIGGER: "CLASS_CANCELLED_TRIGGER",
  MEMBER_CHECKED_IN_TRIGGER: "MEMBER_CHECKED_IN_TRIGGER",
  MEMBER_NO_SHOW_TRIGGER: "MEMBER_NO_SHOW_TRIGGER",
  MEMBERSHIP_CREATED_TRIGGER: "MEMBERSHIP_CREATED_TRIGGER",
  MEMBERSHIP_EXPIRING_TRIGGER: "MEMBERSHIP_EXPIRING_TRIGGER",
  MEMBERSHIP_CANCELLED_TRIGGER: "MEMBERSHIP_CANCELLED_TRIGGER",
  WAITLIST_SPOT_OPENED_TRIGGER: "WAITLIST_SPOT_OPENED_TRIGGER",
  INTRO_OFFER_REDEEMED_TRIGGER: "INTRO_OFFER_REDEEMED_TRIGGER",
  SEND_CLASS_REMINDER: "SEND_CLASS_REMINDER",
  AWARD_LOYALTY_POINTS: "AWARD_LOYALTY_POINTS",
  CALCULATE_CHURN_SCORE: "CALCULATE_CHURN_SCORE",
  SEND_SMS: "SEND_SMS",
  INTRO_OFFER_COMPLETED_TRIGGER: "INTRO_OFFER_COMPLETED_TRIGGER",
  MEMBER_CLASS_COUNT_TRIGGER: "MEMBER_CLASS_COUNT_TRIGGER",
  CLIENT_TAG_ADDED_TRIGGER: "CLIENT_TAG_ADDED_TRIGGER",
  CLIENT_TAG_REMOVED_TRIGGER: "CLIENT_TAG_REMOVED_TRIGGER",
  STUDIO_PAYMENT_SUCCEEDED_TRIGGER: "STUDIO_PAYMENT_SUCCEEDED_TRIGGER",
  STUDIO_PAYMENT_FAILED_TRIGGER: "STUDIO_PAYMENT_FAILED_TRIGGER",
  REFERRAL_CONVERTED_TRIGGER: "REFERRAL_CONVERTED_TRIGGER",
  FORM_SUBMITTED_TRIGGER: "FORM_SUBMITTED_TRIGGER",
  PRICING_OPTION_PURCHASED_TRIGGER: "PRICING_OPTION_PURCHASED_TRIGGER",
  CLIENT_INACTIVITY_TRIGGER: "CLIENT_INACTIVITY_TRIGGER",
  SEND_EMAIL: "SEND_EMAIL",
  CREATE_TASK: "CREATE_TASK",
  STUDIO_CLASS_ACTION: "STUDIO_CLASS_ACTION",
} as const;
export type NodeType = (typeof NodeType)[keyof typeof NodeType];

export const OrganizationMemberRole = {
  owner: "owner",
  admin: "admin",
  manager: "manager",
  staff: "staff",
  viewer: "viewer",
} as const;
export type OrganizationMemberRole =
  (typeof OrganizationMemberRole)[keyof typeof OrganizationMemberRole];

export const PaymentMethod = {
  STRIPE: "STRIPE",
  MANUAL: "MANUAL",
  XERO: "XERO",
  BANK_TRANSFER: "BANK_TRANSFER",
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PayoutStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  PAID: "PAID",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;
export type PayoutStatus = (typeof PayoutStatus)[keyof typeof PayoutStatus];

export const PayrollRunStatus = {
  DRAFT: "DRAFT",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;
export type PayrollRunStatus =
  (typeof PayrollRunStatus)[keyof typeof PayrollRunStatus];

export const PerformanceMetricSource = {
  MANUAL: "MANUAL",
  WEARABLE: "WEARABLE",
  IMPORT: "IMPORT",
} as const;
export type PerformanceMetricSource =
  (typeof PerformanceMetricSource)[keyof typeof PerformanceMetricSource];

export const PricingAdjustmentType = {
  PERCENT: "PERCENT",
  FIXED_AMOUNT: "FIXED_AMOUNT",
} as const;
export type PricingAdjustmentType =
  (typeof PricingAdjustmentType)[keyof typeof PricingAdjustmentType];

export const RecurringFrequency = {
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
  BIWEEKLY: "BIWEEKLY",
  MONTHLY: "MONTHLY",
  QUARTERLY: "QUARTERLY",
  SEMIANNUALLY: "SEMIANNUALLY",
  ANNUALLY: "ANNUALLY",
} as const;
export type RecurringFrequency =
  (typeof RecurringFrequency)[keyof typeof RecurringFrequency];

export const RecurringInvoiceStatus = {
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type RecurringInvoiceStatus =
  (typeof RecurringInvoiceStatus)[keyof typeof RecurringInvoiceStatus];

export const ReferralRewardType = {
  CREDIT: "CREDIT",
  DISCOUNT: "DISCOUNT",
  FREE_CLASS: "FREE_CLASS",
  CASH: "CASH",
} as const;
export type ReferralRewardType =
  (typeof ReferralRewardType)[keyof typeof ReferralRewardType];

export const ReferralStatus = {
  PENDING: "PENDING",
  SIGNED_UP: "SIGNED_UP",
  CONVERTED: "CONVERTED",
  REWARDED: "REWARDED",
  EXPIRED: "EXPIRED",
} as const;
export type ReferralStatus =
  (typeof ReferralStatus)[keyof typeof ReferralStatus];

export const RetentionAutomationType = {
  WELCOME_SEQUENCE: "WELCOME_SEQUENCE",
  CLASS_REMINDER: "CLASS_REMINDER",
  NO_SHOW_FOLLOW_UP: "NO_SHOW_FOLLOW_UP",
  MEMBERSHIP_EXPIRING: "MEMBERSHIP_EXPIRING",
  WIN_BACK: "WIN_BACK",
  MILESTONE_CELEBRATION: "MILESTONE_CELEBRATION",
  ATTENDANCE_DROP: "ATTENDANCE_DROP",
  BIRTHDAY: "BIRTHDAY",
  REFERRAL_REQUEST: "REFERRAL_REQUEST",
  INTRO_OFFER_EXPIRING: "INTRO_OFFER_EXPIRING",
} as const;
export type RetentionAutomationType =
  (typeof RetentionAutomationType)[keyof typeof RetentionAutomationType];

export const RotaStatus = {
  SCHEDULED: "SCHEDULED",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED",
  NO_SHOW: "NO_SHOW",
} as const;
export type RotaStatus = (typeof RotaStatus)[keyof typeof RotaStatus];

export const ShiftSwapStatus = {
  PENDING: "PENDING",
  INSTRUCTOR_ACCEPTED: "INSTRUCTOR_ACCEPTED",
  INSTRUCTOR_REJECTED: "INSTRUCTOR_REJECTED",
  ADMIN_APPROVED: "ADMIN_APPROVED",
  ADMIN_REJECTED: "ADMIN_REJECTED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
} as const;
export type ShiftSwapStatus =
  (typeof ShiftSwapStatus)[keyof typeof ShiftSwapStatus];

export const SmsProvider = {
  TWILIO: "TWILIO",
  VONAGE: "VONAGE",
  MESSAGEBIRD: "MESSAGEBIRD",
} as const;
export type SmsProvider = (typeof SmsProvider)[keyof typeof SmsProvider];

export const SmsStatus = {
  QUEUED: "QUEUED",
  SENDING: "SENDING",
  SENT: "SENT",
  DELIVERED: "DELIVERED",
  FAILED: "FAILED",
  UNDELIVERED: "UNDELIVERED",
} as const;
export type SmsStatus = (typeof SmsStatus)[keyof typeof SmsStatus];

export const SpotType = {
  STANDARD: "STANDARD",
  PREMIUM: "PREMIUM",
  INSTRUCTOR: "INSTRUCTOR",
  BLOCKED: "BLOCKED",
  EQUIPMENT: "EQUIPMENT",
} as const;
export type SpotType = (typeof SpotType)[keyof typeof SpotType];

export const StudioBookingStatus = {
  BOOKED: "BOOKED",
  ATTENDED: "ATTENDED",
  CANCELLED: "CANCELLED",
  NO_SHOW: "NO_SHOW",
  LATE_CANCEL: "LATE_CANCEL",
} as const;
export type StudioBookingStatus =
  (typeof StudioBookingStatus)[keyof typeof StudioBookingStatus];

export const StudioCheckInMethod = {
  QR_CODE: "QR_CODE",
  NFC: "NFC",
  KIOSK: "KIOSK",
  GEO: "GEO",
  MANUAL: "MANUAL",
  PIN: "PIN",
  IMPORT: "IMPORT",
} as const;
export type StudioCheckInMethod =
  (typeof StudioCheckInMethod)[keyof typeof StudioCheckInMethod];

export const StudioMembershipStatus = {
  ACTIVE: "ACTIVE",
  PAST_DUE: "PAST_DUE",
  INACTIVE: "INACTIVE",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
  PAUSED: "PAUSED",
} as const;
export type StudioMembershipStatus =
  (typeof StudioMembershipStatus)[keyof typeof StudioMembershipStatus];

export const StudioPaymentStatus = {
  PENDING: "PENDING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
  CANCELLED: "CANCELLED",
} as const;
export type StudioPaymentStatus =
  (typeof StudioPaymentStatus)[keyof typeof StudioPaymentStatus];

export const StudioPaymentType = {
  MEMBERSHIP: "MEMBERSHIP",
  CLASS_PACK: "CLASS_PACK",
  DROP_IN: "DROP_IN",
  GIFT_CARD: "GIFT_CARD",
  POS: "POS",
} as const;
export type StudioPaymentType =
  (typeof StudioPaymentType)[keyof typeof StudioPaymentType];

export const StudioProductType = {
  MEMBERSHIP_PLAN: "MEMBERSHIP_PLAN",
  CLASS_PACK: "CLASS_PACK",
  RETAIL: "RETAIL",
  FEE: "FEE",
  ACCOUNT_CREDIT: "ACCOUNT_CREDIT",
  SHIPPING: "SHIPPING",
  TIP: "TIP",
  EXTERNAL_REVENUE: "EXTERNAL_REVENUE",
  GIFT_CARD: "GIFT_CARD",
  OTHER: "OTHER",
} as const;
export type StudioProductType =
  (typeof StudioProductType)[keyof typeof StudioProductType];

export const ClientDocumentType = {
  WAIVER: "WAIVER",
  CONTRACT_SIGNATURE: "CONTRACT_SIGNATURE",
  PROFILE_FILE: "PROFILE_FILE",
  SALE_IMAGE: "SALE_IMAGE",
  OTHER: "OTHER",
} as const;
export type ClientDocumentType =
  (typeof ClientDocumentType)[keyof typeof ClientDocumentType];

export const StudioType = {
  YOGA: "YOGA",
  PILATES: "PILATES",
  GYM: "GYM",
  CROSSFIT: "CROSSFIT",
  BARRE: "BARRE",
  DANCE: "DANCE",
  MARTIAL_ARTS: "MARTIAL_ARTS",
  SPIN: "SPIN",
  SWIM: "SWIM",
  MULTI_DISCIPLINE: "MULTI_DISCIPLINE",
  OTHER: "OTHER",
} as const;
export type StudioType = (typeof StudioType)[keyof typeof StudioType];

export const LocationMemberRole = {
  AGENCY: "AGENCY",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  STANDARD: "STANDARD",
  LIMITED: "LIMITED",
  VIEWER: "VIEWER",
} as const;
export type LocationMemberRole =
  (typeof LocationMemberRole)[keyof typeof LocationMemberRole];

export const SubscriptionStatus = {
  ACTIVE: "ACTIVE",
  FROZEN: "FROZEN",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
  PAST_DUE: "PAST_DUE",
  TRIALING: "TRIALING",
} as const;
export type SubscriptionStatus =
  (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const TaskPriority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const;
export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

export const TaskStatus = {
  TODO: "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  DONE: "DONE",
  CANCELLED: "CANCELLED",
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TimeLogStatus = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  INVOICED: "INVOICED",
} as const;
export type TimeLogStatus = (typeof TimeLogStatus)[keyof typeof TimeLogStatus];

export const TimeOffType = {
  VACATION: "VACATION",
  SICK: "SICK",
  PERSONAL: "PERSONAL",
  BEREAVEMENT: "BEREAVEMENT",
  PARENTAL: "PARENTAL",
  UNPAID: "UNPAID",
  COMPENSATORY: "COMPENSATORY",
  PUBLIC_HOLIDAY: "PUBLIC_HOLIDAY",
  OTHER: "OTHER",
} as const;
export type TimeOffType = (typeof TimeOffType)[keyof typeof TimeOffType];

export const UserStatus = {
  ONLINE: "ONLINE",
  WORKING: "WORKING",
  DO_NOT_DISTURB: "DO_NOT_DISTURB",
  AWAY: "AWAY",
  OFFLINE: "OFFLINE",
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const WaitlistStatus = {
  WAITING: "WAITING",
  NOTIFIED: "NOTIFIED",
  CONFIRMED: "CONFIRMED",
  EXPIRED: "EXPIRED",
  CANCELLED_WAITLIST: "CANCELLED_WAITLIST",
} as const;
export type WaitlistStatus =
  (typeof WaitlistStatus)[keyof typeof WaitlistStatus];

export const WebhookProvider = {
  SLACK: "SLACK",
  DISCORD: "DISCORD",
  STRIPE: "STRIPE",
  CUSTOM: "CUSTOM",
} as const;
export type WebhookProvider =
  (typeof WebhookProvider)[keyof typeof WebhookProvider];

export const WidgetType = {
  SCHEDULE: "SCHEDULE",
  BOOKING: "BOOKING",
  MEMBERSHIP: "MEMBERSHIP",
  INSTRUCTORS: "INSTRUCTORS",
  INTRO_OFFER: "INTRO_OFFER",
  EVENT: "EVENT",
  ON_DEMAND: "ON_DEMAND",
  REFERRAL: "REFERRAL",
} as const;
export type WidgetType = (typeof WidgetType)[keyof typeof WidgetType];

export const InstructorDocumentStatus = {
  PENDING_UPLOAD: "PENDING_UPLOAD",
  PENDING_REVIEW: "PENDING_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
} as const;
export type InstructorDocumentStatus =
  (typeof InstructorDocumentStatus)[keyof typeof InstructorDocumentStatus];

export const InstructorDocumentType = {
  PASSPORT: "PASSPORT",
  DRIVING_LICENCE: "DRIVING_LICENCE",
  NATIONAL_ID: "NATIONAL_ID",
  VISA: "VISA",
  RIGHT_TO_WORK: "RIGHT_TO_WORK",
  BIRTH_CERTIFICATE: "BIRTH_CERTIFICATE",
  DBS_CERTIFICATE: "DBS_CERTIFICATE",
  DBS_UPDATE_SERVICE: "DBS_UPDATE_SERVICE",
  PROOF_OF_ADDRESS: "PROOF_OF_ADDRESS",
  PROOF_OF_NI: "PROOF_OF_NI",
  QUALIFICATION: "QUALIFICATION",
  CERTIFICATION: "CERTIFICATION",
  TRAINING_CERTIFICATE: "TRAINING_CERTIFICATE",
  FIRST_AID_CERTIFICATE: "FIRST_AID_CERTIFICATE",
  FOOD_HYGIENE: "FOOD_HYGIENE",
  MANUAL_HANDLING: "MANUAL_HANDLING",
  SAFEGUARDING: "SAFEGUARDING",
  CONTRACT: "CONTRACT",
  SIGNED_POLICY: "SIGNED_POLICY",
  REFERENCE: "REFERENCE",
  HEALTH_DECLARATION: "HEALTH_DECLARATION",
  FIT_NOTE: "FIT_NOTE",
  VACCINATION_RECORD: "VACCINATION_RECORD",
  OCCUPATIONAL_HEALTH: "OCCUPATIONAL_HEALTH",
  PHOTO: "PHOTO",
  OTHER: "OTHER",
} as const;
export type InstructorDocumentType =
  (typeof InstructorDocumentType)[keyof typeof InstructorDocumentType];

export const InstructorPaymentMethod = {
  BANK_TRANSFER: "BANK_TRANSFER",
  CASH: "CASH",
  CHEQUE: "CHEQUE",
  PAYPAL: "PAYPAL",
  STRIPE: "STRIPE",
  OTHER: "OTHER",
} as const;
export type InstructorPaymentMethod =
  (typeof InstructorPaymentMethod)[keyof typeof InstructorPaymentMethod];

export const InstructorPaymentStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
} as const;
export type InstructorPaymentStatus =
  (typeof InstructorPaymentStatus)[keyof typeof InstructorPaymentStatus];
