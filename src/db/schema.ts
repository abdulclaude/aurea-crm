import {
  pgTable,
  unique,
  uniqueIndex,
  text,
  timestamp,
  jsonb,
  boolean,
  varchar,
  integer,
  bigint,
  index,
  foreignKey,
  doublePrecision,
  numeric,
  date,
  pgEnum,
  check,
} from "drizzle-orm/pg-core";

import { sql } from "drizzle-orm";

export const aiLogStatus = pgEnum("AILogStatus", [
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
]);

export const accessControlProvider = pgEnum("AccessControlProvider", [
  "KISI",
  "BRIVO",
  "SALTO",
  "HID",
  "GANTNER",
  "OTHER",
]);

export const acquisitionStage = pgEnum("AcquisitionStage", [
  "INQUIRY",
  "TRIAL",
  "ACTIVE",
  "LOST",
]);

export const adConversionDeliveryStatus = pgEnum("AdConversionDeliveryStatus", [
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
]);

export const activityAction = pgEnum("ActivityAction", [
  "CREATED",
  "UPDATED",
  "DELETED",
  "ASSIGNED",
  "UNASSIGNED",
  "STAGE_CHANGED",
  "STATUS_CHANGED",
  "COMPLETED",
  "ARCHIVED",
  "RESTORED",
]);

export const activityType = pgEnum("ActivityType", [
  "CLIENT",
  "DEAL",
  "WORKFLOW",
  "EXECUTION",
  "PIPELINE",
  "TASK",
  "EMAIL",
  "CALL",
  "MEETING",
  "NOTE",
  "INSTRUCTOR",
  "TIME_LOG",
  "INVOICE",
  "CREDENTIAL",
  "WEBHOOK",
  "INTEGRATION",
  "LOCATION",
  "ORGANIZATION",
  "BOOKING",
  "FUNNEL",
  "CAMPAIGN",
]);

export const appProvider = pgEnum("AppProvider", [
  "GOOGLE_CALENDAR",
  "GMAIL",
  "GOOGLE",
  "TELEGRAM",
  "MICROSOFT",
  "OUTLOOK",
  "ONEDRIVE",
  "MINDBODY",
  "SLACK",
  "DISCORD",
  "GOOGLE_DRIVE",
  "GOOGLE_FORMS",
]);

export const approvalStatus = pgEnum("ApprovalStatus", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
]);

export const automationEventType = pgEnum("AutomationEventType", [
  "WORKFLOW_COMPLETED",
  "MEMBERSHIP_SIGNUP",
  "INTRO_OFFER_REDEEMED",
  "INTRO_OFFER_COMPLETED",
  "CLASS_MILESTONE",
  "LEAD_CONVERTED",
  "BIRTHDAY",
  "NO_SHOW",
  "WAITLIST_SPOT_OPENED",
  "MEMBERSHIP_EXPIRING",
  "MEMBERSHIP_CANCELLED",
  "CLASS_BOOKED",
  "CLASS_CANCELLED",
  "TAG_CHANGED",
  "PAYMENT_SUCCEEDED",
  "PAYMENT_FAILED",
  "REFERRAL_CONVERTED",
]);

export const bankTransferStatus = pgEnum("BankTransferStatus", [
  "PENDING",
  "PROOF_UPLOADED",
  "VERIFIED",
  "REJECTED",
]);

export const billingInterval = pgEnum("BillingInterval", [
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "ANNUALLY",
  "ONE_TIME",
]);

export const billingModel = pgEnum("BillingModel", [
  "HOURLY",
  "PER_SHIFT",
  "WEEKLY_ROLLUP",
  "MONTHLY_ROLLUP",
  "RETAINER",
  "PROJECT_MILESTONE",
  "SUBSCRIPTION",
  "CUSTOM",
]);

export const bookingLocationType = pgEnum("BookingLocationType", [
  "CAL_VIDEO",
  "PHONE",
  "IN_PERSON",
  "GOOGLE_MEET",
  "ZOOM",
  "MS_TEAMS",
  "CUSTOM",
]);

export const bookingStatus = pgEnum("BookingStatus", [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "RESCHEDULED",
  "NO_SHOW",
  "COMPLETED",
]);

export const bookingPaymentStatus = pgEnum("BookingPaymentStatus", [
  "NOT_REQUIRED",
  "REQUIRES_PAYMENT",
  "PROCESSING",
  "PAID",
  "FAILED",
  "EXPIRED",
  "REFUNDED",
]);

export const bookingEntitlementAllocationStatus = pgEnum(
  "BookingEntitlementAllocationStatus",
  ["ACTIVE", "RESTORED", "VOIDED"],
);

export const bookingEntitlementSource = pgEnum("BookingEntitlementSource", [
  "MEMBERSHIP_CREDIT",
  "MEMBERSHIP_ALLOWANCE",
  "FREE",
  "UNPAID_ALLOWED",
]);

export const calComWebhookReceiptStatus = pgEnum("CalComWebhookReceiptStatus", [
  "PROCESSED",
  "IGNORED",
]);

export const campaignRecipientStatus = pgEnum("CampaignRecipientStatus", [
  "PENDING",
  "SENT",
  "DELIVERED",
  "OPENED",
  "CLICKED",
  "BOUNCED",
  "COMPLAINED",
  "UNSUBSCRIBED",
  "FAILED",
]);

export const campaignSegmentType = pgEnum("CampaignSegmentType", [
  "ALL",
  "BY_TYPE",
  "BY_TAGS",
  "BY_LIFECYCLE",
  "BY_COUNTRY",
  "CUSTOM",
]);

export const campaignStatus = pgEnum("CampaignStatus", [
  "DRAFT",
  "SCHEDULED",
  "QUEUED",
  "SENDING",
  "SENT",
  "PAUSED",
  "FAILED",
  "CANCELLED",
]);

export const campaignRunStatus = pgEnum("CampaignRunStatus", [
  "PREPARING",
  "QUEUED",
  "SENDING",
  "COMPLETED",
  "PARTIAL",
  "FAILED",
  "CANCELLED",
]);

export const cancellationChargeType = pgEnum("CancellationChargeType", [
  "LATE_CANCEL",
  "NO_SHOW",
]);

export const cancellationChargeStatus = pgEnum("CancellationChargeStatus", [
  "PENDING",
  "REQUIRES_PAYMENT_METHOD",
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
  "NO_PAYMENT_DUE",
  "WAIVED",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
  "DISPUTED",
]);

export const checkInMethod = pgEnum("CheckInMethod", [
  "MANUAL",
  "QR_CODE",
  "GPS",
  "BIOMETRIC",
  "NFC",
]);

export const churnRiskLevel = pgEnum("ChurnRiskLevel", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

export const classDifficulty = pgEnum("ClassDifficulty", [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "ALL_LEVELS",
]);

export const classInstanceStatus = pgEnum("ClassInstanceStatus", [
  "SCHEDULED",
  "CANCELLED",
  "COMPLETED",
  "IN_PROGRESS",
]);

export const classPricingModel = pgEnum("ClassPricingModel", [
  "FREE",
  "DROP_IN",
  "PACKAGE_ONLY",
  "SLIDING_SCALE",
]);

export const clientType = pgEnum("ClientType", [
  "LEAD",
  "PROSPECT",
  "CUSTOMER",
  "CHURN",
  "CLOSED",
]);

export const contentAccessLevel = pgEnum("ContentAccessLevel", [
  "PUBLIC",
  "MEMBERS_ONLY",
  "PAID",
]);

export const conversationChannel = pgEnum("ConversationChannel", [
  "SMS",
  "EMAIL",
  "APP",
]);

export const conversationStatus = pgEnum("ConversationStatus", [
  "OPEN",
  "DONE",
  "SNOOZED",
]);

export const inboundMessageReceiptStatus = pgEnum(
  "InboundMessageReceiptStatus",
  ["PENDING", "PROCESSING", "PROCESSED", "IGNORED", "FAILED", "DEAD_LETTER"],
);

export const communicationSuppressionReason = pgEnum(
  "CommunicationSuppressionReason",
  [
    "UNSUBSCRIBE",
    "COMPLAINT",
    "HARD_BOUNCE",
    "SMS_STOP",
    "INVALID_DESTINATION",
    "MANUAL",
  ],
);

export const communicationSuppressionScope = pgEnum(
  "CommunicationSuppressionScope",
  ["MARKETING", "ALL"],
);

export const communicationChannelState = pgEnum("CommunicationChannelState", [
  "NOT_REQUESTED",
  "AWAITING_CUSTOMER_INFORMATION",
  "AWAITING_COMPLIANCE",
  "AWAITING_DNS",
  "PROVISIONING",
  "ACTIVE",
  "DEGRADED",
  "SUSPENDED",
  "FAILED",
  "CANCELLATION_GRACE_PERIOD",
  "RELEASE_SCHEDULED",
  "RELEASED",
]);

export const communicationProvisioningOperationType = pgEnum(
  "CommunicationProvisioningOperationType",
  [
    "CREATE",
    "VERIFY",
    "REFRESH",
    "CONFIGURE",
    "PURCHASE",
    "SUSPEND",
    "RELEASE",
    "RECONCILE",
  ],
);

export const communicationProvisioningService = pgEnum(
  "CommunicationProvisioningService",
  [
    "RESEND_DOMAIN",
    "TWILIO_SUBACCOUNT",
    "TWILIO_PHONE_NUMBER",
    "TWILIO_PHONE_WEBHOOKS",
    "TWILIO_PHONE_RELEASE",
    "TWILIO_COMPLIANCE",
  ],
);

export const communicationProvisioningStatus = pgEnum(
  "CommunicationProvisioningStatus",
  [
    "PENDING",
    "PROCESSING",
    "SUCCEEDED",
    "RETRYABLE_FAILURE",
    "FAILED",
    "AMBIGUOUS",
    "CANCELLED",
  ],
);

export const communicationUsageEntryKind = pgEnum(
  "CommunicationUsageEntryKind",
  ["RESERVATION", "USAGE", "RELEASE", "ADJUSTMENT"],
);

export const communicationUsageResourceType = pgEnum(
  "CommunicationUsageResourceType",
  ["EMAIL", "SMS_SEGMENT", "VOICE_SECOND", "PHONE_NUMBER"],
);

export const providerOwnershipMode = pgEnum("ProviderOwnershipMode", [
  "PLATFORM_MANAGED",
  "TENANT_MANAGED_LEGACY",
]);

export const twilioPhoneNumberStatus = pgEnum("TwilioPhoneNumberStatus", [
  "PENDING",
  "PROVISIONING",
  "ACTIVE",
  "DEGRADED",
  "SUSPENDED",
  "RELEASE_SCHEDULED",
  "RELEASING",
  "RELEASED",
  "FAILED",
]);

export const voiceCallDirection = pgEnum("VoiceCallDirection", [
  "INBOUND",
  "OUTBOUND",
]);

export const voiceCallStatus = pgEnum("VoiceCallStatus", [
  "QUEUED",
  "RINGING",
  "IN_PROGRESS",
  "COMPLETED",
  "BUSY",
  "NO_ANSWER",
  "CANCELED",
  "FAILED",
]);

export const credentialType = pgEnum("CredentialType", [
  "ANTHROPIC",
  "GEMINI",
  "OPENAI",
  "TELEGRAM_BOT",
  "MINDBODY",
  "RESEND",
  "CAL_COM",
]);

export const devicePlatform = pgEnum("DevicePlatform", [
  "IOS",
  "ANDROID",
  "WEB",
]);

export const deviceType = pgEnum("DeviceType", ["DESKTOP", "TABLET", "MOBILE"]);

export const discountType = pgEnum("DiscountType", ["PERCENT", "FIXED"]);

export const deliveryAttemptOutcome = pgEnum("DeliveryAttemptOutcome", [
  "ACCEPTED",
  "RETRYABLE_FAILURE",
  "TERMINAL_FAILURE",
  "AMBIGUOUS",
]);

export const deliveryChannel = pgEnum("DeliveryChannel", [
  "EMAIL",
  "SMS",
  "VOICE",
  "APP",
]);

export const deliveryFailureClass = pgEnum("DeliveryFailureClass", [
  "RETRYABLE",
  "TERMINAL",
  "AMBIGUOUS",
]);

export const deliveryProvider = pgEnum("DeliveryProvider", [
  "RESEND",
  "GMAIL",
  "OUTLOOK",
  "TWILIO",
  "VONAGE",
  "MESSAGEBIRD",
  "INTERNAL",
]);

export const deliveryPurpose = pgEnum("DeliveryPurpose", [
  "MARKETING",
  "TRANSACTIONAL",
  "ONE_TO_ONE",
  "SYSTEM",
]);

export const emailDomainStatus = pgEnum("EmailDomainStatus", [
  "PENDING",
  "VERIFYING",
  "VERIFIED",
  "FAILED",
]);

export const emailTemplateType = pgEnum("EmailTemplateType", [
  "MARKETING",
  "ANNOUNCEMENT",
  "PLAIN",
  "CUSTOM",
]);

export const executionStatus = pgEnum("ExecutionStatus", [
  "RUNNING",
  "SUCCESS",
  "FAILED",
]);

export const externalChannelProvider = pgEnum("ExternalChannelProvider", [
  "RESERVE_WITH_GOOGLE",
  "CLASSPASS",
  "GYMPASS",
  "WELLHUB",
]);

export const externalChannelStatus = pgEnum("ExternalChannelStatus", [
  "DRAFT",
  "PENDING_REVIEW",
  "ACTIVE",
  "PAUSED",
  "ERROR",
]);

export const formFieldType = pgEnum("FormFieldType", [
  "SHORT_TEXT",
  "LONG_TEXT",
  "EMAIL",
  "PHONE",
  "NUMBER",
  "URL",
  "DATE",
  "TIME",
  "DATETIME",
  "SELECT",
  "RADIO",
  "CHECKBOX",
  "MULTI_SELECT",
  "FILE_UPLOAD",
  "RATING",
  "SLIDER",
  "SIGNATURE",
  "PAYMENT",
]);

export const formStatus = pgEnum("FormStatus", [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
]);

export const funnelBlockType = pgEnum("FunnelBlockType", [
  "CONTAINER",
  "ONE_COLUMN",
  "TWO_COLUMN",
  "THREE_COLUMN",
  "SECTION",
  "HEADING",
  "PARAGRAPH",
  "LABEL",
  "RICH_TEXT",
  "IMAGE",
  "VIDEO",
  "ICON",
  "INPUT",
  "TEXTAREA",
  "SELECT",
  "CHECKBOX",
  "BUTTON",
  "FORM",
  "CARD",
  "FAQ",
  "TESTIMONIAL",
  "PRICING",
  "FEATURE_GRID",
  "IFRAME",
  "CUSTOM_HTML",
  "SCRIPT",
  "POPUP",
  "COUNTDOWN_TIMER",
  "STICKY_BAR",
]);

export const funnelDomainType = pgEnum("FunnelDomainType", [
  "SUBDOMAIN",
  "CUSTOM",
]);

export const funnelStatus = pgEnum("FunnelStatus", [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
]);

export const funnelType = pgEnum("FunnelType", ["INTERNAL", "EXTERNAL"]);

export const householdRole = pgEnum("HouseholdRole", [
  "PRIMARY",
  "PARTNER",
  "CHILD",
  "DEPENDENT",
  "MEMBER",
]);

export const importSource = pgEnum("ImportSource", [
  "CSV",
  "MINDBODY",
  "GLOFOX",
  "MOMOYOGA",
  "ZEN_PLANNER",
]);

export const importStatus = pgEnum("ImportStatus", [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "ROLLED_BACK",
]);

export const installmentInterval = pgEnum("InstallmentInterval", [
  "WEEKLY",
  "BIWEEKLY",
  "MONTHLY",
]);

export const installmentProvider = pgEnum("InstallmentProvider", [
  "INTERNAL",
  "STRIPE",
  "AFFIRM",
  "KLARNA",
  "CLEARPAY",
  "PAYPAL",
]);

export const instructorSubstitutionStatus = pgEnum(
  "InstructorSubstitutionStatus",
  ["OPEN", "OFFERED", "ACCEPTED", "DECLINED", "CANCELLED", "EXPIRED"],
);

export const introOfferRedemptionStatus = pgEnum("IntroOfferRedemptionStatus", [
  "ACTIVE",
  "EXPIRED",
  "CONVERTED",
  "CANCELLED",
]);

export const introOfferType = pgEnum("IntroOfferType", [
  "TRIAL_CLASSES",
  "UNLIMITED_TRIAL",
  "DISCOUNTED_PACK",
  "FREE_CLASS",
  "FIRST_MONTH_DISCOUNT",
]);

export const invoiceStatus = pgEnum("InvoiceStatus", [
  "DRAFT",
  "SENT",
  "VIEWED",
  "PAID",
  "PARTIALLY_PAID",
  "OVERDUE",
  "CANCELLED",
]);

export const invoiceAccessPurpose = pgEnum("InvoiceAccessPurpose", [
  "PAY",
  "VIEW",
]);

export const invoiceType = pgEnum("InvoiceType", ["SENT", "RECEIVED"]);

export const lifecycleStage = pgEnum("LifecycleStage", [
  "SUBSCRIBER",
  "LEAD",
  "MQL",
  "SQL",
  "OPPORTUNITY",
  "CUSTOMER",
  "EVANGELIST",
]);

export const loyaltyRewardType = pgEnum("LoyaltyRewardType", [
  "FREE_CLASS",
  "DISCOUNT_PERCENT",
  "DISCOUNT_FIXED",
  "MERCHANDISE",
  "EXPERIENCE",
]);

export const loyaltyTier = pgEnum("LoyaltyTier", [
  "BRONZE",
  "SILVER",
  "GOLD",
  "PLATINUM",
]);

export const loyaltyTransactionType = pgEnum("LoyaltyTransactionType", [
  "EARN_CLASS",
  "EARN_PURCHASE",
  "EARN_REFERRAL",
  "EARN_CHALLENGE",
  "EARN_BONUS",
  "REDEEM",
  "EXPIRE",
  "ADJUST",
]);

export const marketplaceListingStatus = pgEnum("MarketplaceListingStatus", [
  "DRAFT",
  "PENDING_REVIEW",
  "PUBLISHED",
  "PAUSED",
  "REJECTED",
]);

export const membershipPlanType = pgEnum("MembershipPlanType", [
  "UNLIMITED",
  "CLASS_PACK",
  "DROP_IN",
  "TIME_BASED",
  "TIERED",
  "INTRO_OFFER",
  "TRIAL",
]);

export const messageDirection = pgEnum("MessageDirection", [
  "INBOUND",
  "OUTBOUND",
]);

export const moduleType = pgEnum("ModuleType", [
  "TIME_TRACKING",
  "INVOICING",
  "INVENTORY",
  "BOOKING_CALENDAR",
  "DOCUMENT_SIGNING",
  "PROJECT_MANAGEMENT",
  "PILATES_STUDIO",
  "STUDIO_CORE",
]);

export const nodeType = pgEnum("NodeType", [
  "INITIAL",
  "MANUAL_TRIGGER",
  "GOOGLE_FORM_TRIGGER",
  "GOOGLE_CALENDAR_TRIGGER",
  "GOOGLE_CALENDAR_EXECUTION",
  "GMAIL_TRIGGER",
  "GMAIL_EXECUTION",
  "TELEGRAM_TRIGGER",
  "TELEGRAM_EXECUTION",
  "STRIPE_TRIGGER",
  "HTTP_REQUEST",
  "GEMINI",
  "ANTHROPIC",
  "OPENAI",
  "DISCORD",
  "SLACK",
  "WAIT",
  "CREATE_CLIENT",
  "UPDATE_CLIENT",
  "DELETE_CLIENT",
  "CREATE_DEAL",
  "UPDATE_DEAL",
  "DELETE_DEAL",
  "UPDATE_PIPELINE",
  "CLIENT_CREATED_TRIGGER",
  "CLIENT_UPDATED_TRIGGER",
  "CLIENT_FIELD_CHANGED_TRIGGER",
  "CLIENT_DELETED_TRIGGER",
  "CLIENT_TYPE_CHANGED_TRIGGER",
  "CLIENT_LIFECYCLE_STAGE_CHANGED_TRIGGER",
  "IF_ELSE",
  "SWITCH",
  "LOOP",
  "SET_VARIABLE",
  "STOP_WORKFLOW",
  "BUNDLE_WORKFLOW",
  "OUTLOOK_TRIGGER",
  "OUTLOOK_EXECUTION",
  "ONEDRIVE_TRIGGER",
  "ONEDRIVE_EXECUTION",
  "GOOGLE_CALENDAR_EVENT_CREATED",
  "GOOGLE_CALENDAR_EVENT_UPDATED",
  "GOOGLE_CALENDAR_EVENT_DELETED",
  "GOOGLE_DRIVE_FILE_CREATED",
  "GOOGLE_DRIVE_FILE_UPDATED",
  "GOOGLE_DRIVE_FILE_DELETED",
  "GOOGLE_DRIVE_FOLDER_CREATED",
  "GOOGLE_CALENDAR_CREATE_EVENT",
  "GOOGLE_CALENDAR_UPDATE_EVENT",
  "GOOGLE_CALENDAR_DELETE_EVENT",
  "GOOGLE_CALENDAR_FIND_AVAILABLE_TIMES",
  "GMAIL_SEND_EMAIL",
  "GMAIL_REPLY_TO_EMAIL",
  "GMAIL_SEARCH_EMAILS",
  "GMAIL_ADD_LABEL",
  "GOOGLE_DRIVE_UPLOAD_FILE",
  "GOOGLE_DRIVE_DOWNLOAD_FILE",
  "GOOGLE_DRIVE_MOVE_FILE",
  "GOOGLE_DRIVE_DELETE_FILE",
  "GOOGLE_DRIVE_CREATE_FOLDER",
  "GOOGLE_FORM_READ_RESPONSES",
  "GOOGLE_FORM_CREATE_RESPONSE",
  "OUTLOOK_NEW_EMAIL",
  "OUTLOOK_EMAIL_MOVED",
  "OUTLOOK_EMAIL_DELETED",
  "ONEDRIVE_FILE_CREATED",
  "ONEDRIVE_FILE_UPDATED",
  "ONEDRIVE_FILE_DELETED",
  "OUTLOOK_CALENDAR_EVENT_CREATED",
  "OUTLOOK_CALENDAR_EVENT_UPDATED",
  "OUTLOOK_CALENDAR_EVENT_DELETED",
  "OUTLOOK_SEND_EMAIL",
  "OUTLOOK_REPLY_TO_EMAIL",
  "OUTLOOK_MOVE_EMAIL",
  "OUTLOOK_SEARCH_EMAILS",
  "ONEDRIVE_UPLOAD_FILE",
  "ONEDRIVE_DOWNLOAD_FILE",
  "ONEDRIVE_MOVE_FILE",
  "ONEDRIVE_DELETE_FILE",
  "OUTLOOK_CALENDAR_CREATE_EVENT",
  "OUTLOOK_CALENDAR_UPDATE_EVENT",
  "OUTLOOK_CALENDAR_DELETE_EVENT",
  "SLACK_NEW_MESSAGE",
  "SLACK_MESSAGE_REACTION",
  "SLACK_CHANNEL_JOINED",
  "DISCORD_NEW_MESSAGE",
  "DISCORD_NEW_REACTION",
  "DISCORD_USER_JOINED",
  "TELEGRAM_NEW_MESSAGE",
  "TELEGRAM_COMMAND_RECEIVED",
  "SLACK_SEND_MESSAGE",
  "SLACK_UPDATE_MESSAGE",
  "SLACK_SEND_DM",
  "SLACK_UPLOAD_FILE",
  "DISCORD_SEND_MESSAGE",
  "DISCORD_EDIT_MESSAGE",
  "DISCORD_SEND_EMBED",
  "DISCORD_SEND_DM",
  "TELEGRAM_SEND_MESSAGE",
  "TELEGRAM_SEND_PHOTO",
  "TELEGRAM_SEND_DOCUMENT",
  "FIND_CLIENTS",
  "ADD_TAG_TO_CLIENT",
  "REMOVE_TAG_FROM_CLIENT",
  "DEAL_CREATED_TRIGGER",
  "DEAL_UPDATED_TRIGGER",
  "DEAL_DELETED_TRIGGER",
  "DEAL_STAGE_CHANGED_TRIGGER",
  "MOVE_DEAL_STAGE",
  "ADD_DEAL_NOTE",
  "APPOINTMENT_CREATED_TRIGGER",
  "APPOINTMENT_CANCELLED_TRIGGER",
  "SCHEDULE_APPOINTMENT",
  "UPDATE_APPOINTMENT",
  "CANCEL_APPOINTMENT",
  "STRIPE_PAYMENT_SUCCEEDED",
  "STRIPE_PAYMENT_FAILED",
  "STRIPE_SUBSCRIPTION_CREATED",
  "STRIPE_SUBSCRIPTION_UPDATED",
  "STRIPE_SUBSCRIPTION_CANCELLED",
  "STRIPE_CREATE_CHECKOUT_SESSION",
  "STRIPE_CREATE_INVOICE",
  "STRIPE_SEND_INVOICE",
  "STRIPE_REFUND_PAYMENT",
  "GEMINI_GENERATE_TEXT",
  "GEMINI_SUMMARISE",
  "GEMINI_TRANSFORM",
  "GEMINI_CLASSIFY",
  "EXECUTE_WORKFLOW",
  "BIRTHDAY_TRIGGER",
  "CLASS_BOOKED_TRIGGER",
  "CLASS_CANCELLED_TRIGGER",
  "MEMBER_CHECKED_IN_TRIGGER",
  "MEMBER_NO_SHOW_TRIGGER",
  "MEMBERSHIP_CREATED_TRIGGER",
  "MEMBERSHIP_EXPIRING_TRIGGER",
  "MEMBERSHIP_CANCELLED_TRIGGER",
  "WAITLIST_SPOT_OPENED_TRIGGER",
  "INTRO_OFFER_REDEEMED_TRIGGER",
  "SEND_CLASS_REMINDER",
  "AWARD_LOYALTY_POINTS",
  "CALCULATE_CHURN_SCORE",
  "SEND_SMS",
  "INTRO_OFFER_COMPLETED_TRIGGER",
  "MEMBER_CLASS_COUNT_TRIGGER",
  "CLIENT_TAG_ADDED_TRIGGER",
  "CLIENT_TAG_REMOVED_TRIGGER",
  "STUDIO_PAYMENT_SUCCEEDED_TRIGGER",
  "STUDIO_PAYMENT_FAILED_TRIGGER",
  "REFERRAL_CONVERTED_TRIGGER",
  "FORM_SUBMITTED_TRIGGER",
  "PRICING_OPTION_PURCHASED_TRIGGER",
  "CLIENT_INACTIVITY_TRIGGER",
  "SEND_EMAIL",
  "CREATE_TASK",
  "STUDIO_CLASS_ACTION",
]);

export const organizationMemberRole = pgEnum("OrganizationMemberRole", [
  "owner",
  "admin",
  "manager",
  "staff",
  "viewer",
]);

export const staffIdentityStatus = pgEnum("StaffIdentityStatus", [
  "INVITED",
  "ACTIVE",
  "SUSPENDED",
  "ARCHIVED",
]);

export const publicationTargetKind = pgEnum("PublicationTargetKind", [
  "FUNNEL",
  "SCHEDULE",
  "PRICING",
  "FORM",
  "GIFT_CARDS",
  "WIDGET",
]);

export const publicationTargetStatus = pgEnum("PublicationTargetStatus", [
  "DRAFT",
  "PUBLISHED",
  "PAUSED",
  "ARCHIVED",
]);

export const publicationDomainStatus = pgEnum("PublicationDomainStatus", [
  "NOT_CONFIGURED",
  "PENDING",
  "VERIFIED",
  "ERROR",
]);

export const publicationSslStatus = pgEnum("PublicationSslStatus", [
  "NOT_CONFIGURED",
  "PENDING",
  "ACTIVE",
  "ERROR",
]);

export const publicFormWorkflowDispatchStatus = pgEnum(
  "PublicFormWorkflowDispatchStatus",
  ["NOT_CONFIGURED", "PENDING", "DISPATCHED", "FAILED"],
);

export const reportViewVisibility = pgEnum("ReportViewVisibility", [
  "PERSONAL",
  "LOCATION",
]);

export const reportExportStatus = pgEnum("ReportExportStatus", [
  "PENDING",
  "COMPLETED",
  "FAILED",
]);

export const reportExportFormat = pgEnum("ReportExportFormat", ["CSV"]);

export const outboundDeliveryStatus = pgEnum("OutboundDeliveryStatus", [
  "QUEUED",
  "SENDING",
  "ACCEPTED",
  "DELIVERED",
  "BOUNCED",
  "SUPPRESSED",
  "CANCELLED",
  "DEAD_LETTER",
  "UNKNOWN",
]);

export const paymentMethod = pgEnum("PaymentMethod", [
  "STRIPE",
  "MANUAL",
  "XERO",
  "BANK_TRANSFER",
]);

export const payoutStatus = pgEnum("PayoutStatus", [
  "PENDING",
  "PROCESSING",
  "PAID",
  "FAILED",
  "CANCELLED",
]);

export const payrollRunStatus = pgEnum("PayrollRunStatus", [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);

export const performanceMetricSource = pgEnum("PerformanceMetricSource", [
  "MANUAL",
  "WEARABLE",
  "IMPORT",
]);

export const pixelProvider = pgEnum("PixelProvider", [
  "META_PIXEL",
  "GOOGLE_ANALYTICS",
  "TIKTOK_PIXEL",
  "CUSTOM",
]);

export const pricingAdjustmentType = pgEnum("PricingAdjustmentType", [
  "PERCENT",
  "FIXED_AMOUNT",
]);

export const pricingAccessTargetType = pgEnum("PricingAccessTargetType", [
  "ALL_SERVICES",
  "SERVICE_TYPE",
  "SERVICE_CATEGORY",
  "CLASS_TYPE",
  "VIDEO_LIBRARY",
  "COMMUNITY",
  "RETAIL_PRODUCT",
]);

export const pricingOptionType = pgEnum("PricingOptionType", [
  "CLASS_PACK",
  "MEMBERSHIP",
  "BUNDLE",
  "DROP_IN",
  "INTRO_OFFER",
  "ACCOUNT_CREDIT",
]);

export const clientAccountCreditTransactionType = pgEnum(
  "ClientAccountCreditTransactionType",
  ["PURCHASE", "REDEMPTION", "ADJUSTMENT", "IMPORT", "REFUND"],
);

export const serviceExperienceType = pgEnum("ServiceExperienceType", [
  "CLASS",
  "PRIVATE",
  "EVENT",
]);

export const serviceFormat = pgEnum("ServiceFormat", [
  "IN_PERSON",
  "VIRTUAL",
  "HYBRID",
]);

export const servicePaymentType = pgEnum("ServicePaymentType", [
  "FREE",
  "PAID",
  "SLIDING_SCALE",
  "PACKAGE_ONLY",
]);

export const serviceVisibility = pgEnum("ServiceVisibility", [
  "PUBLIC",
  "PRIVATE",
]);

export const recurringFrequency = pgEnum("RecurringFrequency", [
  "DAILY",
  "WEEKLY",
  "BIWEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "SEMIANNUALLY",
  "ANNUALLY",
]);

export const recurringInvoiceStatus = pgEnum("RecurringInvoiceStatus", [
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
]);

export const referralRewardType = pgEnum("ReferralRewardType", [
  "CREDIT",
  "DISCOUNT",
  "FREE_CLASS",
  "CASH",
]);

export const referralStatus = pgEnum("ReferralStatus", [
  "PENDING",
  "SIGNED_UP",
  "CONVERTED",
  "REWARDED",
  "EXPIRED",
]);

export const retentionAutomationType = pgEnum("RetentionAutomationType", [
  "WELCOME_SEQUENCE",
  "CLASS_REMINDER",
  "NO_SHOW_FOLLOW_UP",
  "MEMBERSHIP_EXPIRING",
  "WIN_BACK",
  "MILESTONE_CELEBRATION",
  "ATTENDANCE_DROP",
  "BIRTHDAY",
  "REFERRAL_REQUEST",
  "INTRO_OFFER_EXPIRING",
]);

export const rotaStatus = pgEnum("RotaStatus", [
  "SCHEDULED",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
]);

export const shiftSwapStatus = pgEnum("ShiftSwapStatus", [
  "PENDING",
  "INSTRUCTOR_ACCEPTED",
  "INSTRUCTOR_REJECTED",
  "ADMIN_APPROVED",
  "ADMIN_REJECTED",
  "CANCELLED",
  "EXPIRED",
]);

export const smsProvider = pgEnum("SmsProvider", [
  "TWILIO",
  "VONAGE",
  "MESSAGEBIRD",
]);

export const smsStatus = pgEnum("SmsStatus", [
  "QUEUED",
  "SENDING",
  "SENT",
  "DELIVERED",
  "FAILED",
  "UNDELIVERED",
]);

export const spotType = pgEnum("SpotType", [
  "STANDARD",
  "PREMIUM",
  "INSTRUCTOR",
  "BLOCKED",
  "EQUIPMENT",
]);

export const studioBookingStatus = pgEnum("StudioBookingStatus", [
  "BOOKED",
  "ATTENDED",
  "CANCELLED",
  "NO_SHOW",
  "LATE_CANCEL",
]);

export const studioCheckInMethod = pgEnum("StudioCheckInMethod", [
  "QR_CODE",
  "NFC",
  "KIOSK",
  "GEO",
  "MANUAL",
  "PIN",
  "IMPORT",
]);

export const studioMembershipStatus = pgEnum("StudioMembershipStatus", [
  "ACTIVE",
  "PAST_DUE",
  "INACTIVE",
  "CANCELLED",
  "EXPIRED",
  "PAUSED",
]);

export const studioPaymentStatus = pgEnum("StudioPaymentStatus", [
  "PENDING",
  "SUCCEEDED",
  "FAILED",
  "REFUNDED",
  "CANCELLED",
]);

export const studioPaymentType = pgEnum("StudioPaymentType", [
  "MEMBERSHIP",
  "CLASS_PACK",
  "DROP_IN",
  "GIFT_CARD",
  "POS",
  "ACCOUNT_CREDIT",
]);

export const stripeEventStatus = pgEnum("StripeEventStatus", [
  "RECEIVED",
  "PROCESSING",
  "PROCESSED",
  "IGNORED",
  "FAILED",
  "DEAD_LETTER",
]);

export const commerceLedgerKind = pgEnum("CommerceLedgerKind", [
  "PAYMENT",
  "REFUND",
  "DISPUTE",
  "PAYOUT",
  "CREDIT",
  "ADJUSTMENT",
]);

export const commerceLedgerStatus = pgEnum("CommerceLedgerStatus", [
  "PENDING",
  "SUCCEEDED",
  "FAILED",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
  "DISPUTED",
  "WON",
  "LOST",
  "CANCELLED",
]);

export const commerceOperationType = pgEnum("CommerceOperationType", [
  "CHECKOUT",
  "PAYMENT",
  "REFUND",
  "RECONCILIATION",
  "CREDIT_ADJUSTMENT",
]);

export const commerceOperationStatus = pgEnum("CommerceOperationStatus", [
  "CREATED",
  "PROVIDER_PENDING",
  "REQUIRES_ACTION",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
]);

export const paymentRecoveryPolicyMode = pgEnum("PaymentRecoveryPolicyMode", [
  "INHERIT",
  "ENABLED",
  "DISABLED",
]);

export const paymentRecoveryTarget = pgEnum("PaymentRecoveryTarget", [
  "INVOICE",
  "MEMBERSHIP",
  "BOOKING",
]);

export const paymentRecoveryCaseStatus = pgEnum("PaymentRecoveryCaseStatus", [
  "OPEN",
  "IN_PROGRESS",
  "RECOVERED",
  "EXHAUSTED",
  "CANCELLED",
]);

export const paymentRecoveryActionType = pgEnum("PaymentRecoveryActionType", [
  "SEND_EMAIL",
  "SEND_SMS",
  "GRACE_PERIOD_END",
  "ESCALATE",
  "EXPIRE_BOOKING",
  "RELEASE_BOOKING",
  "RETRY_PAYMENT",
  "CREATE_TASK",
  "DISPATCH_WORKFLOW",
]);

export const paymentRecoveryActionStatus = pgEnum(
  "PaymentRecoveryActionStatus",
  ["SCHEDULED", "PROCESSING", "SUCCEEDED", "FAILED", "CANCELLED"],
);

export const paymentRecoveryAttemptType = pgEnum("PaymentRecoveryAttemptType", [
  "PROVIDER_EVENT",
  "DELIVERY",
  "PROVIDER_RETRY",
  "OPERATOR",
]);

export const paymentRecoveryAttemptStatus = pgEnum(
  "PaymentRecoveryAttemptStatus",
  ["SUCCEEDED", "FAILED", "IGNORED"],
);

export const commerceTenderType = pgEnum("CommerceTenderType", [
  "STRIPE",
  "GIFT_CARD",
  "ACCOUNT_CREDIT",
  "PROMOTION",
  "MANUAL",
  "BANK_TRANSFER",
]);

export const commerceReconciliationIssueType = pgEnum(
  "CommerceReconciliationIssueType",
  [
    "MISSING_PROVIDER_RECORD",
    "MISSING_LOCAL_RECORD",
    "AMOUNT_MISMATCH",
    "CURRENCY_MISMATCH",
    "STATUS_MISMATCH",
    "DUPLICATE_RECORD",
    "ORPHANED_REFERENCE",
  ],
);

export const commerceReconciliationSeverity = pgEnum(
  "CommerceReconciliationSeverity",
  ["INFO", "WARNING", "CRITICAL"],
);

export const commerceReconciliationStatus = pgEnum(
  "CommerceReconciliationStatus",
  ["OPEN", "ACKNOWLEDGED", "RESOLVED", "IGNORED"],
);

export const commerceReconciliationRunStatus = pgEnum(
  "CommerceReconciliationRunStatus",
  ["PENDING", "RUNNING", "COMPLETED", "FAILED"],
);

export const studioProductType = pgEnum("StudioProductType", [
  "MEMBERSHIP_PLAN",
  "CLASS_PACK",
  "RETAIL",
  "FEE",
  "ACCOUNT_CREDIT",
  "SHIPPING",
  "TIP",
  "EXTERNAL_REVENUE",
  "GIFT_CARD",
  "OTHER",
]);

export const clientDocumentType = pgEnum("ClientDocumentType", [
  "WAIVER",
  "CONTRACT_SIGNATURE",
  "PROFILE_FILE",
  "SALE_IMAGE",
  "OTHER",
]);

export const studioType = pgEnum("StudioType", [
  "YOGA",
  "PILATES",
  "GYM",
  "CROSSFIT",
  "BARRE",
  "DANCE",
  "MARTIAL_ARTS",
  "SPIN",
  "SWIM",
  "MULTI_DISCIPLINE",
  "OTHER",
]);

export const locationMemberRole = pgEnum("LocationMemberRole", [
  "AGENCY",
  "ADMIN",
  "MANAGER",
  "STANDARD",
  "LIMITED",
  "VIEWER",
]);

export const subscriptionStatus = pgEnum("SubscriptionStatus", [
  "ACTIVE",
  "FROZEN",
  "CANCELLED",
  "EXPIRED",
  "PAST_DUE",
  "TRIALING",
]);

export const taskPriority = pgEnum("TaskPriority", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
]);

export const taskStatus = pgEnum("TaskStatus", [
  "TODO",
  "IN_PROGRESS",
  "DONE",
  "CANCELLED",
]);

export const timeLogStatus = pgEnum("TimeLogStatus", [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "INVOICED",
]);

export const timeOffType = pgEnum("TimeOffType", [
  "VACATION",
  "SICK",
  "PERSONAL",
  "BEREAVEMENT",
  "PARENTAL",
  "UNPAID",
  "COMPENSATORY",
  "PUBLIC_HOLIDAY",
  "OTHER",
]);

export const userStatus = pgEnum("UserStatus", [
  "ONLINE",
  "WORKING",
  "DO_NOT_DISTURB",
  "AWAY",
  "OFFLINE",
]);

export const waitlistStatus = pgEnum("WaitlistStatus", [
  "WAITING",
  "NOTIFIED",
  "CONFIRMED",
  "EXPIRED",
  "CANCELLED_WAITLIST",
]);

export const webVitalMetric = pgEnum("WebVitalMetric", [
  "LCP",
  "INP",
  "CLS",
  "FCP",
  "TTFB",
  "FID",
]);

export const webVitalRating = pgEnum("WebVitalRating", [
  "GOOD",
  "NEEDS_IMPROVEMENT",
  "POOR",
]);

export const webhookProvider = pgEnum("WebhookProvider", [
  "SLACK",
  "DISCORD",
  "STRIPE",
  "CUSTOM",
]);

export const widgetType = pgEnum("WidgetType", [
  "SCHEDULE",
  "BOOKING",
  "MEMBERSHIP",
  "INSTRUCTORS",
  "INTRO_OFFER",
  "EVENT",
  "ON_DEMAND",
  "REFERRAL",
]);

export const instructorDocumentStatus = pgEnum("InstructorDocumentStatus", [
  "PENDING_UPLOAD",
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
]);

export const instructorDocumentType = pgEnum("InstructorDocumentType", [
  "PASSPORT",
  "DRIVING_LICENCE",
  "NATIONAL_ID",
  "VISA",
  "RIGHT_TO_WORK",
  "BIRTH_CERTIFICATE",
  "DBS_CERTIFICATE",
  "DBS_UPDATE_SERVICE",
  "PROOF_OF_ADDRESS",
  "PROOF_OF_NI",
  "QUALIFICATION",
  "CERTIFICATION",
  "TRAINING_CERTIFICATE",
  "FIRST_AID_CERTIFICATE",
  "FOOD_HYGIENE",
  "MANUAL_HANDLING",
  "SAFEGUARDING",
  "CONTRACT",
  "SIGNED_POLICY",
  "REFERENCE",
  "HEALTH_DECLARATION",
  "FIT_NOTE",
  "VACCINATION_RECORD",
  "OCCUPATIONAL_HEALTH",
  "PHOTO",
  "OTHER",
]);

export const instructorPaymentMethod = pgEnum("InstructorPaymentMethod", [
  "BANK_TRANSFER",
  "CASH",
  "CHEQUE",
  "PAYPAL",
  "STRIPE",
  "OTHER",
]);

export const instructorPaymentStatus = pgEnum("InstructorPaymentStatus", [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
]);

export const schedulingPolicySource = pgEnum("SchedulingPolicySource", [
  "CLASS_OVERRIDE",
  "SERVICE_TYPE",
  "LOCATION_DEFAULT",
  "ORGANIZATION_DEFAULT",
  "LEGACY",
]);

export const waitlistPolicyMode = pgEnum("WaitlistPolicyMode", [
  "DISABLED",
  "MANUAL",
  "OFFER_NEXT",
  "AUTO_BOOK",
]);

export const waitlistCreditHoldPolicy = pgEnum("WaitlistCreditHoldPolicy", [
  "NONE",
  "HOLD_ON_JOIN",
]);

export const waitlistFailureFallback = pgEnum("WaitlistFailureFallback", [
  "OFFER_NEXT",
  "NOTIFY_ALL",
  "MANUAL_REVIEW",
]);

export const organization = pgTable(
  "Organization",
  {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	logo: text(),
    createdAt: timestamp({ precision: 3, mode: "date" }).notNull(),
	metadata: text(),
	accentColor: text(),
	brandColor: text(),
	businessAddress: jsonb(),
	businessEmail: text(),
	businessPhone: text(),
	taxId: text(),
	website: text(),
	dunningDays: jsonb(),
	dunningEnabled: boolean().default(true).notNull(),
    currency: text().default("USD"),
	studioType: studioType(),
  },
  (table) => [
    uniqueIndex("Organization_slug_key").using(
      "btree",
      table.slug.asc().nullsLast().op("text_ops"),
    ),
  ],
).enableRLS();

export const prismaMigrations = pgTable("_prisma_migrations", {
	id: varchar({ length: 36 }).primaryKey().notNull(),
	checksum: varchar({ length: 64 }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true, mode: "date" }),
	migrationName: varchar("migration_name", { length: 255 }).notNull(),
	logs: text(),
  rolledBackAt: timestamp("rolled_back_at", {
    withTimezone: true,
    mode: "date",
  }),
  startedAt: timestamp("started_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
	appliedStepsCount: integer("applied_steps_count").default(0).notNull(),
}).enableRLS();

export const studioClass = pgTable(
  "StudioClass",
  {
	id: text().primaryKey().notNull(),
	locationId: text(),
	externalId: text(),
	name: text().notNull(),
	description: text(),
	instructorName: text(),
	location: text(),
    startTime: timestamp({ precision: 3, mode: "date" }).notNull(),
    endTime: timestamp({ precision: 3, mode: "date" }).notNull(),
	maxCapacity: integer(),
	bookedCount: integer().default(0).notNull(),
	metadata: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
	organizationId: text().notNull(),
	bookingWindowHours: integer().default(168),
    bookingWindowPolicyOverrideId: text(),
    resolvedBookingWindowPolicyId: text(),
    resolvedBookingWindowPolicyVersionId: text(),
    bookingWindowPolicySource: schedulingPolicySource()
      .default("LEGACY")
      .notNull(),
    bookingOpensMinutesBeforeStart: integer(),
    bookingClosesMinutesBeforeStart: integer(),
    cancellationsCloseMinutesBeforeStart: integer(),
    blockClientCancellations: boolean(),
	cancellationPolicyId: text(),
	cancellationWindowHours: integer().default(12),
	classTypeId: text(),
	serviceTypeId: text(),
	color: text(),
    currency: text().default("GBP").notNull(),
	difficulty: classDifficulty(),
	dropInPrice: numeric({ precision: 10, scale:  2 }),
	equipmentNeeded: text().array().default([]),
	imageUrl: text(),
	instructorId: text(),
	isRecurring: boolean().default(false).notNull(),
	isVirtual: boolean().default(false).notNull(),
	minCapacity: integer(),
	onlineBookingEnabled: boolean().default(true).notNull(),
	onlineCapacity: integer(),
    pricingModel: classPricingModel().default("PACKAGE_ONLY").notNull(),
	recurrenceRule: text(),
	roomId: text(),
	roomName: text(),
	slidingScaleMaxPrice: numeric({ precision: 10, scale:  2 }),
	slidingScaleMinPrice: numeric({ precision: 10, scale:  2 }),
	spotPickingEnabled: boolean().default(false).notNull(),
    status: classInstanceStatus().default("SCHEDULED").notNull(),
	waitlistEnabled: boolean().default(false).notNull(),
	autoPromoteWaitlist: boolean().default(false).notNull(),
    waitlistPolicyOverrideId: text(),
    resolvedWaitlistPolicyId: text(),
    resolvedWaitlistPolicyVersionId: text(),
    waitlistPolicySource: schedulingPolicySource().default("LEGACY").notNull(),
    waitlistMode: waitlistPolicyMode(),
    waitlistAutomationClosesMinutesBeforeStart: integer(),
    waitlistMaxEntries: integer(),
    waitlistAllowOverlappingReservations: boolean(),
    waitlistCreditHoldPolicy: waitlistCreditHoldPolicy(),
    waitlistOfferExpiryMinutes: integer(),
    waitlistFailureFallback: waitlistFailureFallback(),
    schedulingPolicySchemaVersion: integer(),
    schedulingPolicyResolvedAt: timestamp({
      precision: 3,
      mode: "date",
      withTimezone: true,
    }),
	walkInCapacity: integer(),
  },
  (table) => [
    index("StudioClass_bookingWindowPolicyOverrideId_idx").using(
      "btree",
      table.bookingWindowPolicyOverrideId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioClass_resolvedBookingWindowPolicyVersionId_idx").using(
      "btree",
      table.resolvedBookingWindowPolicyVersionId
        .asc()
        .nullsLast()
        .op("text_ops"),
    ),
    index("StudioClass_cancellationPolicyId_idx").using(
      "btree",
      table.cancellationPolicyId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioClass_classTypeId_idx").using(
      "btree",
      table.classTypeId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioClass_serviceTypeId_idx").using(
      "btree",
      table.serviceTypeId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioClass_externalId_idx").using(
      "btree",
      table.externalId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioClass_instructorId_idx").using(
      "btree",
      table.instructorId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioClass_onlineBookingEnabled_idx").using(
      "btree",
      table.onlineBookingEnabled.asc().nullsLast().op("bool_ops"),
    ),
    index("StudioClass_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("StudioClass_organizationId_id_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
    index("StudioClass_pricingModel_idx").using(
      "btree",
      table.pricingModel.asc().nullsLast().op("enum_ops"),
    ),
    index("StudioClass_startTime_idx").using(
      "btree",
      table.startTime.asc().nullsLast().op("timestamp_ops"),
    ),
    index("StudioClass_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    index("StudioClass_waitlistPolicyOverrideId_idx").using(
      "btree",
      table.waitlistPolicyOverrideId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioClass_resolvedWaitlistPolicyVersionId_idx").using(
      "btree",
      table.resolvedWaitlistPolicyVersionId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioClass_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
		foreignKey({
				columns: [table.classTypeId],
				foreignColumns: [classType.id],
      name: "StudioClass_classTypeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.bookingWindowPolicyOverrideId],
      foreignColumns: [bookingWindowPolicy.id],
      name: "StudioClass_bookingWindowPolicyOverrideId_fkey",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.resolvedBookingWindowPolicyId],
      foreignColumns: [bookingWindowPolicy.id],
      name: "StudioClass_resolvedBookingWindowPolicyId_fkey",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.resolvedBookingWindowPolicyVersionId],
      foreignColumns: [bookingWindowPolicyVersion.id],
      name: "StudioClass_resolvedBookingWindowPolicyVersionId_fkey",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.waitlistPolicyOverrideId],
      foreignColumns: [waitlistPolicy.id],
      name: "StudioClass_waitlistPolicyOverrideId_fkey",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.resolvedWaitlistPolicyId],
      foreignColumns: [waitlistPolicy.id],
      name: "StudioClass_resolvedWaitlistPolicyId_fkey",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.resolvedWaitlistPolicyVersionId],
      foreignColumns: [waitlistPolicyVersion.id],
      name: "StudioClass_resolvedWaitlistPolicyVersionId_fkey",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
		foreignKey({
				columns: [table.serviceTypeId],
				foreignColumns: [serviceType.id],
      name: "StudioClass_serviceTypeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
		foreignKey({
				columns: [table.instructorId],
				foreignColumns: [instructor.id],
      name: "StudioClass_instructorId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "StudioClass_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.roomId],
			foreignColumns: [room.id],
      name: "StudioClass_roomId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "StudioClass_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const studioMembership = pgTable(
  "StudioMembership",
  {
	id: text().primaryKey().notNull(),
	clientId: text().notNull(),
	externalId: text(),
	name: text().notNull(),
	type: text(),
    status: studioMembershipStatus().default("ACTIVE").notNull(),
    startDate: timestamp({ precision: 3, mode: "date" }).notNull(),
    endDate: timestamp({ precision: 3, mode: "date" }),
    renewalDate: timestamp({ precision: 3, mode: "date" }),
	totalClasses: integer(),
	usedClasses: integer().default(0),
	price: numeric({ precision: 10, scale:  2 }),
    currency: text().default("USD"),
	metadata: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
	autoRenew: boolean().default(true).notNull(),
	cancelReason: text(),
    cancelledAt: timestamp({ precision: 3, mode: "date" }),
    frozenAt: timestamp({ precision: 3, mode: "date" }),
    frozenUntil: timestamp({ precision: 3, mode: "date" }),
	organizationId: text(),
	planId: text(),
	stripeSubscriptionId: text(),
    stripeConnectionId: text(),
	locationId: text(),
	paymentMethod: text(),
	paymentFrequency: text(),
	suspendNotes: text(),
	totalPayments: integer(),
	remainingPayments: integer(),
    paymentFailureAt: timestamp({ precision: 3, mode: "date" }),
    paymentGraceEndsAt: timestamp({ precision: 3, mode: "date" }),
  },
  (table) => [
    index("StudioMembership_clientId_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioMembership_endDate_idx").using(
      "btree",
      table.endDate.asc().nullsLast().op("timestamp_ops"),
    ),
    index("StudioMembership_externalId_idx").using(
      "btree",
      table.externalId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioMembership_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioMembership_planId_idx").using(
      "btree",
      table.planId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioMembership_stripeConnectionId_idx").using(
      "btree",
      table.stripeConnectionId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("StudioMembership_stripeSubscriptionId_key")
      .using(
        "btree",
        table.stripeSubscriptionId.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.stripeSubscriptionId} IS NOT NULL`),
    index("StudioMembership_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    index("StudioMembership_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
      name: "StudioMembership_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "StudioMembership_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.planId],
			foreignColumns: [membershipPlan.id],
      name: "StudioMembership_planId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.locationId],
      foreignColumns: [location.id],
      name: "StudioMembership_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.organizationId, table.stripeConnectionId],
      foreignColumns: [stripeConnection.organizationId, stripeConnection.id],
      name: "StudioMembership_stripeConnection_scope_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [
        table.organizationId,
        table.locationId,
        table.stripeConnectionId,
      ],
      foreignColumns: [
        stripeConnection.organizationId,
        stripeConnection.locationId,
        stripeConnection.id,
      ],
      name: "StudioMembership_stripeConnection_location_scope_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    check(
      "StudioMembership_stripe_binding_check",
      sql`${table.stripeSubscriptionId} IS NULL OR ${table.stripeConnectionId} IS NOT NULL`,
    ),
    check(
      "StudioMembership_stripeConnection_organization_check",
      sql`${table.stripeConnectionId} IS NULL OR ${table.organizationId} IS NOT NULL`,
    ),
  ],
).enableRLS();

export const workflowFolder = pgTable(
  "WorkflowFolder",
  {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    description: text(),
    color: text(),
    icon: text(),
    position: integer().default(0).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    userId: text().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
  },
  (table) => [
    index("WorkflowFolder_organizationId_idx").on(table.organizationId),
    index("WorkflowFolder_locationId_idx").on(table.locationId),
    index("WorkflowFolder_userId_position_idx").on(
      table.userId,
      table.position,
    ),
    index("WorkflowFolder_scope_position_idx").on(
      table.organizationId,
      table.locationId,
      table.userId,
      table.position,
    ),
    uniqueIndex("WorkflowFolder_scope_id_key").on(
      table.organizationId,
      table.locationId,
      table.userId,
      table.id,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "WorkflowFolder_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "WorkflowFolder_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "WorkflowFolder_organizationId_locationId_fkey",
    }).onUpdate("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "WorkflowFolder_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
).enableRLS();

export const workflows = pgTable(
  "Workflows",
  {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
	userId: text().notNull(),
    archived: boolean().default(true).notNull(),
	isTemplate: boolean().default(false).notNull(),
	description: text(),
	locationId: text(),
	bundleInputs: jsonb(),
	bundleOutputs: jsonb(),
	isBundle: boolean().default(false).notNull(),
	organizationId: text(),
    folderId: text(),
    behaviorConfig: jsonb().default({ enrollment: "EVERY_EVENT" }).notNull(),
  },
  (table) => [
    index("Workflows_isBundle_idx").using(
      "btree",
      table.isBundle.asc().nullsLast().op("bool_ops"),
    ),
    index("Workflows_folderId_idx").on(table.folderId),
    index("Workflows_scope_status_updatedAt_idx").on(
      table.organizationId,
      table.locationId,
      table.userId,
      table.archived,
      table.isTemplate,
      table.updatedAt,
    ),
    index("Workflows_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("Workflows_organizationId_id_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
    index("Workflows_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.folderId],
      foreignColumns: [workflowFolder.id],
      name: "Workflows_folderId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [
        table.organizationId,
        table.locationId,
        table.userId,
        table.folderId,
      ],
      foreignColumns: [
        workflowFolder.organizationId,
        workflowFolder.locationId,
        workflowFolder.userId,
        workflowFolder.id,
      ],
      name: "Workflows_folder_scope_fkey",
    }).onUpdate("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "Workflows_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "Workflows_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "Workflows_organizationId_locationId_fkey",
    }).onUpdate("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
      name: "Workflows_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
).enableRLS();

export const node = pgTable(
  "Node",
  {
	id: text().primaryKey().notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
	name: text().notNull(),
	type: nodeType().notNull(),
	position: jsonb().notNull(),
	data: jsonb().default({}).notNull(),
	workflowId: text().notNull(),
	credentialId: text(),
    providerAccountId: text(),
  },
  (table) => [
    index("Node_providerAccountId_idx").using(
      "btree",
      table.providerAccountId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.credentialId],
			foreignColumns: [credential.id],
      name: "Node_credentialId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.providerAccountId],
      foreignColumns: [providerAccount.id],
      name: "Node_providerAccountId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.workflowId],
			foreignColumns: [workflows.id],
      name: "Node_workflowId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const credential = pgTable(
  "Credential",
  {
	id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
	name: text().notNull(),
	value: text().notNull(),
	type: credentialType().notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
	userId: text().notNull(),
	metadata: jsonb(),
	locationId: text(),
    isActive: boolean().default(true).notNull(),
    isDefault: boolean().default(false).notNull(),
  },
  (table) => [
    index("Credential_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("Credential_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("Credential_organizationId_id_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("Credential_scope_id_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("Credential_default_organization_type_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.type.asc().nullsLast().op("enum_ops"),
      )
      .where(
        sql`${table.isDefault} = true AND ${table.isActive} = true AND ${table.locationId} IS NULL`,
      ),
    uniqueIndex("Credential_default_location_type_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
        table.type.asc().nullsLast().op("enum_ops"),
      )
      .where(
        sql`${table.isDefault} = true AND ${table.isActive} = true AND ${table.locationId} IS NOT NULL`,
      ),
    check(
      "Credential_default_requires_active_check",
      sql`NOT ${table.isDefault} OR ${table.isActive}`,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "Credential_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "Credential_organizationId_locationId_fkey",
    }).onUpdate("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "Credential_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
      name: "Credential_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const connection = pgTable(
  "Connection",
  {
	id: text().primaryKey().notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
	fromNodeId: text().notNull(),
	toNodeId: text().notNull(),
    fromOutput: text().default("main").notNull(),
    toInput: text().default("main").notNull(),
	workflowId: text().notNull(),
  },
  (table) => [
    uniqueIndex("Connection_fromNodeId_toNodeId_fromOutput_toInput_key").using(
      "btree",
      table.fromNodeId.asc().nullsLast().op("text_ops"),
      table.toNodeId.asc().nullsLast().op("text_ops"),
      table.fromOutput.asc().nullsLast().op("text_ops"),
      table.toInput.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.fromNodeId],
			foreignColumns: [node.id],
      name: "Connection_fromNodeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.toNodeId],
			foreignColumns: [node.id],
      name: "Connection_toNodeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.workflowId],
			foreignColumns: [workflows.id],
      name: "Connection_workflowId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const execution = pgTable(
  "Execution",
  {
	id: text().primaryKey().notNull(),
    startedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    completedAt: timestamp({ precision: 3, mode: "date" }),
    status: executionStatus().default("RUNNING").notNull(),
	inngestEventId: text().notNull(),
	output: jsonb(),
	workflowId: text().notNull(),
    organizationId: text().notNull(),
	error: text(),
	errorStack: text(),
	locationId: text(),
  },
  (table) => [
    uniqueIndex("Execution_inngestEventId_key").using(
      "btree",
      table.inngestEventId.asc().nullsLast().op("text_ops"),
    ),
    index("Execution_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("Execution_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("Execution_scope_startedAt_idx").on(
      table.organizationId,
      table.locationId,
      table.startedAt,
    ),
    index("Execution_workflowId_idx").on(table.workflowId),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "Execution_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "Execution_organizationId_locationId_fkey",
    }).onUpdate("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "Execution_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.workflowId],
			foreignColumns: [workflows.id],
      name: "Execution_workflowId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const workflowEnrollment = pgTable(
  "WorkflowEnrollment",
  {
	id: text().primaryKey().notNull(),
    workflowId: text().notNull(),
    executionId: text().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    clientId: text().notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("WorkflowEnrollment_workflowId_clientId_key").on(
      table.workflowId,
      table.clientId,
    ),
    index("WorkflowEnrollment_scope_createdAt_idx").on(
      table.organizationId,
      table.locationId,
      table.createdAt,
    ),
    foreignKey({
      columns: [table.workflowId],
      foreignColumns: [workflows.id],
      name: "WorkflowEnrollment_workflowId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.executionId],
      foreignColumns: [execution.id],
      name: "WorkflowEnrollment_executionId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.clientId],
      foreignColumns: [client.id],
      name: "WorkflowEnrollment_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "WorkflowEnrollment_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.locationId],
      foreignColumns: [location.id],
      name: "WorkflowEnrollment_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const googleCalendarSubscription = pgTable(
  "GoogleCalendarSubscription",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    providerAccountId: text().notNull(),
    userId: text(),
	workflowId: text().notNull(),
	nodeId: text().notNull(),
	calendarId: text().notNull(),
	calendarName: text(),
	listenFor: text().array(),
	channelId: text().notNull(),
	resourceId: text().notNull(),
    webhookTokenHash: text().notNull(),
    lastMessageNumber: text(),
	syncToken: text(),
    expiresAt: timestamp({ precision: 3, mode: "date" }),
    lastSyncedAt: timestamp({ precision: 3, mode: "date" }),
	timezone: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
	variableName: text(),
  },
  (table) => [
    index("GoogleCalendarSubscription_channelId_idx").using(
      "btree",
      table.channelId.asc().nullsLast().op("text_ops"),
    ),
    index("GoogleCalendarSubscription_organizationId_locationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("GoogleCalendarSubscription_providerAccountId_idx").using(
      "btree",
      table.providerAccountId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex(
      "GoogleCalendarSubscription_providerAccountId_nodeId_key",
    ).using(
      "btree",
      table.providerAccountId.asc().nullsLast().op("text_ops"),
      table.nodeId.asc().nullsLast().op("text_ops"),
    ),
    index("GoogleCalendarSubscription_workflowId_idx").using(
      "btree",
      table.workflowId.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "GoogleCalendarSubscription_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "GoogleCalendarSubscription_organizationId_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.nodeId],
			foreignColumns: [node.id],
      name: "GoogleCalendarSubscription_nodeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.providerAccountId],
      foreignColumns: [providerAccount.organizationId, providerAccount.id],
      name: "GoogleCalendarSubscription_providerAccountId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
      name: "GoogleCalendarSubscription_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
	foreignKey({
			columns: [table.workflowId],
			foreignColumns: [workflows.id],
      name: "GoogleCalendarSubscription_workflowId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const telegramTriggerState = pgTable(
  "TelegramTriggerState",
  {
	id: text().primaryKey().notNull(),
	nodeId: text().notNull(),
	workflowId: text().notNull(),
	lastUpdateId: text(),
    lastTriggeredAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("TelegramTriggerState_nodeId_key").using(
      "btree",
      table.nodeId.asc().nullsLast().op("text_ops"),
    ),
    index("TelegramTriggerState_workflowId_idx").using(
      "btree",
      table.workflowId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.nodeId],
			foreignColumns: [node.id],
      name: "TelegramTriggerState_nodeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.workflowId],
			foreignColumns: [workflows.id],
      name: "TelegramTriggerState_workflowId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const gmailSubscription = pgTable(
  "GmailSubscription",
  {
	id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    providerAccountId: text().notNull(),
    userId: text(),
	emailAddress: text().notNull(),
	labelIds: text().array(),
	topicName: text().notNull(),
    lastPubSubMessageId: text(),
	historyId: text(),
    expiresAt: timestamp({ precision: 3, mode: "date" }),
    lastSyncedAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("GmailSubscription_emailAddress_idx").using(
      "btree",
      table.emailAddress.asc().nullsLast().op("text_ops"),
    ),
    index("GmailSubscription_organizationId_locationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("GmailSubscription_providerAccountId_key").using(
      "btree",
      table.providerAccountId.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "GmailSubscription_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "GmailSubscription_organizationId_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.providerAccountId],
      foreignColumns: [providerAccount.organizationId, providerAccount.id],
      name: "GmailSubscription_providerAccountId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
      name: "GmailSubscription_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const gmailTriggerState = pgTable(
  "GmailTriggerState",
  {
	id: text().primaryKey().notNull(),
	nodeId: text().notNull(),
	workflowId: text().notNull(),
	lastMessageId: text(),
    lastTriggeredAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("GmailTriggerState_nodeId_key").using(
      "btree",
      table.nodeId.asc().nullsLast().op("text_ops"),
    ),
    index("GmailTriggerState_workflowId_idx").using(
      "btree",
      table.workflowId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.nodeId],
			foreignColumns: [node.id],
      name: "GmailTriggerState_nodeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.workflowId],
			foreignColumns: [workflows.id],
      name: "GmailTriggerState_workflowId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const classType = pgTable(
  "ClassType",
  {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	description: text(),
	color: text(),
	icon: text(),
	isActive: boolean().default(true).notNull(),
	organizationId: text().notNull(),
	locationId: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("ClassType_isActive_idx").using(
      "btree",
      table.isActive.asc().nullsLast().op("bool_ops"),
    ),
    index("ClassType_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("ClassType_organizationId_slug_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.slug.asc().nullsLast().op("text_ops"),
    ),
    index("ClassType_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "ClassType_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "ClassType_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const serviceCategory = pgTable(
  "ServiceCategory",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	name: text().notNull(),
	slug: text().notNull(),
	description: text(),
	color: text(),
	sortOrder: integer().default(0).notNull(),
	isActive: boolean().default(true).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("ServiceCategory_isActive_idx").using(
      "btree",
      table.isActive.asc().nullsLast().op("bool_ops"),
    ),
    index("ServiceCategory_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("ServiceCategory_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("ServiceCategory_organizationId_slug_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.slug.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "ServiceCategory_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "ServiceCategory_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const serviceType = pgTable(
  "ServiceType",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	categoryId: text(),
	classTypeId: text(),
	name: text().notNull(),
	slug: text().notNull(),
	description: text(),
    experienceType: serviceExperienceType().default("CLASS").notNull(),
    format: serviceFormat().default("IN_PERSON").notNull(),
	defaultLocation: text(),
	durationMinutes: integer().default(60).notNull(),
	capacity: integer(),
	bufferMinutes: integer().default(0).notNull(),
	roomIds: text().array().default([]),
	instructorIds: text().array().default([]),
    paymentType: servicePaymentType().default("PACKAGE_ONLY").notNull(),
    visibility: serviceVisibility().default("PUBLIC").notNull(),
	price: numeric({ precision: 10, scale:  2 }),
	slidingScaleMinPrice: numeric({ precision: 10, scale:  2 }),
	slidingScaleMaxPrice: numeric({ precision: 10, scale:  2 }),
    currency: text().default("GBP").notNull(),
	revenueCategory: text(),
	bookingRestrictionTags: text().array().default([]),
	workoutTypes: text().array().default([]),
	areasOfFocus: text().array().default([]),
	intensity: text(),
	equipment: text().array().default([]),
	checkoutConfirmation: text(),
	confirmationEmailBody: text(),
    bookingWindowPolicyId: text(),
    waitlistPolicyId: text(),
	imageUrl: text(),
	allowUnpaidBookings: boolean().default(false).notNull(),
	delaySchedulingHours: integer(),
	allowRecurringBookings: boolean().default(false).notNull(),
	displayImageAtCheckout: boolean().default(true).notNull(),
	calendarColor: text(),
	sortOrder: integer().default(0).notNull(),
	isActive: boolean().default(true).notNull(),
	metadata: jsonb().default({}).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("ServiceType_bookingWindowPolicyId_idx").using(
      "btree",
      table.bookingWindowPolicyId.asc().nullsLast().op("text_ops"),
    ),
    index("ServiceType_categoryId_idx").using(
      "btree",
      table.categoryId.asc().nullsLast().op("text_ops"),
    ),
    index("ServiceType_classTypeId_idx").using(
      "btree",
      table.classTypeId.asc().nullsLast().op("text_ops"),
    ),
    index("ServiceType_experienceType_idx").using(
      "btree",
      table.experienceType.asc().nullsLast().op("enum_ops"),
    ),
    index("ServiceType_isActive_idx").using(
      "btree",
      table.isActive.asc().nullsLast().op("bool_ops"),
    ),
    index("ServiceType_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("ServiceType_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("ServiceType_waitlistPolicyId_idx").using(
      "btree",
      table.waitlistPolicyId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("ServiceType_organizationId_slug_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.slug.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "ServiceType_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.bookingWindowPolicyId],
      foreignColumns: [bookingWindowPolicy.id],
      name: "ServiceType_bookingWindowPolicyId_fkey",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.waitlistPolicyId],
      foreignColumns: [waitlistPolicy.id],
      name: "ServiceType_waitlistPolicyId_fkey",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "ServiceType_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [serviceCategory.id],
      name: "ServiceType_categoryId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.classTypeId],
			foreignColumns: [classType.id],
      name: "ServiceType_classTypeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const classSeries = pgTable(
  "ClassSeries",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	serviceTypeId: text(),
	classTypeId: text(),
	roomId: text(),
	name: text().notNull(),
	description: text(),
    startDate: date({ mode: "date" }).notNull(),
    endDate: date({ mode: "date" }),
	startTime: text().notNull(),
	endTime: text().notNull(),
	recurrenceRule: text().notNull(),
	recurrenceDays: text().array().default([]),
	instructorIds: text().array().default([]),
	capacity: integer(),
    status: text().default("ACTIVE").notNull(),
	metadata: jsonb().default({}).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("ClassSeries_classTypeId_idx").using(
      "btree",
      table.classTypeId.asc().nullsLast().op("text_ops"),
    ),
    index("ClassSeries_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("ClassSeries_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("ClassSeries_serviceTypeId_idx").using(
      "btree",
      table.serviceTypeId.asc().nullsLast().op("text_ops"),
    ),
    index("ClassSeries_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "ClassSeries_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "ClassSeries_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.serviceTypeId],
			foreignColumns: [serviceType.id],
      name: "ClassSeries_serviceTypeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.classTypeId],
			foreignColumns: [classType.id],
      name: "ClassSeries_classTypeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.roomId],
			foreignColumns: [room.id],
      name: "ClassSeries_roomId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const room = pgTable(
  "Room",
  {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	capacity: integer(),
	description: text(),
	organizationId: text().notNull(),
	locationId: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("Room_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("Room_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "Room_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "Room_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const webhook = pgTable(
  "Webhook",
  {
	id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
	name: text().notNull(),
	provider: webhookProvider().notNull(),
	url: text().notNull(),
	signingSecret: text(),
	description: text(),
	metadata: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
	userId: text().notNull(),
	locationId: text(),
  },
  (table) => [
    index("Webhook_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("Webhook_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "Webhook_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "Webhook_organizationId_locationId_fkey",
    }).onUpdate("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "Webhook_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
      name: "Webhook_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const classCredit = pgTable(
  "ClassCredit",
  {
	id: text().primaryKey().notNull(),
	membershipId: text(),
	clientId: text().notNull(),
	organizationId: text(),
	locationId: text(),
	externalId: text(),
	paymentRefNo: text(),
	productId: text(),
	totalCredits: integer().notNull(),
	usedCredits: integer().default(0).notNull(),
    expiresAt: timestamp({ precision: 3, mode: "date" }),
	metadata: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("ClassCredit_clientId_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    index("ClassCredit_expiresAt_idx").using(
      "btree",
      table.expiresAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("ClassCredit_externalId_idx").using(
      "btree",
      table.externalId.asc().nullsLast().op("text_ops"),
    ),
    index("ClassCredit_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("ClassCredit_membershipId_idx").using(
      "btree",
      table.membershipId.asc().nullsLast().op("text_ops"),
    ),
    index("ClassCredit_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("ClassCredit_paymentRefNo_idx").using(
      "btree",
      table.paymentRefNo.asc().nullsLast().op("text_ops"),
    ),
    index("ClassCredit_productId_idx").using(
      "btree",
      table.productId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
      name: "ClassCredit_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "ClassCredit_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "ClassCredit_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.membershipId],
			foreignColumns: [studioMembership.id],
      name: "ClassCredit_membershipId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const cancellationCreditAllocation = pgTable(
  "CancellationCreditAllocation",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    cancellationChargeId: text().notNull(),
    classCreditId: text().notNull(),
    credits: integer().notNull(),
    reversedAt: timestamp({ precision: 3, mode: "date" }),
    reversedBy: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    check(
      "CancellationCreditAllocation_credits_positive_check",
      sql`${table.credits} > 0`,
    ),
    uniqueIndex("CancellationCreditAllocation_charge_credit_key").using(
      "btree",
      table.cancellationChargeId.asc().nullsLast().op("text_ops"),
      table.classCreditId.asc().nullsLast().op("text_ops"),
    ),
    index("CancellationCreditAllocation_scope_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.createdAt.desc().nullsLast().op("timestamp_ops"),
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "CancellationCreditAllocation_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "CancellationCreditAllocation_scope_location_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.cancellationChargeId],
      foreignColumns: [cancellationCharge.id],
      name: "CancellationCreditAllocation_chargeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.classCreditId],
      foreignColumns: [classCredit.id],
      name: "CancellationCreditAllocation_classCreditId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
).enableRLS();

export const classWaitlist = pgTable(
  "ClassWaitlist",
  {
	id: text().primaryKey().notNull(),
	classId: text().notNull(),
	clientId: text().notNull(),
	position: integer().notNull(),
    joinedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    notifiedAt: timestamp({ precision: 3, mode: "date" }),
    respondedAt: timestamp({ precision: 3, mode: "date" }),
    waitlistPolicyVersionId: text(),
    waitlistPolicySource: schedulingPolicySource().default("LEGACY").notNull(),
    offerExpiresAt: timestamp({
      precision: 3,
      mode: "date",
      withTimezone: true,
    }),
    offerDispatchedAt: timestamp({
      precision: 3,
      mode: "date",
      withTimezone: true,
    }),
    offerDispatchAttempts: integer().default(0).notNull(),
    lastOfferDispatchAt: timestamp({
      precision: 3,
      mode: "date",
      withTimezone: true,
    }),
    offerDispatchError: text(),
    status: waitlistStatus().default("WAITING").notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("ClassWaitlist_classId_clientId_key").using(
      "btree",
      table.classId.asc().nullsLast().op("text_ops"),
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    index("ClassWaitlist_classId_idx").using(
      "btree",
      table.classId.asc().nullsLast().op("text_ops"),
    ),
    index("ClassWaitlist_clientId_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    index("ClassWaitlist_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    index("ClassWaitlist_offerExpiresAt_idx").using(
      "btree",
      table.offerExpiresAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("ClassWaitlist_pendingOfferDispatch_idx")
      .using("btree", table.notifiedAt.asc().nullsLast().op("timestamp_ops"))
      .where(
        sql`${table.status} = 'NOTIFIED' AND ${table.offerDispatchedAt} IS NULL`,
      ),
    check(
      "ClassWaitlist_offerDispatchAttempts_check",
      sql`${table.offerDispatchAttempts} >= 0`,
    ),
    check(
      "ClassWaitlist_offerDispatchError_check",
      sql`${table.offerDispatchError} IS NULL OR length(${table.offerDispatchError}) <= 1000`,
    ),
	foreignKey({
			columns: [table.classId],
			foreignColumns: [studioClass.id],
      name: "ClassWaitlist_classId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
      name: "ClassWaitlist_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.waitlistPolicyVersionId],
      foreignColumns: [waitlistPolicyVersion.id],
      name: "ClassWaitlist_waitlistPolicyVersionId_fkey",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
  ],
).enableRLS();

export const checkIn = pgTable(
  "CheckIn",
  {
	id: text().primaryKey().notNull(),
	clientId: text().notNull(),
	classId: text().notNull(),
    method: studioCheckInMethod().default("MANUAL").notNull(),
    checkedInAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
	checkedInBy: text(),
	isLateArrival: boolean().default(false).notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	metadata: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("CheckIn_checkedInAt_idx").using(
      "btree",
      table.checkedInAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("CheckIn_classId_idx").using(
      "btree",
      table.classId.asc().nullsLast().op("text_ops"),
    ),
    index("CheckIn_clientId_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("CheckIn_classId_clientId_key").using(
      "btree",
      table.classId.asc().nullsLast().op("text_ops"),
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    index("CheckIn_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("CheckIn_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.classId],
			foreignColumns: [studioClass.id],
      name: "CheckIn_classId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.classId],
      foreignColumns: [studioClass.organizationId, studioClass.id],
      name: "CheckIn_organizationId_classId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
      name: "CheckIn_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.clientId],
      foreignColumns: [client.organizationId, client.id],
      name: "CheckIn_organizationId_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "CheckIn_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "CheckIn_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const membershipPlan = pgTable(
  "MembershipPlan",
  {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	type: membershipPlanType().notNull(),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
    currency: text().default("USD").notNull(),
    billingInterval: billingInterval().default("MONTHLY").notNull(),
	classCredits: integer(),
	durationDays: integer(),
	maxFreezeDays: integer(),
	allowedClassTypeIds: text().array().default([]),
	isIntroOffer: boolean().default(false).notNull(),
	trialDays: integer(),
	cancellationNoticeDays: integer(),
	sortOrder: integer().default(0).notNull(),
	isActive: boolean().default(true).notNull(),
	isPublic: boolean().default(true).notNull(),
	organizationId: text().notNull(),
	locationId: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    platformFeePercent: numeric({ precision: 5, scale: 2 }).default("0"),
	stripePriceId: text(),
	stripeProductId: text(),
    stripeConnectionId: text(),
  },
  (table) => [
    index("MembershipPlan_isActive_idx").using(
      "btree",
      table.isActive.asc().nullsLast().op("bool_ops"),
    ),
    index("MembershipPlan_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("MembershipPlan_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("MembershipPlan_stripeConnectionId_idx").using(
      "btree",
      table.stripeConnectionId.asc().nullsLast().op("text_ops"),
    ),
    index("MembershipPlan_type_idx").using(
      "btree",
      table.type.asc().nullsLast().op("enum_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "MembershipPlan_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "MembershipPlan_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.organizationId, table.stripeConnectionId],
      foreignColumns: [stripeConnection.organizationId, stripeConnection.id],
      name: "MembershipPlan_stripeConnection_scope_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [
        table.organizationId,
        table.locationId,
        table.stripeConnectionId,
      ],
      foreignColumns: [
        stripeConnection.organizationId,
        stripeConnection.locationId,
        stripeConnection.id,
      ],
      name: "MembershipPlan_stripeConnection_location_scope_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    check(
      "MembershipPlan_stripe_binding_check",
      sql`(${table.stripePriceId} IS NULL AND ${table.stripeProductId} IS NULL) OR ${table.stripeConnectionId} IS NOT NULL`,
    ),
  ],
).enableRLS();

export const pricingOption = pgTable(
  "PricingOption",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	membershipPlanId: text(),
	name: text().notNull(),
	slug: text().notNull(),
	description: text(),
    type: pricingOptionType().default("MEMBERSHIP").notNull(),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
    currency: text().default("GBP").notNull(),
    billingInterval: billingInterval().default("ONE_TIME").notNull(),
	classCredits: integer(),
	durationDays: integer(),
	revenueCategory: text(),
	isIntroOffer: boolean().default(false).notNull(),
	isBundle: boolean().default(false).notNull(),
	isPublic: boolean().default(true).notNull(),
	isHidden: boolean().default(false).notNull(),
	showInPos: boolean().default(true).notNull(),
	directPurchaseEnabled: boolean().default(true).notNull(),
	buyPagePath: text(),
	termsText: text(),
	confirmationEmailBody: text(),
	confirmationRedirectUrl: text(),
    commissionMode: text().default("NONE").notNull(),
	commissionValue: numeric({ precision: 10, scale:  2 }),
	maxPurchases: integer(),
	maxPurchasesPerClient: integer(),
	bookingLimits: jsonb().default({}).notNull(),
	accessSummary: text(),
	sortOrder: integer().default(0).notNull(),
	isActive: boolean().default(true).notNull(),
	metadata: jsonb().default({}).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("PricingOption_billingInterval_idx").using(
      "btree",
      table.billingInterval.asc().nullsLast().op("enum_ops"),
    ),
    index("PricingOption_isActive_idx").using(
      "btree",
      table.isActive.asc().nullsLast().op("bool_ops"),
    ),
    index("PricingOption_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("PricingOption_membershipPlanId_idx").using(
      "btree",
      table.membershipPlanId.asc().nullsLast().op("text_ops"),
    ),
    index("PricingOption_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("PricingOption_showInPos_idx").using(
      "btree",
      table.showInPos.asc().nullsLast().op("bool_ops"),
    ),
    index("PricingOption_type_idx").using(
      "btree",
      table.type.asc().nullsLast().op("enum_ops"),
    ),
    uniqueIndex("PricingOption_organizationId_slug_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.slug.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "PricingOption_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "PricingOption_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.membershipPlanId],
			foreignColumns: [membershipPlan.id],
      name: "PricingOption_membershipPlanId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const stripeEvent = pgTable(
  "StripeEvent",
  {
	id: text().primaryKey().notNull(),
	stripeEventId: text().notNull(),
	type: text().notNull(),
	organizationId: text(),
	locationId: text(),
    status: stripeEventStatus().default("RECEIVED").notNull(),
    source: text().default("PLATFORM").notNull(),
    stripeAccountId: text(),
    stripeConnectionId: text(),
    instructorId: text(),
    apiVersion: text(),
    livemode: boolean().default(false).notNull(),
    objectId: text(),
    objectType: text(),
    payloadHash: text(),
    encryptedPayload: text(),
    payloadExpiresAt: timestamp({ precision: 3, mode: "date" }),
    attempts: integer().default(0).notNull(),
    maxAttempts: integer().default(8).notNull(),
    receivedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    lastAttemptAt: timestamp({ precision: 3, mode: "date" }),
    nextAttemptAt: timestamp({ precision: 3, mode: "date" }),
    processedAt: timestamp({ precision: 3, mode: "date" }),
    errorCode: text(),
    errorMessage: text(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("StripeEvent_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("StripeEvent_stripeEventId_key").using(
      "btree",
      table.stripeEventId.asc().nullsLast().op("text_ops"),
    ),
    index("StripeEvent_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("StripeEvent_status_nextAttemptAt_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
      table.nextAttemptAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("StripeEvent_stripeAccountId_idx").using(
      "btree",
      table.stripeAccountId.asc().nullsLast().op("text_ops"),
    ),
    index("StripeEvent_stripeConnectionId_idx").using(
      "btree",
      table.stripeConnectionId.asc().nullsLast().op("text_ops"),
    ),
    index("StripeEvent_instructorId_idx").using(
      "btree",
      table.instructorId.asc().nullsLast().op("text_ops"),
    ),
    index("StripeEvent_type_idx").using(
      "btree",
      table.type.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.organizationId, table.stripeConnectionId],
      foreignColumns: [stripeConnection.organizationId, stripeConnection.id],
      name: "StripeEvent_stripeConnection_scope_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [
        table.organizationId,
        table.locationId,
        table.stripeConnectionId,
      ],
      foreignColumns: [
        stripeConnection.organizationId,
        stripeConnection.locationId,
        stripeConnection.id,
      ],
      name: "StripeEvent_stripeConnection_location_scope_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.instructorId],
      foreignColumns: [instructor.id],
      name: "StripeEvent_instructorId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    check(
      "StripeEvent_stripeConnection_organization_check",
      sql`${table.stripeConnectionId} IS NULL OR ${table.organizationId} IS NOT NULL`,
    ),
    check(
      "StripeEvent_instructor_organization_check",
      sql`${table.instructorId} IS NULL OR ${table.organizationId} IS NOT NULL`,
    ),
    check(
      "StripeEvent_processed_binding_check",
      sql`${table.status} <> 'PROCESSED' OR (${table.source} = 'STRIPE_CONNECT_INSTRUCTOR' AND ${table.instructorId} IS NOT NULL) OR (${table.source} <> 'STRIPE_CONNECT_INSTRUCTOR' AND (${table.organizationId} IS NULL OR ${table.stripeConnectionId} IS NOT NULL))`,
    ),
  ],
).enableRLS();

export const apps = pgTable(
  "Apps",
  {
	id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
	provider: appProvider().notNull(),
	accessToken: text(),
	refreshToken: text(),
    expiresAt: timestamp({ precision: 3, mode: "date" }),
	scopes: text().array(),
	metadata: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
	userId: text().notNull(),
  },
  (table) => [
    index("Apps_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("Apps_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("Apps_org_provider_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.provider.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.locationId} IS NULL`),
    uniqueIndex("Apps_location_provider_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
        table.provider.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.locationId} IS NOT NULL`),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "Apps_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "Apps_organizationId_locationId_fkey",
    }).onUpdate("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
      name: "Apps_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const aiLog = pgTable(
  "AILog",
  {
	id: text().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	intent: text(),
	userMessage: text().notNull(),
    status: aiLogStatus().default("RUNNING").notNull(),
	error: text(),
	result: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    completedAt: timestamp({ precision: 3, mode: "date" }),
	userId: text().notNull(),
	organizationId: text(),
	locationId: text(),
    credentialId: text(),
    model: text(),
  },
  (table) => [
    index("AILog_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("AILog_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("AILog_userId_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("text_ops"),
    ),
    index("AILog_credentialId_idx").using(
      "btree",
      table.credentialId.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.organizationId, table.credentialId],
      foreignColumns: [credential.organizationId, credential.id],
      name: "AILog_credential_scope_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.locationId, table.credentialId],
      foreignColumns: [
        credential.organizationId,
        credential.locationId,
        credential.id,
      ],
      name: "AILog_credential_location_scope_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "AILog_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "AILog_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
      name: "AILog_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    check(
      "AILog_credential_organization_check",
      sql`${table.credentialId} IS NULL OR ${table.organizationId} IS NOT NULL`,
    ),
    check(
      "AILog_credential_model_check",
      sql`${table.credentialId} IS NULL OR ${table.model} IS NOT NULL`,
    ),
  ],
).enableRLS();

export const outlookSubscription = pgTable(
  "OutlookSubscription",
  {
	id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    providerAccountId: text().notNull(),
    userId: text(),
	emailAddress: text().notNull(),
	subscriptionId: text(),
    clientStateHash: text().notNull(),
    expiresAt: timestamp({ precision: 3, mode: "date" }),
    lastSyncedAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("OutlookSubscription_emailAddress_idx").using(
      "btree",
      table.emailAddress.asc().nullsLast().op("text_ops"),
    ),
    index("OutlookSubscription_organizationId_locationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("OutlookSubscription_providerAccountId_key").using(
      "btree",
      table.providerAccountId.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "OutlookSubscription_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "OutlookSubscription_organizationId_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.providerAccountId],
      foreignColumns: [providerAccount.organizationId, providerAccount.id],
      name: "OutlookSubscription_providerAccountId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
      name: "OutlookSubscription_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const outlookTriggerState = pgTable(
  "OutlookTriggerState",
  {
	id: text().primaryKey().notNull(),
	nodeId: text().notNull(),
	workflowId: text().notNull(),
	lastMessageId: text(),
    lastTriggeredAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("OutlookTriggerState_nodeId_key").using(
      "btree",
      table.nodeId.asc().nullsLast().op("text_ops"),
    ),
    index("OutlookTriggerState_workflowId_idx").using(
      "btree",
      table.workflowId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.nodeId],
			foreignColumns: [node.id],
      name: "OutlookTriggerState_nodeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.workflowId],
			foreignColumns: [workflows.id],
      name: "OutlookTriggerState_workflowId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const oneDriveSubscription = pgTable(
  "OneDriveSubscription",
  {
	id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    providerAccountId: text().notNull(),
    userId: text(),
	subscriptionId: text(),
    clientStateHash: text().notNull(),
    expiresAt: timestamp({ precision: 3, mode: "date" }),
    lastSyncedAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("OneDriveSubscription_organizationId_locationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("OneDriveSubscription_providerAccountId_key").using(
      "btree",
      table.providerAccountId.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "OneDriveSubscription_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "OneDriveSubscription_organizationId_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.providerAccountId],
      foreignColumns: [providerAccount.organizationId, providerAccount.id],
      name: "OneDriveSubscription_providerAccountId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
      name: "OneDriveSubscription_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const oneDriveTriggerState = pgTable(
  "OneDriveTriggerState",
  {
	id: text().primaryKey().notNull(),
	nodeId: text().notNull(),
	workflowId: text().notNull(),
	lastDeltaLink: text(),
    lastTriggeredAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("OneDriveTriggerState_nodeId_key").using(
      "btree",
      table.nodeId.asc().nullsLast().op("text_ops"),
    ),
    index("OneDriveTriggerState_workflowId_idx").using(
      "btree",
      table.workflowId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.nodeId],
			foreignColumns: [node.id],
      name: "OneDriveTriggerState_nodeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.workflowId],
			foreignColumns: [workflows.id],
      name: "OneDriveTriggerState_workflowId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const studioPayment = pgTable(
  "StudioPayment",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	clientId: text(),
	membershipId: text(),
	productId: text(),
	externalId: text(),
	mindbodyPmtRefNo: text(),
	paymentMethod: text(),
	stripePaymentIntentId: text(),
	stripeCustomerId: text(),
    stripeConnectionId: text(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
    currency: text().default("GBP").notNull(),
    status: studioPaymentStatus().default("PENDING").notNull(),
	type: studioPaymentType().notNull(),
	description: text(),
	metadata: jsonb(),
	promoCodeId: text(),
	discountAmount: numeric({ precision: 10, scale:  2 }),
	taxAmount: numeric({ precision: 10, scale:  2 }),
    deletedAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("StudioPayment_clientId_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioPayment_createdAt_idx").using(
      "btree",
      table.createdAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("StudioPayment_externalId_idx").using(
      "btree",
      table.externalId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioPayment_membershipId_idx").using(
      "btree",
      table.membershipId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioPayment_mindbodyPmtRefNo_idx").using(
      "btree",
      table.mindbodyPmtRefNo.asc().nullsLast().op("text_ops"),
    ),
    index("StudioPayment_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioPayment_paymentMethod_idx").using(
      "btree",
      table.paymentMethod.asc().nullsLast().op("text_ops"),
    ),
    index("StudioPayment_productId_idx").using(
      "btree",
      table.productId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioPayment_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    index("StudioPayment_stripeConnectionId_idx").using(
      "btree",
      table.stripeConnectionId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("StudioPayment_stripePaymentIntentId_key").using(
      "btree",
      table.stripePaymentIntentId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioPayment_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioPayment_type_idx").using(
      "btree",
      table.type.asc().nullsLast().op("enum_ops"),
    ),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
      name: "StudioPayment_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.membershipId],
			foreignColumns: [studioMembership.id],
      name: "StudioPayment_membershipId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "StudioPayment_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.promoCodeId],
			foreignColumns: [promoCode.id],
      name: "StudioPayment_promoCodeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "StudioPayment_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.organizationId, table.stripeConnectionId],
      foreignColumns: [stripeConnection.organizationId, stripeConnection.id],
      name: "StudioPayment_stripeConnection_scope_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [
        table.organizationId,
        table.locationId,
        table.stripeConnectionId,
      ],
      foreignColumns: [
        stripeConnection.organizationId,
        stripeConnection.locationId,
        stripeConnection.id,
      ],
      name: "StudioPayment_stripeConnection_location_scope_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    check(
      "StudioPayment_stripe_binding_check",
      sql`${table.stripePaymentIntentId} IS NULL OR ${table.stripeConnectionId} IS NOT NULL`,
    ),
  ],
).enableRLS();

export const promoCode = pgTable(
  "PromoCode",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	code: text().notNull(),
    discountType: discountType().default("PERCENT").notNull(),
	discountValue: numeric({ precision: 10, scale:  2 }).notNull(),
	maxRedemptions: integer(),
	redemptionCount: integer().default(0).notNull(),
	applicablePlanIds: text().array().default([]),
    applicablePricingOptionIds: text().array().default([]),
    expiresAt: timestamp({ precision: 3, mode: "date" }),
	isActive: boolean().default(true).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("PromoCode_isActive_idx").using(
      "btree",
      table.isActive.asc().nullsLast().op("bool_ops"),
    ),
    uniqueIndex("PromoCode_organizationId_code_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.code.asc().nullsLast().op("text_ops"),
    ),
    index("PromoCode_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("PromoCode_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "PromoCode_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.locationId],
      foreignColumns: [location.id],
      name: "PromoCode_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const clientAccountBalance = pgTable(
  "ClientAccountBalance",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    clientId: text().notNull(),
    balance: numeric({ precision: 10, scale: 2 }).default("0").notNull(),
    currency: text().default("GBP").notNull(),
    metadata: jsonb().default({}).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("ClientAccountBalance_clientId_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    index("ClientAccountBalance_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("ClientAccountBalance_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("ClientAccountBalance_organizationId_locationId_clientId_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
        table.clientId.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.locationId} IS NOT NULL`),
    uniqueIndex("ClientAccountBalance_organizationId_global_clientId_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.clientId.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.locationId} IS NULL`),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "ClientAccountBalance_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.locationId],
      foreignColumns: [location.id],
      name: "ClientAccountBalance_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.clientId],
      foreignColumns: [client.id],
      name: "ClientAccountBalance_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const clientAccountCreditTransaction = pgTable(
  "ClientAccountCreditTransaction",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    clientId: text().notNull(),
    balanceId: text().notNull(),
    paymentId: text(),
    pricingOptionId: text(),
    type: clientAccountCreditTransactionType().notNull(),
    amount: numeric({ precision: 10, scale: 2 }).notNull(),
    currency: text().default("GBP").notNull(),
    description: text(),
    metadata: jsonb().default({}).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("ClientAccountCreditTransaction_balanceId_idx").using(
      "btree",
      table.balanceId.asc().nullsLast().op("text_ops"),
    ),
    index("ClientAccountCreditTransaction_clientId_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    index("ClientAccountCreditTransaction_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("ClientAccountCreditTransaction_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("ClientAccountCreditTransaction_paymentId_idx").using(
      "btree",
      table.paymentId.asc().nullsLast().op("text_ops"),
    ),
    index("ClientAccountCreditTransaction_pricingOptionId_idx").using(
      "btree",
      table.pricingOptionId.asc().nullsLast().op("text_ops"),
    ),
    index("ClientAccountCreditTransaction_type_idx").using(
      "btree",
      table.type.asc().nullsLast().op("enum_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "ClientAccountCreditTransaction_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "ClientAccountCreditTransaction_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.clientId],
      foreignColumns: [client.id],
      name: "ClientAccountCreditTransaction_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.balanceId],
      foreignColumns: [clientAccountBalance.id],
      name: "ClientAccountCreditTransaction_balanceId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.paymentId],
      foreignColumns: [studioPayment.id],
      name: "ClientAccountCreditTransaction_paymentId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.pricingOptionId],
      foreignColumns: [pricingOption.id],
      name: "ClientAccountCreditTransaction_pricingOptionId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const instructorPayout = pgTable(
  "InstructorPayout",
  {
	id: text().primaryKey().notNull(),
	instructorId: text().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	stripeTransferId: text(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
    currency: text().default("GBP").notNull(),
    status: payoutStatus().default("PENDING").notNull(),
    periodStart: timestamp({ precision: 3, mode: "date" }).notNull(),
    periodEnd: timestamp({ precision: 3, mode: "date" }).notNull(),
	classesCount: integer().default(0).notNull(),
	notes: text(),
    paidAt: timestamp({ precision: 3, mode: "date" }),
    deletedAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("InstructorPayout_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("InstructorPayout_periodStart_idx").using(
      "btree",
      table.periodStart.asc().nullsLast().op("timestamp_ops"),
    ),
    index("InstructorPayout_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    uniqueIndex("InstructorPayout_stripeTransferId_key").using(
      "btree",
      table.stripeTransferId.asc().nullsLast().op("text_ops"),
    ),
    index("InstructorPayout_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("InstructorPayout_instructorId_idx").using(
      "btree",
      table.instructorId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "InstructorPayout_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "InstructorPayout_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.instructorId],
			foreignColumns: [instructor.id],
      name: "InstructorPayout_instructorId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const giftCard = pgTable(
  "GiftCard",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	code: text().notNull(),
	initialValue: numeric({ precision: 10, scale:  2 }).notNull(),
	remainingBalance: numeric({ precision: 10, scale:  2 }).notNull(),
    currency: text().default("GBP").notNull(),
	purchasedByClientId: text(),
	redeemedByClientId: text(),
	isActive: boolean().default(true).notNull(),
    purchasedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    redeemedAt: timestamp({ precision: 3, mode: "date" }),
    expiresAt: timestamp({ precision: 3, mode: "date" }),
	notes: text(),
	stripePaymentIntentId: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("GiftCard_isActive_idx").using(
      "btree",
      table.isActive.asc().nullsLast().op("bool_ops"),
    ),
    uniqueIndex("GiftCard_organizationId_code_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.code.asc().nullsLast().op("text_ops"),
    ),
    index("GiftCard_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("GiftCard_purchasedByClientId_idx").using(
      "btree",
      table.purchasedByClientId.asc().nullsLast().op("text_ops"),
    ),
    index("GiftCard_redeemedByClientId_idx").using(
      "btree",
      table.redeemedByClientId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("GiftCard_stripePaymentIntentId_key").using(
      "btree",
      table.stripePaymentIntentId.asc().nullsLast().op("text_ops"),
    ),
    index("GiftCard_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "GiftCard_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.purchasedByClientId],
			foreignColumns: [client.id],
      name: "GiftCard_purchasedByClientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.redeemedByClientId],
			foreignColumns: [client.id],
      name: "GiftCard_redeemedByClientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "GiftCard_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const studioProduct = pgTable(
  "StudioProduct",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	externalId: text(),
	sku: text(),
	name: text().notNull(),
	description: text(),
    type: studioProductType().default("OTHER").notNull(),
	category: text(),
    price: numeric({ precision: 10, scale: 2 }).default("0").notNull(),
	cost: numeric({ precision: 10, scale:  2 }),
    currency: text().default("GBP").notNull(),
	taxRate: numeric({ precision: 5, scale:  2 }),
	trackInventory: boolean().default(false).notNull(),
	stockQuantity: integer(),
	lowStockThreshold: integer(),
	isActive: boolean().default(true).notNull(),
	isPublic: boolean().default(true).notNull(),
	metadata: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    deletedAt: timestamp({ precision: 3, mode: "date" }),
  },
  (table) => [
    index("StudioProduct_category_idx").using(
      "btree",
      table.category.asc().nullsLast().op("text_ops"),
    ),
    index("StudioProduct_isActive_idx").using(
      "btree",
      table.isActive.asc().nullsLast().op("bool_ops"),
    ),
    index("StudioProduct_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioProduct_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioProduct_organizationId_locationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioProduct_type_idx").using(
      "btree",
      table.type.asc().nullsLast().op("enum_ops"),
    ),
    uniqueIndex("StudioProduct_organizationId_externalId_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.externalId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("StudioProduct_organizationId_sku_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.sku.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "StudioProduct_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "StudioProduct_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const pricingOptionAccessGrant = pgTable(
  "PricingOptionAccessGrant",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	pricingOptionId: text().notNull(),
    targetType: pricingAccessTargetType().default("ALL_SERVICES").notNull(),
	serviceTypeId: text(),
	serviceCategoryId: text(),
	classTypeId: text(),
	productId: text(),
	targetKey: text(),
	visitLimit: integer(),
	bookingLimitPerDay: integer(),
	bookingLimitPerWeek: integer(),
	bookingLimitPerMonth: integer(),
	metadata: jsonb().default({}).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("PricingOptionAccessGrant_classTypeId_idx").using(
      "btree",
      table.classTypeId.asc().nullsLast().op("text_ops"),
    ),
    index("PricingOptionAccessGrant_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("PricingOptionAccessGrant_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("PricingOptionAccessGrant_pricingOptionId_idx").using(
      "btree",
      table.pricingOptionId.asc().nullsLast().op("text_ops"),
    ),
    index("PricingOptionAccessGrant_productId_idx").using(
      "btree",
      table.productId.asc().nullsLast().op("text_ops"),
    ),
    index("PricingOptionAccessGrant_serviceCategoryId_idx").using(
      "btree",
      table.serviceCategoryId.asc().nullsLast().op("text_ops"),
    ),
    index("PricingOptionAccessGrant_serviceTypeId_idx").using(
      "btree",
      table.serviceTypeId.asc().nullsLast().op("text_ops"),
    ),
    index("PricingOptionAccessGrant_targetType_idx").using(
      "btree",
      table.targetType.asc().nullsLast().op("enum_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "PricingOptionAccessGrant_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "PricingOptionAccessGrant_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.pricingOptionId],
			foreignColumns: [pricingOption.id],
      name: "PricingOptionAccessGrant_pricingOptionId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.serviceTypeId],
			foreignColumns: [serviceType.id],
      name: "PricingOptionAccessGrant_serviceTypeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.serviceCategoryId],
			foreignColumns: [serviceCategory.id],
      name: "PricingOptionAccessGrant_serviceCategoryId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.classTypeId],
			foreignColumns: [classType.id],
      name: "PricingOptionAccessGrant_classTypeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [studioProduct.id],
      name: "PricingOptionAccessGrant_productId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const studioPaymentLineItem = pgTable(
  "StudioPaymentLineItem",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	paymentId: text(),
	clientId: text(),
	productId: text(),
	externalId: text(),
	saleId: text(),
	mindbodyPmtRefNo: text(),
	productExternalId: text(),
	description: text(),
	category: text(),
	quantity: integer().default(1).notNull(),
    unitPrice: numeric({ precision: 10, scale: 2 }).default("0").notNull(),
    discountAmount: numeric({ precision: 10, scale: 2 }).default("0").notNull(),
    amount: numeric({ precision: 10, scale: 2 }).default("0").notNull(),
    currency: text().default("GBP").notNull(),
	returned: boolean().default(false).notNull(),
    soldAt: timestamp({ precision: 3, mode: "date" }),
	metadata: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    deletedAt: timestamp({ precision: 3, mode: "date" }),
  },
  (table) => [
    index("StudioPaymentLineItem_clientId_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioPaymentLineItem_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioPaymentLineItem_mindbodyPmtRefNo_idx").using(
      "btree",
      table.mindbodyPmtRefNo.asc().nullsLast().op("text_ops"),
    ),
    index("StudioPaymentLineItem_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioPaymentLineItem_paymentId_idx").using(
      "btree",
      table.paymentId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioPaymentLineItem_productId_idx").using(
      "btree",
      table.productId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioPaymentLineItem_saleId_idx").using(
      "btree",
      table.saleId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioPaymentLineItem_soldAt_idx").using(
      "btree",
      table.soldAt.asc().nullsLast().op("timestamp_ops"),
    ),
    uniqueIndex("StudioPaymentLineItem_organizationId_externalId_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.externalId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
      name: "StudioPaymentLineItem_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "StudioPaymentLineItem_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "StudioPaymentLineItem_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.paymentId],
			foreignColumns: [studioPayment.id],
      name: "StudioPaymentLineItem_paymentId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [studioProduct.id],
      name: "StudioPaymentLineItem_productId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const apiKey = pgTable(
  "ApiKey",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
    locationId: text(),
	name: text().notNull(),
	keyHash: text().notNull(),
	keyPrefix: text().notNull(),
	scopes: text().array().default([]),
    lastUsedAt: timestamp({ precision: 3, mode: "date" }),
    expiresAt: timestamp({ precision: 3, mode: "date" }),
	isActive: boolean().default(true).notNull(),
	createdBy: text().notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("ApiKey_isActive_idx").using(
      "btree",
      table.isActive.asc().nullsLast().op("bool_ops"),
    ),
    index("ApiKey_keyHash_idx").using(
      "btree",
      table.keyHash.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("ApiKey_keyHash_key").using(
      "btree",
      table.keyHash.asc().nullsLast().op("text_ops"),
    ),
    index("ApiKey_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("ApiKey_scope_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "ApiKey_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "ApiKey_scope_location_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const widgetConfig = pgTable(
  "WidgetConfig",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
    locationId: text(),
	name: text().notNull(),
    type: widgetType().default("SCHEDULE").notNull(),
	config: jsonb().default({}).notNull(),
	isActive: boolean().default(true).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("WidgetConfig_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("WidgetConfig_organizationId_locationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("WidgetConfig_type_idx").using(
      "btree",
      table.type.asc().nullsLast().op("enum_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "WidgetConfig_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "WidgetConfig_organizationId_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const importJob = pgTable(
  "ImportJob",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
    source: importSource().default("CSV").notNull(),
    status: importStatus().default("PENDING").notNull(),
	totalRecords: integer().default(0).notNull(),
	processedRecords: integer().default(0).notNull(),
	failedRecords: integer().default(0).notNull(),
	columnMapping: jsonb().default({}).notNull(),
	importConfig: jsonb().default({}).notNull(),
	entityCounts: jsonb().default({}).notNull(),
	entityProgress: jsonb().default({}).notNull(),
	sourceFilenames: text().array().default([]),
	rawFileUrl: text(),
	errorLog: jsonb().default([]).notNull(),
	warningLog: jsonb().default([]).notNull(),
	missingFields: jsonb().default([]).notNull(),
	importedBy: text().notNull(),
    startedAt: timestamp({ precision: 3, mode: "date" }),
    completedAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("ImportJob_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("ImportJob_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("ImportJob_source_idx").using(
      "btree",
      table.source.asc().nullsLast().op("enum_ops"),
    ),
    index("ImportJob_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "ImportJob_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "ImportJob_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const deviceToken = pgTable(
  "DeviceToken",
  {
	id: text().primaryKey().notNull(),
	clientId: text().notNull(),
	organizationId: text().notNull(),
	token: text().notNull(),
	platform: devicePlatform().notNull(),
	isActive: boolean().default(true).notNull(),
    lastUsedAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("DeviceToken_clientId_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("DeviceToken_clientId_token_key").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
      table.token.asc().nullsLast().op("text_ops"),
    ),
    index("DeviceToken_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("DeviceToken_token_idx").using(
      "btree",
      table.token.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
      name: "DeviceToken_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "DeviceToken_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const mobileSession = pgTable(
  "MobileSession",
  {
	id: text().primaryKey().notNull(),
	clientId: text().notNull(),
	organizationId: text().notNull(),
	sessionToken: text().notNull(),
    expiresAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("MobileSession_clientId_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    index("MobileSession_sessionToken_idx").using(
      "btree",
      table.sessionToken.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("MobileSession_sessionToken_key").using(
      "btree",
      table.sessionToken.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
      name: "MobileSession_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "MobileSession_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const inboxConversation = pgTable(
  "InboxConversation",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	clientId: text(),
    routeId: text(),
    assigneeStaffIdentityId: text(),
    assignedAt: timestamp({ precision: 3, mode: "date" }),
    assignedByUserId: text(),
    replyRoutingTokenHash: text(),
	channel: conversationChannel().notNull(),
    status: conversationStatus().default("OPEN").notNull(),
	subject: text(),
	isRead: boolean().default(true).notNull(),
    lastMessageAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("InboxConversation_clientId_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    index("InboxConversation_routeId_idx").using(
      "btree",
      table.routeId.asc().nullsLast().op("text_ops"),
    ),
    index("InboxConversation_assigneeStaffIdentityId_idx").using(
      "btree",
      table.assigneeStaffIdentityId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("InboxConversation_replyRoutingTokenHash_key")
      .using(
        "btree",
        table.replyRoutingTokenHash.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.replyRoutingTokenHash} IS NOT NULL`),
    index("InboxConversation_lastMessageAt_idx").using(
      "btree",
      table.lastMessageAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("InboxConversation_organizationId_locationId_isRead_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.isRead.asc().nullsLast().op("bool_ops"),
    ),
    index("InboxConversation_organizationId_locationId_status_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("enum_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.status.asc().nullsLast().op("enum_ops"),
    ),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
      name: "InboxConversation_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "InboxConversation_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "InboxConversation_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.routeId],
      foreignColumns: [inboxRoute.id],
      name: "InboxConversation_routeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.assigneeStaffIdentityId],
      foreignColumns: [staffIdentity.id],
      name: "InboxConversation_assigneeStaffIdentityId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.assignedByUserId],
      foreignColumns: [user.id],
      name: "InboxConversation_assignedByUserId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const inboxMessage = pgTable(
  "InboxMessage",
  {
	id: text().primaryKey().notNull(),
	conversationId: text().notNull(),
	direction: messageDirection().notNull(),
	content: text().notNull(),
	isRead: boolean().default(false).notNull(),
	senderUserId: text(),
    deliveryId: text(),
    providerAccountId: text(),
    inboundReceiptId: text(),
    externalMessageId: text(),
    externalThreadId: text(),
    fromAddress: text(),
    toAddress: text(),
    subject: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("InboxMessage_conversationId_createdAt_idx").using(
      "btree",
      table.conversationId.asc().nullsLast().op("text_ops"),
      table.createdAt.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("InboxMessage_deliveryId_key")
      .using("btree", table.deliveryId.asc().nullsLast().op("text_ops"))
      .where(sql`${table.deliveryId} IS NOT NULL`),
    uniqueIndex("InboxMessage_inboundReceiptId_key")
      .using("btree", table.inboundReceiptId.asc().nullsLast().op("text_ops"))
      .where(sql`${table.inboundReceiptId} IS NOT NULL`),
    uniqueIndex("InboxMessage_providerAccountId_externalMessageId_key")
      .using(
        "btree",
        table.providerAccountId.asc().nullsLast().op("text_ops"),
        table.externalMessageId.asc().nullsLast().op("text_ops"),
      )
      .where(
        sql`${table.providerAccountId} IS NOT NULL AND ${table.externalMessageId} IS NOT NULL`,
      ),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [inboxConversation.id],
      name: "InboxMessage_conversationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.deliveryId],
      foreignColumns: [outboundDelivery.id],
      name: "InboxMessage_deliveryId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.providerAccountId],
      foreignColumns: [providerAccount.id],
      name: "InboxMessage_providerAccountId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.inboundReceiptId],
      foreignColumns: [inboundMessageReceipt.id],
      name: "InboxMessage_inboundReceiptId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const clientInstructor = pgTable(
  "ClientInstructor",
  {
	id: text().primaryKey().notNull(),
	clientId: text().notNull(),
	instructorId: text().notNull(),
    assignedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("ClientInstructor_clientId_instructorId_key").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
      table.instructorId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
      name: "ClientInstructor_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.instructorId],
			foreignColumns: [instructor.id],
      name: "ClientInstructor_instructorId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const externalChannelIntegration = pgTable(
  "ExternalChannelIntegration",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	provider: externalChannelProvider().notNull(),
    status: externalChannelStatus().default("DRAFT").notNull(),
	accountName: text(),
	externalAccountId: text(),
	bookingUrl: text(),
	credentials: jsonb(),
	config: jsonb(),
    lastSyncedAt: timestamp({ precision: 3, mode: "date" }),
    enabledAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("ExternalChannelIntegration_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex(
      "ExternalChannelIntegration_organizationId_locationId_prov_key",
    ).using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.provider.asc().nullsLast().op("text_ops"),
    ),
    index("ExternalChannelIntegration_provider_idx").using(
      "btree",
      table.provider.asc().nullsLast().op("enum_ops"),
    ),
    index("ExternalChannelIntegration_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    index("ExternalChannelIntegration_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "ExternalChannelIntegration_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "ExternalChannelIntegration_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const clientHousehold = pgTable(
  "ClientHousehold",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	name: text().notNull(),
	primaryContactId: text(),
	notes: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("ClientHousehold_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("ClientHousehold_organizationId_locationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("ClientHousehold_primaryContactId_idx").using(
      "btree",
      table.primaryContactId.asc().nullsLast().op("text_ops"),
    ),
    index("ClientHousehold_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "ClientHousehold_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.primaryContactId],
			foreignColumns: [client.id],
      name: "ClientHousehold_primaryContactId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "ClientHousehold_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const clientHouseholdMember = pgTable(
  "ClientHouseholdMember",
  {
	id: text().primaryKey().notNull(),
	householdId: text().notNull(),
	clientId: text().notNull(),
    role: householdRole().default("MEMBER").notNull(),
	relationship: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("ClientHouseholdMember_clientId_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("ClientHouseholdMember_householdId_clientId_key").using(
      "btree",
      table.householdId.asc().nullsLast().op("text_ops"),
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    index("ClientHouseholdMember_householdId_idx").using(
      "btree",
      table.householdId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
      name: "ClientHouseholdMember_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.householdId],
			foreignColumns: [clientHousehold.id],
      name: "ClientHouseholdMember_householdId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const instructorSubstitutionRequest = pgTable(
  "InstructorSubstitutionRequest",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	classId: text().notNull(),
	originalInstructorId: text(),
	substituteId: text(),
    status: instructorSubstitutionStatus().default("OPEN").notNull(),
	reason: text(),
    requestedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    acceptedAt: timestamp({ precision: 3, mode: "date" }),
    declinedAt: timestamp({ precision: 3, mode: "date" }),
    expiresAt: timestamp({ precision: 3, mode: "date" }),
	notes: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("InstructorSubstitutionRequest_classId_idx").using(
      "btree",
      table.classId.asc().nullsLast().op("text_ops"),
    ),
    index("InstructorSubstitutionRequest_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("InstructorSubstitutionRequest_organizationId_status_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    index("InstructorSubstitutionRequest_originalInstructorId_idx").using(
      "btree",
      table.originalInstructorId.asc().nullsLast().op("text_ops"),
    ),
    index("InstructorSubstitutionRequest_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    index("InstructorSubstitutionRequest_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("InstructorSubstitutionRequest_substituteId_idx").using(
      "btree",
      table.substituteId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.classId],
			foreignColumns: [studioClass.id],
      name: "InstructorSubstitutionRequest_classId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "InstructorSubstitutionRequest_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.originalInstructorId],
			foreignColumns: [instructor.id],
      name: "InstructorSubstitutionRequest_originalInstructorId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "InstructorSubstitutionRequest_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.substituteId],
			foreignColumns: [instructor.id],
      name: "InstructorSubstitutionRequest_substituteId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const dynamicPricingRule = pgTable(
  "DynamicPricingRule",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	name: text().notNull(),
	classTypeId: text(),
	daysOfWeek: integer().array().default([]),
    startsAt: timestamp({ precision: 3, mode: "date" }),
    endsAt: timestamp({ precision: 3, mode: "date" }),
	adjustmentType: pricingAdjustmentType().notNull(),
	adjustmentValue: numeric({ precision: 10, scale:  2 }).notNull(),
	minPrice: numeric({ precision: 10, scale:  2 }),
	maxPrice: numeric({ precision: 10, scale:  2 }),
	demandThresholdPercent: integer(),
	isActive: boolean().default(true).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("DynamicPricingRule_classTypeId_idx").using(
      "btree",
      table.classTypeId.asc().nullsLast().op("text_ops"),
    ),
    index("DynamicPricingRule_isActive_idx").using(
      "btree",
      table.isActive.asc().nullsLast().op("bool_ops"),
    ),
    index("DynamicPricingRule_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("DynamicPricingRule_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.classTypeId],
			foreignColumns: [classType.id],
      name: "DynamicPricingRule_classTypeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "DynamicPricingRule_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "DynamicPricingRule_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const studioPaymentPlan = pgTable(
  "StudioPaymentPlan",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	membershipPlanId: text(),
	name: text().notNull(),
    provider: installmentProvider().default("INTERNAL").notNull(),
	depositAmount: numeric({ precision: 10, scale:  2 }),
	installmentCount: integer().notNull(),
    interval: installmentInterval().default("MONTHLY").notNull(),
	feeAmount: numeric({ precision: 10, scale:  2 }),
	feePercent: numeric({ precision: 5, scale:  2 }),
	isActive: boolean().default(true).notNull(),
	terms: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("StudioPaymentPlan_isActive_idx").using(
      "btree",
      table.isActive.asc().nullsLast().op("bool_ops"),
    ),
    index("StudioPaymentPlan_membershipPlanId_idx").using(
      "btree",
      table.membershipPlanId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioPaymentPlan_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioPaymentPlan_provider_idx").using(
      "btree",
      table.provider.asc().nullsLast().op("enum_ops"),
    ),
    index("StudioPaymentPlan_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.membershipPlanId],
			foreignColumns: [membershipPlan.id],
      name: "StudioPaymentPlan_membershipPlanId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "StudioPaymentPlan_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "StudioPaymentPlan_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const videoOnDemandAsset = pgTable(
  "VideoOnDemandAsset",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	title: text().notNull(),
	description: text(),
	videoUrl: text().notNull(),
	thumbnailUrl: text(),
	durationSeconds: integer(),
	classTypeId: text(),
	instructorId: text(),
    accessLevel: contentAccessLevel().default("MEMBERS_ONLY").notNull(),
	price: numeric({ precision: 10, scale:  2 }),
	isPublished: boolean().default(false).notNull(),
    publishedAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("VideoOnDemandAsset_classTypeId_idx").using(
      "btree",
      table.classTypeId.asc().nullsLast().op("text_ops"),
    ),
    index("VideoOnDemandAsset_instructorId_idx").using(
      "btree",
      table.instructorId.asc().nullsLast().op("text_ops"),
    ),
    index("VideoOnDemandAsset_isPublished_idx").using(
      "btree",
      table.isPublished.asc().nullsLast().op("bool_ops"),
    ),
    index("VideoOnDemandAsset_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("VideoOnDemandAsset_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.classTypeId],
			foreignColumns: [classType.id],
      name: "VideoOnDemandAsset_classTypeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.instructorId],
			foreignColumns: [instructor.id],
      name: "VideoOnDemandAsset_instructorId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "VideoOnDemandAsset_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "VideoOnDemandAsset_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const accessControlIntegration = pgTable(
  "AccessControlIntegration",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	provider: accessControlProvider().notNull(),
	locationName: text(),
    status: externalChannelStatus().default("DRAFT").notNull(),
	config: jsonb(),
	credentials: jsonb(),
    lastSyncedAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("AccessControlIntegration_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("AccessControlIntegration_provider_idx").using(
      "btree",
      table.provider.asc().nullsLast().op("enum_ops"),
    ),
    index("AccessControlIntegration_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    index("AccessControlIntegration_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "AccessControlIntegration_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "AccessControlIntegration_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const performanceMetric = pgTable(
  "PerformanceMetric",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	clientId: text().notNull(),
    source: performanceMetricSource().default("MANUAL").notNull(),
	metricType: text().notNull(),
	value: numeric({ precision: 12, scale:  4 }).notNull(),
	unit: text().notNull(),
    recordedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
	notes: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("PerformanceMetric_clientId_recordedAt_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
      table.recordedAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("PerformanceMetric_metricType_idx").using(
      "btree",
      table.metricType.asc().nullsLast().op("text_ops"),
    ),
    index("PerformanceMetric_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("PerformanceMetric_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
      name: "PerformanceMetric_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "PerformanceMetric_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "PerformanceMetric_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const workoutProgram = pgTable(
  "WorkoutProgram",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	title: text().notNull(),
	description: text(),
	classTypeId: text(),
	coachId: text(),
	difficulty: classDifficulty(),
	blocks: jsonb().notNull(),
	isPublished: boolean().default(false).notNull(),
    publishedAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("WorkoutProgram_classTypeId_idx").using(
      "btree",
      table.classTypeId.asc().nullsLast().op("text_ops"),
    ),
    index("WorkoutProgram_coachId_idx").using(
      "btree",
      table.coachId.asc().nullsLast().op("text_ops"),
    ),
    index("WorkoutProgram_isPublished_idx").using(
      "btree",
      table.isPublished.asc().nullsLast().op("bool_ops"),
    ),
    index("WorkoutProgram_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("WorkoutProgram_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.classTypeId],
			foreignColumns: [classType.id],
      name: "WorkoutProgram_classTypeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.coachId],
			foreignColumns: [instructor.id],
      name: "WorkoutProgram_coachId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "WorkoutProgram_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "WorkoutProgram_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const soapNote = pgTable(
  "SoapNote",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	clientId: text().notNull(),
	authorId: text(),
	subjective: text().notNull(),
	objective: text(),
	assessment: text(),
	plan: text(),
	privateNote: boolean().default(true).notNull(),
    signedAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("SoapNote_authorId_idx").using(
      "btree",
      table.authorId.asc().nullsLast().op("text_ops"),
    ),
    index("SoapNote_clientId_createdAt_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
      table.createdAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("SoapNote_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("SoapNote_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [instructor.id],
      name: "SoapNote_authorId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
      name: "SoapNote_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "SoapNote_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "SoapNote_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const marketplaceListing = pgTable(
  "MarketplaceListing",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	title: text().notNull(),
	description: text().notNull(),
	categories: text().array().default([]),
	bookingUrl: text(),
    status: marketplaceListingStatus().default("DRAFT").notNull(),
    publishedAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("MarketplaceListing_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("MarketplaceListing_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    index("MarketplaceListing_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "MarketplaceListing_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "MarketplaceListing_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const automationEvent = pgTable(
  "AutomationEvent",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	workflowId: text(),
	executionId: text(),
	clientId: text(),
	type: automationEventType().notNull(),
	name: text().notNull(),
	entityType: text(),
	entityId: text(),
	sourceNodeType: nodeType(),
	sourceNodeId: text(),
	value: numeric({ precision: 12, scale:  2 }),
	metadata: jsonb(),
	deduplicationKey: text(),
    occurredAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("AutomationEvent_clientId_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("AutomationEvent_deduplicationKey_key").using(
      "btree",
      table.deduplicationKey.asc().nullsLast().op("text_ops"),
    ),
    index("AutomationEvent_executionId_idx").using(
      "btree",
      table.executionId.asc().nullsLast().op("text_ops"),
    ),
    index("AutomationEvent_occurredAt_idx").using(
      "btree",
      table.occurredAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("AutomationEvent_organizationId_occurredAt_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.occurredAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("AutomationEvent_organizationId_locationId_occurredAt_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.occurredAt.asc().nullsLast().op("text_ops"),
    ),
    index("AutomationEvent_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("AutomationEvent_type_occurredAt_idx").using(
      "btree",
      table.type.asc().nullsLast().op("enum_ops"),
      table.occurredAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("AutomationEvent_workflowId_occurredAt_idx").using(
      "btree",
      table.workflowId.asc().nullsLast().op("text_ops"),
      table.occurredAt.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
      name: "AutomationEvent_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.executionId],
			foreignColumns: [execution.id],
      name: "AutomationEvent_executionId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "AutomationEvent_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "AutomationEvent_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.workflowId],
			foreignColumns: [workflows.id],
      name: "AutomationEvent_workflowId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const smsConfig = pgTable(
  "SmsConfig",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
    locationId: text(),
    providerAccountId: text().notNull(),
	fromNumber: text().notNull(),
	isActive: boolean().default(true).notNull(),
	monthlyLimit: integer().default(5000).notNull(),
	sentThisMonth: integer().default(0).notNull(),
    lastResetAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("SmsConfig_scope_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("SmsConfig_org_default_key")
      .using("btree", table.organizationId.asc().nullsLast().op("text_ops"))
      .where(sql`${table.locationId} IS NULL`),
    uniqueIndex("SmsConfig_location_default_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.locationId} IS NOT NULL`),
    uniqueIndex("SmsConfig_providerAccountId_key").using(
      "btree",
      table.providerAccountId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "SmsConfig_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "SmsConfig_organizationId_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.providerAccountId],
      foreignColumns: [providerAccount.id],
      name: "SmsConfig_providerAccountId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
).enableRLS();

export const smsMessage = pgTable(
  "SmsMessage",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	clientId: text(),
	to: text().notNull(),
	from: text().notNull(),
	body: text().notNull(),
	direction: messageDirection().notNull(),
    status: smsStatus().default("QUEUED").notNull(),
	providerSid: text(),
	errorCode: text(),
	errorMessage: text(),
    sentAt: timestamp({ precision: 3, mode: "date" }),
    deliveredAt: timestamp({ precision: 3, mode: "date" }),
	automationId: text(),
    deliveryId: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("SmsMessage_automationId_idx").using(
      "btree",
      table.automationId.asc().nullsLast().op("text_ops"),
    ),
    index("SmsMessage_clientId_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    index("SmsMessage_createdAt_idx").using(
      "btree",
      table.createdAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("SmsMessage_organizationId_locationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("SmsMessage_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    uniqueIndex("SmsMessage_deliveryId_key")
      .using("btree", table.deliveryId.asc().nullsLast().op("text_ops"))
      .where(sql`${table.deliveryId} IS NOT NULL`),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "SmsMessage_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "SmsMessage_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.deliveryId],
      foreignColumns: [outboundDelivery.id],
      name: "SmsMessage_deliveryId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const waiverTemplate = pgTable(
  "WaiverTemplate",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	name: text().notNull(),
	content: text().notNull(),
    documentUrl: text(),
    documentName: text(),
    documentKey: text(),
    documentSize: integer(),
    documentMimeType: text(),
	isRequired: boolean().default(true).notNull(),
	requiresMinor: boolean().default(false).notNull(),
	isActive: boolean().default(true).notNull(),
	version: integer().default(1).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("WaiverTemplate_isActive_idx").using(
      "btree",
      table.isActive.asc().nullsLast().op("bool_ops"),
    ),
    index("WaiverTemplate_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("WaiverTemplate_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "WaiverTemplate_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "WaiverTemplate_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const waiverSignature = pgTable(
  "WaiverSignature",
  {
	id: text().primaryKey().notNull(),
	templateId: text().notNull(),
	clientId: text().notNull(),
    templateVersion: integer(),
    templateName: text(),
    templateContent: text(),
    documentUrl: text(),
    documentName: text(),
    documentKey: text(),
	signatureData: text().notNull(),
    signedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
	ipAddress: text(),
	emergencyName: text(),
	emergencyPhone: text(),
	healthConditions: text(),
	agreedToTerms: boolean().default(true).notNull(),
	minorName: text(),
	guardianName: text(),
    expiresAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("WaiverSignature_clientId_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    index("WaiverSignature_signedAt_idx").using(
      "btree",
      table.signedAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("WaiverSignature_templateId_idx").using(
      "btree",
      table.templateId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("WaiverSignature_template_client_version_key").on(
      table.templateId,
      table.clientId,
      table.templateVersion,
    ),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [waiverTemplate.id],
      name: "WaiverSignature_templateId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.clientId],
      foreignColumns: [client.id],
      name: "WaiverSignature_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
).enableRLS();

export const clientDocument = pgTable(
  "ClientDocument",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	clientId: text().notNull(),
	membershipId: text(),
	paymentId: text(),
	paymentLineItemId: text(),
    source: importSource().default("MINDBODY").notNull(),
	sourcePath: text(),
	fileName: text().notNull(),
	fileType: text(),
	storageUrl: text(),
    documentType: clientDocumentType().default("OTHER").notNull(),
	metadata: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("ClientDocument_clientId_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    index("ClientDocument_documentType_idx").using(
      "btree",
      table.documentType.asc().nullsLast().op("enum_ops"),
    ),
    index("ClientDocument_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("ClientDocument_membershipId_idx").using(
      "btree",
      table.membershipId.asc().nullsLast().op("text_ops"),
    ),
    index("ClientDocument_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("ClientDocument_paymentId_idx").using(
      "btree",
      table.paymentId.asc().nullsLast().op("text_ops"),
    ),
    index("ClientDocument_paymentLineItemId_idx").using(
      "btree",
      table.paymentLineItemId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("ClientDocument_organizationId_sourcePath_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.sourcePath.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
      name: "ClientDocument_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "ClientDocument_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "ClientDocument_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.membershipId],
			foreignColumns: [studioMembership.id],
      name: "ClientDocument_membershipId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.paymentId],
			foreignColumns: [studioPayment.id],
      name: "ClientDocument_paymentId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.paymentLineItemId],
			foreignColumns: [studioPaymentLineItem.id],
      name: "ClientDocument_paymentLineItemId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const roomLayout = pgTable(
  "RoomLayout",
  {
	id: text().primaryKey().notNull(),
	roomId: text().notNull(),
	name: text().notNull(),
	rows: integer().default(5).notNull(),
	columns: integer().default(5).notNull(),
	layoutData: jsonb().default([]).notNull(),
	isDefault: boolean().default(false).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("RoomLayout_roomId_idx").using(
      "btree",
      table.roomId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.roomId],
			foreignColumns: [room.id],
      name: "RoomLayout_roomId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const cancellationCharge = pgTable(
  "CancellationCharge",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
    locationId: text(),
	clientId: text().notNull(),
	classId: text().notNull(),
	bookingId: text().notNull(),
    policyId: text(),
	type: cancellationChargeType().notNull(),
    status: cancellationChargeStatus().default("PENDING").notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
    currency: text().default("GBP").notNull(),
	creditsDeducted: integer().default(0).notNull(),
	waived: boolean().default(false).notNull(),
	waivedBy: text(),
	waivedReason: text(),
	stripeChargeId: text(),
    stripeConnectionId: text(),
    commerceOperationId: text(),
    stripePaymentIntentId: text(),
    collectionAttempt: integer().default(0).notNull(),
    failureCode: text(),
    failureMessage: text(),
    processedAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    check(
      "CancellationCharge_amount_nonnegative_check",
      sql`${table.amount} >= 0`,
    ),
    check(
      "CancellationCharge_credits_nonnegative_check",
      sql`${table.creditsDeducted} >= 0`,
    ),
    check(
      "CancellationCharge_collection_attempt_nonnegative_check",
      sql`${table.collectionAttempt} >= 0`,
    ),
    check(
      "CancellationCharge_waiver_state_check",
      sql`(${table.status} = 'WAIVED') = ${table.waived}`,
    ),
    check(
      "CancellationCharge_no_payment_due_check",
      sql`${table.status} <> 'NO_PAYMENT_DUE' OR ${table.amount} = 0`,
    ),
    check(
      "CancellationCharge_processing_binding_check",
      sql`${table.status} <> 'PROCESSING' OR (${table.stripeConnectionId} IS NOT NULL AND ${table.commerceOperationId} IS NOT NULL)`,
    ),
    uniqueIndex("CancellationCharge_bookingId_type_key").using(
      "btree",
      table.bookingId.asc().nullsLast().op("text_ops"),
      table.type.asc().nullsLast().op("enum_ops"),
    ),
    index("CancellationCharge_classId_idx").using(
      "btree",
      table.classId.asc().nullsLast().op("text_ops"),
    ),
    index("CancellationCharge_clientId_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    index("CancellationCharge_createdAt_idx").using(
      "btree",
      table.createdAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("CancellationCharge_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("CancellationCharge_scope_status_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.status.asc().nullsLast().op("enum_ops"),
      table.createdAt.desc().nullsLast().op("timestamp_ops"),
    ),
    uniqueIndex("CancellationCharge_commerceOperationId_key")
      .using(
        "btree",
        table.commerceOperationId.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.commerceOperationId} IS NOT NULL`),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "CancellationCharge_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "CancellationCharge_scope_location_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.classId],
      foreignColumns: [studioClass.organizationId, studioClass.id],
      name: "CancellationCharge_scope_class_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
).enableRLS();

export const classReminderConfig = pgTable(
  "ClassReminderConfig",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	enabled: boolean().default(true).notNull(),
	emailEnabled: boolean().default(true).notNull(),
	smsEnabled: boolean().default(false).notNull(),
	reminder24H: boolean().default(true).notNull(),
	reminder1H: boolean().default(true).notNull(),
	reminderCustom: integer(),
	messageTemplate: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("ClassReminderConfig_organizationId_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "ClassReminderConfig_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "ClassReminderConfig_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const retentionAutomation = pgTable(
  "RetentionAutomation",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	name: text().notNull(),
	type: retentionAutomationType().notNull(),
	trigger: jsonb().notNull(),
	actions: jsonb().notNull(),
	isActive: boolean().default(true).notNull(),
    lastRunAt: timestamp({ precision: 3, mode: "date" }),
	runsCount: integer().default(0).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("RetentionAutomation_isActive_idx").using(
      "btree",
      table.isActive.asc().nullsLast().op("bool_ops"),
    ),
    index("RetentionAutomation_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("RetentionAutomation_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("RetentionAutomation_type_idx").using(
      "btree",
      table.type.asc().nullsLast().op("enum_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "RetentionAutomation_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "RetentionAutomation_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const billingRule = pgTable(
  "BillingRule",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	name: text().notNull(),
	description: text(),
	billingModel: billingModel().notNull(),
	config: jsonb().notNull(),
	autoGenerate: boolean().default(false).notNull(),
	generateDay: integer(),
	defaultTerms: text(),
	defaultNotes: text(),
	defaultDueDays: integer().default(30).notNull(),
	defaultTaxRate: numeric({ precision: 5, scale:  2 }),
	isActive: boolean().default(true).notNull(),
	metadata: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("BillingRule_isActive_idx").using(
      "btree",
      table.isActive.asc().nullsLast().op("bool_ops"),
    ),
    index("BillingRule_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("BillingRule_organizationId_locationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("BillingRule_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
  ],
).enableRLS();

export const introOffer = pgTable(
  "IntroOffer",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	name: text().notNull(),
	description: text(),
	offerType: introOfferType().notNull(),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
	originalPrice: numeric({ precision: 10, scale:  2 }),
    currency: text().default("GBP").notNull(),
	durationDays: integer().default(7).notNull(),
	classCredits: integer(),
	allowedClassTypes: text().array().default([]),
	maxRedemptions: integer(),
	redemptionCount: integer().default(0).notNull(),
	isActive: boolean().default(true).notNull(),
	displayOnWidget: boolean().default(true).notNull(),
	followUpPlanId: text(),
	autoConvert: boolean().default(false).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("IntroOffer_isActive_idx").using(
      "btree",
      table.isActive.asc().nullsLast().op("bool_ops"),
    ),
    index("IntroOffer_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("IntroOffer_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "IntroOffer_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "IntroOffer_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const introOfferRedemption = pgTable(
  "IntroOfferRedemption",
  {
	id: text().primaryKey().notNull(),
	offerId: text().notNull(),
	clientId: text().notNull(),
    redeemedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    expiresAt: timestamp({ precision: 3, mode: "date" }).notNull(),
	classesUsed: integer().default(0).notNull(),
    convertedAt: timestamp({ precision: 3, mode: "date" }),
	convertedToPlanId: text(),
    status: introOfferRedemptionStatus().default("ACTIVE").notNull(),
  },
  (table) => [
    index("IntroOfferRedemption_clientId_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    index("IntroOfferRedemption_expiresAt_idx").using(
      "btree",
      table.expiresAt.asc().nullsLast().op("timestamp_ops"),
    ),
    uniqueIndex("IntroOfferRedemption_offerId_clientId_key").using(
      "btree",
      table.offerId.asc().nullsLast().op("text_ops"),
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    index("IntroOfferRedemption_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
	foreignKey({
			columns: [table.offerId],
			foreignColumns: [introOffer.id],
      name: "IntroOfferRedemption_offerId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const churnRiskScore = pgTable(
  "ChurnRiskScore",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
    locationId: text(),
	clientId: text().notNull(),
	score: integer().notNull(),
	riskLevel: churnRiskLevel().notNull(),
	factors: jsonb().notNull(),
	suggestedActions: jsonb(),
    calculatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    expiresAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("ChurnRiskScore_clientId_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("ChurnRiskScore_organizationId_clientId_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    index("ChurnRiskScore_organizationId_riskLevel_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("enum_ops"),
      table.riskLevel.asc().nullsLast().op("enum_ops"),
    ),
    index("ChurnRiskScore_organizationId_locationId_riskLevel_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.riskLevel.asc().nullsLast().op("enum_ops"),
    ),
    index("ChurnRiskScore_score_idx").using(
      "btree",
      table.score.asc().nullsLast().op("int4_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "ChurnRiskScore_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "ChurnRiskScore_organizationId_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.clientId],
      foreignColumns: [client.organizationId, client.id],
      name: "ChurnRiskScore_organizationId_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const referralProgram = pgTable(
  "ReferralProgram",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
    locationId: text(),
    name: text().default("Refer a Friend").notNull(),
	isActive: boolean().default(true).notNull(),
    referrerRewardType: referralRewardType().default("CREDIT").notNull(),
	referrerRewardValue: numeric({ precision: 10, scale:  2 }).notNull(),
    refereeRewardType: referralRewardType().default("DISCOUNT").notNull(),
	refereeRewardValue: numeric({ precision: 10, scale:  2 }).notNull(),
	refereeOfferDays: integer().default(30).notNull(),
    currency: text().default("GBP").notNull(),
	maxReferralsPerMember: integer(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    unique("ReferralProgram_organizationId_locationId_key")
      .on(table.organizationId, table.locationId)
      .nullsNotDistinct(),
    uniqueIndex("ReferralProgram_organizationId_id_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "ReferralProgram_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "ReferralProgram_organizationId_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const referral = pgTable(
  "Referral",
  {
	id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
	programId: text().notNull(),
	referrerClientId: text().notNull(),
	refereeClientId: text(),
	refereeEmail: text().notNull(),
	refereePhone: text(),
	code: text().notNull(),
    status: referralStatus().default("PENDING").notNull(),
	referrerRewarded: boolean().default(false).notNull(),
	refereeRewarded: boolean().default(false).notNull(),
    convertedAt: timestamp({ precision: 3, mode: "date" }),
    expiresAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("Referral_code_idx").using(
      "btree",
      table.code.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("Referral_code_key").using(
      "btree",
      table.code.asc().nullsLast().op("text_ops"),
    ),
    index("Referral_organizationId_locationId_status_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.status.asc().nullsLast().op("enum_ops"),
      table.createdAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("Referral_organizationId_locationId_program_referrer_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.programId.asc().nullsLast().op("text_ops"),
      table.referrerClientId.asc().nullsLast().op("text_ops"),
    ),
    index("Referral_organizationId_locationId_refereeEmail_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.refereeEmail.asc().nullsLast().op("text_ops"),
    ),
    index("Referral_programId_idx").using(
      "btree",
      table.programId.asc().nullsLast().op("text_ops"),
    ),
    index("Referral_refereeClientId_idx").using(
      "btree",
      table.refereeClientId.asc().nullsLast().op("text_ops"),
    ),
    index("Referral_refereeEmail_idx").using(
      "btree",
      table.refereeEmail.asc().nullsLast().op("text_ops"),
    ),
    index("Referral_referrerClientId_idx").using(
      "btree",
      table.referrerClientId.asc().nullsLast().op("text_ops"),
    ),
    index("Referral_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    foreignKey({
      columns: [table.organizationId, table.programId],
      foreignColumns: [referralProgram.organizationId, referralProgram.id],
      name: "Referral_organizationId_programId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "Referral_organizationId_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.refereeClientId],
			foreignColumns: [client.id],
      name: "Referral_refereeClientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.organizationId, table.referrerClientId],
      foreignColumns: [client.organizationId, client.id],
      name: "Referral_organizationId_referrerClientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const loyaltyProgram = pgTable(
  "LoyaltyProgram",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
    name: text().default("Rewards").notNull(),
	isActive: boolean().default(true).notNull(),
	pointsPerClass: integer().default(10).notNull(),
	pointsPerReferral: integer().default(50).notNull(),
	pointsPerPurchase: integer().default(1).notNull(),
    purchasePointsUnit: numeric({ precision: 10, scale: 2 })
      .default("1.00")
      .notNull(),
    currency: text().default("GBP").notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("LoyaltyProgram_organizationId_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "LoyaltyProgram_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const loyaltyBalance = pgTable(
  "LoyaltyBalance",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	clientId: text().notNull(),
	points: integer().default(0).notNull(),
	lifetimePoints: integer().default(0).notNull(),
    tier: loyaltyTier().default("BRONZE").notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("LoyaltyBalance_clientId_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("LoyaltyBalance_organizationId_clientId_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    index("LoyaltyBalance_tier_idx").using(
      "btree",
      table.tier.asc().nullsLast().op("enum_ops"),
    ),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
      name: "LoyaltyBalance_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "LoyaltyBalance_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const loyaltyTransaction = pgTable(
  "LoyaltyTransaction",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	clientId: text().notNull(),
	points: integer().notNull(),
	type: loyaltyTransactionType().notNull(),
	description: text().notNull(),
	referenceId: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("LoyaltyTransaction_createdAt_idx").using(
      "btree",
      table.createdAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("LoyaltyTransaction_organizationId_clientId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "LoyaltyTransaction_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const loyaltyReward = pgTable(
  "LoyaltyReward",
  {
	id: text().primaryKey().notNull(),
	programId: text().notNull(),
	name: text().notNull(),
	description: text(),
	pointsCost: integer().notNull(),
	type: loyaltyRewardType().notNull(),
	value: text(),
	isActive: boolean().default(true).notNull(),
	stock: integer(),
	imageUrl: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("LoyaltyReward_isActive_idx").using(
      "btree",
      table.isActive.asc().nullsLast().op("bool_ops"),
    ),
    index("LoyaltyReward_programId_idx").using(
      "btree",
      table.programId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.programId],
			foreignColumns: [loyaltyProgram.id],
      name: "LoyaltyReward_programId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const spot = pgTable(
  "Spot",
  {
	id: text().primaryKey().notNull(),
	layoutId: text().notNull(),
	label: text().notNull(),
	row: integer().notNull(),
	col: integer().notNull(),
    type: spotType().default("STANDARD").notNull(),
	isActive: boolean().default(true).notNull(),
	equipment: text(),
	metadata: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("Spot_layoutId_idx").using(
      "btree",
      table.layoutId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("Spot_layoutId_row_col_key").using(
      "btree",
      table.layoutId.asc().nullsLast().op("text_ops"),
      table.row.asc().nullsLast().op("int4_ops"),
      table.col.asc().nullsLast().op("int4_ops"),
    ),
	foreignKey({
			columns: [table.layoutId],
			foreignColumns: [roomLayout.id],
      name: "Spot_layoutId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const spotBooking = pgTable(
  "SpotBooking",
  {
	id: text().primaryKey().notNull(),
	spotId: text().notNull(),
	bookingId: text().notNull(),
	clientId: text().notNull(),
	classId: text().notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("SpotBooking_bookingId_key").using(
      "btree",
      table.bookingId.asc().nullsLast().op("text_ops"),
    ),
    index("SpotBooking_classId_idx").using(
      "btree",
      table.classId.asc().nullsLast().op("text_ops"),
    ),
    index("SpotBooking_clientId_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("SpotBooking_spotId_classId_key").using(
      "btree",
      table.spotId.asc().nullsLast().op("text_ops"),
      table.classId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.bookingId],
			foreignColumns: [studioBooking.id],
      name: "SpotBooking_bookingId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.spotId],
			foreignColumns: [spot.id],
      name: "SpotBooking_spotId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const paymentIntegration = pgTable(
  "PaymentIntegration",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	provider: text().notNull(),
	credentials: jsonb().notNull(),
	config: jsonb(),
	isActive: boolean().default(true).notNull(),
    lastSyncedAt: timestamp({ precision: 3, mode: "date" }),
	metadata: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("PaymentIntegration_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("PaymentIntegration_organizationId_provider_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.provider.asc().nullsLast().op("text_ops"),
    ),
    index("PaymentIntegration_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("PaymentIntegration_locationId_provider_key").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
      table.provider.asc().nullsLast().op("text_ops"),
    ),
  ],
).enableRLS();

export const cancellationPolicy = pgTable(
  "CancellationPolicy",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	name: text().notNull(),
	lateCancelWindow: integer().default(12).notNull(),
	noShowFeeAmount: numeric({ precision: 10, scale:  2 }).notNull(),
	lateCancelFee: numeric({ precision: 10, scale:  2 }).notNull(),
    currency: text().default("GBP").notNull(),
	deductCredits: boolean().default(true).notNull(),
	creditsDeducted: integer().default(1).notNull(),
	chargeCard: boolean().default(false).notNull(),
	sendNotification: boolean().default(true).notNull(),
	isDefault: boolean().default(false).notNull(),
	isActive: boolean().default(true).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("CancellationPolicy_isDefault_idx").using(
      "btree",
      table.isDefault.asc().nullsLast().op("bool_ops"),
    ),
    index("CancellationPolicy_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("CancellationPolicy_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("CancellationPolicy_active_default_location_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
      )
      .where(
        sql`${table.isDefault} = true AND ${table.isActive} = true AND ${table.locationId} IS NOT NULL`,
      ),
    uniqueIndex("CancellationPolicy_active_default_organization_key")
      .using("btree", table.organizationId.asc().nullsLast().op("text_ops"))
      .where(
        sql`${table.isDefault} = true AND ${table.isActive} = true AND ${table.locationId} IS NULL`,
      ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "CancellationPolicy_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "CancellationPolicy_scope_location_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
).enableRLS();

export const spotReservation = pgTable(
  "SpotReservation",
  {
	id: text().primaryKey().notNull(),
	spotId: text().notNull(),
	layoutId: text().notNull(),
	guestName: text().notNull(),
	sessionId: text().notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("SpotReservation_layoutId_idx").using(
      "btree",
      table.layoutId.asc().nullsLast().op("text_ops"),
    ),
    index("SpotReservation_sessionId_idx").using(
      "btree",
      table.sessionId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("SpotReservation_spotId_key").using(
      "btree",
      table.spotId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.layoutId],
			foreignColumns: [roomLayout.id],
      name: "SpotReservation_layoutId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.spotId],
			foreignColumns: [spot.id],
      name: "SpotReservation_spotId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const verification = pgTable("Verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
  expiresAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  createdAt: timestamp({ precision: 3, mode: "date" })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp({ precision: 3, mode: "date" })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
}).enableRLS();

export const location = pgTable(
  "Location",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	externalId: text(),
	companyName: text().notNull(),
	contactName: text(),
	website: text(),
	billingEmail: text(),
	phone: text(),
	addressLine1: text(),
	addressLine2: text(),
	city: text(),
	state: text(),
	postalCode: text(),
	country: text(),
    timezone: text(),
	createdByUserId: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
	industry: text(),
	logo: text(),
	slug: text(),
	accentColor: text(),
	brandColor: text(),
	businessEmail: text(),
	businessPhone: text(),
	taxId: text(),
	dunningDays: jsonb(),
	dunningEnabled: boolean().default(true).notNull(),
	taxGrouping: text(),
	taxRates: jsonb(),
	description: text(),
	metadata: jsonb(),
	isActive: boolean().default(true).notNull(),
  },
  (table) => [
    index("Location_externalId_idx").using(
      "btree",
      table.externalId.asc().nullsLast().op("text_ops"),
    ),
    index("Location_isActive_idx").using(
      "btree",
      table.isActive.asc().nullsLast().op("bool_ops"),
    ),
    index("Location_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("Location_organizationId_id_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("Location_organizationId_externalId_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.externalId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.createdByUserId],
			foreignColumns: [user.id],
      name: "Location_createdByUserId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "Location_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const user = pgTable(
  "User",
  {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	emailVerified: boolean().default(false).notNull(),
	image: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    status: userStatus().default("ONLINE").notNull(),
	statusMessage: text(),
  },
  (table) => [
    uniqueIndex("User_email_key").using(
      "btree",
      table.email.asc().nullsLast().op("text_ops"),
    ),
  ],
).enableRLS();

export const account = pgTable(
  "Account",
  {
	id: text().primaryKey().notNull(),
	accountId: text().notNull(),
	providerId: text().notNull(),
	userId: text().notNull(),
	accessToken: text(),
	refreshToken: text(),
	idToken: text(),
    accessTokenExpiresAt: timestamp({ precision: 3, mode: "date" }),
    refreshTokenExpiresAt: timestamp({ precision: 3, mode: "date" }),
	scope: text(),
	password: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
      name: "Account_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const activity = pgTable(
  "Activity",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	userId: text().notNull(),
	type: activityType().notNull(),
	action: activityAction().notNull(),
	entityType: text().notNull(),
	entityId: text().notNull(),
	entityName: text().notNull(),
	changes: jsonb(),
	metadata: jsonb(),
	ipAddress: text(),
	userAgent: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("Activity_createdAt_idx").using(
      "btree",
      table.createdAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("Activity_entityType_entityId_idx").using(
      "btree",
      table.entityType.asc().nullsLast().op("text_ops"),
      table.entityId.asc().nullsLast().op("text_ops"),
    ),
    index("Activity_organizationId_entityType_entityId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.entityType.asc().nullsLast().op("text_ops"),
      table.entityId.asc().nullsLast().op("text_ops"),
    ),
    index("Activity_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("Activity_organizationId_locationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("Activity_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("Activity_type_idx").using(
      "btree",
      table.type.asc().nullsLast().op("enum_ops"),
    ),
    index("Activity_userId_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
      name: "Activity_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const bankTransferSettings = pgTable(
  "BankTransferSettings",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	enabled: boolean().default(false).notNull(),
	bankName: text(),
	accountName: text(),
	accountNumber: text(),
	routingNumber: text(),
	iban: text(),
	swiftBic: text(),
	bankAddress: jsonb(),
	accountType: text(),
    currency: text().default("GBP"),
	instructions: text(),
	referenceFormat: text(),
	autoReminders: boolean().default(true).notNull(),
	reminderDays: jsonb(),
	metadata: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
	sortCode: text(),
    transferType: text().default("UK_DOMESTIC"),
  },
  (table) => [
    index("BankTransferSettings_enabled_idx").using(
      "btree",
      table.enabled.asc().nullsLast().op("bool_ops"),
    ),
    index("BankTransferSettings_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("BankTransferSettings_organizationId_locationId_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("BankTransferSettings_organization_scope_key")
      .using("btree", table.organizationId.asc().nullsLast().op("text_ops"))
      .where(sql`${table.locationId} IS NULL`),
    index("BankTransferSettings_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("BankTransferSettings_locationId_key").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "BankTransferSettings_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "BankTransferSettings_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const clientAssignee = pgTable(
  "ClientAssignee",
  {
	id: text().primaryKey().notNull(),
	clientId: text().notNull(),
	locationMemberId: text().notNull(),
    assignedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("ClientAssignee_clientId_locationMemberId_key").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
      table.locationMemberId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
      name: "ClientAssignee_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationMemberId],
			foreignColumns: [locationMember.id],
      name: "ClientAssignee_locationMemberId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const locationMember = pgTable(
  "LocationMember",
  {
	id: text().primaryKey().notNull(),
	locationId: text().notNull(),
	userId: text().notNull(),
    staffIdentityId: text(),
    role: locationMemberRole().default("STANDARD").notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("LocationMember_locationId_userId_key").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
      table.userId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("LocationMember_locationId_staffIdentityId_key")
      .using(
        "btree",
        table.locationId.asc().nullsLast().op("text_ops"),
        table.staffIdentityId.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.staffIdentityId} IS NOT NULL`),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "LocationMember_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
      name: "LocationMember_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.staffIdentityId],
      foreignColumns: [staffIdentity.id],
      name: "LocationMember_staffIdentityId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const deal = pgTable(
  "Deal",
  {
	id: text().primaryKey().notNull(),
	locationId: text(),
	name: text().notNull(),
	value: numeric({ precision: 12, scale:  2 }),
    currency: text().default("USD"),
    deadline: timestamp({ precision: 3, mode: "date" }),
	source: text(),
	tags: text().array().default([]),
	description: text(),
    lastActivityAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
	pipelineId: text(),
	pipelineStageId: text(),
	organizationId: text().notNull(),
  },
  (table) => [
    index("Deal_organizationId_locationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("Deal_pipelineId_idx").using(
      "btree",
      table.pipelineId.asc().nullsLast().op("text_ops"),
    ),
    index("Deal_locationId_pipelineStageId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
      table.pipelineStageId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "Deal_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.pipelineId],
			foreignColumns: [pipeline.id],
      name: "Deal_pipelineId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.pipelineStageId],
			foreignColumns: [pipelineStage.id],
      name: "Deal_pipelineStageId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "Deal_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const pipeline = pgTable(
  "Pipeline",
  {
	id: text().primaryKey().notNull(),
	locationId: text(),
	name: text().notNull(),
	description: text(),
	isActive: boolean().default(true).notNull(),
	isDefault: boolean().default(false).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
	organizationId: text().notNull(),
  },
  (table) => [
    index("Pipeline_organizationId_locationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("Pipeline_locationId_isActive_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
      table.isActive.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "Pipeline_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "Pipeline_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const pipelineStage = pgTable(
  "PipelineStage",
  {
	id: text().primaryKey().notNull(),
	pipelineId: text().notNull(),
	name: text().notNull(),
	position: integer().notNull(),
	probability: integer().default(0).notNull(),
	rottingDays: integer(),
	color: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("PipelineStage_pipelineId_idx").using(
      "btree",
      table.pipelineId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("PipelineStage_pipelineId_position_key").using(
      "btree",
      table.pipelineId.asc().nullsLast().op("text_ops"),
      table.position.asc().nullsLast().op("int4_ops"),
    ),
	foreignKey({
			columns: [table.pipelineId],
			foreignColumns: [pipeline.id],
      name: "PipelineStage_pipelineId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const dealClient = pgTable(
  "DealClient",
  {
	id: text().primaryKey().notNull(),
	dealId: text().notNull(),
	clientId: text().notNull(),
  },
  (table) => [
    uniqueIndex("DealClient_dealId_clientId_key").using(
      "btree",
      table.dealId.asc().nullsLast().op("text_ops"),
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
      name: "DealClient_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.dealId],
			foreignColumns: [deal.id],
      name: "DealClient_dealId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const dealAssignee = pgTable(
  "DealMember",
  {
	id: text().primaryKey().notNull(),
	dealId: text().notNull(),
	locationMemberId: text().notNull(),
    assignedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("DealMember_dealId_locationMemberId_key").using(
      "btree",
      table.dealId.asc().nullsLast().op("text_ops"),
      table.locationMemberId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.dealId],
			foreignColumns: [deal.id],
      name: "DealMember_dealId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationMemberId],
			foreignColumns: [locationMember.id],
      name: "DealMember_locationMemberId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const form = pgTable(
  "Form",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	name: text().notNull(),
	description: text(),
    status: formStatus().default("DRAFT").notNull(),
	isMultiStep: boolean().default(false).notNull(),
	showProgress: boolean().default(true).notNull(),
    progressDisplay: text().default("BAR").notNull(),
	submitUrl: text(),
    successMessage: text().default("Thank you for your submission!").notNull(),
	redirectUrl: text(),
	workflowId: text(),
    crmResolutionConfig: jsonb().default({ enabled: false }).notNull(),
    automationConfig: jsonb()
      .default({
        version: 1,
        emailMarketingConsentFieldId: null,
        smsMarketingConsentFieldId: null,
        followUpConsentFieldId: null,
      })
      .notNull(),
	stylePresetId: text(),
    primaryColor: text().default("#2563eb").notNull(),
    buttonTextColor: text().default("#ffffff").notNull(),
    backgroundColor: text().default("#ffffff").notNull(),
    textColor: text().default("#111827").notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    publishedAt: timestamp({ precision: 3, mode: "date" }),
  },
  (table) => [
    index("Form_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("Form_organizationId_id_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
    index("Form_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    index("Form_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("Form_workflowId_idx").using(
      "btree",
      table.workflowId.asc().nullsLast().op("text_ops"),
    ),
    check(
      "Form_primaryColor_check",
      sql`${table.primaryColor} ~ '^#[0-9A-Fa-f]{6}$'`,
    ),
    check(
      "Form_backgroundColor_check",
      sql`${table.backgroundColor} ~ '^#[0-9A-Fa-f]{6}$'`,
    ),
    check(
      "Form_buttonTextColor_check",
      sql`${table.buttonTextColor} ~ '^#[0-9A-Fa-f]{6}$'`,
    ),
    check(
      "Form_textColor_check",
      sql`${table.textColor} ~ '^#[0-9A-Fa-f]{6}$'`,
    ),
    check(
      "Form_progressDisplay_check",
      sql`${table.progressDisplay} IN ('RING', 'STEPS', 'BAR')`,
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "Form_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.stylePresetId],
			foreignColumns: [globalStylePreset.id],
      name: "Form_stylePresetId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "Form_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.workflowId],
			foreignColumns: [workflows.id],
      name: "Form_workflowId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const globalStylePreset = pgTable(
  "GlobalStylePreset",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	name: text().notNull(),
	description: text(),
    primaryColor: text().default("#3b82f6").notNull(),
    secondaryColor: text().default("#8b5cf6").notNull(),
    accentColor: text().default("#f59e0b").notNull(),
    backgroundColor: text().default("#ffffff").notNull(),
    textColor: text().default("#1f2937").notNull(),
    mutedColor: text().default("#6b7280").notNull(),
    borderColor: text().default("#e5e7eb").notNull(),
    fontFamily: text().default("Inter, system-ui, sans-serif").notNull(),
    headingFont: text().default("Inter, system-ui, sans-serif").notNull(),
    fontSize: jsonb()
      .default({
        lg: 18,
        sm: 14,
        xl: 20,
        "2xl": 24,
        "3xl": 30,
        "4xl": 36,
        base: 16,
      })
      .notNull(),
    fontWeight: jsonb()
      .default({ bold: 700, medium: 500, normal: 400, semibold: 600 })
      .notNull(),
    lineHeight: jsonb()
      .default({ tight: 1.25, normal: 1.5, relaxed: 1.75 })
      .notNull(),
    spacing: jsonb()
      .default({ lg: 24, md: 16, sm: 8, xl: 32, xs: 4, "2xl": 48, "3xl": 64 })
      .notNull(),
    borderRadius: jsonb()
      .default({ lg: 12, md: 8, sm: 4, xl: 16, full: 9999, none: 0 })
      .notNull(),
    buttonPresets: jsonb()
      .default({
        outline: {
          bg: "transparent",
          text: "#3b82f6",
          border: "2px solid #3b82f6",
          padding: "12px 24px",
          borderRadius: 8,
        },
        primary: {
          bg: "#3b82f6",
          text: "#ffffff",
          padding: "12px 24px",
          borderRadius: 8,
        },
        secondary: {
          bg: "#8b5cf6",
          text: "#ffffff",
          padding: "12px 24px",
          borderRadius: 8,
        },
      })
      .notNull(),
    shadows: jsonb()
      .default({
        lg: "0 10px 15px rgba(0,0,0,0.1)",
        md: "0 4px 6px rgba(0,0,0,0.1)",
        sm: "0 1px 2px rgba(0,0,0,0.05)",
        xl: "0 20px 25px rgba(0,0,0,0.1)",
      })
      .notNull(),
	isDefault: boolean().default(false).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("GlobalStylePreset_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("GlobalStylePreset_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "GlobalStylePreset_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "GlobalStylePreset_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const formStep = pgTable(
  "FormStep",
  {
	id: text().primaryKey().notNull(),
	formId: text().notNull(),
	name: text().notNull(),
	order: integer().default(0).notNull(),
	showConditions: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("FormStep_formId_idx").using(
      "btree",
      table.formId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.formId],
			foreignColumns: [form.id],
      name: "FormStep_formId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const formField = pgTable(
  "FormField",
  {
	id: text().primaryKey().notNull(),
	stepId: text().notNull(),
	type: formFieldType().notNull(),
	label: text().notNull(),
	placeholder: text(),
	helpText: text(),
	required: boolean().default(false).notNull(),
	validation: jsonb(),
	options: jsonb(),
	defaultValue: text(),
	showConditions: jsonb(),
	order: integer().default(0).notNull(),
	styles: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("FormField_stepId_idx").using(
      "btree",
      table.stepId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.stepId],
			foreignColumns: [formStep.id],
      name: "FormField_stepId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const formSubmission = pgTable(
  "FormSubmission",
  {
	id: text().primaryKey().notNull(),
	formId: text().notNull(),
    organizationId: text(),
    locationId: text(),
    publicationTargetId: text(),
    publicationVersionId: text(),
    receiptId: text(),
    consentSnapshot: jsonb(),
	data: jsonb().notNull(),
	clientId: text(),
    crmResolutionConfig: jsonb(),
    automationConfig: jsonb(),
    clientResolutionStatus: text().default("NOT_CONFIGURED").notNull(),
    clientResolutionAttempts: integer().default(0).notNull(),
    clientResolutionError: text(),
    lastClientResolutionAttemptAt: timestamp({ precision: 3, mode: "date" }),
    clientResolvedAt: timestamp({ precision: 3, mode: "date" }),
	utmSource: text(),
	utmMedium: text(),
	utmCampaign: text(),
	utmTerm: text(),
	utmContent: text(),
	ipAddress: text(),
	userAgent: text(),
	referrer: text(),
    retentionExpiresAt: timestamp({ precision: 3, mode: "date" }),
    triggerDispatchStatus: text(),
    triggerDispatchAttempts: integer().default(0).notNull(),
    triggerDispatchError: text(),
    lastTriggerDispatchAttemptAt: timestamp({ precision: 3, mode: "date" }),
    triggerDispatchedAt: timestamp({ precision: 3, mode: "date" }),
    submittedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("FormSubmission_clientId_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    index("FormSubmission_clientResolutionStatus_idx").using(
      "btree",
      table.clientResolutionStatus.asc().nullsLast().op("text_ops"),
    ),
    index("FormSubmission_formId_idx").using(
      "btree",
      table.formId.asc().nullsLast().op("text_ops"),
    ),
    index("FormSubmission_scope_submittedAt_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.submittedAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("FormSubmission_retentionExpiresAt_idx")
      .using(
        "btree",
        table.retentionExpiresAt.asc().nullsLast().op("timestamp_ops"),
      )
      .where(sql`${table.receiptId} IS NOT NULL`),
    uniqueIndex("FormSubmission_receiptId_key")
      .using("btree", table.receiptId.asc().nullsLast().op("text_ops"))
      .where(sql`${table.receiptId} IS NOT NULL`),
    index("FormSubmission_submittedAt_idx").using(
      "btree",
      table.submittedAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("FormSubmission_triggerDispatchStatus_submittedAt_idx").using(
      "btree",
      table.triggerDispatchStatus.asc().nullsLast().op("text_ops"),
      table.submittedAt.asc().nullsLast().op("timestamp_ops"),
    ),
    check(
      "FormSubmission_native_publication_scope_check",
      sql`${table.receiptId} IS NULL OR (${table.organizationId} IS NOT NULL AND ${table.publicationTargetId} IS NOT NULL AND ${table.publicationVersionId} IS NOT NULL AND ${table.consentSnapshot} IS NOT NULL AND ${table.retentionExpiresAt} IS NOT NULL AND ${table.retentionExpiresAt} > ${table.submittedAt})`,
    ),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
      name: "FormSubmission_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.formId],
			foreignColumns: [form.id],
      name: "FormSubmission_formId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "FormSubmission_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "FormSubmission_organizationId_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.formId],
      foreignColumns: [form.organizationId, form.id],
      name: "FormSubmission_organizationId_formId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.publicationTargetId],
      foreignColumns: [publicationTarget.organizationId, publicationTarget.id],
      name: "FormSubmission_publicationTargetId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.publicationTargetId, table.publicationVersionId],
      foreignColumns: [publicationVersion.targetId, publicationVersion.id],
      name: "FormSubmission_publicationVersionId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.receiptId],
      foreignColumns: [
        publicFormSubmissionReceipt.organizationId,
        publicFormSubmissionReceipt.id,
      ],
      name: "FormSubmission_receiptId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
).enableRLS();

export const funnelAnalytics = pgTable(
  "FunnelAnalytics",
  {
	id: text().primaryKey().notNull(),
	funnelId: text().notNull(),
	pageId: text(),
	pageViews: integer().default(0).notNull(),
	uniqueVisitors: integer().default(0).notNull(),
	leads: integer().default(0).notNull(),
	conversions: integer().default(0).notNull(),
	date: date().notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("FunnelAnalytics_funnelId_date_idx").using(
      "btree",
      table.funnelId.asc().nullsLast().op("date_ops"),
      table.date.asc().nullsLast().op("date_ops"),
    ),
    uniqueIndex("FunnelAnalytics_funnelId_pageId_date_key").using(
      "btree",
      table.funnelId.asc().nullsLast().op("text_ops"),
      table.pageId.asc().nullsLast().op("text_ops"),
      table.date.asc().nullsLast().op("date_ops"),
    ),
    index("FunnelAnalytics_pageId_date_idx").using(
      "btree",
      table.pageId.asc().nullsLast().op("text_ops"),
      table.date.asc().nullsLast().op("date_ops"),
    ),
	foreignKey({
			columns: [table.funnelId],
			foreignColumns: [funnel.id],
      name: "FunnelAnalytics_funnelId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.pageId],
			foreignColumns: [funnelPage.id],
      name: "FunnelAnalytics_pageId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const funnelPage = pgTable(
  "FunnelPage",
  {
	id: text().primaryKey().notNull(),
	funnelId: text().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	order: integer().default(0).notNull(),
	isPublished: boolean().default(false).notNull(),
	metaTitle: text(),
	metaDescription: text(),
	metaImage: text(),
	customCss: text(),
	customJs: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("FunnelPage_funnelId_idx").using(
      "btree",
      table.funnelId.asc().nullsLast().op("text_ops"),
    ),
    index("FunnelPage_funnelId_order_idx").using(
      "btree",
      table.funnelId.asc().nullsLast().op("text_ops"),
      table.order.asc().nullsLast().op("int4_ops"),
    ),
    uniqueIndex("FunnelPage_funnelId_slug_key").using(
      "btree",
      table.funnelId.asc().nullsLast().op("text_ops"),
      table.slug.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.funnelId],
			foreignColumns: [funnel.id],
      name: "FunnelPage_funnelId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const funnelBlock = pgTable(
  "FunnelBlock",
  {
	id: text().primaryKey().notNull(),
	pageId: text(),
	parentBlockId: text(),
	type: funnelBlockType().notNull(),
	props: jsonb().default({}).notNull(),
	styles: jsonb().default({}).notNull(),
	order: integer().default(0).notNull(),
	visible: boolean().default(true).notNull(),
	locked: boolean().default(false).notNull(),
	targetWorkflowId: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
	smartSectionId: text(),
	smartSectionInstanceId: text(),
  },
  (table) => [
    index("FunnelBlock_pageId_idx").using(
      "btree",
      table.pageId.asc().nullsLast().op("text_ops"),
    ),
    index("FunnelBlock_pageId_order_idx").using(
      "btree",
      table.pageId.asc().nullsLast().op("text_ops"),
      table.order.asc().nullsLast().op("int4_ops"),
    ),
    index("FunnelBlock_pageId_parentBlockId_order_idx").using(
      "btree",
      table.pageId.asc().nullsLast().op("text_ops"),
      table.parentBlockId.asc().nullsLast().op("text_ops"),
      table.order.asc().nullsLast().op("int4_ops"),
    ),
    index("FunnelBlock_parentBlockId_idx").using(
      "btree",
      table.parentBlockId.asc().nullsLast().op("text_ops"),
    ),
    index("FunnelBlock_smartSectionId_idx").using(
      "btree",
      table.smartSectionId.asc().nullsLast().op("text_ops"),
    ),
    index("FunnelBlock_smartSectionId_order_idx").using(
      "btree",
      table.smartSectionId.asc().nullsLast().op("text_ops"),
      table.order.asc().nullsLast().op("int4_ops"),
    ),
    index("FunnelBlock_smartSectionInstanceId_idx").using(
      "btree",
      table.smartSectionInstanceId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("FunnelBlock_smartSectionInstanceId_key").using(
      "btree",
      table.smartSectionInstanceId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.pageId],
			foreignColumns: [funnelPage.id],
      name: "FunnelBlock_pageId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.parentBlockId],
			foreignColumns: [table.id],
      name: "FunnelBlock_parentBlockId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.smartSectionId],
			foreignColumns: [smartSection.id],
      name: "FunnelBlock_smartSectionId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.smartSectionInstanceId],
			foreignColumns: [smartSectionInstance.id],
      name: "FunnelBlock_smartSectionInstanceId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const smartSection = pgTable(
  "SmartSection",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	name: text().notNull(),
	description: text(),
	category: text(),
	thumbnail: text(),
	blockStructure: jsonb().default([]).notNull(),
	usageCount: integer().default(0).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("SmartSection_category_idx").using(
      "btree",
      table.category.asc().nullsLast().op("text_ops"),
    ),
    index("SmartSection_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("SmartSection_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "SmartSection_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "SmartSection_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const smartSectionInstance = pgTable(
  "SmartSectionInstance",
  {
	id: text().primaryKey().notNull(),
	sectionId: text().notNull(),
	funnelPageId: text(),
	formId: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
	order: integer().default(0).notNull(),
  },
  (table) => [
    index("SmartSectionInstance_formId_idx").using(
      "btree",
      table.formId.asc().nullsLast().op("text_ops"),
    ),
    index("SmartSectionInstance_funnelPageId_idx").using(
      "btree",
      table.funnelPageId.asc().nullsLast().op("text_ops"),
    ),
    index("SmartSectionInstance_sectionId_idx").using(
      "btree",
      table.sectionId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.formId],
			foreignColumns: [form.id],
      name: "SmartSectionInstance_formId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.funnelPageId],
			foreignColumns: [funnelPage.id],
      name: "SmartSectionInstance_funnelPageId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.sectionId],
			foreignColumns: [smartSection.id],
      name: "SmartSectionInstance_sectionId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const funnelBlockAnalytics = pgTable(
  "FunnelBlockAnalytics",
  {
	id: text().primaryKey().notNull(),
	blockId: text().notNull(),
	views: integer().default(0).notNull(),
	clicks: integer().default(0).notNull(),
	engagementTime: integer().default(0).notNull(),
	date: date().notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("FunnelBlockAnalytics_blockId_date_idx").using(
      "btree",
      table.blockId.asc().nullsLast().op("date_ops"),
      table.date.asc().nullsLast().op("date_ops"),
    ),
    uniqueIndex("FunnelBlockAnalytics_blockId_date_key").using(
      "btree",
      table.blockId.asc().nullsLast().op("text_ops"),
      table.date.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.blockId],
			foreignColumns: [funnelBlock.id],
      name: "FunnelBlockAnalytics_blockId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const funnelBlockEvent = pgTable(
  "FunnelBlockEvent",
  {
	id: text().primaryKey().notNull(),
	blockId: text().notNull(),
	eventType: text().notNull(),
	eventName: text(),
	parameters: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("FunnelBlockEvent_blockId_idx").using(
      "btree",
      table.blockId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("FunnelBlockEvent_blockId_key").using(
      "btree",
      table.blockId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.blockId],
			foreignColumns: [funnelBlock.id],
      name: "FunnelBlockEvent_blockId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const funnelBreakpoint = pgTable(
  "FunnelBreakpoint",
  {
	id: text().primaryKey().notNull(),
	blockId: text().notNull(),
	device: deviceType().notNull(),
	styles: jsonb().default({}).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("FunnelBreakpoint_blockId_device_key").using(
      "btree",
      table.blockId.asc().nullsLast().op("text_ops"),
      table.device.asc().nullsLast().op("text_ops"),
    ),
    index("FunnelBreakpoint_blockId_idx").using(
      "btree",
      table.blockId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.blockId],
			foreignColumns: [funnelBlock.id],
      name: "FunnelBreakpoint_blockId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const funnelPixelIntegration = pgTable(
  "FunnelPixelIntegration",
  {
	id: text().primaryKey().notNull(),
	funnelId: text().notNull(),
	provider: pixelProvider().notNull(),
	pixelId: text().notNull(),
	enabled: boolean().default(true).notNull(),
	metadata: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("FunnelPixelIntegration_funnelId_idx").using(
      "btree",
      table.funnelId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("FunnelPixelIntegration_funnelId_provider_key").using(
      "btree",
      table.funnelId.asc().nullsLast().op("text_ops"),
      table.provider.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.funnelId],
			foreignColumns: [funnel.id],
      name: "FunnelPixelIntegration_funnelId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const invitation = pgTable(
  "Invitation",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	email: text().notNull(),
	role: text(),
	status: text().notNull(),
    expiresAt: timestamp({ precision: 3, mode: "date" }).notNull(),
	inviterId: text().notNull(),
    staffIdentityId: text(),
  },
  (table) => [
    index("Invitation_staffIdentityId_idx").using(
      "btree",
      table.staffIdentityId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.inviterId],
			foreignColumns: [user.id],
      name: "Invitation_inviterId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "Invitation_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.staffIdentityId],
      foreignColumns: [staffIdentity.id],
      name: "Invitation_staffIdentityId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const invoiceTemplate = pgTable(
  "InvoiceTemplate",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	name: text().notNull(),
	description: text(),
	isDefault: boolean().default(false).notNull(),
	isSystem: boolean().default(false).notNull(),
	layout: jsonb().notNull(),
	styles: jsonb().notNull(),
	variables: jsonb(),
	thumbnailUrl: text(),
	metadata: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("InvoiceTemplate_isDefault_idx").using(
      "btree",
      table.isDefault.asc().nullsLast().op("bool_ops"),
    ),
    index("InvoiceTemplate_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("InvoiceTemplate_organizationId_locationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("InvoiceTemplate_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
  ],
).enableRLS();

export const invoiceLineItem = pgTable(
  "InvoiceLineItem",
  {
	id: text().primaryKey().notNull(),
	invoiceId: text().notNull(),
	description: text().notNull(),
	quantity: numeric({ precision: 10, scale:  2 }).notNull(),
	unitPrice: numeric({ precision: 10, scale:  2 }).notNull(),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	timeLogId: text(),
	order: integer().default(0).notNull(),
	metadata: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("InvoiceLineItem_invoiceId_idx").using(
      "btree",
      table.invoiceId.asc().nullsLast().op("text_ops"),
    ),
    index("InvoiceLineItem_timeLogId_idx").using(
      "btree",
      table.timeLogId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [invoice.id],
      name: "InvoiceLineItem_invoiceId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const invoicePayment = pgTable(
  "InvoicePayment",
  {
	id: text().primaryKey().notNull(),
	invoiceId: text().notNull(),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
    currency: text().default("USD").notNull(),
	method: paymentMethod().notNull(),
    paidAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
	stripePaymentId: text(),
	xeroPaymentId: text(),
	referenceNumber: text(),
	notes: text(),
	metadata: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("InvoicePayment_invoiceId_idx").using(
      "btree",
      table.invoiceId.asc().nullsLast().op("text_ops"),
    ),
    index("InvoicePayment_paidAt_idx").using(
      "btree",
      table.paidAt.asc().nullsLast().op("timestamp_ops"),
    ),
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [invoice.id],
      name: "InvoicePayment_invoiceId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const invoiceReminder = pgTable(
  "InvoiceReminder",
  {
	id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
	invoiceId: text().notNull(),
    sentAt: timestamp({ precision: 3, mode: "date" }),
	sentTo: text().notNull(),
	subject: text().notNull(),
	message: text().notNull(),
    deliveryStatus: outboundDeliveryStatus().default("QUEUED").notNull(),
    providerAccountId: text(),
    outboundDeliveryId: text(),
    policyId: text(),
    policyVersion: integer(),
    stepKey: text(),
    queuedAt: timestamp({ precision: 3, mode: "date" }),
    deliveredAt: timestamp({ precision: 3, mode: "date" }),
    failedAt: timestamp({ precision: 3, mode: "date" }),
    failureMessage: text(),
	opened: boolean().default(false).notNull(),
    openedAt: timestamp({ precision: 3, mode: "date" }),
	metadata: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
	daysOverdue: integer(),
	isDunning: boolean().default(false).notNull(),
  },
  (table) => [
    index("InvoiceReminder_invoiceId_idx").using(
      "btree",
      table.invoiceId.asc().nullsLast().op("text_ops"),
    ),
    index("InvoiceReminder_scope_status_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.deliveryStatus.asc().nullsLast().op("enum_ops"),
    ),
    uniqueIndex("InvoiceReminder_stepKey_key")
      .using("btree", table.stepKey.asc().nullsLast().op("text_ops"))
      .where(sql`${table.stepKey} IS NOT NULL`),
    index("InvoiceReminder_isDunning_idx").using(
      "btree",
      table.isDunning.asc().nullsLast().op("bool_ops"),
    ),
    index("InvoiceReminder_sentAt_idx").using(
      "btree",
      table.sentAt.asc().nullsLast().op("timestamp_ops"),
    ),
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [invoice.id],
      name: "InvoiceReminder_invoiceId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "InvoiceReminder_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "InvoiceReminder_organizationId_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const member = pgTable(
  "Member",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	userId: text().notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    role: organizationMemberRole().default("viewer").notNull(),
    staffIdentityId: text(),
  },
  (table) => [
    uniqueIndex("Member_staffIdentityId_key")
      .using("btree", table.staffIdentityId.asc().nullsLast().op("text_ops"))
      .where(sql`${table.staffIdentityId} IS NOT NULL`),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "Member_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
      name: "Member_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.staffIdentityId],
      foreignColumns: [staffIdentity.id],
      name: "Member_staffIdentityId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const notification = pgTable(
  "Notification",
  {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	organizationId: text(),
	locationId: text(),
	type: text().notNull(),
	title: text().notNull(),
	message: text().notNull(),
	data: jsonb(),
	entityType: text(),
	entityId: text(),
	actorId: text(),
	read: boolean().default(false).notNull(),
    readAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("Notification_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("Notification_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("Notification_userId_createdAt_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("text_ops"),
      table.createdAt.asc().nullsLast().op("text_ops"),
    ),
    index("Notification_userId_read_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("text_ops"),
      table.read.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.actorId],
			foreignColumns: [user.id],
      name: "Notification_actorId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
      name: "Notification_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const notificationPreference = pgTable(
  "NotificationPreference",
  {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	preferences: jsonb().default({}).notNull(),
	emailEnabled: boolean().default(true).notNull(),
	emailDigest: boolean().default(false).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("NotificationPreference_userId_key").using(
      "btree",
      table.userId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
      name: "NotificationPreference_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const qrCode = pgTable(
  "QRCode",
  {
	id: text().primaryKey().notNull(),
	locationId: text(),
	name: text().notNull(),
	code: text().notNull(),
	dealId: text(),
	location: jsonb(),
	enabled: boolean().default(true).notNull(),
    expiresAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
	organizationId: text().notNull(),
  },
  (table) => [
    index("QRCode_code_idx").using(
      "btree",
      table.code.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("QRCode_code_key").using(
      "btree",
      table.code.asc().nullsLast().op("text_ops"),
    ),
    index("QRCode_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("QRCode_organizationId_locationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("QRCode_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "QRCode_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "QRCode_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const recurringInvoice = pgTable(
  "RecurringInvoice",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	name: text().notNull(),
	description: text(),
    status: recurringInvoiceStatus().default("ACTIVE").notNull(),
	clientId: text(),
	clientName: text().notNull(),
	clientEmail: text(),
	clientAddress: jsonb(),
    billingModel: billingModel().default("RETAINER").notNull(),
	templateId: text(),
	frequency: recurringFrequency().notNull(),
	interval: integer().default(1).notNull(),
    startDate: timestamp({ precision: 3, mode: "date" }).notNull(),
    endDate: timestamp({ precision: 3, mode: "date" }),
    nextRunDate: timestamp({ precision: 3, mode: "date" }).notNull(),
	dayOfMonth: integer(),
	dayOfWeek: integer(),
	lineItems: jsonb().notNull(),
	subtotal: numeric({ precision: 12, scale:  2 }).notNull(),
	taxRate: numeric({ precision: 5, scale:  2 }),
    taxAmount: numeric({ precision: 12, scale: 2 }).default("0").notNull(),
    discountAmount: numeric({ precision: 12, scale: 2 }).default("0").notNull(),
	total: numeric({ precision: 12, scale:  2 }).notNull(),
    currency: text().default("USD").notNull(),
	dueDays: integer().default(30).notNull(),
	notes: text(),
	termsConditions: text(),
	autoSend: boolean().default(false).notNull(),
	sendReminders: boolean().default(false).notNull(),
    lastRunDate: timestamp({ precision: 3, mode: "date" }),
	invoicesGenerated: integer().default(0).notNull(),
	metadata: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("RecurringInvoice_frequency_idx").using(
      "btree",
      table.frequency.asc().nullsLast().op("enum_ops"),
    ),
    index("RecurringInvoice_nextRunDate_idx").using(
      "btree",
      table.nextRunDate.asc().nullsLast().op("timestamp_ops"),
    ),
    index("RecurringInvoice_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("RecurringInvoice_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    index("RecurringInvoice_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "RecurringInvoice_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const recurringInvoiceGeneration = pgTable(
  "RecurringInvoiceGeneration",
  {
	id: text().primaryKey().notNull(),
	recurringInvoiceId: text().notNull(),
	invoiceId: text().notNull(),
    generatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    periodStart: timestamp({ precision: 3, mode: "date" }).notNull(),
    periodEnd: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("RecurringInvoiceGeneration_invoiceId_key").using(
      "btree",
      table.invoiceId.asc().nullsLast().op("text_ops"),
    ),
    index("RecurringInvoiceGeneration_recurringInvoiceId_idx").using(
      "btree",
      table.recurringInvoiceId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.recurringInvoiceId],
			foreignColumns: [recurringInvoice.id],
      name: "RecurringInvoiceGeneration_recurringInvoiceId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const rota = pgTable(
  "Rota",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	instructorId: text().notNull(),
	clientId: text(),
	companyName: text(),
	dealId: text(),
    startTime: timestamp({ precision: 3, mode: "date" }).notNull(),
    endTime: timestamp({ precision: 3, mode: "date" }).notNull(),
	title: text(),
	description: text(),
	location: text(),
    status: rotaStatus().default("SCHEDULED").notNull(),
	hourlyRate: numeric({ precision: 10, scale:  2 }),
    currency: text().default("GBP"),
	billable: boolean().default(true).notNull(),
	notes: text(),
	customFields: jsonb(),
	isRecurring: boolean().default(false).notNull(),
	recurrenceRule: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    magicLinkSentAt: timestamp({ precision: 3, mode: "date" }),
    color: text().default("blue"),
    actualEndTime: timestamp({ precision: 3, mode: "date" }),
	actualHours: numeric({ precision: 10, scale:  2 }),
    actualStartTime: timestamp({ precision: 3, mode: "date" }),
	actualValue: numeric({ precision: 10, scale:  2 }),
	scheduledHours: numeric({ precision: 10, scale:  2 }),
	scheduledValue: numeric({ precision: 10, scale:  2 }),
  },
  (table) => [
    index("Rota_clientId_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    index("Rota_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("Rota_organizationId_instructorId_startTime_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.instructorId.asc().nullsLast().op("text_ops"),
      table.startTime.asc().nullsLast().op("timestamp_ops"),
    ),
    index("Rota_organizationId_instructorId_status_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.instructorId.asc().nullsLast().op("text_ops"),
      table.status.asc().nullsLast().op("text_ops"),
    ),
    index("Rota_startTime_idx").using(
      "btree",
      table.startTime.asc().nullsLast().op("timestamp_ops"),
    ),
    index("Rota_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    index("Rota_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("Rota_instructorId_idx").using(
      "btree",
      table.instructorId.asc().nullsLast().op("text_ops"),
    ),
    index("Rota_instructorId_startTime_endTime_idx").using(
      "btree",
      table.instructorId.asc().nullsLast().op("text_ops"),
      table.startTime.asc().nullsLast().op("text_ops"),
      table.endTime.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
      name: "Rota_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.dealId],
			foreignColumns: [deal.id],
      name: "Rota_dealId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "Rota_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "Rota_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.instructorId],
			foreignColumns: [instructor.id],
      name: "Rota_instructorId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const session = pgTable(
  "Session",
  {
	id: text().primaryKey().notNull(),
    expiresAt: timestamp({ precision: 3, mode: "date" }).notNull(),
	token: text().notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
	ipAddress: text(),
	userAgent: text(),
	userId: text().notNull(),
	activeOrganizationId: text(),
	activeLocationId: text(),
	isOnline: boolean().default(true).notNull(),
    lastActivityAt: timestamp({ precision: 3, mode: "date" }).default(
      sql`CURRENT_TIMESTAMP`,
    ),
  },
  (table) => [
    uniqueIndex("Session_token_key").using(
      "btree",
      table.token.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
      name: "Session_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const stripeConnection = pgTable(
  "StripeConnection",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	stripeAccountId: text().notNull(),
	accountType: text().notNull(),
	accessToken: text(),
	refreshToken: text(),
	isActive: boolean().default(true).notNull(),
	chargesEnabled: boolean().default(false).notNull(),
	payoutsEnabled: boolean().default(false).notNull(),
	detailsSubmitted: boolean().default(false).notNull(),
	email: text(),
	businessName: text(),
	country: text(),
	currency: text(),
	applicationFeePercent: numeric({ precision: 5, scale:  2 }),
	applicationFeeFixed: numeric({ precision: 10, scale:  2 }),
	metadata: jsonb(),
    lastSyncedAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("StripeConnection_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("StripeConnection_active_location_scope_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.isActive} = true AND ${table.locationId} IS NOT NULL`),
    uniqueIndex("StripeConnection_active_organization_scope_key")
      .using("btree", table.organizationId.asc().nullsLast().op("text_ops"))
      .where(sql`${table.isActive} = true AND ${table.locationId} IS NULL`),
    uniqueIndex("StripeConnection_organizationId_id_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("StripeConnection_scope_id_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
    index("StripeConnection_stripeAccountId_idx").using(
      "btree",
      table.stripeAccountId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("StripeConnection_stripeAccountId_key").using(
      "btree",
      table.stripeAccountId.asc().nullsLast().op("text_ops"),
    ),
    index("StripeConnection_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "StripeConnection_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "StripeConnection_organizationId_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
).enableRLS();

export const studioBooking = pgTable(
  "StudioBooking",
  {
	id: text().primaryKey().notNull(),
	classId: text().notNull(),
	clientId: text().notNull(),
	externalId: text(),
    status: studioBookingStatus().default("BOOKED").notNull(),
    bookedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    checkedInAt: timestamp({ precision: 3, mode: "date" }),
    cancelledAt: timestamp({ precision: 3, mode: "date" }),
	notes: text(),
	cancellationReason: text(),
    paymentStatus: bookingPaymentStatus().default("NOT_REQUIRED").notNull(),
    paymentId: text(),
    amount: numeric({ precision: 10, scale: 2 }),
    currency: text(),
    holdExpiresAt: timestamp({ precision: 3, mode: "date" }),
    paymentRequiredAt: timestamp({ precision: 3, mode: "date" }),
    paymentFailureAt: timestamp({ precision: 3, mode: "date" }),
    confirmedAt: timestamp({ precision: 3, mode: "date" }),
    releasedAt: timestamp({ precision: 3, mode: "date" }),
    bookingWindowPolicyVersionId: text(),
    bookingWindowPolicySource: schedulingPolicySource()
      .default("LEGACY")
      .notNull(),
    selfCancellationBlocked: boolean().default(false).notNull(),
    selfCancelClosesAt: timestamp({
      precision: 3,
      mode: "date",
      withTimezone: true,
    }),
	metadata: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("StudioBooking_classId_idx").using(
      "btree",
      table.classId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioBooking_clientId_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioBooking_externalId_idx").using(
      "btree",
      table.externalId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioBooking_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    index("StudioBooking_paymentStatus_holdExpiresAt_idx").using(
      "btree",
      table.paymentStatus.asc().nullsLast().op("enum_ops"),
      table.holdExpiresAt.asc().nullsLast().op("timestamp_ops"),
    ),
    uniqueIndex("StudioBooking_active_class_client_key")
      .using(
        "btree",
        table.classId.asc().nullsLast().op("text_ops"),
        table.clientId.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.status} IN ('BOOKED', 'ATTENDED')`),
	foreignKey({
			columns: [table.classId],
			foreignColumns: [studioClass.id],
      name: "StudioBooking_classId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
      name: "StudioBooking_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.bookingWindowPolicyVersionId],
      foreignColumns: [bookingWindowPolicyVersion.id],
      name: "StudioBooking_bookingWindowPolicyVersionId_fkey",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
  ],
).enableRLS();

export const studioBookingPayment = pgTable(
  "StudioBookingPayment",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	bookingId: text().notNull(),
	paymentId: text(),
	lineItemId: text(),
	classCreditId: text(),
	visitRefNo: text().notNull(),
	mindbodyPmtRefNo: text().notNull(),
	metadata: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("StudioBookingPayment_bookingId_idx").using(
      "btree",
      table.bookingId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioBookingPayment_classCreditId_idx").using(
      "btree",
      table.classCreditId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioBookingPayment_lineItemId_idx").using(
      "btree",
      table.lineItemId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioBookingPayment_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioBookingPayment_mindbodyPmtRefNo_idx").using(
      "btree",
      table.mindbodyPmtRefNo.asc().nullsLast().op("text_ops"),
    ),
    index("StudioBookingPayment_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioBookingPayment_paymentId_idx").using(
      "btree",
      table.paymentId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex(
      "StudioBookingPayment_organizationId_visitRefNo_pmtRefNo_key",
    ).using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.visitRefNo.asc().nullsLast().op("text_ops"),
      table.mindbodyPmtRefNo.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.bookingId],
			foreignColumns: [studioBooking.id],
      name: "StudioBookingPayment_bookingId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.classCreditId],
			foreignColumns: [classCredit.id],
      name: "StudioBookingPayment_classCreditId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.lineItemId],
			foreignColumns: [studioPaymentLineItem.id],
      name: "StudioBookingPayment_lineItemId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "StudioBookingPayment_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "StudioBookingPayment_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.paymentId],
			foreignColumns: [studioPayment.id],
      name: "StudioBookingPayment_paymentId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const locationModule = pgTable(
  "LocationModule",
  {
	id: text().primaryKey().notNull(),
	locationId: text(),
	moduleType: moduleType().notNull(),
	enabled: boolean().default(false).notNull(),
	config: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
	organizationId: text(),
  },
  (table) => [
    index("LocationModule_organizationId_enabled_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.enabled.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("LocationModule_organizationId_moduleType_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.moduleType.asc().nullsLast().op("text_ops"),
    ),
    index("LocationModule_locationId_enabled_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
      table.enabled.asc().nullsLast().op("bool_ops"),
    ),
    uniqueIndex("LocationModule_locationId_moduleType_key").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
      table.moduleType.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "LocationModule_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "LocationModule_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const userPresence = pgTable(
  "UserPresence",
  {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	organizationId: text(),
	locationId: text(),
    status: text().default("offline").notNull(),
    lastSeenAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    lastActivityAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
	userAgent: text(),
	ipAddress: text(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("UserPresence_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("UserPresence_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("UserPresence_userId_key").using(
      "btree",
      table.userId.asc().nullsLast().op("text_ops"),
    ),
    index("UserPresence_userId_status_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("text_ops"),
      table.status.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
      name: "UserPresence_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const instructorDocument = pgTable(
  "InstructorDocument",
  {
	id: text().primaryKey().notNull(),
	instructorId: text().notNull(),
	type: instructorDocumentType().notNull(),
	name: text().notNull(),
	description: text(),
	fileUrl: text(),
	fileName: text(),
	fileSize: integer(),
	mimeType: text(),
	documentNumber: text(),
    issueDate: timestamp({ precision: 3, mode: "date" }),
    expiryDate: timestamp({ precision: 3, mode: "date" }),
	issuingAuthority: text(),
    status: instructorDocumentStatus().default("PENDING_UPLOAD").notNull(),
    reviewedAt: timestamp({ precision: 3, mode: "date" }),
	reviewedBy: text(),
	rejectionReason: text(),
	expiryNotificationSent: boolean().default(false).notNull(),
    expiryNotificationDate: timestamp({ precision: 3, mode: "date" }),
	metadata: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("InstructorDocument_expiryDate_idx").using(
      "btree",
      table.expiryDate.asc().nullsLast().op("timestamp_ops"),
    ),
    index("InstructorDocument_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    index("InstructorDocument_type_idx").using(
      "btree",
      table.type.asc().nullsLast().op("enum_ops"),
    ),
    index("InstructorDocument_instructorId_idx").using(
      "btree",
      table.instructorId.asc().nullsLast().op("text_ops"),
    ),
    index("InstructorDocument_instructorId_status_idx").using(
      "btree",
      table.instructorId.asc().nullsLast().op("enum_ops"),
      table.status.asc().nullsLast().op("text_ops"),
    ),
    index("InstructorDocument_instructorId_type_idx").using(
      "btree",
      table.instructorId.asc().nullsLast().op("text_ops"),
      table.type.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.instructorId],
			foreignColumns: [instructor.id],
      name: "InstructorDocument_instructorId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const timeLog = pgTable(
  "TimeLog",
  {
	id: text().primaryKey().notNull(),
	locationId: text(),
	clientId: text(),
	dealId: text(),
    startTime: timestamp({ precision: 3, mode: "date" }).notNull(),
    endTime: timestamp({ precision: 3, mode: "date" }),
	duration: integer(),
	breakDuration: integer(),
    checkInMethod: checkInMethod().default("MANUAL").notNull(),
	checkInLocation: jsonb(),
	checkOutLocation: jsonb(),
	qrCodeId: text(),
	title: text(),
	description: text(),
    status: timeLogStatus().default("DRAFT").notNull(),
	billable: boolean().default(true).notNull(),
	hourlyRate: numeric({ precision: 10, scale:  2 }),
	totalAmount: numeric({ precision: 12, scale:  2 }),
    currency: text().default("USD"),
    submittedAt: timestamp({ precision: 3, mode: "date" }),
	submittedBy: text(),
    approvedAt: timestamp({ precision: 3, mode: "date" }),
	approvedBy: text(),
    rejectedAt: timestamp({ precision: 3, mode: "date" }),
	rejectedBy: text(),
	rejectionReason: text(),
	invoiceId: text(),
	customFields: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
	instructorId: text(),
	organizationId: text().notNull(),
    descriptionMode: text().default("single"),
	sections: jsonb(),
	complianceFlags: jsonb(),
	isOvertime: boolean().default(false),
	overtimeHours: numeric({ precision: 6, scale:  2 }),
  },
  (table) => [
    index("TimeLog_organizationId_clientId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    index("TimeLog_organizationId_dealId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.dealId.asc().nullsLast().op("text_ops"),
    ),
    index("TimeLog_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("TimeLog_organizationId_startTime_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.startTime.asc().nullsLast().op("timestamp_ops"),
    ),
    index("TimeLog_organizationId_status_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.status.asc().nullsLast().op("text_ops"),
    ),
    index("TimeLog_organizationId_locationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("TimeLog_organizationId_instructorId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.instructorId.asc().nullsLast().op("text_ops"),
    ),
    index("TimeLog_organizationId_instructorId_startTime_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.instructorId.asc().nullsLast().op("text_ops"),
      table.startTime.asc().nullsLast().op("text_ops"),
    ),
    index("TimeLog_status_invoiceId_idx").using(
      "btree",
      table.status.asc().nullsLast().op("text_ops"),
      table.invoiceId.asc().nullsLast().op("text_ops"),
    ),
    index("TimeLog_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("TimeLog_instructorId_status_idx").using(
      "btree",
      table.instructorId.asc().nullsLast().op("text_ops"),
      table.status.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
      name: "TimeLog_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.dealId],
			foreignColumns: [deal.id],
      name: "TimeLog_dealId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [invoice.id],
      name: "TimeLog_invoiceId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "TimeLog_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "TimeLog_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.instructorId],
			foreignColumns: [instructor.id],
      name: "TimeLog_instructorId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const shiftSwapRequest = pgTable(
  "ShiftSwapRequest",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	rotaId: text().notNull(),
	requesterId: text().notNull(),
	targetInstructorId: text(),
    status: shiftSwapStatus().default("PENDING").notNull(),
	reason: text(),
    requestedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    respondedAt: timestamp({ precision: 3, mode: "date" }),
	respondedBy: text(),
    adminApprovedAt: timestamp({ precision: 3, mode: "date" }),
	adminApprovedBy: text(),
    adminRejectedAt: timestamp({ precision: 3, mode: "date" }),
	adminRejectedBy: text(),
	rejectionReason: text(),
    expiresAt: timestamp({ precision: 3, mode: "date" }),
	notificationsSent: boolean().default(false).notNull(),
	metadata: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("ShiftSwapRequest_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("ShiftSwapRequest_organizationId_status_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    index("ShiftSwapRequest_requestedAt_idx").using(
      "btree",
      table.requestedAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("ShiftSwapRequest_requesterId_idx").using(
      "btree",
      table.requesterId.asc().nullsLast().op("text_ops"),
    ),
    index("ShiftSwapRequest_rotaId_idx").using(
      "btree",
      table.rotaId.asc().nullsLast().op("text_ops"),
    ),
    index("ShiftSwapRequest_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    index("ShiftSwapRequest_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("ShiftSwapRequest_targetInstructorId_idx").using(
      "btree",
      table.targetInstructorId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "ShiftSwapRequest_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.requesterId],
			foreignColumns: [instructor.id],
      name: "ShiftSwapRequest_requesterId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.rotaId],
			foreignColumns: [rota.id],
      name: "ShiftSwapRequest_rotaId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "ShiftSwapRequest_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.targetInstructorId],
			foreignColumns: [instructor.id],
      name: "ShiftSwapRequest_targetInstructorId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const instructorAvailability = pgTable(
  "InstructorAvailability",
  {
	id: text().primaryKey().notNull(),
	instructorId: text().notNull(),
	organizationId: text().notNull(),
	dayOfWeek: integer().notNull(),
	startTime: text().notNull(),
	endTime: text().notNull(),
	isRecurring: boolean().default(true).notNull(),
	isActive: boolean().default(true).notNull(),
    effectiveFrom: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    effectiveTo: timestamp({ precision: 3, mode: "date" }),
	notes: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("InstructorAvailability_dayOfWeek_idx").using(
      "btree",
      table.dayOfWeek.asc().nullsLast().op("int4_ops"),
    ),
    index("InstructorAvailability_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("InstructorAvailability_instructorId_dayOfWeek_isActive_idx").using(
      "btree",
      table.instructorId.asc().nullsLast().op("text_ops"),
      table.dayOfWeek.asc().nullsLast().op("int4_ops"),
      table.isActive.asc().nullsLast().op("bool_ops"),
    ),
    index("InstructorAvailability_instructorId_idx").using(
      "btree",
      table.instructorId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "InstructorAvailability_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.instructorId],
			foreignColumns: [instructor.id],
      name: "InstructorAvailability_instructorId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const timeOffRequest = pgTable(
  "TimeOffRequest",
  {
	id: text().primaryKey().notNull(),
	instructorId: text().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
    type: timeOffType().default("VACATION").notNull(),
    startDate: timestamp({ precision: 3, mode: "date" }).notNull(),
    endDate: timestamp({ precision: 3, mode: "date" }).notNull(),
	startHalfDay: boolean().default(false).notNull(),
	endHalfDay: boolean().default(false).notNull(),
	totalDays: numeric({ precision: 4, scale:  1 }).notNull(),
	reason: text(),
    status: approvalStatus().default("PENDING").notNull(),
    requestedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    approvedAt: timestamp({ precision: 3, mode: "date" }),
	approvedBy: text(),
    rejectedAt: timestamp({ precision: 3, mode: "date" }),
	rejectedBy: text(),
	rejectionReason: text(),
    cancelledAt: timestamp({ precision: 3, mode: "date" }),
	cancelledBy: text(),
	cancellationReason: text(),
	notes: text(),
	attachments: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("TimeOffRequest_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("TimeOffRequest_organizationId_status_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    index("TimeOffRequest_startDate_endDate_idx").using(
      "btree",
      table.startDate.asc().nullsLast().op("timestamp_ops"),
      table.endDate.asc().nullsLast().op("timestamp_ops"),
    ),
    index("TimeOffRequest_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    index("TimeOffRequest_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("TimeOffRequest_instructorId_idx").using(
      "btree",
      table.instructorId.asc().nullsLast().op("text_ops"),
    ),
    index("TimeOffRequest_instructorId_status_idx").using(
      "btree",
      table.instructorId.asc().nullsLast().op("enum_ops"),
      table.status.asc().nullsLast().op("enum_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "TimeOffRequest_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "TimeOffRequest_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.instructorId],
			foreignColumns: [instructor.id],
      name: "TimeOffRequest_instructorId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const overtimeTracking = pgTable(
  "OvertimeTracking",
  {
	id: text().primaryKey().notNull(),
	instructorId: text().notNull(),
	organizationId: text().notNull(),
    weekStartDate: timestamp({ precision: 3, mode: "date" }).notNull(),
    weekEndDate: timestamp({ precision: 3, mode: "date" }).notNull(),
	regularHours: numeric({ precision: 6, scale:  2 }).notNull(),
	overtimeHours: numeric({ precision: 6, scale:  2 }).notNull(),
	totalHours: numeric({ precision: 6, scale:  2 }).notNull(),
	weeklyLimit: numeric({ precision: 6, scale:  2 }),
	isOverLimit: boolean().default(false).notNull(),
	complianceFlags: jsonb(),
    calculatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("OvertimeTracking_isOverLimit_idx").using(
      "btree",
      table.isOverLimit.asc().nullsLast().op("bool_ops"),
    ),
    index("OvertimeTracking_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("OvertimeTracking_weekStartDate_idx").using(
      "btree",
      table.weekStartDate.asc().nullsLast().op("timestamp_ops"),
    ),
    index("OvertimeTracking_instructorId_idx").using(
      "btree",
      table.instructorId.asc().nullsLast().op("text_ops"),
    ),
    index("OvertimeTracking_instructorId_weekStartDate_idx").using(
      "btree",
      table.instructorId.asc().nullsLast().op("text_ops"),
      table.weekStartDate.asc().nullsLast().op("timestamp_ops"),
    ),
    uniqueIndex("OvertimeTracking_instructorId_weekStartDate_key").using(
      "btree",
      table.instructorId.asc().nullsLast().op("text_ops"),
      table.weekStartDate.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "OvertimeTracking_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.instructorId],
			foreignColumns: [instructor.id],
      name: "OvertimeTracking_instructorId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const invoice = pgTable(
  "Invoice",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	invoiceNumber: text().notNull(),
	clientId: text(),
	clientName: text().notNull(),
	clientEmail: text(),
	clientAddress: jsonb(),
	title: text(),
    status: invoiceStatus().default("DRAFT").notNull(),
    billingModel: billingModel().default("CUSTOM").notNull(),
    issueDate: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    dueDate: timestamp({ precision: 3, mode: "date" }).notNull(),
    paidAt: timestamp({ precision: 3, mode: "date" }),
	subtotal: numeric({ precision: 12, scale:  2 }).notNull(),
	taxRate: numeric({ precision: 5, scale:  2 }),
    taxAmount: numeric({ precision: 12, scale: 2 }).default("0").notNull(),
    discountAmount: numeric({ precision: 12, scale: 2 }).default("0").notNull(),
	total: numeric({ precision: 12, scale:  2 }).notNull(),
    amountPaid: numeric({ precision: 12, scale: 2 }).default("0").notNull(),
	amountDue: numeric({ precision: 12, scale:  2 }).notNull(),
    currency: text().default("USD").notNull(),
	notes: text(),
	internalNotes: text(),
	termsConditions: text(),
	stripeInvoiceId: text(),
	stripePaymentIntentId: text(),
	xeroInvoiceId: text(),
    lastReminderSentAt: timestamp({ precision: 3, mode: "date" }),
	reminderCount: integer().default(0).notNull(),
	metadata: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
	templateId: text(),
	bankTransferNotes: text(),
	bankTransferProof: text(),
	bankTransferStatus: bankTransferStatus(),
    bankTransferVerifiedAt: timestamp({ precision: 3, mode: "date" }),
	bankTransferVerifiedBy: text(),
	paymentMethods: paymentMethod("paymentMethods").array().default([]),
    type: invoiceType().default("SENT").notNull(),
	documentUrl: text(),
	documentName: text(),
  },
  (table) => [
    index("Invoice_clientId_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    index("Invoice_dueDate_idx").using(
      "btree",
      table.dueDate.asc().nullsLast().op("timestamp_ops"),
    ),
    index("Invoice_invoiceNumber_idx").using(
      "btree",
      table.invoiceNumber.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("Invoice_invoiceNumber_key").using(
      "btree",
      table.invoiceNumber.asc().nullsLast().op("text_ops"),
    ),
    index("Invoice_issueDate_idx").using(
      "btree",
      table.issueDate.asc().nullsLast().op("timestamp_ops"),
    ),
    index("Invoice_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("Invoice_organizationId_locationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("Invoice_organizationId_type_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("enum_ops"),
      table.type.asc().nullsLast().op("text_ops"),
    ),
    index("Invoice_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    uniqueIndex("Invoice_stripeInvoiceId_key").using(
      "btree",
      table.stripeInvoiceId.asc().nullsLast().op("text_ops"),
    ),
    index("Invoice_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("Invoice_templateId_idx").using(
      "btree",
      table.templateId.asc().nullsLast().op("text_ops"),
    ),
    index("Invoice_type_idx").using(
      "btree",
      table.type.asc().nullsLast().op("enum_ops"),
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "Invoice_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [invoiceTemplate.id],
      name: "Invoice_templateId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const invoiceAccessToken = pgTable(
  "InvoiceAccessToken",
  {
    id: text().primaryKey().notNull(),
    invoiceId: text().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    purpose: invoiceAccessPurpose().notNull(),
    tokenHash: text().notNull(),
    expiresAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    revokedAt: timestamp({ precision: 3, mode: "date" }),
    createdBy: text(),
    revokedBy: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("InvoiceAccessToken_tokenHash_key").using(
      "btree",
      table.tokenHash.asc().nullsLast().op("text_ops"),
    ),
    index("InvoiceAccessToken_invoiceId_purpose_idx").using(
      "btree",
      table.invoiceId.asc().nullsLast().op("text_ops"),
      table.purpose.asc().nullsLast().op("enum_ops"),
    ),
    index("InvoiceAccessToken_scope_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("InvoiceAccessToken_expiresAt_idx").using(
      "btree",
      table.expiresAt.asc().nullsLast().op("timestamp_ops"),
    ),
    foreignKey({
      columns: [table.invoiceId],
      foreignColumns: [invoice.id],
      name: "InvoiceAccessToken_invoiceId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "InvoiceAccessToken_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.locationId],
      foreignColumns: [location.id],
      name: "InvoiceAccessToken_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [user.id],
      name: "InvoiceAccessToken_createdBy_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.revokedBy],
      foreignColumns: [user.id],
      name: "InvoiceAccessToken_revokedBy_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const payrollRun = pgTable(
  "PayrollRun",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
    periodStart: timestamp({ precision: 3, mode: "date" }).notNull(),
    periodEnd: timestamp({ precision: 3, mode: "date" }).notNull(),
    paymentDate: timestamp({ precision: 3, mode: "date" }).notNull(),
    status: payrollRunStatus().default("DRAFT").notNull(),
	totalGrossPay: numeric({ precision: 12, scale:  2 }).notNull(),
    totalDeductions: numeric({ precision: 12, scale: 2 })
      .default("0")
      .notNull(),
	totalNetPay: numeric({ precision: 12, scale:  2 }).notNull(),
    currency: text().default("GBP").notNull(),
	notes: text(),
	approvedBy: text(),
    approvedAt: timestamp({ precision: 3, mode: "date" }),
	processedBy: text(),
    processedAt: timestamp({ precision: 3, mode: "date" }),
    completedAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
	createdBy: text().notNull(),
  },
  (table) => [
    index("PayrollRun_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("PayrollRun_paymentDate_idx").using(
      "btree",
      table.paymentDate.asc().nullsLast().op("timestamp_ops"),
    ),
    index("PayrollRun_periodStart_periodEnd_idx").using(
      "btree",
      table.periodStart.asc().nullsLast().op("timestamp_ops"),
      table.periodEnd.asc().nullsLast().op("timestamp_ops"),
    ),
    index("PayrollRun_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    index("PayrollRun_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "PayrollRun_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "PayrollRun_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const instructorPayment = pgTable(
  "InstructorPayment",
  {
	id: text().primaryKey().notNull(),
	instructorId: text().notNull(),
	payrollRunId: text(),
	organizationId: text().notNull(),
	locationId: text(),
    periodStart: timestamp({ precision: 3, mode: "date" }).notNull(),
    periodEnd: timestamp({ precision: 3, mode: "date" }).notNull(),
    paymentDate: timestamp({ precision: 3, mode: "date" }).notNull(),
	grossAmount: numeric({ precision: 12, scale:  2 }).notNull(),
    deductions: numeric({ precision: 12, scale: 2 }).default("0").notNull(),
	netAmount: numeric({ precision: 12, scale:  2 }).notNull(),
    currency: text().default("GBP").notNull(),
    paymentMethod: instructorPaymentMethod().default("BANK_TRANSFER").notNull(),
    paymentStatus: instructorPaymentStatus().default("PENDING").notNull(),
	paymentReference: text(),
	bankAccountName: text(),
	bankAccountNumber: text(),
	bankSortCode: text(),
	notes: text(),
	paidBy: text(),
    paidAt: timestamp({ precision: 3, mode: "date" }),
	failureReason: text(),
	metadata: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("InstructorPayment_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("InstructorPayment_paymentDate_idx").using(
      "btree",
      table.paymentDate.asc().nullsLast().op("timestamp_ops"),
    ),
    index("InstructorPayment_paymentStatus_idx").using(
      "btree",
      table.paymentStatus.asc().nullsLast().op("enum_ops"),
    ),
    index("InstructorPayment_payrollRunId_idx").using(
      "btree",
      table.payrollRunId.asc().nullsLast().op("text_ops"),
    ),
    index("InstructorPayment_periodStart_periodEnd_idx").using(
      "btree",
      table.periodStart.asc().nullsLast().op("timestamp_ops"),
      table.periodEnd.asc().nullsLast().op("timestamp_ops"),
    ),
    index("InstructorPayment_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("InstructorPayment_instructorId_idx").using(
      "btree",
      table.instructorId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "InstructorPayment_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.payrollRunId],
			foreignColumns: [payrollRun.id],
      name: "InstructorPayment_payrollRunId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "InstructorPayment_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.instructorId],
			foreignColumns: [instructor.id],
      name: "InstructorPayment_instructorId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const payrollRunInstructor = pgTable(
  "PayrollRunInstructor",
  {
	id: text().primaryKey().notNull(),
	payrollRunId: text().notNull(),
	instructorId: text().notNull(),
	regularHours: numeric({ precision: 8, scale:  2 }).notNull(),
    overtimeHours: numeric({ precision: 8, scale: 2 }).default("0").notNull(),
	regularPay: numeric({ precision: 12, scale:  2 }).notNull(),
    overtimePay: numeric({ precision: 12, scale: 2 }).default("0").notNull(),
    bonuses: numeric({ precision: 12, scale: 2 }).default("0").notNull(),
    deductions: numeric({ precision: 12, scale: 2 }).default("0").notNull(),
	grossPay: numeric({ precision: 12, scale:  2 }).notNull(),
	netPay: numeric({ precision: 12, scale:  2 }).notNull(),
	notes: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    housingAllowance: numeric({ precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    incomeTax: numeric({ precision: 12, scale: 2 }).default("0").notNull(),
    mealAllowance: numeric({ precision: 12, scale: 2 }).default("0").notNull(),
    nationalInsurance: numeric({ precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    otherAllowances: numeric({ precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    otherDeductions: numeric({ precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    payslipSentAt: timestamp({ precision: 3, mode: "date" }),
	payslipUrl: text(),
    pensionContribution: numeric({ precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    studentLoan: numeric({ precision: 12, scale: 2 }).default("0").notNull(),
    transportAllowance: numeric({ precision: 12, scale: 2 })
      .default("0")
      .notNull(),
	ytdGrossPay: numeric({ precision: 12, scale:  2 }),
	ytdNi: numeric({ precision: 12, scale:  2 }),
	ytdNetPay: numeric({ precision: 12, scale:  2 }),
	ytdTax: numeric({ precision: 12, scale:  2 }),
  },
  (table) => [
    index("PayrollRunInstructor_payrollRunId_idx").using(
      "btree",
      table.payrollRunId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("PayrollRunInstructor_payrollRunId_instructorId_key").using(
      "btree",
      table.payrollRunId.asc().nullsLast().op("text_ops"),
      table.instructorId.asc().nullsLast().op("text_ops"),
    ),
    index("PayrollRunInstructor_instructorId_idx").using(
      "btree",
      table.instructorId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.payrollRunId],
			foreignColumns: [payrollRun.id],
      name: "PayrollRunInstructor_payrollRunId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.instructorId],
			foreignColumns: [instructor.id],
      name: "PayrollRunInstructor_instructorId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const instructor = pgTable(
  "Instructor",
  {
	id: text().primaryKey().notNull(),
    staffIdentityId: text(),
	locationId: text(),
	mindbodyTrainerId: text(),
	name: text().notNull(),
	email: text(),
	phone: text(),
	employeeId: text(),
	portalToken: text(),
    portalTokenExpiry: timestamp({ precision: 3, mode: "date" }),
    lastLoginAt: timestamp({ precision: 3, mode: "date" }),
	hourlyRate: numeric({ precision: 10, scale:  2 }),
    currency: text().default("GBP"),
	role: text(),
	isActive: boolean().default(true).notNull(),
	customFields: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
	organizationId: text().notNull(),
	addressLine1: text(),
	addressLine2: text(),
	bankAccountName: text(),
	bankAccountNumber: text(),
	bankSortCode: text(),
	city: text(),
    country: text().default("United Kingdom"),
	county: text(),
    dateOfBirth: timestamp({ precision: 3, mode: "date" }),
	emergencyContactEmail: text(),
	emergencyContactName: text(),
	emergencyContactPhone: text(),
	emergencyContactRelation: text(),
	firstName: text(),
	gender: text(),
	hasOwnTransport: boolean().default(false).notNull(),
	languages: text().array().default([]),
	lastName: text(),
	maxHoursPerWeek: integer(),
	nationalInsuranceNumber: text(),
	onboardingCompleted: boolean().default(false).notNull(),
    onboardingCompletedAt: timestamp({ precision: 3, mode: "date" }),
	postcode: text(),
	preferredShiftTypes: text().array().default([]),
	profilePhoto: text(),
	qualifications: text().array().default([]),
	sessionToken: text(),
    sessionTokenExpiry: timestamp({ precision: 3, mode: "date" }),
	skills: text().array().default([]),
	travelRadius: integer(),
	commissionConfig: jsonb(),
    employmentStart: timestamp({ precision: 3, mode: "date" }),
    employmentEnd: timestamp({ precision: 3, mode: "date" }),
	isSystem: boolean().default(false).notNull(),
    employerPensionRate: numeric({ precision: 5, scale: 2 }).default("3"),
    housingAllowance: numeric({ precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    mealAllowance: numeric({ precision: 10, scale: 2 }).default("0").notNull(),
    otherAllowances: numeric({ precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    pensionContributionRate: numeric({ precision: 5, scale: 2 }).default("5"),
	pensionSchemeEnrolled: boolean().default(false).notNull(),
	studentLoanPlan: text(),
    taxCode: text().default("1257L"),
    transportAllowance: numeric({ precision: 10, scale: 2 })
      .default("0")
      .notNull(),
	bio: text(),
	instructorCertifications: text().array().default([]),
	instructorClassTypes: text().array().default([]),
	instructorSpecialties: text().array().default([]),
	publicProfileSlug: text(),
	stripeAccountId: text(),
	stripeAccountStatus: text(),
	stripeOnboardingComplete: boolean().default(false).notNull(),
	userId: text(),
  },
  (table) => [
    index("Instructor_email_idx").using(
      "btree",
      table.email.asc().nullsLast().op("text_ops"),
    ),
    index("Instructor_mindbodyTrainerId_idx").using(
      "btree",
      table.mindbodyTrainerId.asc().nullsLast().op("text_ops"),
    ),
    index("Instructor_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("Instructor_organizationId_locationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("Instructor_phone_idx").using(
      "btree",
      table.phone.asc().nullsLast().op("text_ops"),
    ),
    index("Instructor_portalToken_idx").using(
      "btree",
      table.portalToken.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("Instructor_organizationId_mindbodyTrainerId_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.mindbodyTrainerId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("Instructor_portalToken_key").using(
      "btree",
      table.portalToken.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("Instructor_stripeAccountId_key")
      .using("btree", table.stripeAccountId.asc().nullsLast().op("text_ops"))
      .where(sql`${table.stripeAccountId} IS NOT NULL`),
    index("Instructor_sessionToken_idx").using(
      "btree",
      table.sessionToken.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("Instructor_sessionToken_key").using(
      "btree",
      table.sessionToken.asc().nullsLast().op("text_ops"),
    ),
    index("Instructor_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("Instructor_userId_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("Instructor_userId_key").using(
      "btree",
      table.userId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("Instructor_locationId_staffIdentityId_key")
      .using(
        "btree",
        table.locationId.asc().nullsLast().op("text_ops"),
        table.staffIdentityId.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.staffIdentityId} IS NOT NULL`),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "Instructor_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "Instructor_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.staffIdentityId],
      foreignColumns: [staffIdentity.id],
      name: "Instructor_staffIdentityId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const studioStaffMember = pgTable(
  "StudioStaffMember",
  {
	id: text().primaryKey().notNull(),
    staffIdentityId: text(),
	organizationId: text().notNull(),
	locationId: text(),
	externalId: text(),
	employeeId: text(),
	firstName: text(),
	lastName: text(),
	name: text().notNull(),
	email: text(),
	phone: text(),
	role: text(),
    staffType: text().default("TEAM_MEMBER").notNull(),
	isActive: boolean().default(true).notNull(),
	isSystem: boolean().default(false).notNull(),
	isIntegrationAccount: boolean().default(false).notNull(),
	canTeachClasses: boolean().default(false).notNull(),
	canTakeAppointments: boolean().default(false).notNull(),
	canHandleReservations: boolean().default(false).notNull(),
	canLeadWorkshops: boolean().default(false).notNull(),
	hourlyRate: numeric({ precision: 10, scale:  2 }),
    currency: text().default("GBP"),
    employmentStart: timestamp({ precision: 3, mode: "date" }),
    employmentEnd: timestamp({ precision: 3, mode: "date" }),
	metadata: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    deletedAt: timestamp({ precision: 3, mode: "date" }),
  },
  (table) => [
    index("StudioStaffMember_email_idx").using(
      "btree",
      table.email.asc().nullsLast().op("text_ops"),
    ),
    index("StudioStaffMember_isActive_idx").using(
      "btree",
      table.isActive.asc().nullsLast().op("bool_ops"),
    ),
    index("StudioStaffMember_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioStaffMember_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("StudioStaffMember_staffType_idx").using(
      "btree",
      table.staffType.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("StudioStaffMember_organizationId_externalId_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.externalId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("StudioStaffMember_locationId_staffIdentityId_key")
      .using(
        "btree",
        table.locationId.asc().nullsLast().op("text_ops"),
        table.staffIdentityId.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.staffIdentityId} IS NOT NULL`),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "StudioStaffMember_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "StudioStaffMember_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.staffIdentityId],
      foreignColumns: [staffIdentity.id],
      name: "StudioStaffMember_staffIdentityId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const funnel = pgTable(
  "Funnel",
  {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
    status: funnelStatus().default("DRAFT").notNull(),
	organizationId: text().notNull(),
	locationId: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    publishedAt: timestamp({ precision: 3, mode: "date" }),
	stylePresetId: text(),
	customDomain: text(),
    domainType: funnelDomainType().default("SUBDOMAIN").notNull(),
	domainVerified: boolean().default(false).notNull(),
	subdomain: text(),
	apiKey: text(),
	externalDomains: text().array(),
	externalMetadata: jsonb(),
	externalUrl: text(),
    funnelType: funnelType().default("INTERNAL").notNull(),
	isReadOnly: boolean().default(false).notNull(),
    lastSyncedAt: timestamp({ precision: 3, mode: "date" }),
	trackingConfig: jsonb(),
  },
  (table) => [
    index("Funnel_apiKey_idx").using(
      "btree",
      table.apiKey.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("Funnel_apiKey_key").using(
      "btree",
      table.apiKey.asc().nullsLast().op("text_ops"),
    ),
    index("Funnel_customDomain_idx").using(
      "btree",
      table.customDomain.asc().nullsLast().op("text_ops"),
    ),
    index("Funnel_funnelType_idx").using(
      "btree",
      table.funnelType.asc().nullsLast().op("enum_ops"),
    ),
    index("Funnel_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("Funnel_organizationId_id_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
    index("Funnel_organizationId_locationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("Funnel_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    index("Funnel_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("Funnel_subdomain_idx").using(
      "btree",
      table.subdomain.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "Funnel_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.stylePresetId],
			foreignColumns: [globalStylePreset.id],
      name: "Funnel_stylePresetId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "Funnel_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const externalFormSubmission = pgTable(
  "ExternalFormSubmission",
  {
	id: text().primaryKey().notNull(),
    mirroredFormSubmissionId: text(),
    idempotencyKey: text(),
    payloadHash: text(),
	funnelId: text().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	formId: text(),
	formKey: text().notNull(),
	formName: text(),
	formType: text(),
	formVersion: text(),
    status: text().default("submitted").notNull(),
	qualified: boolean(),
	score: doublePrecision(),
	reasonCodes: text().array().default([]).notNull(),
	data: jsonb().notNull(),
	normalized: jsonb().default({}).notNull(),
	metadata: jsonb().default({}).notNull(),
	sessionId: text(),
	anonymousId: text(),
	userId: text(),
	pageUrl: text(),
	pagePath: text(),
	pageTitle: text(),
	referrer: text(),
	utmSource: text(),
	utmMedium: text(),
	utmCampaign: text(),
	utmTerm: text(),
	utmContent: text(),
	firstTouchUtm: jsonb(),
	lastTouchUtm: jsonb(),
	clickIds: jsonb(),
	cookies: jsonb(),
	device: jsonb(),
	ipAddress: text(),
	userAgent: text(),
    submittedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("ExternalFormSubmission_anonymousId_idx").using(
      "btree",
      table.anonymousId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("ExternalFormSubmission_mirroredFormSubmissionId_key").using(
      "btree",
      table.mirroredFormSubmissionId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("ExternalFormSubmission_funnelId_idempotencyKey_key")
      .using(
        "btree",
        table.funnelId.asc().nullsLast().op("text_ops"),
        table.idempotencyKey.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.idempotencyKey} IS NOT NULL`),
    check(
      "ExternalFormSubmission_idempotency_hash_check",
      sql`${table.idempotencyKey} IS NULL OR char_length(${table.payloadHash}) = 64`,
    ),
    index("ExternalFormSubmission_formKey_idx").using(
      "btree",
      table.formKey.asc().nullsLast().op("text_ops"),
    ),
    index("ExternalFormSubmission_funnelId_submittedAt_idx").using(
      "btree",
      table.funnelId.asc().nullsLast().op("text_ops"),
      table.submittedAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("ExternalFormSubmission_locationId_submittedAt_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
      table.submittedAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("ExternalFormSubmission_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("ExternalFormSubmission_qualified_idx").using(
      "btree",
      table.qualified.asc().nullsLast().op("bool_ops"),
    ),
    index("ExternalFormSubmission_sessionId_idx").using(
      "btree",
      table.sessionId.asc().nullsLast().op("text_ops"),
    ),
    index("ExternalFormSubmission_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.mirroredFormSubmissionId],
      foreignColumns: [formSubmission.id],
      name: "ExternalFormSubmission_mirroredFormSubmissionId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.formId],
			foreignColumns: [form.id],
      name: "ExternalFormSubmission_formId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.funnelId],
			foreignColumns: [funnel.id],
      name: "ExternalFormSubmission_funnelId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "ExternalFormSubmission_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "ExternalFormSubmission_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const anonymousUserProfiles = pgTable(
  "anonymous_user_profiles",
  {
	id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    anonymousId: text().notNull(),
	displayName: text().notNull(),
    firstSeen: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    lastSeen: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
	totalSessions: integer().default(0).notNull(),
	totalEvents: integer().default(0).notNull(),
	avgEngagementRate: doublePrecision(),
	avgExperienceScore: doublePrecision(),
    identifiedAt: timestamp({ precision: 3, mode: "date" }),
	identifiedUserId: text(),
	lifecycleStage: text(),
	tags: text().array().default([]),
	userProperties: jsonb().default({}).notNull(),
	consentGiven: boolean().default(false).notNull(),
    consentTimestamp: timestamp({ precision: 3, mode: "date" }),
    consentVersion: text().default("1.0"),
	dataRetentionDays: integer().default(90).notNull(),
    deletionRequestedAt: timestamp({ precision: 3, mode: "date" }),
  },
  (table) => [
    uniqueIndex("anonymous_user_profiles_org_identity_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.anonymousId.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.locationId} IS NULL`),
    uniqueIndex("anonymous_user_profiles_location_identity_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
        table.anonymousId.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.locationId} IS NOT NULL`),
    index("anonymous_user_profiles_scope_lastSeen_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.lastSeen.asc().nullsLast().op("timestamp_ops"),
    ),
    index("anonymous_user_profiles_consentGiven_idx").using(
      "btree",
      table.consentGiven.asc().nullsLast().op("bool_ops"),
    ),
    index("anonymous_user_profiles_deletionRequestedAt_idx").using(
      "btree",
      table.deletionRequestedAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("anonymous_user_profiles_identifiedUserId_idx").using(
      "btree",
      table.identifiedUserId.asc().nullsLast().op("text_ops"),
    ),
    index("anonymous_user_profiles_lifecycleStage_idx").using(
      "btree",
      table.lifecycleStage.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "anonymous_user_profiles_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "anonymous_user_profiles_organizationId_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const funnelWebVital = pgTable(
  "FunnelWebVital",
  {
	id: text().primaryKey().notNull(),
	funnelId: text().notNull(),
	locationId: text(),
	sessionId: text().notNull(),
	anonymousId: text(),
	pageUrl: text().notNull(),
	pagePath: text().notNull(),
	pageTitle: text(),
	metric: webVitalMetric().notNull(),
	value: doublePrecision().notNull(),
	rating: webVitalRating().notNull(),
	delta: doublePrecision(),
	idMetric: text("id_metric"),
	deviceType: text(),
	browserName: text(),
	browserVersion: text(),
	osName: text(),
	osVersion: text(),
	screenWidth: integer(),
	screenHeight: integer(),
	countryCode: text(),
	countryName: text(),
	region: text(),
	city: text(),
    timestamp: timestamp({ precision: 3, mode: "date" }).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("FunnelWebVital_anonymousId_idx").using(
      "btree",
      table.anonymousId.asc().nullsLast().op("text_ops"),
    ),
    index("FunnelWebVital_funnelId_timestamp_idx").using(
      "btree",
      table.funnelId.asc().nullsLast().op("text_ops"),
      table.timestamp.asc().nullsLast().op("text_ops"),
    ),
    index("FunnelWebVital_metric_rating_idx").using(
      "btree",
      table.metric.asc().nullsLast().op("enum_ops"),
      table.rating.asc().nullsLast().op("enum_ops"),
    ),
    index("FunnelWebVital_pageUrl_metric_idx").using(
      "btree",
      table.pageUrl.asc().nullsLast().op("text_ops"),
      table.metric.asc().nullsLast().op("enum_ops"),
    ),
    index("FunnelWebVital_sessionId_idx").using(
      "btree",
      table.sessionId.asc().nullsLast().op("text_ops"),
    ),
    index("FunnelWebVital_locationId_timestamp_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
      table.timestamp.asc().nullsLast().op("timestamp_ops"),
    ),
    foreignKey({
      columns: [table.funnelId, table.sessionId],
      foreignColumns: [funnelSession.funnelId, funnelSession.sessionId],
      name: "FunnelWebVital_funnelId_sessionId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const funnelEvent = pgTable(
  "FunnelEvent",
  {
	id: text().primaryKey().notNull(),
	eventId: text().notNull(),
	funnelId: text().notNull(),
	locationId: text(),
	eventName: text().notNull(),
	eventProperties: jsonb().default({}).notNull(),
	sessionId: text().notNull(),
	userId: text(),
	anonymousId: text(),
	pageUrl: text(),
	pagePath: text(),
	pageTitle: text(),
	referrer: text(),
	utmSource: text(),
	utmMedium: text(),
	utmCampaign: text(),
	utmTerm: text(),
	utmContent: text(),
	userAgent: text(),
	deviceType: text(),
	browserName: text(),
	browserVersion: text(),
	osName: text(),
	osVersion: text(),
	screenWidth: integer(),
	screenHeight: integer(),
	ipAddress: text(),
	countryCode: text(),
	region: text(),
	city: text(),
	timezone: text(),
	isConversion: boolean().default(false).notNull(),
	conversionType: text(),
	revenue: numeric({ precision: 10, scale:  2 }),
	currency: text(),
	orderId: text(),
    timestamp: timestamp({ precision: 3, mode: "date" }).notNull(),
    serverTimestamp: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
	countryName: text(),
	cls: doublePrecision(),
	fcp: doublePrecision(),
	inp: doublePrecision(),
	lcp: doublePrecision(),
	ttfb: doublePrecision(),
	vitalRating: text(),
	funnelStage: text(),
	isMicroConversion: boolean().default(false).notNull(),
	microConversionType: text(),
	microConversionValue: doublePrecision(),
	eventCategory: text(),
	eventDescription: text(),
	eventColor: text(),
	scCid: text("ScCid"),
	dclid: text(),
	epik: text(),
	fbc: text(),
	fbclid: text(),
	fbp: text(),
	gbraid: text(),
	gclid: text(),
	liFatId: text("li_fat_id"),
	msclkid: text(),
	rdtCid: text("rdt_cid"),
	ttclid: text(),
	ttp: text(),
	twclid: text(),
	wbraid: text(),
	abTestId: text(),
	abTestVariant: text(),
	customDimensions: jsonb(),
	engagementLevel: text(),
	engagementScore: doublePrecision(),
	eventSource: text(),
    firstTouchTimestamp: timestamp({ precision: 3, mode: "date" }),
	firstTouchUtmCampaign: text(),
	firstTouchUtmContent: text(),
	firstTouchUtmMedium: text(),
	firstTouchUtmSource: text(),
	firstTouchUtmTerm: text(),
    lastTouchTimestamp: timestamp({ precision: 3, mode: "date" }),
	lastTouchUtmCampaign: text(),
	lastTouchUtmContent: text(),
	lastTouchUtmMedium: text(),
	lastTouchUtmSource: text(),
	lastTouchUtmTerm: text(),
	leadScore: doublePrecision(),
	leadScoreGrade: text(),
  },
  (table) => [
    index("FunnelEvent_abTestId_idx").using(
      "btree",
      table.abTestId.asc().nullsLast().op("text_ops"),
    ),
    index("FunnelEvent_anonymousId_idx").using(
      "btree",
      table.anonymousId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("FunnelEvent_eventId_key").using(
      "btree",
      table.eventId.asc().nullsLast().op("text_ops"),
    ),
    index("FunnelEvent_eventName_funnelId_idx").using(
      "btree",
      table.eventName.asc().nullsLast().op("text_ops"),
      table.funnelId.asc().nullsLast().op("text_ops"),
    ),
    index("FunnelEvent_fbclid_idx").using(
      "btree",
      table.fbclid.asc().nullsLast().op("text_ops"),
    ),
    index("FunnelEvent_funnelId_timestamp_idx").using(
      "btree",
      table.funnelId.asc().nullsLast().op("text_ops"),
      table.timestamp.asc().nullsLast().op("text_ops"),
    ),
    index("FunnelEvent_gclid_idx").using(
      "btree",
      table.gclid.asc().nullsLast().op("text_ops"),
    ),
    index("FunnelEvent_isConversion_funnelId_idx").using(
      "btree",
      table.isConversion.asc().nullsLast().op("bool_ops"),
      table.funnelId.asc().nullsLast().op("text_ops"),
    ),
    index("FunnelEvent_leadScoreGrade_idx").using(
      "btree",
      table.leadScoreGrade.asc().nullsLast().op("text_ops"),
    ),
    index("FunnelEvent_msclkid_idx").using(
      "btree",
      table.msclkid.asc().nullsLast().op("text_ops"),
    ),
    index("FunnelEvent_sessionId_idx").using(
      "btree",
      table.sessionId.asc().nullsLast().op("text_ops"),
    ),
    index("FunnelEvent_funnelId_sessionId_idx").using(
      "btree",
      table.funnelId.asc().nullsLast().op("text_ops"),
      table.sessionId.asc().nullsLast().op("text_ops"),
    ),
    index("FunnelEvent_locationId_timestamp_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
      table.timestamp.asc().nullsLast().op("timestamp_ops"),
    ),
    index("FunnelEvent_ttclid_idx").using(
      "btree",
      table.ttclid.asc().nullsLast().op("text_ops"),
    ),
    index("FunnelEvent_userId_timestamp_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("text_ops"),
      table.timestamp.asc().nullsLast().op("timestamp_ops"),
    ),
	foreignKey({
			columns: [table.funnelId],
			foreignColumns: [funnel.id],
      name: "FunnelEvent_funnelId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "FunnelEvent_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const adConversionDelivery = pgTable(
  "AdConversionDelivery",
  {
    id: text().primaryKey().notNull(),
    eventId: text().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    providerAccountId: text().notNull(),
    provider: text().notNull(),
    status: adConversionDeliveryStatus().default("PROCESSING").notNull(),
    attemptCount: integer().default(1).notNull(),
    providerEventId: text(),
    lastErrorCode: text(),
    lastAttemptAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    succeededAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("AdConversionDelivery_eventId_providerAccountId_key").using(
      "btree",
      table.eventId.asc().nullsLast().op("text_ops"),
      table.providerAccountId.asc().nullsLast().op("text_ops"),
    ),
    index("AdConversionDelivery_scope_status_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    index("AdConversionDelivery_providerAccountId_idx").using(
      "btree",
      table.providerAccountId.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.eventId],
      foreignColumns: [funnelEvent.eventId],
      name: "AdConversionDelivery_eventId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "AdConversionDelivery_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "AdConversionDelivery_organizationId_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.providerAccountId],
      foreignColumns: [providerAccount.organizationId, providerAccount.id],
      name: "AdConversionDelivery_providerAccountId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const funnelSession = pgTable(
  "FunnelSession",
  {
	id: text().primaryKey().notNull(),
	sessionId: text().notNull(),
	funnelId: text().notNull(),
	locationId: text(),
	userId: text(),
	anonymousId: text(),
    startedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    endedAt: timestamp({ precision: 3, mode: "date" }),
	durationSeconds: integer(),
	firstSource: text(),
	firstMedium: text(),
	firstCampaign: text(),
	firstReferrer: text(),
	firstPageUrl: text(),
	lastSource: text(),
	lastMedium: text(),
	lastCampaign: text(),
	lastPageUrl: text(),
	pageViews: integer().default(0).notNull(),
	eventsCount: integer().default(0).notNull(),
	converted: boolean().default(false).notNull(),
	conversionValue: numeric({ precision: 10, scale:  2 }),
	conversionType: text(),
	ipAddress: text(),
	userAgent: text(),
	deviceType: text(),
	countryCode: text(),
	city: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
	profileId: text(),
	browserName: text(),
	browserVersion: text(),
	countryName: text(),
	osName: text(),
	osVersion: text(),
	region: text(),
	activeTimeSeconds: integer(),
	avgCls: doublePrecision(),
	avgFcp: doublePrecision(),
	avgInp: doublePrecision(),
	avgLcp: doublePrecision(),
	avgTtfb: doublePrecision(),
	engagementRate: doublePrecision(),
	experienceScore: integer(),
	idleTimeSeconds: integer(),
	abandonReason: text(),
    abandonedAt: timestamp({ precision: 3, mode: "date" }),
    checkoutCompletedAt: timestamp({ precision: 3, mode: "date" }),
	checkoutDuration: integer(),
    checkoutStartedAt: timestamp({ precision: 3, mode: "date" }),
	currentStage: text(),
	firstTouchSource: text(),
	isAbandoned: boolean().default(false).notNull(),
	lastTouchSource: text(),
	linkedSessionId: text(),
	stageHistory: jsonb().default([]).notNull(),
	touchpoints: text().array().default([]),
	consentGiven: boolean().default(false).notNull(),
    consentTimestamp: timestamp({ precision: 3, mode: "date" }),
    consentVersion: text().default("1.0"),
	conversionPlatform: text(),
	fbc: text(),
	fbp: text(),
	firstFbclid: text(),
	firstGclid: text(),
	firstLiFatId: text(),
	firstMsclkid: text(),
	firstTtclid: text(),
	firstTwclid: text(),
	lastFbclid: text(),
	lastGclid: text(),
	lastLiFatId: text(),
	lastMsclkid: text(),
	lastTtclid: text(),
	lastTwclid: text(),
	ttp: text(),
	gbraid: text(),
	wbraid: text(),
	latitude: doublePrecision(),
	longitude: doublePrecision(),
  },
  (table) => [
    index("FunnelSession_anonymousId_idx").using(
      "btree",
      table.anonymousId.asc().nullsLast().op("text_ops"),
    ),
    index("FunnelSession_consentGiven_idx").using(
      "btree",
      table.consentGiven.asc().nullsLast().op("bool_ops"),
    ),
    index("FunnelSession_converted_funnelId_idx").using(
      "btree",
      table.converted.asc().nullsLast().op("bool_ops"),
      table.funnelId.asc().nullsLast().op("text_ops"),
    ),
    index("FunnelSession_funnelId_startedAt_idx").using(
      "btree",
      table.funnelId.asc().nullsLast().op("text_ops"),
      table.startedAt.asc().nullsLast().op("timestamp_ops"),
    ),
    uniqueIndex("FunnelSession_funnelId_sessionId_key").using(
      "btree",
      table.funnelId.asc().nullsLast().op("text_ops"),
      table.sessionId.asc().nullsLast().op("text_ops"),
    ),
    index("FunnelSession_profileId_idx").using(
      "btree",
      table.profileId.asc().nullsLast().op("text_ops"),
    ),
    index("FunnelSession_locationId_startedAt_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
      table.startedAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("FunnelSession_userId_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.funnelId],
			foreignColumns: [funnel.id],
      name: "FunnelSession_funnelId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.linkedSessionId],
			foreignColumns: [table.id],
      name: "FunnelSession_linkedSessionId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.profileId],
			foreignColumns: [anonymousUserProfiles.id],
      name: "FunnelSession_profileId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "FunnelSession_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const adSpend = pgTable(
  "AdSpend",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	funnelId: text(),
	platform: text().notNull(),
	campaignId: text(),
	campaignName: text(),
	adSetId: text(),
	adSetName: text(),
	adId: text(),
	adName: text(),
	date: date().notNull(),
	spend: numeric({ precision: 10, scale:  2 }).notNull(),
    currency: text().default("USD").notNull(),
	impressions: integer(),
	clicks: integer(),
	conversions: integer(),
	revenue: numeric({ precision: 10, scale:  2 }),
	cpc: numeric({ precision: 10, scale:  2 }),
	cpm: numeric({ precision: 10, scale:  2 }),
	ctr: numeric({ precision: 5, scale:  2 }),
	conversionRate: numeric({ precision: 5, scale:  2 }),
	roas: numeric({ precision: 10, scale:  2 }),
	rawData: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("AdSpend_funnelId_date_idx").using(
      "btree",
      table.funnelId.asc().nullsLast().op("date_ops"),
      table.date.asc().nullsLast().op("text_ops"),
    ),
    index("AdSpend_organizationId_date_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.date.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("AdSpend_organizationId_platform_campaignId_date_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.platform.asc().nullsLast().op("date_ops"),
      table.campaignId.asc().nullsLast().op("date_ops"),
      table.date.asc().nullsLast().op("date_ops"),
    ),
    index("AdSpend_platform_date_idx").using(
      "btree",
      table.platform.asc().nullsLast().op("text_ops"),
      table.date.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.funnelId],
			foreignColumns: [funnel.id],
      name: "AdSpend_funnelId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "AdSpend_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "AdSpend_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const adPlatformCredential = pgTable(
  "AdPlatformCredential",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	platform: text().notNull(),
	accessToken: text(),
	refreshToken: text(),
	apiKey: text(),
	apiSecret: text(),
	accountId: text(),
	pixelId: text(),
	developerId: text(),
	customerId: text(),
    expiresAt: timestamp({ precision: 3, mode: "date" }),
	isActive: boolean().default(true).notNull(),
    lastSyncedAt: timestamp({ precision: 3, mode: "date" }),
	lastError: text(),
	scopes: text().array().default([]),
	metadata: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex(
      "AdPlatformCredential_organizationId_platform_accountId_key",
    ).using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.platform.asc().nullsLast().op("text_ops"),
      table.accountId.asc().nullsLast().op("text_ops"),
    ),
    index("AdPlatformCredential_organizationId_platform_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.platform.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "AdPlatformCredential_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "AdPlatformCredential_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const client = pgTable(
  "Client",
  {
	id: text().primaryKey().notNull(),
	locationId: text(),
	mindbodyId: text(),
	barcodeId: text(),
	logo: text(),
	name: text().notNull(),
	firstName: text(),
	middleName: text(),
	lastName: text(),
	nickname: text(),
	companyName: text(),
	email: text(),
	position: text(),
	phone: text(),
	homePhone: text(),
	workPhone: text(),
	mobilePhone: text(),
	addressLine1: text(),
	addressLine2: text(),
	country: text(),
	city: text(),
	state: text(),
	postalCode: text(),
    dateOfBirth: timestamp({ precision: 3, mode: "date" }),
	gender: text(),
	score: integer().default(0),
    type: clientType().default("LEAD").notNull(),
	source: text(),
	website: text(),
	linkedin: text(),
	tags: text().array().default([]),
    lastInteractionAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
	lifecycleStage: lifecycleStage(),
	organizationId: text().notNull(),
	metadata: jsonb(),
	emailUnsubscribed: boolean().default(false).notNull(),
    emailUnsubscribedAt: timestamp({ precision: 3, mode: "date" }),
	attendanceCount: integer().default(0).notNull(),
	currentStreak: integer().default(0).notNull(),
	emergencyContactName: text(),
	emergencyContactPhone: text(),
	emergencyContactRelation: text(),
	emergencyContactEmail: text(),
	fitnessGoals: text(),
	healthNotes: text(),
    waiverSignedAt: timestamp({ precision: 3, mode: "date" }),
	contraindications: text(),
	trustedMember: boolean().default(false).notNull(),
	stripeCustomerId: text(),
	portalToken: text(),
    portalTokenExpiry: timestamp({ precision: 3, mode: "date" }),
	birthMonth: integer(),
	birthDay: integer(),
    acquisitionStage: acquisitionStage().default("INQUIRY").notNull(),
    acquiredAt: timestamp({ precision: 3, mode: "date" }),
    trialStartedAt: timestamp({ precision: 3, mode: "date" }),
	notificationPrefs: jsonb(),
  },
  (table) => [
    index("Client_barcodeId_idx").using(
      "btree",
      table.barcodeId.asc().nullsLast().op("text_ops"),
    ),
    index("Client_mindbodyId_idx").using(
      "btree",
      table.mindbodyId.asc().nullsLast().op("text_ops"),
    ),
    index("Client_organizationId_locationId_acquisitionStage_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.acquisitionStage.asc().nullsLast().op("text_ops"),
    ),
    index("Client_organizationId_locationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("Client_organizationId_id_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("Client_organizationId_barcodeId_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.barcodeId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("Client_organizationId_mindbodyId_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.mindbodyId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("Client_portalToken_key").using(
      "btree",
      table.portalToken.asc().nullsLast().op("text_ops"),
    ),
    index("Client_locationId_email_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
      table.email.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "Client_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "Client_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const providerAccount = pgTable(
  "ProviderAccount",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    provider: text().notNull(),
    displayName: text().notNull(),
    externalAccountId: text(),
    encryptedSecret: text(),
    encryptedWebhookSecret: text(),
    ownershipMode: providerOwnershipMode()
      .default("TENANT_MANAGED_LEGACY")
      .notNull(),
    environment: text().default("live").notNull(),
    status: text().default("ACTIVE").notNull(),
    isDefault: boolean().default(true).notNull(),
    capabilities: text().array(),
    config: jsonb().default({}).notNull(),
    lastHealthCheckAt: timestamp({ precision: 3, mode: "date" }),
    lastSuccessAt: timestamp({ precision: 3, mode: "date" }),
    lastErrorCode: text(),
    createdByUserId: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("ProviderAccount_scope_provider_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.provider.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("ProviderAccount_organizationId_id_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("ProviderAccount_org_default_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.provider.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.locationId} IS NULL AND ${table.isDefault} = true`),
    uniqueIndex("ProviderAccount_location_default_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
        table.provider.asc().nullsLast().op("text_ops"),
      )
      .where(
        sql`${table.locationId} IS NOT NULL AND ${table.isDefault} = true`,
      ),
    uniqueIndex("ProviderAccount_org_twilio_platform_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.provider.asc().nullsLast().op("text_ops"),
        table.environment.asc().nullsLast().op("text_ops"),
      )
      .where(
        sql`${table.locationId} IS NULL AND ${table.provider} = 'TWILIO' AND ${table.ownershipMode} = 'PLATFORM_MANAGED'`,
      ),
    uniqueIndex("ProviderAccount_org_resend_platform_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.provider.asc().nullsLast().op("text_ops"),
        table.environment.asc().nullsLast().op("text_ops"),
      )
      .where(
        sql`${table.locationId} IS NULL AND ${table.provider} = 'RESEND' AND ${table.ownershipMode} = 'PLATFORM_MANAGED'`,
      ),
    uniqueIndex("ProviderAccount_twilio_platform_external_account_key")
      .using("btree", table.externalAccountId.asc().nullsLast().op("text_ops"))
      .where(
        sql`${table.provider} = 'TWILIO' AND ${table.ownershipMode} = 'PLATFORM_MANAGED' AND ${table.externalAccountId} IS NOT NULL`,
      ),
    uniqueIndex("ProviderAccount_org_oauth_identity_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.provider.asc().nullsLast().op("text_ops"),
        table.externalAccountId.asc().nullsLast().op("text_ops"),
      )
      .where(
        sql`${table.locationId} IS NULL AND ${table.externalAccountId} IS NOT NULL AND ${table.provider} IN ('GOOGLE_WORKSPACE', 'MICROSOFT_365', 'SLACK_OAUTH', 'DISCORD_OAUTH')`,
      ),
    uniqueIndex("ProviderAccount_location_oauth_identity_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
        table.provider.asc().nullsLast().op("text_ops"),
        table.externalAccountId.asc().nullsLast().op("text_ops"),
      )
      .where(
        sql`${table.locationId} IS NOT NULL AND ${table.externalAccountId} IS NOT NULL AND ${table.provider} IN ('GOOGLE_WORKSPACE', 'MICROSOFT_365', 'SLACK_OAUTH', 'DISCORD_OAUTH')`,
      ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "ProviderAccount_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "ProviderAccount_organizationId_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.createdByUserId],
      foreignColumns: [user.id],
      name: "ProviderAccount_createdByUserId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const providerOAuthGrant = pgTable(
  "ProviderOAuthGrant",
  {
    providerAccountId: text().primaryKey().notNull(),
    oauthAccountId: text().notNull(),
    oauthProviderId: text().notNull(),
    authorizedByUserId: text().notNull(),
    scopes: text().array().default([]).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("ProviderOAuthGrant_oauthAccountId_idx").using(
      "btree",
      table.oauthAccountId.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.providerAccountId],
      foreignColumns: [providerAccount.id],
      name: "ProviderOAuthGrant_providerAccountId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.oauthAccountId],
      foreignColumns: [account.id],
      name: "ProviderOAuthGrant_oauthAccountId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.authorizedByUserId],
      foreignColumns: [user.id],
      name: "ProviderOAuthGrant_authorizedByUserId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
).enableRLS();

export const emailDomain = pgTable(
  "EmailDomain",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
    providerAccountId: text(),
	domain: text().notNull(),
	resendDomainId: text(),
    ownershipMode: providerOwnershipMode()
      .default("TENANT_MANAGED_LEGACY")
      .notNull(),
    status: emailDomainStatus().default("PENDING").notNull(),
    lifecycleState: communicationChannelState()
      .default("AWAITING_DNS")
      .notNull(),
	dnsRecords: jsonb(),
	defaultFromName: text(),
	defaultFromEmail: text(),
	defaultReplyTo: text(),
    isDefault: boolean().default(false).notNull(),
    isDisabled: boolean().default(false).notNull(),
    verifiedAt: timestamp({ precision: 3, mode: "date" }),
    lastCheckedAt: timestamp({ precision: 3, mode: "date" }),
    verificationStaleAt: timestamp({ precision: 3, mode: "date" }),
    removedAt: timestamp({ precision: 3, mode: "date" }),
    lastErrorCode: text(),
    lastErrorMessage: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("EmailDomain_domain_key").on(sql`lower(${table.domain})`),
    uniqueIndex("EmailDomain_resendDomainId_key")
      .using("btree", table.resendDomainId.asc().nullsLast().op("text_ops"))
      .where(sql`${table.resendDomainId} IS NOT NULL`),
    uniqueIndex("EmailDomain_organization_default_key")
      .using("btree", table.organizationId.asc().nullsLast().op("text_ops"))
      .where(
        sql`${table.locationId} IS NULL AND ${table.isDefault} = true AND ${table.isDisabled} = false AND ${table.removedAt} IS NULL`,
      ),
    uniqueIndex("EmailDomain_location_default_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
      )
      .where(
        sql`${table.locationId} IS NOT NULL AND ${table.isDefault} = true AND ${table.isDisabled} = false AND ${table.removedAt} IS NULL`,
      ),
    uniqueIndex("EmailDomain_organizationId_id_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
    index("EmailDomain_organizationId_locationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("EmailDomain_providerAccountId_idx").using(
      "btree",
      table.providerAccountId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "EmailDomain_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "EmailDomain_organizationId_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.providerAccountId],
      foreignColumns: [providerAccount.organizationId, providerAccount.id],
      name: "EmailDomain_organizationId_providerAccountId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
).enableRLS();

export const communicationServiceProfile = pgTable(
  "CommunicationServiceProfile",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    emailState: communicationChannelState().default("NOT_REQUESTED").notNull(),
    smsState: communicationChannelState().default("NOT_REQUESTED").notNull(),
    voiceState: communicationChannelState().default("NOT_REQUESTED").notNull(),
    brandedEmailEntitledAt: timestamp({ precision: 3, mode: "date" }),
    smsEntitledAt: timestamp({ precision: 3, mode: "date" }),
    voiceEntitledAt: timestamp({ precision: 3, mode: "date" }),
    entitlementSource: text(),
    fallbackEmailEnabled: boolean().default(true).notNull(),
    spendCurrency: varchar({ length: 3 }).default("GBP").notNull(),
    smsMonthlySpendLimit: numeric({ precision: 14, scale: 4 }),
    voiceMonthlySpendLimit: numeric({ precision: 14, scale: 4 }),
    voiceMaxCallDurationSeconds: integer(),
    numberReleaseGraceDays: integer(),
    allowedSmsCountries: text().array().default([]).notNull(),
    allowedVoiceCountries: text().array().default([]).notNull(),
    voiceForwardingNumber: text(),
    voiceForwardingNumberVerifiedAt: timestamp({ precision: 3, mode: "date" }),
    voiceForwardingVerificationHash: text(),
    voiceForwardingVerificationExpiresAt: timestamp({
      precision: 3,
      mode: "date",
    }),
    voiceForwardingVerificationAttempts: integer().default(0).notNull(),
    voicemailEnabled: boolean().default(false).notNull(),
    recordingEnabled: boolean().default(false).notNull(),
    recordingRetentionDays: integer(),
    recordingLegalAcknowledgedAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("CommunicationServiceProfile_organizationId_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    check(
      "CommunicationServiceProfile_sms_spend_limit_check",
      sql`${table.smsMonthlySpendLimit} IS NULL OR ${table.smsMonthlySpendLimit} >= 0`,
    ),
    check(
      "CommunicationServiceProfile_voice_spend_limit_check",
      sql`${table.voiceMonthlySpendLimit} IS NULL OR ${table.voiceMonthlySpendLimit} >= 0`,
    ),
    check(
      "CommunicationServiceProfile_release_grace_days_check",
      sql`${table.numberReleaseGraceDays} IS NULL OR (${table.numberReleaseGraceDays} >= 0 AND ${table.numberReleaseGraceDays} <= 365)`,
    ),
    check(
      "CommunicationServiceProfile_voice_max_duration_check",
      sql`${table.voiceMaxCallDurationSeconds} IS NULL OR (${table.voiceMaxCallDurationSeconds} >= 60 AND ${table.voiceMaxCallDurationSeconds} <= 14400)`,
    ),
    check(
      "CommunicationServiceProfile_recording_retention_check",
      sql`${table.recordingRetentionDays} IS NULL OR (${table.recordingRetentionDays} >= 1 AND ${table.recordingRetentionDays} <= 3650)`,
    ),
    check(
      "CommunicationServiceProfile_currency_check",
      sql`${table.spendCurrency} ~ '^[A-Z]{3}$'`,
    ),
    check(
      "CommunicationServiceProfile_recording_ack_check",
      sql`${table.recordingEnabled} = false OR ${table.recordingLegalAcknowledgedAt} IS NOT NULL`,
    ),
    check(
      "CommunicationServiceProfile_forwarding_verification_attempts_check",
      sql`${table.voiceForwardingVerificationAttempts} >= 0 AND ${table.voiceForwardingVerificationAttempts} <= 10`,
    ),
	foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "CommunicationServiceProfile_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const communicationEntitlementGrant = pgTable(
  "CommunicationEntitlementGrant",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    source: text().notNull(),
    externalSubscriptionId: text().notNull(),
    externalProductId: text().notNull(),
    status: text().notNull(),
    emailEnabled: boolean().default(false).notNull(),
    smsEnabled: boolean().default(false).notNull(),
    voiceEnabled: boolean().default(false).notNull(),
    currentPeriodEnd: timestamp({ precision: 3, mode: "date" }),
    providerModifiedAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("CommunicationEntitlementGrant_source_subscription_key").using(
      "btree",
      table.source.asc().nullsLast().op("text_ops"),
      table.externalSubscriptionId.asc().nullsLast().op("text_ops"),
    ),
    index("CommunicationEntitlementGrant_organization_status_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.status.asc().nullsLast().op("text_ops"),
    ),
    check(
      "CommunicationEntitlementGrant_status_check",
      sql`${table.status} IN ('ACTIVE', 'CANCELED', 'REVOKED')`,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "CommunicationEntitlementGrant_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const twilioComplianceRegistration = pgTable(
  "TwilioComplianceRegistration",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    providerAccountId: text().notNull(),
    country: varchar({ length: 2 }).notNull(),
    channel: text().notNull(),
    programType: text().notNull(),
    numberType: text().notNull(),
    status: text().default("NOT_CONFIGURED").notNull(),
    providerStatus: text(),
    addressSid: text(),
    bundleSid: text(),
    identitySid: text(),
    messagingServiceSid: text(),
    campaignSid: text(),
    submittedAt: timestamp({ precision: 3, mode: "date" }),
    approvedAt: timestamp({ precision: 3, mode: "date" }),
    lastCheckedAt: timestamp({ precision: 3, mode: "date" }),
    lastErrorCode: text(),
    lastErrorMessage: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("TwilioComplianceRegistration_organizationId_id_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("TwilioComplianceRegistration_scope_program_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.providerAccountId.asc().nullsLast().op("text_ops"),
      table.country.asc().nullsLast().op("text_ops"),
      table.channel.asc().nullsLast().op("text_ops"),
      table.programType.asc().nullsLast().op("text_ops"),
      table.numberType.asc().nullsLast().op("text_ops"),
    ),
    index("TwilioComplianceRegistration_scope_status_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.status.asc().nullsLast().op("text_ops"),
    ),
    check(
      "TwilioComplianceRegistration_country_check",
      sql`${table.country} ~ '^[A-Z]{2}$'`,
    ),
    check(
      "TwilioComplianceRegistration_channel_check",
      sql`${table.channel} IN ('SMS', 'VOICE', 'BOTH')`,
    ),
    check(
      "TwilioComplianceRegistration_status_check",
      sql`${table.status} IN ('NOT_CONFIGURED', 'PENDING', 'APPROVED', 'REJECTED', 'DEGRADED')`,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "TwilioComplianceRegistration_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.providerAccountId],
      foreignColumns: [providerAccount.organizationId, providerAccount.id],
      name: "TwilioComplianceRegistration_organizationId_providerAccountId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const communicationPhoneNumberQuote = pgTable(
  "CommunicationPhoneNumberQuote",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    providerAccountId: text().notNull(),
    phoneNumber: text().notNull(),
    country: varchar({ length: 2 }).notNull(),
    numberType: text().notNull(),
    smsEnabled: boolean().default(false).notNull(),
    voiceEnabled: boolean().default(false).notNull(),
    regulatoryRequirement: text().default("none").notNull(),
    monthlyProviderCost: numeric({ precision: 14, scale: 4 }).notNull(),
    currency: varchar({ length: 3 }).notNull(),
    expiresAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    consumedAt: timestamp({ precision: 3, mode: "date" }),
    createdByUserId: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("CommunicationPhoneNumberQuote_scope_expiresAt_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.expiresAt.asc().nullsLast().op("timestamp_ops"),
    ),
    check(
      "CommunicationPhoneNumberQuote_provider_cost_check",
      sql`${table.monthlyProviderCost} >= 0`,
    ),
    check(
      "CommunicationPhoneNumberQuote_country_check",
      sql`${table.country} ~ '^[A-Z]{2}$'`,
    ),
    check(
      "CommunicationPhoneNumberQuote_currency_check",
      sql`${table.currency} ~ '^[A-Z]{3}$'`,
    ),
    check(
      "CommunicationPhoneNumberQuote_regulatory_requirement_check",
      sql`${table.regulatoryRequirement} IN ('none', 'any', 'local', 'foreign')`,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "CommunicationPhoneNumberQuote_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "CommunicationPhoneNumberQuote_organizationId_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.providerAccountId],
      foreignColumns: [providerAccount.organizationId, providerAccount.id],
      name: "CommunicationPhoneNumberQuote_organizationId_providerAccountId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.createdByUserId],
      foreignColumns: [user.id],
      name: "CommunicationPhoneNumberQuote_createdByUserId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const twilioPhoneNumber = pgTable(
  "TwilioPhoneNumber",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    providerAccountId: text().notNull(),
    complianceRegistrationId: text(),
    messagingServiceSid: text(),
    providerPhoneNumberId: text().notNull(),
    phoneNumber: text().notNull(),
    country: varchar({ length: 2 }).notNull(),
    numberType: text().notNull(),
    smsEnabled: boolean().default(false).notNull(),
    voiceEnabled: boolean().default(false).notNull(),
    status: twilioPhoneNumberStatus().default("PENDING").notNull(),
    complianceStatus: text().default("NOT_REQUIRED").notNull(),
    isDefault: boolean().default(false).notNull(),
    monthlyProviderCost: numeric({ precision: 14, scale: 4 })
      .default("0")
      .notNull(),
    currency: varchar({ length: 3 }).default("GBP").notNull(),
    purchaseConfirmedAt: timestamp({ precision: 3, mode: "date" }),
    purchasedAt: timestamp({ precision: 3, mode: "date" }),
    webhooksConfiguredAt: timestamp({ precision: 3, mode: "date" }),
    suspendedAt: timestamp({ precision: 3, mode: "date" }),
    releaseScheduledAt: timestamp({ precision: 3, mode: "date" }),
    releasedAt: timestamp({ precision: 3, mode: "date" }),
    lastHealthCheckAt: timestamp({ precision: 3, mode: "date" }),
    lastErrorCode: text(),
    lastErrorMessage: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("TwilioPhoneNumber_organizationId_id_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("TwilioPhoneNumber_org_provider_id_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.providerAccountId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("TwilioPhoneNumber_provider_resource_key").using(
      "btree",
      table.providerAccountId.asc().nullsLast().op("text_ops"),
      table.providerPhoneNumberId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("TwilioPhoneNumber_active_number_key")
      .using("btree", table.phoneNumber.asc().nullsLast().op("text_ops"))
      .where(sql`${table.status} <> 'RELEASED'`),
    uniqueIndex("TwilioPhoneNumber_organization_default_key")
      .using("btree", table.organizationId.asc().nullsLast().op("text_ops"))
      .where(
        sql`${table.locationId} IS NULL AND ${table.isDefault} = true AND ${table.status} <> 'RELEASED'`,
      ),
    uniqueIndex("TwilioPhoneNumber_location_default_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
      )
      .where(
        sql`${table.locationId} IS NOT NULL AND ${table.isDefault} = true AND ${table.status} <> 'RELEASED'`,
      ),
    index("TwilioPhoneNumber_scope_status_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    check(
      "TwilioPhoneNumber_monthly_provider_cost_check",
      sql`${table.monthlyProviderCost} >= 0`,
    ),
    check(
      "TwilioPhoneNumber_country_check",
      sql`${table.country} ~ '^[A-Z]{2}$'`,
    ),
    check(
      "TwilioPhoneNumber_currency_check",
      sql`${table.currency} ~ '^[A-Z]{3}$'`,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "TwilioPhoneNumber_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "TwilioPhoneNumber_organizationId_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.providerAccountId],
      foreignColumns: [providerAccount.organizationId, providerAccount.id],
      name: "TwilioPhoneNumber_organizationId_providerAccountId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.complianceRegistrationId],
      foreignColumns: [
        twilioComplianceRegistration.organizationId,
        twilioComplianceRegistration.id,
      ],
      name: "TwilioPhoneNumber_organizationId_complianceRegistrationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
).enableRLS();

export const voiceCall = pgTable(
  "VoiceCall",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    clientId: text(),
    providerAccountId: text().notNull(),
    phoneNumberId: text().notNull(),
    direction: voiceCallDirection().notNull(),
    status: voiceCallStatus().default("QUEUED").notNull(),
    providerCallId: text(),
    fromNumber: text().notNull(),
    toNumber: text().notNull(),
    forwardingNumber: text(),
    recordingEnabled: boolean().default(false).notNull(),
    recordingProviderId: text(),
    recordingObjectKey: text(),
    startedAt: timestamp({ precision: 3, mode: "date" }),
    answeredAt: timestamp({ precision: 3, mode: "date" }),
    endedAt: timestamp({ precision: 3, mode: "date" }),
    durationSeconds: integer(),
    providerCost: numeric({ precision: 14, scale: 4 }).default("0").notNull(),
    providerCostCurrency: varchar({ length: 3 }),
    providerCostReconciledAt: timestamp({ precision: 3, mode: "date" }),
    customerCharge: numeric({ precision: 14, scale: 4 }).default("0").notNull(),
    currency: varchar({ length: 3 }).default("GBP").notNull(),
    failureCode: text(),
    failureMessage: text(),
    idempotencyKey: text().notNull(),
    claimToken: text(),
    leaseExpiresAt: timestamp({ precision: 3, mode: "date" }),
    attemptCount: integer().default(0).notNull(),
    maxAttempts: integer().default(5).notNull(),
    nextAttemptAt: timestamp({ precision: 3, mode: "date" }),
    recordingDeleteScheduledAt: timestamp({ precision: 3, mode: "date" }),
    recordingDeletedAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("VoiceCall_organizationId_id_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("VoiceCall_provider_call_key")
      .using(
        "btree",
        table.providerAccountId.asc().nullsLast().op("text_ops"),
        table.providerCallId.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.providerCallId} IS NOT NULL`),
    uniqueIndex("VoiceCall_organization_idempotency_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.idempotencyKey.asc().nullsLast().op("text_ops"),
    ),
    index("VoiceCall_scope_createdAt_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.createdAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("VoiceCall_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    check(
      "VoiceCall_duration_check",
      sql`${table.durationSeconds} IS NULL OR ${table.durationSeconds} >= 0`,
    ),
    check("VoiceCall_provider_cost_check", sql`${table.providerCost} >= 0`),
    check(
      "VoiceCall_provider_cost_currency_check",
      sql`${table.providerCostCurrency} IS NULL OR ${table.providerCostCurrency} ~ '^[A-Z]{3}$'`,
    ),
    check("VoiceCall_customer_charge_check", sql`${table.customerCharge} >= 0`),
    check("VoiceCall_currency_check", sql`${table.currency} ~ '^[A-Z]{3}$'`),
    check(
      "VoiceCall_attempts_check",
      sql`${table.attemptCount} >= 0 AND ${table.maxAttempts} > 0`,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "VoiceCall_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "VoiceCall_organizationId_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.clientId],
      foreignColumns: [client.organizationId, client.id],
      name: "VoiceCall_organizationId_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.providerAccountId],
      foreignColumns: [providerAccount.organizationId, providerAccount.id],
      name: "VoiceCall_organizationId_providerAccountId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [
        table.organizationId,
        table.providerAccountId,
        table.phoneNumberId,
      ],
      foreignColumns: [
        twilioPhoneNumber.organizationId,
        twilioPhoneNumber.providerAccountId,
        twilioPhoneNumber.id,
      ],
      name: "VoiceCall_org_provider_phoneNumberId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
).enableRLS();

export const communicationProvisioningOperation = pgTable(
  "CommunicationProvisioningOperation",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    providerAccountId: text(),
    emailDomainId: text(),
    phoneNumberId: text(),
    service: communicationProvisioningService().notNull(),
    operationType: communicationProvisioningOperationType().notNull(),
    status: communicationProvisioningStatus().default("PENDING").notNull(),
    idempotencyKey: text().notNull(),
    claimToken: text(),
    leaseExpiresAt: timestamp({ precision: 3, mode: "date" }),
    attemptCount: integer().default(0).notNull(),
    maxAttempts: integer().default(5).notNull(),
    nextAttemptAt: timestamp({ precision: 3, mode: "date" }),
    externalResourceId: text(),
    safeInput: jsonb().default({}).notNull(),
    requestedByUserId: text(),
    lastErrorCode: text(),
    lastErrorMessage: text(),
    startedAt: timestamp({ precision: 3, mode: "date" }),
    completedAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex(
      "CommunicationProvisioningOperation_organizationId_idempotencyKey_key",
    ).using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.idempotencyKey.asc().nullsLast().op("text_ops"),
    ),
    index("CommunicationProvisioningOperation_status_nextAttemptAt_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
      table.nextAttemptAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("CommunicationProvisioningOperation_leaseExpiresAt_idx").using(
      "btree",
      table.leaseExpiresAt.asc().nullsLast().op("timestamp_ops"),
    ),
    check(
      "CommunicationProvisioningOperation_attempts_check",
      sql`${table.attemptCount} >= 0 AND ${table.maxAttempts} > 0`,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "CommunicationProvisioningOperation_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "CommunicationProvisioningOperation_organizationId_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.providerAccountId],
      foreignColumns: [providerAccount.organizationId, providerAccount.id],
      name: "CommunicationProvisioningOperation_organizationId_providerAccountId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.emailDomainId],
      foreignColumns: [emailDomain.organizationId, emailDomain.id],
      name: "CommunicationProvisioningOperation_organizationId_emailDomainId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.phoneNumberId],
      foreignColumns: [twilioPhoneNumber.organizationId, twilioPhoneNumber.id],
      name: "CommunicationProvisioningOperation_organizationId_phoneNumberId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.requestedByUserId],
      foreignColumns: [user.id],
      name: "CommunicationProvisioningOperation_requestedByUserId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const communicationAuditEvent = pgTable(
  "CommunicationAuditEvent",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    actorUserId: text(),
    action: text().notNull(),
    resourceType: text().notNull(),
    resourceId: text(),
    safeMetadata: jsonb().default({}).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("CommunicationAuditEvent_scope_createdAt_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.createdAt.asc().nullsLast().op("timestamp_ops"),
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "CommunicationAuditEvent_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "CommunicationAuditEvent_organizationId_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.actorUserId],
      foreignColumns: [user.id],
      name: "CommunicationAuditEvent_actorUserId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const communicationUsageLedger = pgTable(
  "CommunicationUsageLedger",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    clientId: text(),
    provider: deliveryProvider().notNull(),
    providerAccountId: text(),
    phoneNumberId: text(),
    deliveryId: text(),
    voiceCallId: text(),
    entryKind: communicationUsageEntryKind().notNull(),
    resourceType: communicationUsageResourceType().notNull(),
    idempotencyKey: text().notNull(),
    providerEventId: text(),
    providerResourceId: text(),
    quantity: numeric({ precision: 18, scale: 6 }).notNull(),
    unit: text().notNull(),
    providerCost: numeric({ precision: 14, scale: 4 }).default("0").notNull(),
    customerCharge: numeric({ precision: 14, scale: 4 }).default("0").notNull(),
    currency: varchar({ length: 3 }).notNull(),
    occurredAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    billingPeriod: text().notNull(),
    metadata: jsonb().default({}).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("CommunicationUsageLedger_organization_idempotency_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.idempotencyKey.asc().nullsLast().op("text_ops"),
    ),
    index("CommunicationUsageLedger_scope_occurredAt_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.occurredAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("CommunicationUsageLedger_provider_resource_idx").using(
      "btree",
      table.provider.asc().nullsLast().op("enum_ops"),
      table.providerAccountId.asc().nullsLast().op("text_ops"),
      table.providerResourceId.asc().nullsLast().op("text_ops"),
    ),
    check(
      "CommunicationUsageLedger_quantity_check",
      sql`${table.quantity} >= 0`,
    ),
    check(
      "CommunicationUsageLedger_provider_cost_check",
      sql`${table.providerCost} >= 0`,
    ),
    check(
      "CommunicationUsageLedger_customer_charge_check",
      sql`${table.customerCharge} >= 0`,
    ),
    check(
      "CommunicationUsageLedger_currency_check",
      sql`${table.currency} ~ '^[A-Z]{3}$'`,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "CommunicationUsageLedger_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "CommunicationUsageLedger_organizationId_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.clientId],
      foreignColumns: [client.organizationId, client.id],
      name: "CommunicationUsageLedger_organizationId_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.providerAccountId],
      foreignColumns: [providerAccount.organizationId, providerAccount.id],
      name: "CommunicationUsageLedger_organizationId_providerAccountId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [
        table.organizationId,
        table.providerAccountId,
        table.phoneNumberId,
      ],
      foreignColumns: [
        twilioPhoneNumber.organizationId,
        twilioPhoneNumber.providerAccountId,
        twilioPhoneNumber.id,
      ],
      name: "CommunicationUsageLedger_org_provider_phoneNumberId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.deliveryId],
      foreignColumns: [outboundDelivery.organizationId, outboundDelivery.id],
      name: "CommunicationUsageLedger_organizationId_deliveryId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.voiceCallId],
      foreignColumns: [voiceCall.organizationId, voiceCall.id],
      name: "CommunicationUsageLedger_organizationId_voiceCallId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
).enableRLS();

export const communicationWebhookReceipt = pgTable(
  "CommunicationWebhookReceipt",
  {
    id: text().primaryKey().notNull(),
    organizationId: text(),
    locationId: text(),
    provider: deliveryProvider().notNull(),
    providerAccountId: text(),
    providerAccountRef: text().notNull(),
    eventType: text().notNull(),
    providerEventId: text().notNull(),
    providerResourceId: text().notNull(),
    status: inboundMessageReceiptStatus().default("PENDING").notNull(),
    payloadHash: text().notNull(),
    encryptedPayload: text().notNull(),
    safeMetadata: jsonb().default({}).notNull(),
    attemptCount: integer().default(0).notNull(),
    claimToken: text(),
    leaseExpiresAt: timestamp({ precision: 3, mode: "date" }),
    occurredAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    receivedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    processedAt: timestamp({ precision: 3, mode: "date" }),
    lastErrorCode: text(),
    lastErrorMessage: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("CommunicationWebhookReceipt_provider_event_key").using(
      "btree",
      table.provider.asc().nullsLast().op("enum_ops"),
      table.providerAccountRef.asc().nullsLast().op("text_ops"),
      table.eventType.asc().nullsLast().op("text_ops"),
      table.providerEventId.asc().nullsLast().op("text_ops"),
    ),
    index("CommunicationWebhookReceipt_status_lease_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
      table.leaseExpiresAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("CommunicationWebhookReceipt_scope_receivedAt_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.receivedAt.asc().nullsLast().op("timestamp_ops"),
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "CommunicationWebhookReceipt_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "CommunicationWebhookReceipt_organizationId_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.providerAccountId],
      foreignColumns: [providerAccount.organizationId, providerAccount.id],
      name: "CommunicationWebhookReceipt_organizationId_providerAccountId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
).enableRLS();

export const emailTemplate = pgTable(
  "EmailTemplate",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	name: text().notNull(),
	description: text(),
    type: emailTemplateType().default("MARKETING").notNull(),
	content: jsonb().notNull(),
	design: jsonb(),
	isSystemTemplate: boolean().default(false).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("EmailTemplate_organizationId_id_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
    index("EmailTemplate_organizationId_locationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "EmailTemplate_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "EmailTemplate_organizationId_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const campaignRecipient = pgTable(
  "CampaignRecipient",
  {
	id: text().primaryKey().notNull(),
	campaignId: text().notNull(),
	clientId: text().notNull(),
    runId: text(),
    deliveryId: text(),
    recipientAddress: text(),
    suppressionReason: text(),
	resendEmailId: text(),
    status: campaignRecipientStatus().default("PENDING").notNull(),
    deliveredAt: timestamp({ precision: 3, mode: "date" }),
    openedAt: timestamp({ precision: 3, mode: "date" }),
    clickedAt: timestamp({ precision: 3, mode: "date" }),
    bouncedAt: timestamp({ precision: 3, mode: "date" }),
    complainedAt: timestamp({ precision: 3, mode: "date" }),
    unsubscribedAt: timestamp({ precision: 3, mode: "date" }),
	clickCount: integer().default(0).notNull(),
	clickedLinks: jsonb(),
	openCount: integer().default(0).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("CampaignRecipient_legacy_campaignId_clientId_key")
      .using(
        "btree",
        table.campaignId.asc().nullsLast().op("text_ops"),
        table.clientId.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.runId} IS NULL`),
    uniqueIndex("CampaignRecipient_runId_clientId_key")
      .using(
        "btree",
        table.runId.asc().nullsLast().op("text_ops"),
        table.clientId.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.runId} IS NOT NULL`),
    index("CampaignRecipient_clientId_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    index("CampaignRecipient_runId_idx").using(
      "btree",
      table.runId.asc().nullsLast().op("text_ops"),
    ),
    index("CampaignRecipient_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    uniqueIndex("CampaignRecipient_deliveryId_key")
      .using("btree", table.deliveryId.asc().nullsLast().op("text_ops"))
      .where(sql`${table.deliveryId} IS NOT NULL`),
	foreignKey({
			columns: [table.campaignId],
			foreignColumns: [campaign.id],
      name: "CampaignRecipient_campaignId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
      name: "CampaignRecipient_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.runId],
      foreignColumns: [campaignRun.id],
      name: "CampaignRecipient_runId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.deliveryId],
      foreignColumns: [outboundDelivery.id],
      name: "CampaignRecipient_deliveryId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const unsubscribeToken = pgTable(
  "UnsubscribeToken",
  {
	id: text().primaryKey().notNull(),
    organizationId: text(),
    locationId: text(),
	clientId: text().notNull(),
	campaignId: text(),
    deliveryId: text(),
    channel: deliveryChannel(),
    suppressionScope: communicationSuppressionScope(),
	token: text().notNull(),
    tokenHash: text(),
    usedAt: timestamp({ precision: 3, mode: "date" }),
    expiresAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("UnsubscribeToken_clientId_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    index("UnsubscribeToken_deliveryId_idx").using(
      "btree",
      table.deliveryId.asc().nullsLast().op("text_ops"),
    ),
    index("UnsubscribeToken_token_idx").using(
      "btree",
      table.token.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("UnsubscribeToken_token_key").using(
      "btree",
      table.token.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("UnsubscribeToken_tokenHash_key")
      .using("btree", table.tokenHash.asc().nullsLast().op("text_ops"))
      .where(sql`${table.tokenHash} IS NOT NULL`),
	foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "UnsubscribeToken_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.locationId],
      foreignColumns: [location.id],
      name: "UnsubscribeToken_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.clientId],
      foreignColumns: [client.id],
      name: "UnsubscribeToken_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.deliveryId],
      foreignColumns: [outboundDelivery.id],
      name: "UnsubscribeToken_deliveryId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const campaign = pgTable(
  "Campaign",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	name: text().notNull(),
    status: campaignStatus().default("DRAFT").notNull(),
	templateId: text(),
	subject: text().notNull(),
	preheaderText: text(),
	content: jsonb().notNull(),
	emailDomainId: text(),
	fromName: text(),
	fromEmail: text(),
	replyTo: text(),
    savedAudienceId: text(),
    segmentType: campaignSegmentType().default("ALL").notNull(),
	segmentFilter: jsonb(),
    scheduledAt: timestamp({ precision: 3, mode: "date" }),
    sentAt: timestamp({ precision: 3, mode: "date" }),
	resendBroadcastId: text(),
	totalRecipients: integer().default(0).notNull(),
	delivered: integer().default(0).notNull(),
	opened: integer().default(0).notNull(),
	clicked: integer().default(0).notNull(),
	bounced: integer().default(0).notNull(),
	complained: integer().default(0).notNull(),
	unsubscribed: integer().default(0).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
	resendTemplateId: text(),
  },
  (table) => [
    index("Campaign_organizationId_locationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("Campaign_savedAudienceId_idx").using(
      "btree",
      table.savedAudienceId.asc().nullsLast().op("text_ops"),
    ),
    index("Campaign_scheduledAt_idx").using(
      "btree",
      table.scheduledAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("Campaign_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    foreignKey({
      columns: [table.organizationId, table.emailDomainId],
      foreignColumns: [emailDomain.organizationId, emailDomain.id],
      name: "Campaign_organizationId_emailDomainId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "Campaign_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "Campaign_organizationId_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.templateId],
      foreignColumns: [emailTemplate.organizationId, emailTemplate.id],
      name: "Campaign_organizationId_templateId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.savedAudienceId],
      foreignColumns: [savedAudience.id],
      name: "Campaign_savedAudienceId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
).enableRLS();

export const booking = pgTable(
  "Booking",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	calBookingId: integer(),
	calBookingUid: text(),
    calComCredentialId: text(),
    calLastEventAt: timestamp({ precision: 3, mode: "date" }),
	eventTypeId: text().notNull(),
	clientId: text(),
	dealId: text(),
	title: text().notNull(),
	description: text(),
    status: bookingStatus().default("CONFIRMED").notNull(),
	attendeeName: text().notNull(),
	attendeeEmail: text().notNull(),
	attendeePhone: text(),
	attendeeTimezone: text().notNull(),
	additionalNotes: text(),
	guests: text().array().default([]),
    startTime: timestamp({ precision: 3, mode: "date" }).notNull(),
    endTime: timestamp({ precision: 3, mode: "date" }).notNull(),
	duration: integer().notNull(),
	locationType: bookingLocationType().notNull(),
	locationValue: text(),
	paid: boolean().default(false).notNull(),
    paymentStatus: bookingPaymentStatus().default("NOT_REQUIRED").notNull(),
	paymentId: text(),
	amount: numeric({ precision: 10, scale:  2 }),
	currency: text(),
    holdExpiresAt: timestamp({ precision: 3, mode: "date" }),
    paymentRequiredAt: timestamp({ precision: 3, mode: "date" }),
    paymentFailureAt: timestamp({ precision: 3, mode: "date" }),
    confirmedAt: timestamp({ precision: 3, mode: "date" }),
    releasedAt: timestamp({ precision: 3, mode: "date" }),
    cancelledAt: timestamp({ precision: 3, mode: "date" }),
	cancelledBy: text(),
	cancellationReason: text(),
	rescheduledFrom: text(),
	rescheduledTo: text(),
	customFieldsResponses: jsonb(),
	metadata: jsonb(),
    lastSyncedAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("Booking_attendeeEmail_idx").using(
      "btree",
      table.attendeeEmail.asc().nullsLast().op("text_ops"),
    ),
    index("Booking_calBookingId_idx").using(
      "btree",
      table.calBookingId.asc().nullsLast().op("int4_ops"),
    ),
    uniqueIndex("Booking_calComCredentialId_calBookingUid_key")
      .using(
        "btree",
        table.calComCredentialId.asc().nullsLast().op("text_ops"),
        table.calBookingUid.asc().nullsLast().op("text_ops"),
      )
      .where(
        sql`${table.calComCredentialId} IS NOT NULL AND ${table.calBookingUid} IS NOT NULL`,
      ),
    index("Booking_calComCredentialId_idx").using(
      "btree",
      table.calComCredentialId.asc().nullsLast().op("text_ops"),
    ),
    index("Booking_clientId_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    index("Booking_dealId_idx").using(
      "btree",
      table.dealId.asc().nullsLast().op("text_ops"),
    ),
    index("Booking_organizationId_locationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("Booking_startTime_idx").using(
      "btree",
      table.startTime.asc().nullsLast().op("timestamp_ops"),
    ),
    index("Booking_status_startTime_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
      table.startTime.asc().nullsLast().op("timestamp_ops"),
    ),
    index("Booking_paymentStatus_holdExpiresAt_idx").using(
      "btree",
      table.paymentStatus.asc().nullsLast().op("enum_ops"),
      table.holdExpiresAt.asc().nullsLast().op("timestamp_ops"),
    ),
    uniqueIndex("Booking_organizationId_id_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("Booking_scope_id_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.calComCredentialId],
      foreignColumns: [calComCredential.id],
      name: "Booking_calComCredentialId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
      name: "Booking_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.dealId],
			foreignColumns: [deal.id],
      name: "Booking_dealId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.eventTypeId],
			foreignColumns: [bookingEventType.id],
      name: "Booking_eventTypeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "Booking_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "Booking_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const calComCredential = pgTable(
  "CalComCredential",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
    apiKey: text(),
	calUserId: integer(),
	calUsername: text(),
	calOrgId: integer(),
	calOrgSlug: text(),
	accessToken: text(),
	refreshToken: text(),
    expiresAt: timestamp({ precision: 3, mode: "date" }),
	isActive: boolean().default(true).notNull(),
    lastSyncedAt: timestamp({ precision: 3, mode: "date" }),
	lastError: text(),
    webhookId: text(),
    webhookSecret: text(),
    webhookConfiguredAt: timestamp({ precision: 3, mode: "date" }),
    lastWebhookAt: timestamp({ precision: 3, mode: "date" }),
    lastWebhookError: text(),
	metadata: jsonb(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("CalComCredential_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("CalComCredential_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("CalComCredential_org_key")
      .using("btree", table.organizationId.asc().nullsLast().op("text_ops"))
      .where(sql`${table.locationId} IS NULL`),
    uniqueIndex("CalComCredential_org_location_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.locationId} IS NOT NULL`),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "CalComCredential_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "CalComCredential_organizationId_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "CalComCredential_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const calComWebhookReceipt = pgTable(
  "CalComWebhookReceipt",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text().notNull(),
    credentialId: text().notNull(),
    eventKey: text().notNull(),
    triggerEvent: text().notNull(),
    bookingUid: text(),
    bookingId: text(),
    providerCreatedAt: timestamp({ precision: 3, mode: "date" }),
    status: calComWebhookReceiptStatus().notNull(),
    outcome: text().notNull(),
    workflowDispatchedAt: timestamp({ precision: 3, mode: "date" }),
    workflowDispatchError: text(),
    receivedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    processedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("CalComWebhookReceipt_credentialId_eventKey_key").using(
      "btree",
      table.credentialId.asc().nullsLast().op("text_ops"),
      table.eventKey.asc().nullsLast().op("text_ops"),
    ),
    index(
      "CalComWebhookReceipt_organizationId_locationId_receivedAt_idx",
    ).using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.receivedAt.desc().nullsFirst().op("timestamp_ops"),
    ),
    index("CalComWebhookReceipt_status_receivedAt_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
      table.receivedAt.desc().nullsFirst().op("timestamp_ops"),
    ),
    foreignKey({
      columns: [table.bookingId],
      foreignColumns: [booking.id],
      name: "CalComWebhookReceipt_bookingId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.credentialId],
      foreignColumns: [calComCredential.id],
      name: "CalComWebhookReceipt_credentialId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "CalComWebhookReceipt_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "CalComWebhookReceipt_organizationId_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const bookingEventType = pgTable(
  "BookingEventType",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	calEventTypeId: integer(),
    calComCredentialId: text(),
	calTeamId: integer(),
	title: text().notNull(),
	slug: text().notNull(),
	description: text(),
	length: integer().notNull(),
	availableDurations: integer().array().default([]),
	minimumBookingNotice: integer(),
	slotInterval: integer(),
	beforeEventBuffer: integer(),
	afterEventBuffer: integer(),
    locationType: bookingLocationType().default("CAL_VIDEO").notNull(),
	locationValue: text(),
	scheduleId: text(),
	isTeamEvent: boolean().default(false).notNull(),
	teamMembers: jsonb(),
	color: text(),
	customFields: jsonb(),
	requiresPayment: boolean().default(false).notNull(),
	price: numeric({ precision: 10, scale:  2 }),
    currency: text().default("USD"),
	metadata: jsonb(),
	isActive: boolean().default(true).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    lastSyncedAt: timestamp({ precision: 3, mode: "date" }),
	requiresConfirmation: boolean().default(false).notNull(),
  },
  (table) => [
    index("BookingEventType_calEventTypeId_idx").using(
      "btree",
      table.calEventTypeId.asc().nullsLast().op("int4_ops"),
    ),
    index("BookingEventType_calComCredentialId_idx").using(
      "btree",
      table.calComCredentialId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("BookingEventType_calComCredentialId_calEventTypeId_key")
      .using(
        "btree",
        table.calComCredentialId.asc().nullsLast().op("text_ops"),
        table.calEventTypeId.asc().nullsLast().op("int4_ops"),
      )
      .where(
        sql`${table.calComCredentialId} IS NOT NULL AND ${table.calEventTypeId} IS NOT NULL`,
      ),
    uniqueIndex("BookingEventType_organizationId_slug_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.slug.asc().nullsLast().op("text_ops"),
    ),
    index("BookingEventType_organizationId_locationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.calComCredentialId],
      foreignColumns: [calComCredential.id],
      name: "BookingEventType_calComCredentialId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "BookingEventType_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "BookingEventType_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const bookingAvailability = pgTable(
  "BookingAvailability",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	title: text(),
    startTime: timestamp({ precision: 3, mode: "date" }).notNull(),
    endTime: timestamp({ precision: 3, mode: "date" }).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("BookingAvailability_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("BookingAvailability_organizationId_locationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("BookingAvailability_startTime_endTime_idx").using(
      "btree",
      table.startTime.asc().nullsLast().op("timestamp_ops"),
      table.endTime.asc().nullsLast().op("timestamp_ops"),
    ),
    index("BookingAvailability_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "BookingAvailability_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "BookingAvailability_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const bookingHoliday = pgTable(
  "BookingHoliday",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	name: text().notNull(),
    startDate: timestamp({ precision: 3, mode: "date" }).notNull(),
    endDate: timestamp({ precision: 3, mode: "date" }).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("BookingHoliday_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("BookingHoliday_organizationId_locationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("BookingHoliday_startDate_endDate_idx").using(
      "btree",
      table.startDate.asc().nullsLast().op("timestamp_ops"),
      table.endDate.asc().nullsLast().op("timestamp_ops"),
    ),
    index("BookingHoliday_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "BookingHoliday_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "BookingHoliday_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const note = pgTable(
  "note",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	clientId: text(),
	dealId: text(),
	authorId: text(),
	content: text().notNull(),
	pinned: boolean().default(false).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("note_clientId_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    index("note_dealId_idx").using(
      "btree",
      table.dealId.asc().nullsLast().op("text_ops"),
    ),
    index("note_organizationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
    ),
    index("note_pinned_idx").using(
      "btree",
      table.pinned.asc().nullsLast().op("bool_ops"),
    ),
    index("note_locationId_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [user.id],
      name: "note_authorId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
      name: "note_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.dealId],
			foreignColumns: [deal.id],
      name: "note_dealId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const noteMention = pgTable(
  "note_mention",
  {
	id: text().primaryKey().notNull(),
	noteId: text().notNull(),
	userId: text().notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("note_mention_noteId_userId_key").using(
      "btree",
      table.noteId.asc().nullsLast().op("text_ops"),
      table.userId.asc().nullsLast().op("text_ops"),
    ),
    index("note_mention_userId_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("text_ops"),
    ),
	foreignKey({
			columns: [table.noteId],
			foreignColumns: [note.id],
      name: "note_mention_noteId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
      name: "note_mention_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const task = pgTable(
  "task",
  {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	title: text().notNull(),
	description: text(),
    status: taskStatus().default("TODO").notNull(),
    priority: taskPriority().default("MEDIUM").notNull(),
    dueDate: timestamp({ precision: 3, mode: "date" }),
    completedAt: timestamp({ precision: 3, mode: "date" }),
	clientId: text(),
	dealId: text(),
	createdById: text().notNull(),
	assigneeId: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("task_assigneeId_idx").using(
      "btree",
      table.assigneeId.asc().nullsLast().op("text_ops"),
    ),
    index("task_clientId_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    index("task_dealId_idx").using(
      "btree",
      table.dealId.asc().nullsLast().op("text_ops"),
    ),
    index("task_dueDate_idx").using(
      "btree",
      table.dueDate.asc().nullsLast().op("timestamp_ops"),
    ),
    index("task_organizationId_locationId_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    index("task_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
	foreignKey({
			columns: [table.assigneeId],
			foreignColumns: [user.id],
      name: "task_assigneeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
      name: "task_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
	foreignKey({
			columns: [table.createdById],
			foreignColumns: [user.id],
      name: "task_createdById_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.dealId],
			foreignColumns: [deal.id],
      name: "task_dealId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "task_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.locationId],
      foreignColumns: [location.id],
      name: "task_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const commerceOperation = pgTable(
  "CommerceOperation",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    clientId: text(),
    type: commerceOperationType().notNull(),
    status: commerceOperationStatus().default("CREATED").notNull(),
    provider: text().notNull(),
    providerAccountId: text(),
    stripeConnectionId: text(),
    idempotencyKey: text().notNull(),
    amountMinor: bigint({ mode: "number" }).notNull(),
    currency: text().notNull(),
    currencyExponent: integer().default(2).notNull(),
    invoiceId: text(),
    bookingId: text(),
    studioBookingId: text(),
    membershipId: text(),
    studioPaymentId: text(),
    providerCheckoutSessionId: text(),
    providerPaymentIntentId: text(),
    providerRefundId: text(),
    requestedBy: text(),
    failureCode: text(),
    failureMessage: text(),
    expiresAt: timestamp({ precision: 3, mode: "date" }),
    completedAt: timestamp({ precision: 3, mode: "date" }),
    metadata: jsonb().default({}).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("CommerceOperation_idempotencyKey_key").using(
      "btree",
      table.idempotencyKey.asc().nullsLast().op("text_ops"),
    ),
    index("CommerceOperation_scope_createdAt_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.createdAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("CommerceOperation_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    index("CommerceOperation_stripeConnectionId_idx").using(
      "btree",
      table.stripeConnectionId.asc().nullsLast().op("text_ops"),
    ),
    index("CommerceOperation_providerCheckoutSessionId_idx").using(
      "btree",
      table.providerCheckoutSessionId.asc().nullsLast().op("text_ops"),
    ),
    index("CommerceOperation_providerPaymentIntentId_idx").using(
      "btree",
      table.providerPaymentIntentId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("CommerceOperation_providerRefundId_key")
      .using("btree", table.providerRefundId.asc().nullsLast().op("text_ops"))
      .where(sql`${table.providerRefundId} IS NOT NULL`),
    uniqueIndex("CommerceOperation_active_booking_checkout_key")
      .using("btree", table.bookingId.asc().nullsLast().op("text_ops"))
      .where(
        sql`${table.bookingId} IS NOT NULL AND ${table.type} = 'CHECKOUT' AND ${table.status} IN ('CREATED', 'PROVIDER_PENDING', 'REQUIRES_ACTION')`,
      ),
    uniqueIndex("CommerceOperation_active_studio_booking_checkout_key")
      .using("btree", table.studioBookingId.asc().nullsLast().op("text_ops"))
      .where(
        sql`${table.studioBookingId} IS NOT NULL AND ${table.type} = 'CHECKOUT' AND ${table.status} IN ('CREATED', 'PROVIDER_PENDING', 'REQUIRES_ACTION')`,
      ),
    foreignKey({
      columns: [table.organizationId, table.stripeConnectionId],
      foreignColumns: [stripeConnection.organizationId, stripeConnection.id],
      name: "CommerceOperation_stripeConnection_scope_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [
        table.organizationId,
        table.locationId,
        table.stripeConnectionId,
      ],
      foreignColumns: [
        stripeConnection.organizationId,
        stripeConnection.locationId,
        stripeConnection.id,
      ],
      name: "CommerceOperation_stripeConnection_location_scope_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "CommerceOperation_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.locationId],
      foreignColumns: [location.id],
      name: "CommerceOperation_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.clientId],
      foreignColumns: [client.id],
      name: "CommerceOperation_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.invoiceId],
      foreignColumns: [invoice.id],
      name: "CommerceOperation_invoiceId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.bookingId],
      foreignColumns: [booking.id],
      name: "CommerceOperation_bookingId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.organizationId, table.bookingId],
      foreignColumns: [booking.organizationId, booking.id],
      name: "CommerceOperation_booking_scope_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.locationId, table.bookingId],
      foreignColumns: [booking.organizationId, booking.locationId, booking.id],
      name: "CommerceOperation_booking_location_scope_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.studioBookingId],
      foreignColumns: [studioBooking.id],
      name: "CommerceOperation_studioBookingId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.membershipId],
      foreignColumns: [studioMembership.id],
      name: "CommerceOperation_membershipId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.studioPaymentId],
      foreignColumns: [studioPayment.id],
      name: "CommerceOperation_studioPaymentId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.requestedBy],
      foreignColumns: [user.id],
      name: "CommerceOperation_requestedBy_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    check(
      "CommerceOperation_stripe_binding_check",
      sql`upper(${table.provider}) <> 'STRIPE' OR (${table.stripeConnectionId} IS NOT NULL AND ${table.providerAccountId} IS NOT NULL)`,
    ),
  ],
).enableRLS();

export const commerceLedgerEntry = pgTable(
  "CommerceLedgerEntry",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    operationId: text(),
    provider: text().notNull(),
    providerAccountId: text(),
    stripeConnectionId: text(),
    instructorId: text(),
    idempotencyKey: text().notNull(),
    providerObjectId: text().notNull(),
    providerObjectType: text().notNull(),
    kind: commerceLedgerKind().notNull(),
    status: commerceLedgerStatus().notNull(),
    paymentIntentId: text(),
    chargeId: text(),
    checkoutSessionId: text(),
    amountMinor: bigint({ mode: "number" }).notNull(),
    feeMinor: bigint({ mode: "number" }),
    netMinor: bigint({ mode: "number" }),
    currency: text().notNull(),
    currencyExponent: integer().default(2).notNull(),
    clientId: text(),
    membershipId: text(),
    bookingId: text(),
    studioBookingId: text(),
    invoiceId: text(),
    studioPaymentId: text(),
    invoicePaymentId: text(),
    stripeEventId: text(),
    occurredAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    metadata: jsonb().default({}).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("CommerceLedgerEntry_idempotencyKey_key").using(
      "btree",
      table.idempotencyKey.asc().nullsLast().op("text_ops"),
    ),
    index("CommerceLedgerEntry_organizationId_occurredAt_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.occurredAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("CommerceLedgerEntry_locationId_occurredAt_idx").using(
      "btree",
      table.locationId.asc().nullsLast().op("text_ops"),
      table.occurredAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("CommerceLedgerEntry_providerObjectId_idx").using(
      "btree",
      table.providerObjectId.asc().nullsLast().op("text_ops"),
    ),
    index("CommerceLedgerEntry_paymentIntentId_idx").using(
      "btree",
      table.paymentIntentId.asc().nullsLast().op("text_ops"),
    ),
    index("CommerceLedgerEntry_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    index("CommerceLedgerEntry_stripeConnectionId_idx").using(
      "btree",
      table.stripeConnectionId.asc().nullsLast().op("text_ops"),
    ),
    index("CommerceLedgerEntry_instructorId_idx").using(
      "btree",
      table.instructorId.asc().nullsLast().op("text_ops"),
    ),
    index("CommerceLedgerEntry_clientId_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    index("CommerceLedgerEntry_invoiceId_idx").using(
      "btree",
      table.invoiceId.asc().nullsLast().op("text_ops"),
    ),
    index("CommerceLedgerEntry_studioPaymentId_idx").using(
      "btree",
      table.studioPaymentId.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.organizationId, table.stripeConnectionId],
      foreignColumns: [stripeConnection.organizationId, stripeConnection.id],
      name: "CommerceLedgerEntry_stripeConnection_scope_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [
        table.organizationId,
        table.locationId,
        table.stripeConnectionId,
      ],
      foreignColumns: [
        stripeConnection.organizationId,
        stripeConnection.locationId,
        stripeConnection.id,
      ],
      name: "CommerceLedgerEntry_stripeConnection_location_scope_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.instructorId],
      foreignColumns: [instructor.id],
      name: "CommerceLedgerEntry_instructorId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.operationId],
      foreignColumns: [commerceOperation.id],
      name: "CommerceLedgerEntry_operationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "CommerceLedgerEntry_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.locationId],
      foreignColumns: [location.id],
      name: "CommerceLedgerEntry_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.clientId],
      foreignColumns: [client.id],
      name: "CommerceLedgerEntry_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.membershipId],
      foreignColumns: [studioMembership.id],
      name: "CommerceLedgerEntry_membershipId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.bookingId],
      foreignColumns: [booking.id],
      name: "CommerceLedgerEntry_bookingId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.studioBookingId],
      foreignColumns: [studioBooking.id],
      name: "CommerceLedgerEntry_studioBookingId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.invoiceId],
      foreignColumns: [invoice.id],
      name: "CommerceLedgerEntry_invoiceId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.studioPaymentId],
      foreignColumns: [studioPayment.id],
      name: "CommerceLedgerEntry_studioPaymentId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.invoicePaymentId],
      foreignColumns: [invoicePayment.id],
      name: "CommerceLedgerEntry_invoicePaymentId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.stripeEventId],
      foreignColumns: [stripeEvent.id],
      name: "CommerceLedgerEntry_stripeEventId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    check(
      "CommerceLedgerEntry_stripe_binding_check",
      sql`upper(${table.provider}) <> 'STRIPE' OR (${table.kind} = 'PAYOUT' AND ${table.instructorId} IS NOT NULL AND ${table.providerAccountId} IS NOT NULL AND ${table.stripeConnectionId} IS NULL) OR (${table.kind} <> 'PAYOUT' AND ${table.stripeConnectionId} IS NOT NULL AND ${table.providerAccountId} IS NOT NULL AND ${table.instructorId} IS NULL)`,
    ),
  ],
).enableRLS();

export const commerceTenderAllocation = pgTable(
  "CommerceTenderAllocation",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    ledgerEntryId: text().notNull(),
    type: commerceTenderType().notNull(),
    amountMinor: bigint({ mode: "number" }).notNull(),
    currency: text().notNull(),
    currencyExponent: integer().default(2).notNull(),
    sourceId: text(),
    metadata: jsonb().default({}).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("CommerceTenderAllocation_ledgerEntryId_idx").using(
      "btree",
      table.ledgerEntryId.asc().nullsLast().op("text_ops"),
    ),
    index("CommerceTenderAllocation_scope_type_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.type.asc().nullsLast().op("enum_ops"),
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "CommerceTenderAllocation_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.locationId],
      foreignColumns: [location.id],
      name: "CommerceTenderAllocation_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.ledgerEntryId],
      foreignColumns: [commerceLedgerEntry.id],
      name: "CommerceTenderAllocation_ledgerEntryId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const commerceReconciliationRun = pgTable(
  "CommerceReconciliationRun",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    provider: text().notNull(),
    status: commerceReconciliationRunStatus().default("PENDING").notNull(),
    requestedBy: text(),
    windowStart: timestamp({ precision: 3, mode: "date" }).notNull(),
    windowEnd: timestamp({ precision: 3, mode: "date" }).notNull(),
    providerRecords: integer().default(0).notNull(),
    localRecords: integer().default(0).notNull(),
    issuesFound: integer().default(0).notNull(),
    startedAt: timestamp({ precision: 3, mode: "date" }),
    completedAt: timestamp({ precision: 3, mode: "date" }),
    errorMessage: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("CommerceReconciliationRun_scope_createdAt_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.createdAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("CommerceReconciliationRun_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "CommerceReconciliationRun_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.locationId],
      foreignColumns: [location.id],
      name: "CommerceReconciliationRun_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.requestedBy],
      foreignColumns: [user.id],
      name: "CommerceReconciliationRun_requestedBy_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const commerceReconciliationIssue = pgTable(
  "CommerceReconciliationIssue",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    runId: text(),
    ledgerEntryId: text(),
    stripeEventId: text(),
    fingerprint: text().notNull(),
    type: commerceReconciliationIssueType().notNull(),
    severity: commerceReconciliationSeverity().default("WARNING").notNull(),
    status: commerceReconciliationStatus().default("OPEN").notNull(),
    localEntityType: text(),
    localEntityId: text(),
    providerObjectId: text(),
    expected: jsonb().default({}).notNull(),
    actual: jsonb().default({}).notNull(),
    recoveryAction: text(),
    detectedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    lastSeenAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    acknowledgedAt: timestamp({ precision: 3, mode: "date" }),
    acknowledgedBy: text(),
    resolvedAt: timestamp({ precision: 3, mode: "date" }),
    resolvedBy: text(),
    resolutionNote: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("CommerceReconciliationIssue_fingerprint_key").using(
      "btree",
      table.fingerprint.asc().nullsLast().op("text_ops"),
    ),
    index("CommerceReconciliationIssue_scope_status_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    index("CommerceReconciliationIssue_providerObjectId_idx").using(
      "btree",
      table.providerObjectId.asc().nullsLast().op("text_ops"),
    ),
    index("CommerceReconciliationIssue_ledgerEntryId_idx").using(
      "btree",
      table.ledgerEntryId.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "CommerceReconciliationIssue_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.locationId],
      foreignColumns: [location.id],
      name: "CommerceReconciliationIssue_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.runId],
      foreignColumns: [commerceReconciliationRun.id],
      name: "CommerceReconciliationIssue_runId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.ledgerEntryId],
      foreignColumns: [commerceLedgerEntry.id],
      name: "CommerceReconciliationIssue_ledgerEntryId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.stripeEventId],
      foreignColumns: [stripeEvent.id],
      name: "CommerceReconciliationIssue_stripeEventId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.acknowledgedBy],
      foreignColumns: [user.id],
      name: "CommerceReconciliationIssue_acknowledgedBy_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.resolvedBy],
      foreignColumns: [user.id],
      name: "CommerceReconciliationIssue_resolvedBy_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const campaignRun = pgTable(
  "CampaignRun",
  {
    id: text().primaryKey().notNull(),
    campaignId: text().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    requestedBy: text(),
    status: campaignRunStatus().default("PREPARING").notNull(),
    idempotencyKey: text().notNull(),
    scheduledFor: timestamp({ precision: 3, mode: "date" }),
    audienceSnapshot: jsonb().default({}).notNull(),
    contentSnapshot: jsonb().default({}).notNull(),
    senderSnapshot: jsonb().default({}).notNull(),
    totalRecipients: integer().default(0).notNull(),
    queued: integer().default(0).notNull(),
    accepted: integer().default(0).notNull(),
    delivered: integer().default(0).notNull(),
    bounced: integer().default(0).notNull(),
    suppressed: integer().default(0).notNull(),
    failed: integer().default(0).notNull(),
    preparedAt: timestamp({ precision: 3, mode: "date" }),
    startedAt: timestamp({ precision: 3, mode: "date" }),
    completedAt: timestamp({ precision: 3, mode: "date" }),
    cancelledAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("CampaignRun_organizationId_idempotencyKey_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.idempotencyKey.asc().nullsLast().op("text_ops"),
    ),
    index("CampaignRun_campaignId_createdAt_idx").using(
      "btree",
      table.campaignId.asc().nullsLast().op("text_ops"),
      table.createdAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("CampaignRun_scope_createdAt_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.createdAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("CampaignRun_status_scheduledFor_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
      table.scheduledFor.asc().nullsLast().op("timestamp_ops"),
    ),
    foreignKey({
      columns: [table.campaignId],
      foreignColumns: [campaign.id],
      name: "CampaignRun_campaignId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "CampaignRun_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.locationId],
      foreignColumns: [location.id],
      name: "CampaignRun_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.requestedBy],
      foreignColumns: [user.id],
      name: "CampaignRun_requestedBy_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const outboundDelivery = pgTable(
  "OutboundDelivery",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    clientId: text(),
    workflowId: text(),
    executionId: text(),
    nodeId: text(),
    channel: deliveryChannel().notNull(),
    purpose: deliveryPurpose().notNull(),
    provider: deliveryProvider().notNull(),
    status: outboundDeliveryStatus().default("QUEUED").notNull(),
    providerAccountId: text(),
    providerAccountRef: text().notNull(),
    sourceType: text().notNull(),
    sourceId: text().notNull(),
    destination: text().notNull(),
    destinationNormalized: text().notNull(),
    senderRef: jsonb().default({}).notNull(),
    payloadVersion: integer().default(1).notNull(),
    payload: jsonb().notNull(),
    idempotencyKey: text().notNull(),
    availableAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    nextAttemptAt: timestamp({ precision: 3, mode: "date" }),
    claimToken: text(),
    leaseExpiresAt: timestamp({ precision: 3, mode: "date" }),
    attemptCount: integer().default(0).notNull(),
    maxAttempts: integer().default(5).notNull(),
    providerMessageId: text(),
    providerRequestId: text(),
    lastFailureClass: deliveryFailureClass(),
    lastErrorCode: text(),
    lastErrorMessage: text(),
    delayedAt: timestamp({ precision: 3, mode: "date" }),
    acceptedAt: timestamp({ precision: 3, mode: "date" }),
    deliveredAt: timestamp({ precision: 3, mode: "date" }),
    bouncedAt: timestamp({ precision: 3, mode: "date" }),
    openedAt: timestamp({ precision: 3, mode: "date" }),
    clickedAt: timestamp({ precision: 3, mode: "date" }),
    readAt: timestamp({ precision: 3, mode: "date" }),
    cancelledAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("OutboundDelivery_organizationId_id_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("OutboundDelivery_organizationId_idempotencyKey_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.idempotencyKey.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("OutboundDelivery_provider_message_key")
      .using(
        "btree",
        table.provider.asc().nullsLast().op("enum_ops"),
        table.providerAccountRef.asc().nullsLast().op("text_ops"),
        table.providerMessageId.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.providerMessageId} IS NOT NULL`),
    index("OutboundDelivery_scope_createdAt_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.createdAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("OutboundDelivery_status_availableAt_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
      table.availableAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("OutboundDelivery_status_nextAttemptAt_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
      table.nextAttemptAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("OutboundDelivery_source_idx").using(
      "btree",
      table.sourceType.asc().nullsLast().op("text_ops"),
      table.sourceId.asc().nullsLast().op("text_ops"),
    ),
    index("OutboundDelivery_providerAccountId_idx").using(
      "btree",
      table.providerAccountId.asc().nullsLast().op("text_ops"),
    ),
    index("OutboundDelivery_clientId_createdAt_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
      table.createdAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("OutboundDelivery_leaseExpiresAt_idx").using(
      "btree",
      table.leaseExpiresAt.asc().nullsLast().op("timestamp_ops"),
    ),
    foreignKey({
      columns: [table.providerAccountId],
      foreignColumns: [providerAccount.id],
      name: "OutboundDelivery_providerAccountId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "OutboundDelivery_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.locationId],
      foreignColumns: [location.id],
      name: "OutboundDelivery_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.clientId],
      foreignColumns: [client.id],
      name: "OutboundDelivery_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.workflowId],
      foreignColumns: [workflows.id],
      name: "OutboundDelivery_workflowId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.executionId],
      foreignColumns: [execution.id],
      name: "OutboundDelivery_executionId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.nodeId],
      foreignColumns: [node.id],
      name: "OutboundDelivery_nodeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const deliveryAttempt = pgTable(
  "DeliveryAttempt",
  {
    id: text().primaryKey().notNull(),
    deliveryId: text().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    attemptNumber: integer().notNull(),
    claimToken: text(),
    provider: deliveryProvider().notNull(),
    outcome: deliveryAttemptOutcome(),
    providerMessageId: text(),
    providerRequestId: text(),
    httpStatus: integer(),
    errorClass: deliveryFailureClass(),
    errorCode: text(),
    errorMessage: text(),
    retryAfter: timestamp({ precision: 3, mode: "date" }),
    startedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    completedAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("DeliveryAttempt_deliveryId_attemptNumber_key").using(
      "btree",
      table.deliveryId.asc().nullsLast().op("text_ops"),
      table.attemptNumber.asc().nullsLast().op("int4_ops"),
    ),
    index("DeliveryAttempt_scope_startedAt_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.startedAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("DeliveryAttempt_outcome_idx").using(
      "btree",
      table.outcome.asc().nullsLast().op("enum_ops"),
    ),
    foreignKey({
      columns: [table.deliveryId],
      foreignColumns: [outboundDelivery.id],
      name: "DeliveryAttempt_deliveryId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "DeliveryAttempt_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.locationId],
      foreignColumns: [location.id],
      name: "DeliveryAttempt_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const deliveryProviderEvent = pgTable(
  "DeliveryProviderEvent",
  {
    id: text().primaryKey().notNull(),
    organizationId: text(),
    locationId: text(),
    deliveryId: text(),
    provider: deliveryProvider().notNull(),
    providerAccountId: text(),
    providerAccountRef: text().notNull(),
    providerEventId: text().notNull(),
    providerMessageId: text().notNull(),
    eventType: text().notNull(),
    occurredAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    receivedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    verifiedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    payloadHash: text().notNull(),
    safeMetadata: jsonb().default({}).notNull(),
    appliedAt: timestamp({ precision: 3, mode: "date" }),
    applyError: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("DeliveryProviderEvent_provider_event_key").using(
      "btree",
      table.provider.asc().nullsLast().op("enum_ops"),
      table.providerAccountRef.asc().nullsLast().op("text_ops"),
      table.providerEventId.asc().nullsLast().op("text_ops"),
    ),
    index("DeliveryProviderEvent_deliveryId_idx").using(
      "btree",
      table.deliveryId.asc().nullsLast().op("text_ops"),
    ),
    index("DeliveryProviderEvent_provider_message_idx").using(
      "btree",
      table.provider.asc().nullsLast().op("enum_ops"),
      table.providerAccountRef.asc().nullsLast().op("text_ops"),
      table.providerMessageId.asc().nullsLast().op("text_ops"),
    ),
    index("DeliveryProviderEvent_providerAccountId_idx").using(
      "btree",
      table.providerAccountId.asc().nullsLast().op("text_ops"),
    ),
    index("DeliveryProviderEvent_unmatched_idx")
      .using("btree", table.receivedAt.asc().nullsLast().op("timestamp_ops"))
      .where(sql`${table.deliveryId} IS NULL`),
    foreignKey({
      columns: [table.providerAccountId],
      foreignColumns: [providerAccount.id],
      name: "DeliveryProviderEvent_providerAccountId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "DeliveryProviderEvent_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.locationId],
      foreignColumns: [location.id],
      name: "DeliveryProviderEvent_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.deliveryId],
      foreignColumns: [outboundDelivery.id],
      name: "DeliveryProviderEvent_deliveryId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const communicationSuppression = pgTable(
  "CommunicationSuppression",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    clientId: text(),
    channel: deliveryChannel().notNull(),
    scope: communicationSuppressionScope().notNull(),
    reason: communicationSuppressionReason().notNull(),
    destinationNormalized: text().notNull(),
    sourceDeliveryId: text(),
    createdBy: text(),
    activeAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    expiresAt: timestamp({ precision: 3, mode: "date" }),
    revokedAt: timestamp({ precision: 3, mode: "date" }),
    revokedBy: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("CommunicationSuppression_location_active_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
        table.channel.asc().nullsLast().op("enum_ops"),
        table.destinationNormalized.asc().nullsLast().op("text_ops"),
        table.scope.asc().nullsLast().op("enum_ops"),
      )
      .where(
        sql`${table.locationId} IS NOT NULL AND ${table.revokedAt} IS NULL`,
      ),
    uniqueIndex("CommunicationSuppression_organization_active_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.channel.asc().nullsLast().op("enum_ops"),
        table.destinationNormalized.asc().nullsLast().op("text_ops"),
        table.scope.asc().nullsLast().op("enum_ops"),
      )
      .where(sql`${table.locationId} IS NULL AND ${table.revokedAt} IS NULL`),
    index("CommunicationSuppression_scope_destination_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.channel.asc().nullsLast().op("enum_ops"),
      table.destinationNormalized.asc().nullsLast().op("text_ops"),
    ),
    index("CommunicationSuppression_clientId_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "CommunicationSuppression_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.locationId],
      foreignColumns: [location.id],
      name: "CommunicationSuppression_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.clientId],
      foreignColumns: [client.id],
      name: "CommunicationSuppression_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.sourceDeliveryId],
      foreignColumns: [outboundDelivery.id],
      name: "CommunicationSuppression_sourceDeliveryId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [user.id],
      name: "CommunicationSuppression_createdBy_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.revokedBy],
      foreignColumns: [user.id],
      name: "CommunicationSuppression_revokedBy_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const savedAudience = pgTable(
  "SavedAudience",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    name: text().notNull(),
    description: text(),
    definition: jsonb().notNull(),
    schemaVersion: integer().default(1).notNull(),
    createdById: text(),
    updatedById: text(),
    archivedById: text(),
    archivedAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("SavedAudience_scope_archivedAt_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.archivedAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("SavedAudience_scope_updatedAt_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.updatedAt.asc().nullsLast().op("timestamp_ops"),
    ),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
      name: "SavedAudience_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
      name: "SavedAudience_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.createdById],
      foreignColumns: [user.id],
      name: "SavedAudience_createdById_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.updatedById],
      foreignColumns: [user.id],
      name: "SavedAudience_updatedById_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.archivedById],
      foreignColumns: [user.id],
      name: "SavedAudience_archivedById_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const staffIdentity = pgTable(
  "StaffIdentity",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    userId: text(),
    displayName: text().notNull(),
    email: text(),
    normalizedEmail: text(),
    phone: text(),
    status: staffIdentityStatus().default("ACTIVE").notNull(),
    createdById: text(),
    updatedById: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("StaffIdentity_organizationId_userId_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.userId.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.userId} IS NOT NULL`),
    index("StaffIdentity_organizationId_status_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    index("StaffIdentity_organizationId_normalizedEmail_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.normalizedEmail.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "StaffIdentity_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "StaffIdentity_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.createdById],
      foreignColumns: [user.id],
      name: "StaffIdentity_createdById_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.updatedById],
      foreignColumns: [user.id],
      name: "StaffIdentity_updatedById_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const publicationTarget = pgTable(
  "PublicationTarget",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    kind: publicationTargetKind().notNull(),
    sourceKey: text().notNull(),
    sourceId: text(),
    name: text().notNull(),
    slug: text().notNull(),
    status: publicationTargetStatus().default("DRAFT").notNull(),
    themePresetId: text(),
    publishedVersionId: text(),
    domainHost: text(),
    domainVerificationToken: text().notNull(),
    domainStatus: publicationDomainStatus().default("NOT_CONFIGURED").notNull(),
    sslStatus: publicationSslStatus().default("NOT_CONFIGURED").notNull(),
    domainCheckedAt: timestamp({ precision: 3, mode: "date" }),
    domainError: text(),
    seoConfig: jsonb().default({}).notNull(),
    consentConfig: jsonb().default({}).notNull(),
    channelConfig: jsonb().default({}).notNull(),
    publishedAt: timestamp({ precision: 3, mode: "date" }),
    createdById: text(),
    updatedById: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("PublicationTarget_organizationId_id_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("PublicationTarget_organizationId_kind_sourceKey_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.kind.asc().nullsLast().op("enum_ops"),
      table.sourceKey.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("PublicationTarget_organizationId_slug_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.slug.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("PublicationTarget_domainHost_key")
      .using("btree", table.domainHost.asc().nullsLast().op("text_ops"))
      .where(sql`${table.domainHost} IS NOT NULL`),
    index("PublicationTarget_scope_status_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "PublicationTarget_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.locationId],
      foreignColumns: [location.id],
      name: "PublicationTarget_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "PublicationTarget_organizationId_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.themePresetId],
      foreignColumns: [globalStylePreset.id],
      name: "PublicationTarget_themePresetId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.createdById],
      foreignColumns: [user.id],
      name: "PublicationTarget_createdById_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.updatedById],
      foreignColumns: [user.id],
      name: "PublicationTarget_updatedById_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const publicationVersion = pgTable(
  "PublicationVersion",
  {
    id: text().primaryKey().notNull(),
    targetId: text().notNull(),
    version: integer().notNull(),
    snapshotSchemaVersion: integer().default(1).notNull(),
    contentHash: text().notNull(),
    snapshot: jsonb().notNull(),
    themeSnapshot: jsonb(),
    seoSnapshot: jsonb().notNull(),
    consentSnapshot: jsonb().notNull(),
    validation: jsonb().default({}).notNull(),
    changeNote: text(),
    isRollback: boolean().default(false).notNull(),
    createdById: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("PublicationVersion_targetId_id_key").using(
      "btree",
      table.targetId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("PublicationVersion_targetId_version_key").using(
      "btree",
      table.targetId.asc().nullsLast().op("text_ops"),
      table.version.asc().nullsLast().op("int4_ops"),
    ),
    index("PublicationVersion_targetId_createdAt_idx").using(
      "btree",
      table.targetId.asc().nullsLast().op("text_ops"),
      table.createdAt.asc().nullsLast().op("timestamp_ops"),
    ),
    foreignKey({
      columns: [table.targetId],
      foreignColumns: [publicationTarget.id],
      name: "PublicationVersion_targetId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.createdById],
      foreignColumns: [user.id],
      name: "PublicationVersion_createdById_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const publicFormSubmissionReceipt = pgTable(
  "PublicFormSubmissionReceipt",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    targetId: text().notNull(),
    versionId: text().notNull(),
    formId: text().notNull(),
    idempotencyKey: text().notNull(),
    submissionTokenFingerprint: text().notNull(),
    payloadHash: text().notNull(),
    consentSnapshot: jsonb().notNull(),
    workflowId: text(),
    workflowDispatchStatus: publicFormWorkflowDispatchStatus()
      .default("NOT_CONFIGURED")
      .notNull(),
    workflowDispatchAttempts: integer().default(0).notNull(),
    workflowDispatchError: text(),
    lastWorkflowAttemptAt: timestamp({ precision: 3, mode: "date" }),
    workflowDispatchedAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("PublicFormSubmissionReceipt_organizationId_id_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex(
      "PublicFormSubmissionReceipt_target_version_idempotency_key",
    ).using(
      "btree",
      table.targetId.asc().nullsLast().op("text_ops"),
      table.versionId.asc().nullsLast().op("text_ops"),
      table.idempotencyKey.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("PublicFormSubmissionReceipt_target_token_key").using(
      "btree",
      table.targetId.asc().nullsLast().op("text_ops"),
      table.submissionTokenFingerprint.asc().nullsLast().op("text_ops"),
    ),
    index("PublicFormSubmissionReceipt_scope_createdAt_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.createdAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("PublicFormSubmissionReceipt_dispatch_createdAt_idx").using(
      "btree",
      table.workflowDispatchStatus.asc().nullsLast().op("enum_ops"),
      table.createdAt.asc().nullsLast().op("timestamp_ops"),
    ),
    check(
      "PublicFormSubmissionReceipt_hash_lengths_check",
      sql`char_length(${table.submissionTokenFingerprint}) = 64 AND char_length(${table.payloadHash}) = 64`,
    ),
    check(
      "PublicFormSubmissionReceipt_idempotency_length_check",
      sql`char_length(${table.idempotencyKey}) BETWEEN 16 AND 128`,
    ),
    check(
      "PublicFormSubmissionReceipt_attempts_check",
      sql`${table.workflowDispatchAttempts} BETWEEN 0 AND 10`,
    ),
    check(
      "PublicFormSubmissionReceipt_workflow_status_check",
      sql`(${table.workflowId} IS NULL AND ${table.workflowDispatchStatus} = 'NOT_CONFIGURED') OR (${table.workflowId} IS NOT NULL AND ${table.workflowDispatchStatus} <> 'NOT_CONFIGURED')`,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "PublicFormSubmissionReceipt_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "PublicFormSubmissionReceipt_organizationId_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.targetId],
      foreignColumns: [publicationTarget.organizationId, publicationTarget.id],
      name: "PublicFormSubmissionReceipt_targetId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.targetId, table.versionId],
      foreignColumns: [publicationVersion.targetId, publicationVersion.id],
      name: "PublicFormSubmissionReceipt_versionId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.formId],
      foreignColumns: [form.organizationId, form.id],
      name: "PublicFormSubmissionReceipt_formId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.workflowId],
      foreignColumns: [workflows.organizationId, workflows.id],
      name: "PublicFormSubmissionReceipt_workflowId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
).enableRLS();

export const publicationRequestQuota = pgTable(
  "PublicationRequestQuota",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    targetId: text().notNull(),
    action: text().notNull(),
    dimension: text().notNull(),
    subjectKeyHash: text().notNull(),
    windowStartedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    windowSeconds: integer().notNull(),
    requestCount: integer().default(1).notNull(),
    expiresAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("PublicationRequestQuota_counter_key").using(
      "btree",
      table.targetId.asc().nullsLast().op("text_ops"),
      table.action.asc().nullsLast().op("text_ops"),
      table.dimension.asc().nullsLast().op("text_ops"),
      table.subjectKeyHash.asc().nullsLast().op("text_ops"),
      table.windowStartedAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("PublicationRequestQuota_expiresAt_idx").using(
      "btree",
      table.expiresAt.asc().nullsLast().op("timestamp_ops"),
    ),
    check(
      "PublicationRequestQuota_values_check",
      sql`char_length(${table.action}) BETWEEN 1 AND 100 AND ${table.dimension} IN ('SUBJECT', 'GLOBAL') AND char_length(${table.subjectKeyHash}) = 64 AND ${table.windowSeconds} BETWEEN 1 AND 86400 AND ${table.requestCount} > 0`,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "PublicationRequestQuota_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.targetId],
      foreignColumns: [publicationTarget.organizationId, publicationTarget.id],
      name: "PublicationRequestQuota_targetId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const funnelRequestQuota = pgTable(
  "FunnelRequestQuota",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    funnelId: text().notNull(),
    action: text().notNull(),
    dimension: text().notNull(),
    subjectKeyHash: text().notNull(),
    windowStartedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    windowSeconds: integer().notNull(),
    requestCount: integer().default(1).notNull(),
    expiresAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("FunnelRequestQuota_counter_key").using(
      "btree",
      table.funnelId.asc().nullsLast().op("text_ops"),
      table.action.asc().nullsLast().op("text_ops"),
      table.dimension.asc().nullsLast().op("text_ops"),
      table.subjectKeyHash.asc().nullsLast().op("text_ops"),
      table.windowStartedAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("FunnelRequestQuota_expiresAt_idx").using(
      "btree",
      table.expiresAt.asc().nullsLast().op("timestamp_ops"),
    ),
    check(
      "FunnelRequestQuota_values_check",
      sql`char_length(${table.action}) BETWEEN 1 AND 100 AND ${table.dimension} IN ('SUBJECT', 'GLOBAL') AND char_length(${table.subjectKeyHash}) = 64 AND ${table.windowSeconds} BETWEEN 1 AND 86400 AND ${table.requestCount} > 0`,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "FunnelRequestQuota_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.funnelId],
      foreignColumns: [funnel.organizationId, funnel.id],
      name: "FunnelRequestQuota_funnelId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const reportSavedView = pgTable(
  "ReportSavedView",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text().notNull(),
    reportGroupId: text().notNull(),
    reportId: text().notNull(),
    name: text().notNull(),
    visibility: reportViewVisibility().default("PERSONAL").notNull(),
    definition: jsonb().notNull(),
    schemaVersion: integer().default(1).notNull(),
    timezone: text().notNull(),
    currency: text().notNull(),
    ownerId: text().notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    archivedAt: timestamp({ precision: 3, mode: "date" }),
  },
  (table) => [
    index("ReportSavedView_scope_report_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.reportGroupId.asc().nullsLast().op("text_ops"),
      table.reportId.asc().nullsLast().op("text_ops"),
      table.archivedAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("ReportSavedView_owner_updatedAt_idx").using(
      "btree",
      table.ownerId.asc().nullsLast().op("text_ops"),
      table.updatedAt.asc().nullsLast().op("timestamp_ops"),
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "ReportSavedView_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.locationId],
      foreignColumns: [location.id],
      name: "ReportSavedView_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.ownerId],
      foreignColumns: [user.id],
      name: "ReportSavedView_ownerId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const reportExportRequest = pgTable(
  "ReportExportRequest",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text().notNull(),
    requestedById: text(),
    savedViewId: text(),
    reportGroupId: text().notNull(),
    reportId: text().notNull(),
    status: reportExportStatus().default("PENDING").notNull(),
    format: reportExportFormat().default("CSV").notNull(),
    definitionSnapshot: jsonb().notNull(),
    fieldSnapshot: jsonb().notNull(),
    timezone: text().notNull(),
    currency: text().notNull(),
    rowCount: integer(),
    fileName: text(),
    contentHash: text(),
    possiblePartial: boolean().default(false).notNull(),
    failureMessage: text(),
    requestedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    completedAt: timestamp({ precision: 3, mode: "date" }),
  },
  (table) => [
    index("ReportExportRequest_scope_requestedAt_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.requestedAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("ReportExportRequest_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "ReportExportRequest_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.locationId],
      foreignColumns: [location.id],
      name: "ReportExportRequest_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.requestedById],
      foreignColumns: [user.id],
      name: "ReportExportRequest_requestedById_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.savedViewId],
      foreignColumns: [reportSavedView.id],
      name: "ReportExportRequest_savedViewId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const inboxRoute = pgTable(
  "InboxRoute",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    providerAccountId: text().notNull(),
    channel: conversationChannel().notNull(),
    name: text().notNull(),
    inboundAddress: text().notNull(),
    inboundAddressNormalized: text().notNull(),
    isDefault: boolean().default(false).notNull(),
    isActive: boolean().default(true).notNull(),
    defaultAssigneeStaffIdentityId: text(),
    createdByUserId: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("InboxRoute_providerAccountId_address_key").using(
      "btree",
      table.providerAccountId.asc().nullsLast().op("text_ops"),
      table.inboundAddressNormalized.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("InboxRoute_organization_default_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.channel.asc().nullsLast().op("enum_ops"),
      )
      .where(
        sql`${table.locationId} IS NULL AND ${table.isDefault} = true AND ${table.isActive} = true`,
      ),
    uniqueIndex("InboxRoute_location_default_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
        table.channel.asc().nullsLast().op("enum_ops"),
      )
      .where(
        sql`${table.locationId} IS NOT NULL AND ${table.isDefault} = true AND ${table.isActive} = true`,
      ),
    index("InboxRoute_scope_active_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.channel.asc().nullsLast().op("enum_ops"),
      table.isActive.asc().nullsLast().op("bool_ops"),
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "InboxRoute_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "InboxRoute_organizationId_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.providerAccountId],
      foreignColumns: [providerAccount.organizationId, providerAccount.id],
      name: "InboxRoute_organizationId_providerAccountId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.defaultAssigneeStaffIdentityId],
      foreignColumns: [staffIdentity.id],
      name: "InboxRoute_defaultAssigneeStaffIdentityId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.createdByUserId],
      foreignColumns: [user.id],
      name: "InboxRoute_createdByUserId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const inboundMessageReceipt = pgTable(
  "InboundMessageReceipt",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    routeId: text(),
    providerAccountId: text().notNull(),
    provider: text().notNull(),
    providerEventId: text().notNull(),
    providerMessageId: text().notNull(),
    eventType: text().notNull(),
    status: inboundMessageReceiptStatus().default("PENDING").notNull(),
    payloadHash: text().notNull(),
    safeMetadata: jsonb().default({}).notNull(),
    attemptCount: integer().default(0).notNull(),
    claimToken: text(),
    leaseExpiresAt: timestamp({ precision: 3, mode: "date" }),
    occurredAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    receivedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    processedAt: timestamp({ precision: 3, mode: "date" }),
    lastErrorCode: text(),
    lastErrorMessage: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("InboundMessageReceipt_provider_event_key").using(
      "btree",
      table.provider.asc().nullsLast().op("text_ops"),
      table.providerAccountId.asc().nullsLast().op("text_ops"),
      table.providerEventId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("InboundMessageReceipt_provider_message_key").using(
      "btree",
      table.provider.asc().nullsLast().op("text_ops"),
      table.providerAccountId.asc().nullsLast().op("text_ops"),
      table.providerMessageId.asc().nullsLast().op("text_ops"),
    ),
    index("InboundMessageReceipt_status_lease_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
      table.leaseExpiresAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("InboundMessageReceipt_scope_receivedAt_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.receivedAt.asc().nullsLast().op("timestamp_ops"),
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "InboundMessageReceipt_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "InboundMessageReceipt_organizationId_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.providerAccountId],
      foreignColumns: [providerAccount.organizationId, providerAccount.id],
      name: "InboundMessageReceipt_organizationId_providerAccountId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.routeId],
      foreignColumns: [inboxRoute.id],
      name: "InboundMessageReceipt_routeId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const inboxReadState = pgTable(
  "InboxReadState",
  {
    id: text().primaryKey().notNull(),
    conversationId: text().notNull(),
    userId: text().notNull(),
    lastReadMessageId: text(),
    lastReadAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("InboxReadState_conversationId_userId_key").using(
      "btree",
      table.conversationId.asc().nullsLast().op("text_ops"),
      table.userId.asc().nullsLast().op("text_ops"),
    ),
    index("InboxReadState_userId_lastReadAt_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("text_ops"),
      table.lastReadAt.asc().nullsLast().op("timestamp_ops"),
    ),
    foreignKey({
      columns: [table.conversationId],
      foreignColumns: [inboxConversation.id],
      name: "InboxReadState_conversationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "InboxReadState_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.lastReadMessageId],
      foreignColumns: [inboxMessage.id],
      name: "InboxReadState_lastReadMessageId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const inboxConversationEvent = pgTable(
  "InboxConversationEvent",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    conversationId: text().notNull(),
    eventType: text().notNull(),
    actorUserId: text(),
    targetStaffIdentityId: text(),
    metadata: jsonb().default({}).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("InboxConversationEvent_conversationId_createdAt_idx").using(
      "btree",
      table.conversationId.asc().nullsLast().op("text_ops"),
      table.createdAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("InboxConversationEvent_scope_createdAt_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.createdAt.asc().nullsLast().op("timestamp_ops"),
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "InboxConversationEvent_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "InboxConversationEvent_organizationId_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.conversationId],
      foreignColumns: [inboxConversation.id],
      name: "InboxConversationEvent_conversationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.actorUserId],
      foreignColumns: [user.id],
      name: "InboxConversationEvent_actorUserId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.targetStaffIdentityId],
      foreignColumns: [staffIdentity.id],
      name: "InboxConversationEvent_targetStaffIdentityId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const demoDataProfile = pgEnum("DemoDataProfile", [
  "SHOWCASE",
  "QA_EXHAUSTIVE",
]);

export const demoDataRunStatus = pgEnum("DemoDataRunStatus", [
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "CLEARING",
  "CLEARED",
]);

export const demoDataRun = pgTable(
  "DemoDataRun",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text().notNull(),
    profile: demoDataProfile().notNull(),
    status: demoDataRunStatus().default("RUNNING").notNull(),
    schemaVersion: integer().default(1).notNull(),
    idempotencyKey: text().notNull(),
    requestedByUserId: text(),
    referenceDate: timestamp({ precision: 3, mode: "date" }).notNull(),
    counts: jsonb().default({}).notNull(),
    errorMessage: text(),
    startedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    completedAt: timestamp({ precision: 3, mode: "date" }),
    failedAt: timestamp({ precision: 3, mode: "date" }),
    clearedAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("DemoDataRun_scope_idempotency_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.idempotencyKey.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("DemoDataRun_active_scope_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.status} in ('RUNNING', 'CLEARING')`),
    index("DemoDataRun_scope_createdAt_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.createdAt.desc().nullsLast().op("timestamp_ops"),
    ),
    check(
      "DemoDataRun_idempotencyKey_check",
      sql`char_length(${table.idempotencyKey}) between 8 and 128`,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "DemoDataRun_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "DemoDataRun_organizationId_locationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.requestedByUserId],
      foreignColumns: [user.id],
      name: "DemoDataRun_requestedByUserId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const demoDataRecord = pgTable(
  "DemoDataRecord",
  {
    id: text().primaryKey().notNull(),
    runId: text().notNull(),
    recordType: text().notNull(),
    recordId: text().notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("DemoDataRecord_type_record_key").using(
      "btree",
      table.recordType.asc().nullsLast().op("text_ops"),
      table.recordId.asc().nullsLast().op("text_ops"),
    ),
    index("DemoDataRecord_run_type_idx").using(
      "btree",
      table.runId.asc().nullsLast().op("text_ops"),
      table.recordType.asc().nullsLast().op("text_ops"),
    ),
    check(
      "DemoDataRecord_recordType_check",
      sql`char_length(${table.recordType}) between 1 and 100`,
    ),
    foreignKey({
      columns: [table.runId],
      foreignColumns: [demoDataRun.id],
      name: "DemoDataRecord_runId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
).enableRLS();

export const bookingEntitlementAllocation = pgTable(
  "BookingEntitlementAllocation",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    bookingId: text().notNull(),
    clientId: text().notNull(),
    membershipId: text(),
    classCreditId: text(),
    source: bookingEntitlementSource().notNull(),
    status: bookingEntitlementAllocationStatus().default("ACTIVE").notNull(),
    quantity: integer().default(1).notNull(),
    allocatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    restoredAt: timestamp({ precision: 3, mode: "date" }),
    restoredBy: text(),
    voidedAt: timestamp({ precision: 3, mode: "date" }),
    createdBy: text(),
    metadata: jsonb().default({}).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("BookingEntitlementAllocation_active_booking_key")
      .using("btree", table.bookingId.asc().nullsLast().op("text_ops"))
      .where(sql`${table.status} = 'ACTIVE'`),
    index("BookingEntitlementAllocation_scope_createdAt_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.createdAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("BookingEntitlementAllocation_clientId_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
    ),
    check(
      "BookingEntitlementAllocation_quantity_check",
      sql`${table.quantity} = 1`,
    ),
    check(
      "BookingEntitlementAllocation_membership_source_check",
      sql`${table.source} NOT IN ('MEMBERSHIP_CREDIT', 'MEMBERSHIP_ALLOWANCE') OR ${table.membershipId} IS NOT NULL`,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "BookingEntitlementAllocation_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "BookingEntitlementAllocation_scope_location_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.bookingId],
      foreignColumns: [studioBooking.id],
      name: "BookingEntitlementAllocation_bookingId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.clientId],
      foreignColumns: [client.id],
      name: "BookingEntitlementAllocation_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.membershipId],
      foreignColumns: [studioMembership.id],
      name: "BookingEntitlementAllocation_membershipId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.classCreditId],
      foreignColumns: [classCredit.id],
      name: "BookingEntitlementAllocation_classCreditId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.restoredBy],
      foreignColumns: [user.id],
      name: "BookingEntitlementAllocation_restoredBy_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [user.id],
      name: "BookingEntitlementAllocation_createdBy_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const paymentRecoveryPolicy = pgTable(
  "PaymentRecoveryPolicy",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    target: paymentRecoveryTarget().notNull(),
    mode: paymentRecoveryPolicyMode().default("ENABLED").notNull(),
    name: text().notNull(),
    version: integer().notNull(),
    gracePeriodDays: integer().default(3).notNull(),
    scheduleDays: integer().array().default([0, 3, 7]).notNull(),
    maxActions: integer().default(5).notNull(),
    steps: jsonb().default([]).notNull(),
    isActive: boolean().default(false).notNull(),
    createdBy: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("PaymentRecoveryPolicy_scope_target_version_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.target.asc().nullsLast().op("enum_ops"),
      table.version.asc().nullsLast().op("int4_ops"),
    ),
    uniqueIndex("PaymentRecoveryPolicy_active_location_target_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
        table.target.asc().nullsLast().op("enum_ops"),
      )
      .where(sql`${table.isActive} = true AND ${table.locationId} IS NOT NULL`),
    uniqueIndex("PaymentRecoveryPolicy_active_org_target_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.target.asc().nullsLast().op("enum_ops"),
      )
      .where(sql`${table.isActive} = true AND ${table.locationId} IS NULL`),
    index("PaymentRecoveryPolicy_scope_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
    ),
    check("PaymentRecoveryPolicy_version_check", sql`${table.version} > 0`),
    check(
      "PaymentRecoveryPolicy_limits_check",
      sql`${table.gracePeriodDays} >= 0 AND ${table.maxActions} BETWEEN 1 AND 20`,
    ),
    check(
      "PaymentRecoveryPolicy_inherit_scope_check",
      sql`${table.mode} <> 'INHERIT' OR ${table.locationId} IS NOT NULL`,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "PaymentRecoveryPolicy_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "PaymentRecoveryPolicy_scope_location_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [user.id],
      name: "PaymentRecoveryPolicy_createdBy_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const paymentRecoveryCase = pgTable(
  "PaymentRecoveryCase",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    clientId: text(),
    target: paymentRecoveryTarget().notNull(),
    status: paymentRecoveryCaseStatus().default("OPEN").notNull(),
    caseKey: text().notNull(),
    policyId: text(),
    policyVersion: integer(),
    policySnapshot: jsonb().default({}).notNull(),
    invoiceId: text(),
    membershipId: text(),
    bookingId: text(),
    studioBookingId: text(),
    studioPaymentId: text(),
    commerceOperationId: text(),
    provider: text(),
    providerAccountId: text(),
    providerAccountRef: text(),
    stripeConnectionId: text(),
    providerObjectId: text(),
    sourceEventId: text(),
    sourceEventAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    amountMinor: bigint({ mode: "number" }).notNull(),
    currency: text().notNull(),
    currencyExponent: integer().default(2).notNull(),
    attemptCount: integer().default(0).notNull(),
    nextActionAt: timestamp({ precision: 3, mode: "date" }),
    ownerUserId: text(),
    lastErrorCode: text(),
    lastErrorMessage: text(),
    openedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    recoveredAt: timestamp({ precision: 3, mode: "date" }),
    exhaustedAt: timestamp({ precision: 3, mode: "date" }),
    cancelledAt: timestamp({ precision: 3, mode: "date" }),
    metadata: jsonb().default({}).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("PaymentRecoveryCase_caseKey_key").using(
      "btree",
      table.caseKey.asc().nullsLast().op("text_ops"),
    ),
    index("PaymentRecoveryCase_scope_status_nextActionAt_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.status.asc().nullsLast().op("enum_ops"),
      table.nextActionAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("PaymentRecoveryCase_clientId_openedAt_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("text_ops"),
      table.openedAt.desc().nullsLast().op("timestamp_ops"),
    ),
    check(
      "PaymentRecoveryCase_source_check",
      sql`num_nonnulls(${table.invoiceId}, ${table.membershipId}, ${table.bookingId}, ${table.studioBookingId}) = 1`,
    ),
    check(
      "PaymentRecoveryCase_attempt_count_check",
      sql`${table.attemptCount} >= 0`,
    ),
    check(
      "PaymentRecoveryCase_amount_check",
      sql`${table.amountMinor} >= 0 AND ${table.currencyExponent} BETWEEN 0 AND 4`,
    ),
    check(
      "PaymentRecoveryCase_stripe_binding_check",
      sql`upper(coalesce(${table.provider}, '')) <> 'STRIPE' OR (${table.stripeConnectionId} IS NOT NULL AND ${table.providerAccountRef} IS NOT NULL)`,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "PaymentRecoveryCase_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "PaymentRecoveryCase_scope_location_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.clientId],
      foreignColumns: [client.id],
      name: "PaymentRecoveryCase_clientId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.policyId],
      foreignColumns: [paymentRecoveryPolicy.id],
      name: "PaymentRecoveryCase_policyId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.invoiceId],
      foreignColumns: [invoice.id],
      name: "PaymentRecoveryCase_invoiceId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.membershipId],
      foreignColumns: [studioMembership.id],
      name: "PaymentRecoveryCase_membershipId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.bookingId],
      foreignColumns: [booking.id],
      name: "PaymentRecoveryCase_bookingId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.studioBookingId],
      foreignColumns: [studioBooking.id],
      name: "PaymentRecoveryCase_studioBookingId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.studioPaymentId],
      foreignColumns: [studioPayment.id],
      name: "PaymentRecoveryCase_studioPaymentId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.commerceOperationId],
      foreignColumns: [commerceOperation.id],
      name: "PaymentRecoveryCase_commerceOperationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.providerAccountId],
      foreignColumns: [providerAccount.id],
      name: "PaymentRecoveryCase_providerAccountId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.stripeConnectionId],
      foreignColumns: [stripeConnection.id],
      name: "PaymentRecoveryCase_stripeConnectionId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.sourceEventId],
      foreignColumns: [stripeEvent.id],
      name: "PaymentRecoveryCase_sourceEventId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.ownerUserId],
      foreignColumns: [user.id],
      name: "PaymentRecoveryCase_ownerUserId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const paymentRecoveryAction = pgTable(
  "PaymentRecoveryAction",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    caseId: text().notNull(),
    type: paymentRecoveryActionType().notNull(),
    status: paymentRecoveryActionStatus().default("SCHEDULED").notNull(),
    sequence: integer().notNull(),
    idempotencyKey: text().notNull(),
    scheduledAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    availableAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    claimToken: text(),
    leaseExpiresAt: timestamp({ precision: 3, mode: "date" }),
    attemptCount: integer().default(0).notNull(),
    maxAttempts: integer().default(5).notNull(),
    providerAccountId: text(),
    providerAccountRef: text(),
    stripeConnectionId: text(),
    outboundDeliveryId: text(),
    providerObjectId: text(),
    payload: jsonb().default({}).notNull(),
    startedAt: timestamp({ precision: 3, mode: "date" }),
    completedAt: timestamp({ precision: 3, mode: "date" }),
    cancelledAt: timestamp({ precision: 3, mode: "date" }),
    lastErrorCode: text(),
    lastErrorMessage: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("PaymentRecoveryAction_idempotencyKey_key").using(
      "btree",
      table.idempotencyKey.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("PaymentRecoveryAction_caseId_sequence_key").using(
      "btree",
      table.caseId.asc().nullsLast().op("text_ops"),
      table.sequence.asc().nullsLast().op("int4_ops"),
    ),
    index("PaymentRecoveryAction_status_availableAt_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
      table.availableAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index("PaymentRecoveryAction_leaseExpiresAt_idx").using(
      "btree",
      table.leaseExpiresAt.asc().nullsLast().op("timestamp_ops"),
    ),
    check(
      "PaymentRecoveryAction_attempts_check",
      sql`${table.attemptCount} >= 0 AND ${table.maxAttempts} BETWEEN 1 AND 20`,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "PaymentRecoveryAction_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "PaymentRecoveryAction_scope_location_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [paymentRecoveryCase.id],
      name: "PaymentRecoveryAction_caseId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.providerAccountId],
      foreignColumns: [providerAccount.id],
      name: "PaymentRecoveryAction_providerAccountId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.stripeConnectionId],
      foreignColumns: [stripeConnection.id],
      name: "PaymentRecoveryAction_stripeConnectionId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.outboundDeliveryId],
      foreignColumns: [outboundDelivery.id],
      name: "PaymentRecoveryAction_outboundDeliveryId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const paymentRecoveryAttempt = pgTable(
  "PaymentRecoveryAttempt",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    caseId: text().notNull(),
    actionId: text(),
    type: paymentRecoveryAttemptType().notNull(),
    status: paymentRecoveryAttemptStatus().notNull(),
    idempotencyKey: text().notNull(),
    provider: text(),
    providerAccountId: text(),
    providerAccountRef: text(),
    stripeConnectionId: text(),
    providerObjectId: text(),
    errorCode: text(),
    errorMessage: text(),
    metadata: jsonb().default({}).notNull(),
    occurredAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("PaymentRecoveryAttempt_idempotencyKey_key").using(
      "btree",
      table.idempotencyKey.asc().nullsLast().op("text_ops"),
    ),
    index("PaymentRecoveryAttempt_caseId_occurredAt_idx").using(
      "btree",
      table.caseId.asc().nullsLast().op("text_ops"),
      table.occurredAt.asc().nullsLast().op("timestamp_ops"),
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "PaymentRecoveryAttempt_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "PaymentRecoveryAttempt_scope_location_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [paymentRecoveryCase.id],
      name: "PaymentRecoveryAttempt_caseId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.actionId],
      foreignColumns: [paymentRecoveryAction.id],
      name: "PaymentRecoveryAttempt_actionId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.providerAccountId],
      foreignColumns: [providerAccount.id],
      name: "PaymentRecoveryAttempt_providerAccountId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.stripeConnectionId],
      foreignColumns: [stripeConnection.id],
      name: "PaymentRecoveryAttempt_stripeConnectionId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
).enableRLS();

export const paymentRecoveryLink = pgTable(
  "PaymentRecoveryLink",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    caseId: text().notNull(),
    tokenHash: text().notNull(),
    purpose: text().notNull(),
    expiresAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    usedAt: timestamp({ precision: 3, mode: "date" }),
    revokedAt: timestamp({ precision: 3, mode: "date" }),
    createdBy: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("PaymentRecoveryLink_tokenHash_key").using(
      "btree",
      table.tokenHash.asc().nullsLast().op("text_ops"),
    ),
    index("PaymentRecoveryLink_caseId_expiresAt_idx").using(
      "btree",
      table.caseId.asc().nullsLast().op("text_ops"),
      table.expiresAt.asc().nullsLast().op("timestamp_ops"),
    ),
    check(
      "PaymentRecoveryLink_purpose_check",
      sql`${table.purpose} IN ('UPDATE_PAYMENT', 'RETRY_CHECKOUT')`,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "PaymentRecoveryLink_organizationId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "PaymentRecoveryLink_scope_location_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [paymentRecoveryCase.id],
      name: "PaymentRecoveryLink_caseId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [user.id],
      name: "PaymentRecoveryLink_createdBy_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
).enableRLS();

export const workspaceWeekStart = pgEnum("WorkspaceWeekStart", [
  "SUNDAY",
  "MONDAY",
  "SATURDAY",
]);

export const workspaceDateFormat = pgEnum("WorkspaceDateFormat", [
  "LOCALE",
  "MONTH_DAY_YEAR",
  "DAY_MONTH_YEAR",
  "YEAR_MONTH_DAY",
]);

export const workspaceTimeFormat = pgEnum("WorkspaceTimeFormat", [
  "TWELVE_HOUR",
  "TWENTY_FOUR_HOUR",
]);

export const bookingWindowPolicy = pgTable(
  "BookingWindowPolicy",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    name: text().notNull(),
    description: text(),
    isDefault: boolean().default(false).notNull(),
    isActive: boolean().default(true).notNull(),
    createdBy: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("BookingWindowPolicy_location_name_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
        table.name.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.locationId} IS NOT NULL`),
    uniqueIndex("BookingWindowPolicy_org_name_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.name.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.locationId} IS NULL`),
    uniqueIndex("BookingWindowPolicy_active_location_default_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
      )
      .where(
        sql`${table.isActive} = true AND ${table.isDefault} = true AND ${table.locationId} IS NOT NULL`,
      ),
    uniqueIndex("BookingWindowPolicy_active_org_default_key")
      .using("btree", table.organizationId.asc().nullsLast().op("text_ops"))
      .where(
        sql`${table.isActive} = true AND ${table.isDefault} = true AND ${table.locationId} IS NULL`,
      ),
    uniqueIndex("BookingWindowPolicy_scope_id_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("BookingWindowPolicy_organization_id_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
    check(
      "BookingWindowPolicy_text_check",
      sql`length(${table.name}) BETWEEN 1 AND 120 AND (${table.description} IS NULL OR length(${table.description}) <= 500)`,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "BookingWindowPolicy_organizationId_fkey",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "BookingWindowPolicy_scope_location_fkey",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [user.id],
      name: "BookingWindowPolicy_createdBy_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
  ],
).enableRLS();

export const bookingWindowPolicyVersion = pgTable(
  "BookingWindowPolicyVersion",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    policyId: text().notNull(),
    version: integer().notNull(),
    schemaVersion: integer().default(1).notNull(),
    opensMinutesBeforeStart: integer().notNull(),
    closesMinutesBeforeStart: integer().notNull(),
    cancellationsCloseMinutesBeforeStart: integer().notNull(),
    blockClientCancellations: boolean().default(false).notNull(),
    effectiveFrom: timestamp({
      precision: 3,
      mode: "date",
      withTimezone: true,
    }).notNull(),
    rollbackFromVersion: integer(),
    changeNote: text(),
    createdBy: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("BookingWindowPolicyVersion_policy_version_key").using(
      "btree",
      table.policyId.asc().nullsLast().op("text_ops"),
      table.version.asc().nullsLast().op("int4_ops"),
    ),
    uniqueIndex("BookingWindowPolicyVersion_organization_id_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
    index("BookingWindowPolicyVersion_policy_effective_key").using(
      "btree",
      table.policyId.asc().nullsLast().op("text_ops"),
      table.effectiveFrom.asc().nullsLast().op("timestamp_ops"),
      table.version.asc().nullsLast().op("int4_ops"),
    ),
    check(
      "BookingWindowPolicyVersion_values_check",
      sql`${table.version} > 0 AND ${table.schemaVersion} > 0 AND ${table.opensMinutesBeforeStart} BETWEEN 0 AND 527040 AND ${table.closesMinutesBeforeStart} BETWEEN -1440 AND 527040 AND ${table.opensMinutesBeforeStart} >= ${table.closesMinutesBeforeStart} AND ${table.cancellationsCloseMinutesBeforeStart} BETWEEN 0 AND 527040`,
    ),
    check(
      "BookingWindowPolicyVersion_rollback_check",
      sql`${table.rollbackFromVersion} IS NULL OR ${table.rollbackFromVersion} > 0`,
    ),
    check(
      "BookingWindowPolicyVersion_note_check",
      sql`${table.changeNote} IS NULL OR length(${table.changeNote}) <= 240`,
    ),
    foreignKey({
      columns: [table.organizationId, table.policyId],
      foreignColumns: [
        bookingWindowPolicy.organizationId,
        bookingWindowPolicy.id,
      ],
      name: "BookingWindowPolicyVersion_scope_policy_fkey",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [user.id],
      name: "BookingWindowPolicyVersion_createdBy_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
  ],
).enableRLS();

export const waitlistPolicy = pgTable(
  "WaitlistPolicy",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    name: text().notNull(),
    description: text(),
    isDefault: boolean().default(false).notNull(),
    isActive: boolean().default(true).notNull(),
    createdBy: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("WaitlistPolicy_location_name_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
        table.name.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.locationId} IS NOT NULL`),
    uniqueIndex("WaitlistPolicy_org_name_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.name.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.locationId} IS NULL`),
    uniqueIndex("WaitlistPolicy_active_location_default_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
      )
      .where(
        sql`${table.isActive} = true AND ${table.isDefault} = true AND ${table.locationId} IS NOT NULL`,
      ),
    uniqueIndex("WaitlistPolicy_active_org_default_key")
      .using("btree", table.organizationId.asc().nullsLast().op("text_ops"))
      .where(
        sql`${table.isActive} = true AND ${table.isDefault} = true AND ${table.locationId} IS NULL`,
      ),
    uniqueIndex("WaitlistPolicy_scope_id_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("WaitlistPolicy_organization_id_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
    check(
      "WaitlistPolicy_text_check",
      sql`length(${table.name}) BETWEEN 1 AND 120 AND (${table.description} IS NULL OR length(${table.description}) <= 500)`,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "WaitlistPolicy_organizationId_fkey",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "WaitlistPolicy_scope_location_fkey",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [user.id],
      name: "WaitlistPolicy_createdBy_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
  ],
).enableRLS();

export const waitlistPolicyVersion = pgTable(
  "WaitlistPolicyVersion",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    policyId: text().notNull(),
    version: integer().notNull(),
    schemaVersion: integer().default(1).notNull(),
    mode: waitlistPolicyMode().notNull(),
    automationClosesMinutesBeforeStart: integer().notNull(),
    maxEntries: integer(),
    allowOverlappingReservations: boolean().default(false).notNull(),
    creditHoldPolicy: waitlistCreditHoldPolicy().default("NONE").notNull(),
    offerExpiryMinutes: integer(),
    failureFallback: waitlistFailureFallback()
      .default("MANUAL_REVIEW")
      .notNull(),
    effectiveFrom: timestamp({
      precision: 3,
      mode: "date",
      withTimezone: true,
    }).notNull(),
    rollbackFromVersion: integer(),
    changeNote: text(),
    createdBy: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("WaitlistPolicyVersion_policy_version_key").using(
      "btree",
      table.policyId.asc().nullsLast().op("text_ops"),
      table.version.asc().nullsLast().op("int4_ops"),
    ),
    uniqueIndex("WaitlistPolicyVersion_organization_id_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
    index("WaitlistPolicyVersion_policy_effective_key").using(
      "btree",
      table.policyId.asc().nullsLast().op("text_ops"),
      table.effectiveFrom.asc().nullsLast().op("timestamp_ops"),
      table.version.asc().nullsLast().op("int4_ops"),
    ),
    check(
      "WaitlistPolicyVersion_values_check",
      sql`${table.version} > 0 AND ${table.schemaVersion} > 0 AND ${table.automationClosesMinutesBeforeStart} BETWEEN 0 AND 527040 AND (${table.maxEntries} IS NULL OR ${table.maxEntries} BETWEEN 1 AND 10000) AND (${table.offerExpiryMinutes} IS NULL OR ${table.offerExpiryMinutes} BETWEEN 1 AND 10080)`,
    ),
    check(
      "WaitlistPolicyVersion_disabled_check",
      sql`${table.mode} <> 'DISABLED' OR (${table.creditHoldPolicy} = 'NONE' AND ${table.offerExpiryMinutes} IS NULL)`,
    ),
    check(
      "WaitlistPolicyVersion_offer_expiry_check",
      sql`(${table.mode} <> 'OFFER_NEXT' AND ${table.failureFallback} <> 'OFFER_NEXT') OR ${table.offerExpiryMinutes} IS NOT NULL`,
    ),
    check(
      "WaitlistPolicyVersion_rollback_check",
      sql`${table.rollbackFromVersion} IS NULL OR ${table.rollbackFromVersion} > 0`,
    ),
    check(
      "WaitlistPolicyVersion_note_check",
      sql`${table.changeNote} IS NULL OR length(${table.changeNote}) <= 240`,
    ),
    foreignKey({
      columns: [table.organizationId, table.policyId],
      foreignColumns: [waitlistPolicy.organizationId, waitlistPolicy.id],
      name: "WaitlistPolicyVersion_scope_policy_fkey",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [user.id],
      name: "WaitlistPolicyVersion_createdBy_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
  ],
).enableRLS();

export const workspaceRegionalSettingsVersion = pgTable(
  "WorkspaceRegionalSettingsVersion",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    version: integer().notNull(),
    timezone: text(),
    locale: text(),
    currency: text(),
    weekStart: workspaceWeekStart(),
    dateFormat: workspaceDateFormat(),
    timeFormat: workspaceTimeFormat(),
    isActive: boolean().default(false).notNull(),
    isRollback: boolean().default(false).notNull(),
    rollbackFromVersion: integer(),
    changeNote: text(),
    createdBy: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("WorkspaceRegionalSettingsVersion_location_version_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
        table.version.asc().nullsLast().op("int4_ops"),
      )
      .where(sql`${table.locationId} IS NOT NULL`),
    uniqueIndex("WorkspaceRegionalSettingsVersion_org_version_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.version.asc().nullsLast().op("int4_ops"),
      )
      .where(sql`${table.locationId} IS NULL`),
    uniqueIndex("WorkspaceRegionalSettingsVersion_active_location_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.isActive} = true AND ${table.locationId} IS NOT NULL`),
    uniqueIndex("WorkspaceRegionalSettingsVersion_active_org_key")
      .using("btree", table.organizationId.asc().nullsLast().op("text_ops"))
      .where(sql`${table.isActive} = true AND ${table.locationId} IS NULL`),
    index("WorkspaceRegionalSettingsVersion_scope_createdAt_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.createdAt.asc().nullsLast().op("timestamp_ops"),
    ),
    check(
      "WorkspaceRegionalSettingsVersion_version_check",
      sql`${table.version} > 0`,
    ),
    check(
      "WorkspaceRegionalSettingsVersion_org_values_check",
      sql`${table.locationId} IS NOT NULL OR (${table.timezone} IS NOT NULL AND ${table.locale} IS NOT NULL AND ${table.currency} IS NOT NULL AND ${table.weekStart} IS NOT NULL AND ${table.dateFormat} IS NOT NULL AND ${table.timeFormat} IS NOT NULL)`,
    ),
    check(
      "WorkspaceRegionalSettingsVersion_text_values_check",
      sql`(${table.timezone} IS NULL OR length(${table.timezone}) BETWEEN 1 AND 100) AND (${table.locale} IS NULL OR length(${table.locale}) BETWEEN 2 AND 35) AND (${table.currency} IS NULL OR ${table.currency} ~ '^[A-Z]{3}$')`,
    ),
    check(
      "WorkspaceRegionalSettingsVersion_rollback_check",
      sql`(${table.isRollback} = false AND ${table.rollbackFromVersion} IS NULL) OR (${table.isRollback} = true AND ${table.rollbackFromVersion} IS NOT NULL AND ${table.rollbackFromVersion} > 0)`,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "WorkspaceRegionalSettingsVersion_organizationId_fkey",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "WorkspaceRegionalSettingsVersion_scope_location_fkey",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [user.id],
      name: "WorkspaceRegionalSettingsVersion_createdBy_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
  ],
).enableRLS();

export const workspaceOperationsSettingsVersion = pgTable(
  "WorkspaceOperationsSettingsVersion",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    version: integer().notNull(),
    businessHours: jsonb(),
    scheduleStartMinutes: integer(),
    scheduleEndMinutes: integer(),
    scheduleSlotMinutes: integer(),
    guestBookingEnabled: boolean(),
    maxGuestsPerBooking: integer(),
    guestRequiredFields: text().array(),
    showPublicEmail: boolean(),
    showPublicPhone: boolean(),
    showPublicWebsite: boolean(),
    showPublicAddress: boolean(),
    isActive: boolean().default(false).notNull(),
    isRollback: boolean().default(false).notNull(),
    rollbackFromVersion: integer(),
    changeNote: text(),
    createdBy: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("WorkspaceOperationsSettingsVersion_location_version_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
        table.version.asc().nullsLast().op("int4_ops"),
      )
      .where(sql`${table.locationId} IS NOT NULL`),
    uniqueIndex("WorkspaceOperationsSettingsVersion_org_version_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.version.asc().nullsLast().op("int4_ops"),
      )
      .where(sql`${table.locationId} IS NULL`),
    uniqueIndex("WorkspaceOperationsSettingsVersion_active_location_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.isActive} = true AND ${table.locationId} IS NOT NULL`),
    uniqueIndex("WorkspaceOperationsSettingsVersion_active_org_key")
      .using("btree", table.organizationId.asc().nullsLast().op("text_ops"))
      .where(sql`${table.isActive} = true AND ${table.locationId} IS NULL`),
    index("WorkspaceOperationsSettingsVersion_scope_createdAt_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.createdAt.asc().nullsLast().op("timestamp_ops"),
    ),
    check(
      "WorkspaceOperationsSettingsVersion_version_check",
      sql`${table.version} > 0`,
    ),
    check(
      "WorkspaceOperationsSettingsVersion_org_values_check",
      sql`${table.locationId} IS NOT NULL OR (${table.businessHours} IS NOT NULL AND ${table.scheduleStartMinutes} IS NOT NULL AND ${table.scheduleEndMinutes} IS NOT NULL AND ${table.scheduleSlotMinutes} IS NOT NULL AND ${table.guestBookingEnabled} IS NOT NULL AND ${table.maxGuestsPerBooking} IS NOT NULL AND ${table.guestRequiredFields} IS NOT NULL AND ${table.showPublicEmail} IS NOT NULL AND ${table.showPublicPhone} IS NOT NULL AND ${table.showPublicWebsite} IS NOT NULL AND ${table.showPublicAddress} IS NOT NULL)`,
    ),
    check(
      "WorkspaceOperationsSettingsVersion_schedule_check",
      sql`(${table.scheduleStartMinutes} IS NULL OR ${table.scheduleStartMinutes} BETWEEN 0 AND 1439) AND (${table.scheduleEndMinutes} IS NULL OR ${table.scheduleEndMinutes} BETWEEN 1 AND 1440) AND (${table.scheduleStartMinutes} IS NULL OR ${table.scheduleEndMinutes} IS NULL OR ${table.scheduleStartMinutes} < ${table.scheduleEndMinutes}) AND (${table.scheduleSlotMinutes} IS NULL OR ${table.scheduleSlotMinutes} IN (5, 10, 15, 20, 30, 60))`,
    ),
    check(
      "WorkspaceOperationsSettingsVersion_guests_check",
      sql`${table.maxGuestsPerBooking} IS NULL OR ${table.maxGuestsPerBooking} BETWEEN 0 AND 20`,
    ),
    check(
      "WorkspaceOperationsSettingsVersion_guest_fields_check",
      sql`${table.guestRequiredFields} IS NULL OR ${table.guestRequiredFields} <@ ARRAY['EMAIL']::text[]`,
    ),
    check(
      "WorkspaceOperationsSettingsVersion_business_hours_check",
      sql`${table.businessHours} IS NULL OR jsonb_typeof(${table.businessHours}) = 'object'`,
    ),
    check(
      "WorkspaceOperationsSettingsVersion_rollback_check",
      sql`(${table.isRollback} = false AND ${table.rollbackFromVersion} IS NULL) OR (${table.isRollback} = true AND ${table.rollbackFromVersion} IS NOT NULL AND ${table.rollbackFromVersion} > 0)`,
    ),
    check(
      "WorkspaceOperationsSettingsVersion_note_check",
      sql`${table.changeNote} IS NULL OR length(${table.changeNote}) <= 240`,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "WorkspaceOperationsSettingsVersion_organizationId_fkey",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "WorkspaceOperationsSettingsVersion_scope_location_fkey",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [user.id],
      name: "WorkspaceOperationsSettingsVersion_createdBy_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
  ],
).enableRLS();

export const customerFieldDefinition = pgTable(
  "CustomerFieldDefinition",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    key: text().notNull(),
    label: text().notNull(),
    description: text(),
    fieldType: text({
      enum: ["TEXT", "NUMBER", "DATE", "BOOLEAN", "SELECT", "MULTI_SELECT"],
    }).notNull(),
    isRequired: boolean().default(false).notNull(),
    options: jsonb().$type<string[]>().default([]).notNull(),
    archivedAt: timestamp({ precision: 3, mode: "date" }),
    archivedById: text(),
    createdById: text(),
    updatedById: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("CustomerFieldDefinition_active_org_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.key.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.locationId} IS NULL AND ${table.archivedAt} IS NULL`),
    uniqueIndex("CustomerFieldDefinition_active_location_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
        table.key.asc().nullsLast().op("text_ops"),
      )
      .where(
        sql`${table.locationId} IS NOT NULL AND ${table.archivedAt} IS NULL`,
      ),
    index("CustomerFieldDefinition_scope_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.updatedAt.asc().nullsLast().op("timestamp_ops"),
    ),
    check(
      "CustomerFieldDefinition_key_format_check",
      sql`${table.key} ~ '^[a-z][a-z0-9_]*$'`,
    ),
    check(
      "CustomerFieldDefinition_type_check",
      sql`${table.fieldType} IN ('TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'MULTI_SELECT')`,
    ),
    check(
      "CustomerFieldDefinition_options_array_check",
      sql`jsonb_typeof(${table.options}) = 'array'`,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "CustomerFieldDefinition_organizationId_fkey",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "CustomerFieldDefinition_scope_location_fkey",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.archivedById],
      foreignColumns: [user.id],
      name: "CustomerFieldDefinition_archivedById_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
    foreignKey({
      columns: [table.createdById],
      foreignColumns: [user.id],
      name: "CustomerFieldDefinition_createdById_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
    foreignKey({
      columns: [table.updatedById],
      foreignColumns: [user.id],
      name: "CustomerFieldDefinition_updatedById_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
  ],
).enableRLS();

export const customerTagDefinition = pgTable(
  "CustomerTagDefinition",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    name: text().notNull(),
    color: text(),
    description: text(),
    archivedAt: timestamp({ precision: 3, mode: "date" }),
    archivedById: text(),
    createdById: text(),
    updatedById: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("CustomerTagDefinition_active_org_name")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        sql`lower(${table.name})`,
      )
      .where(sql`${table.locationId} IS NULL AND ${table.archivedAt} IS NULL`),
    uniqueIndex("CustomerTagDefinition_active_location_name")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
        sql`lower(${table.name})`,
      )
      .where(
        sql`${table.locationId} IS NOT NULL AND ${table.archivedAt} IS NULL`,
      ),
    index("CustomerTagDefinition_scope_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.updatedAt.asc().nullsLast().op("timestamp_ops"),
    ),
    check(
      "CustomerTagDefinition_color_check",
      sql`${table.color} IS NULL OR ${table.color} ~ '^#[0-9a-fA-F]{6}$'`,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "CustomerTagDefinition_organizationId_fkey",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "CustomerTagDefinition_scope_location_fkey",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.archivedById],
      foreignColumns: [user.id],
      name: "CustomerTagDefinition_archivedById_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
    foreignKey({
      columns: [table.createdById],
      foreignColumns: [user.id],
      name: "CustomerTagDefinition_createdById_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
    foreignKey({
      columns: [table.updatedById],
      foreignColumns: [user.id],
      name: "CustomerTagDefinition_updatedById_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
  ],
).enableRLS();

export const customerNoteTemplate = pgTable(
  "CustomerNoteTemplate",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    name: text().notNull(),
    description: text(),
    content: text().notNull(),
    archivedAt: timestamp({ precision: 3, mode: "date" }),
    archivedById: text(),
    createdById: text(),
    updatedById: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("CustomerNoteTemplate_active_org_name")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        sql`lower(${table.name})`,
      )
      .where(sql`${table.locationId} IS NULL AND ${table.archivedAt} IS NULL`),
    uniqueIndex("CustomerNoteTemplate_active_location_name")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
        sql`lower(${table.name})`,
      )
      .where(
        sql`${table.locationId} IS NOT NULL AND ${table.archivedAt} IS NULL`,
      ),
    index("CustomerNoteTemplate_scope_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.updatedAt.asc().nullsLast().op("timestamp_ops"),
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "CustomerNoteTemplate_organizationId_fkey",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "CustomerNoteTemplate_scope_location_fkey",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.archivedById],
      foreignColumns: [user.id],
      name: "CustomerNoteTemplate_archivedById_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
    foreignKey({
      columns: [table.createdById],
      foreignColumns: [user.id],
      name: "CustomerNoteTemplate_createdById_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
    foreignKey({
      columns: [table.updatedById],
      foreignColumns: [user.id],
      name: "CustomerNoteTemplate_updatedById_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
  ],
).enableRLS();

export const householdSharingPolicyVersion = pgTable(
  "HouseholdSharingPolicyVersion",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    version: integer().notNull(),
    values: jsonb().$type<Record<string, unknown>>().notNull(),
    isActive: boolean().default(false).notNull(),
    changeNote: text(),
    createdById: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("HouseholdSharingPolicyVersion_org_version_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.version.asc().nullsLast().op("int4_ops"),
      )
      .where(sql`${table.locationId} IS NULL`),
    uniqueIndex("HouseholdSharingPolicyVersion_location_version_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
        table.version.asc().nullsLast().op("int4_ops"),
      )
      .where(sql`${table.locationId} IS NOT NULL`),
    uniqueIndex("HouseholdSharingPolicyVersion_active_org_key")
      .using("btree", table.organizationId.asc().nullsLast().op("text_ops"))
      .where(sql`${table.locationId} IS NULL AND ${table.isActive} = true`),
    uniqueIndex("HouseholdSharingPolicyVersion_active_location_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.locationId} IS NOT NULL AND ${table.isActive} = true`),
    index("HouseholdSharingPolicyVersion_scope_createdAt_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.createdAt.asc().nullsLast().op("timestamp_ops"),
    ),
    check(
      "HouseholdSharingPolicyVersion_version_check",
      sql`${table.version} > 0`,
    ),
    check(
      "HouseholdSharingPolicyVersion_values_object_check",
      sql`jsonb_typeof(${table.values}) = 'object'`,
    ),
    check(
      "HouseholdSharingPolicyVersion_note_check",
      sql`${table.changeNote} IS NULL OR length(${table.changeNote}) <= 240`,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "HouseholdSharingPolicyVersion_organizationId_fkey",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "HouseholdSharingPolicyVersion_scope_location_fkey",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.createdById],
      foreignColumns: [user.id],
      name: "HouseholdSharingPolicyVersion_createdById_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
  ],
).enableRLS();

export const commerceTaxRate = pgTable(
  "CommerceTaxRate",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    name: text().notNull(),
    code: text().notNull(),
    rateBasisPoints: integer().notNull(),
    kind: text({ enum: ["EXCLUSIVE", "INCLUSIVE"] }).notNull(),
    description: text(),
    archivedAt: timestamp({ precision: 3, mode: "date" }),
    archivedById: text(),
    createdById: text(),
    updatedById: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("CommerceTaxRate_active_org_code_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.code.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.locationId} IS NULL AND ${table.archivedAt} IS NULL`),
    uniqueIndex("CommerceTaxRate_active_location_code_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
        table.code.asc().nullsLast().op("text_ops"),
      )
      .where(
        sql`${table.locationId} IS NOT NULL AND ${table.archivedAt} IS NULL`,
      ),
    index("CommerceTaxRate_scope_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.updatedAt.asc().nullsLast().op("timestamp_ops"),
    ),
    uniqueIndex("CommerceTaxRate_organization_id_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
    check(
      "CommerceTaxRate_rate_basis_points_check",
      sql`${table.rateBasisPoints} BETWEEN 0 AND 10000`,
    ),
    check(
      "CommerceTaxRate_kind_check",
      sql`${table.kind} IN ('EXCLUSIVE', 'INCLUSIVE')`,
    ),
    check(
      "CommerceTaxRate_code_format_check",
      sql`${table.code} ~ '^[A-Z0-9_-]+$'`,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "CommerceTaxRate_organizationId_fkey",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "CommerceTaxRate_scope_location_fkey",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.archivedById],
      foreignColumns: [user.id],
      name: "CommerceTaxRate_archivedById_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
    foreignKey({
      columns: [table.createdById],
      foreignColumns: [user.id],
      name: "CommerceTaxRate_createdById_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
    foreignKey({
      columns: [table.updatedById],
      foreignColumns: [user.id],
      name: "CommerceTaxRate_updatedById_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
  ],
).enableRLS();

export const commerceTaxAssignment = pgTable(
  "CommerceTaxAssignment",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    subjectType: text({ enum: ["LINE_TYPE", "PRODUCT"] }).notNull(),
    lineType: text({
      enum: ["MEMBERSHIP", "CLASS", "ADD_ON", "GIFT_CARD", "RETAIL", "OTHER"],
    }),
    productId: text(),
    taxRateId: text(),
    archivedAt: timestamp({ precision: 3, mode: "date" }),
    archivedById: text(),
    createdById: text(),
    updatedById: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("CommerceTaxAssignment_active_line_type_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.lineType.asc().nullsLast().op("text_ops"),
      )
      .where(
        sql`${table.locationId} IS NULL AND ${table.subjectType} = 'LINE_TYPE' AND ${table.archivedAt} IS NULL`,
      ),
    uniqueIndex("CommerceTaxAssignment_active_location_line_type_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
        table.lineType.asc().nullsLast().op("text_ops"),
      )
      .where(
        sql`${table.locationId} IS NOT NULL AND ${table.subjectType} = 'LINE_TYPE' AND ${table.archivedAt} IS NULL`,
      ),
    uniqueIndex("CommerceTaxAssignment_active_product_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.productId.asc().nullsLast().op("text_ops"),
      )
      .where(
        sql`${table.subjectType} = 'PRODUCT' AND ${table.archivedAt} IS NULL`,
      ),
    index("CommerceTaxAssignment_scope_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.updatedAt.asc().nullsLast().op("timestamp_ops"),
    ),
    check(
      "CommerceTaxAssignment_subject_check",
      sql`(${table.subjectType} = 'LINE_TYPE' AND ${table.lineType} IS NOT NULL AND ${table.productId} IS NULL) OR (${table.subjectType} = 'PRODUCT' AND ${table.productId} IS NOT NULL AND ${table.lineType} IS NULL)`,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "CommerceTaxAssignment_organizationId_fkey",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "CommerceTaxAssignment_scope_location_fkey",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.taxRateId],
      foreignColumns: [commerceTaxRate.organizationId, commerceTaxRate.id],
      name: "CommerceTaxAssignment_scope_taxRateId_fkey",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [studioProduct.id],
      name: "CommerceTaxAssignment_productId_fkey",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.archivedById],
      foreignColumns: [user.id],
      name: "CommerceTaxAssignment_archivedById_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
    foreignKey({
      columns: [table.createdById],
      foreignColumns: [user.id],
      name: "CommerceTaxAssignment_createdById_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
    foreignKey({
      columns: [table.updatedById],
      foreignColumns: [user.id],
      name: "CommerceTaxAssignment_updatedById_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
  ],
).enableRLS();

export const commerceRevenueCategory = pgTable(
  "CommerceRevenueCategory",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    name: text().notNull(),
    code: text().notNull(),
    description: text(),
    accountingAccountReference: text(),
    accountingAccountName: text(),
    archivedAt: timestamp({ precision: 3, mode: "date" }),
    archivedById: text(),
    createdById: text(),
    updatedById: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("CommerceRevenueCategory_active_org_code_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.code.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.locationId} IS NULL AND ${table.archivedAt} IS NULL`),
    uniqueIndex("CommerceRevenueCategory_active_location_code_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
        table.code.asc().nullsLast().op("text_ops"),
      )
      .where(
        sql`${table.locationId} IS NOT NULL AND ${table.archivedAt} IS NULL`,
      ),
    index("CommerceRevenueCategory_scope_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.updatedAt.asc().nullsLast().op("timestamp_ops"),
    ),
    uniqueIndex("CommerceRevenueCategory_organization_id_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
    check(
      "CommerceRevenueCategory_code_format_check",
      sql`${table.code} ~ '^[A-Z0-9_-]+$'`,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "CommerceRevenueCategory_organizationId_fkey",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "CommerceRevenueCategory_scope_location_fkey",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.archivedById],
      foreignColumns: [user.id],
      name: "CommerceRevenueCategory_archivedById_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
    foreignKey({
      columns: [table.createdById],
      foreignColumns: [user.id],
      name: "CommerceRevenueCategory_createdById_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
    foreignKey({
      columns: [table.updatedById],
      foreignColumns: [user.id],
      name: "CommerceRevenueCategory_updatedById_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
  ],
).enableRLS();

export const commerceOfflinePaymentMethod = pgTable(
  "CommerceOfflinePaymentMethod",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    name: text().notNull(),
    kind: text({
      enum: ["CASH", "CARD_TERMINAL", "BANK_TRANSFER", "CHEQUE", "OTHER"],
    }).notNull(),
    instructions: text(),
    enabled: boolean().default(true).notNull(),
    archivedAt: timestamp({ precision: 3, mode: "date" }),
    archivedById: text(),
    createdById: text(),
    updatedById: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("CommerceOfflinePaymentMethod_active_org_name_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        sql`lower(${table.name})`,
      )
      .where(sql`${table.locationId} IS NULL AND ${table.archivedAt} IS NULL`),
    uniqueIndex("CommerceOfflinePaymentMethod_active_location_name_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
        sql`lower(${table.name})`,
      )
      .where(
        sql`${table.locationId} IS NOT NULL AND ${table.archivedAt} IS NULL`,
      ),
    index("CommerceOfflinePaymentMethod_scope_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.updatedAt.asc().nullsLast().op("timestamp_ops"),
    ),
    check(
      "CommerceOfflinePaymentMethod_kind_check",
      sql`${table.kind} IN ('CASH', 'CARD_TERMINAL', 'BANK_TRANSFER', 'CHEQUE', 'OTHER')`,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "CommerceOfflinePaymentMethod_organizationId_fkey",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "CommerceOfflinePaymentMethod_scope_location_fkey",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.archivedById],
      foreignColumns: [user.id],
      name: "CommerceOfflinePaymentMethod_archivedById_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
    foreignKey({
      columns: [table.createdById],
      foreignColumns: [user.id],
      name: "CommerceOfflinePaymentMethod_createdById_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
    foreignKey({
      columns: [table.updatedById],
      foreignColumns: [user.id],
      name: "CommerceOfflinePaymentMethod_updatedById_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
  ],
).enableRLS();

export const commerceDocumentDefaults = pgTable(
  "CommerceDocumentDefaults",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    invoicePrefix: text(),
    invoiceDueDays: integer(),
    invoiceFooter: text(),
    receiptFooter: text(),
    defaultRevenueCategoryId: text(),
    createdById: text(),
    updatedById: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("CommerceDocumentDefaults_org_scope_key")
      .using("btree", table.organizationId.asc().nullsLast().op("text_ops"))
      .where(sql`${table.locationId} IS NULL`),
    uniqueIndex("CommerceDocumentDefaults_location_scope_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.locationId} IS NOT NULL`),
    check(
      "CommerceDocumentDefaults_invoice_due_days_check",
      sql`${table.invoiceDueDays} IS NULL OR ${table.invoiceDueDays} BETWEEN 0 AND 365`,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "CommerceDocumentDefaults_organizationId_fkey",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "CommerceDocumentDefaults_scope_location_fkey",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.defaultRevenueCategoryId],
      foreignColumns: [
        commerceRevenueCategory.organizationId,
        commerceRevenueCategory.id,
      ],
      name: "CommerceDocumentDefaults_scope_defaultRevenueCategoryId_fkey",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.createdById],
      foreignColumns: [user.id],
      name: "CommerceDocumentDefaults_createdById_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
    foreignKey({
      columns: [table.updatedById],
      foreignColumns: [user.id],
      name: "CommerceDocumentDefaults_updatedById_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
  ],
).enableRLS();

export const commerceGuestPassPolicyVersion = pgTable(
  "CommerceGuestPassPolicyVersion",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    version: integer().notNull(),
    values: jsonb().$type<Record<string, unknown>>().notNull(),
    isActive: boolean().default(false).notNull(),
    changeNote: text(),
    createdById: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("CommerceGuestPassPolicyVersion_org_version_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.version.asc().nullsLast().op("int4_ops"),
      )
      .where(sql`${table.locationId} IS NULL`),
    uniqueIndex("CommerceGuestPassPolicyVersion_location_version_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
        table.version.asc().nullsLast().op("int4_ops"),
      )
      .where(sql`${table.locationId} IS NOT NULL`),
    uniqueIndex("CommerceGuestPassPolicyVersion_active_org_key")
      .using("btree", table.organizationId.asc().nullsLast().op("text_ops"))
      .where(sql`${table.locationId} IS NULL AND ${table.isActive} = true`),
    uniqueIndex("CommerceGuestPassPolicyVersion_active_location_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.locationId} IS NOT NULL AND ${table.isActive} = true`),
    index("CommerceGuestPassPolicyVersion_scope_createdAt_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.createdAt.asc().nullsLast().op("timestamp_ops"),
    ),
    check(
      "CommerceGuestPassPolicyVersion_version_check",
      sql`${table.version} > 0`,
    ),
    check(
      "CommerceGuestPassPolicyVersion_values_object_check",
      sql`jsonb_typeof(${table.values}) = 'object'`,
    ),
    check(
      "CommerceGuestPassPolicyVersion_note_check",
      sql`${table.changeNote} IS NULL OR length(${table.changeNote}) <= 240`,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "CommerceGuestPassPolicyVersion_organizationId_fkey",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "CommerceGuestPassPolicyVersion_scope_location_fkey",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.createdById],
      foreignColumns: [user.id],
      name: "CommerceGuestPassPolicyVersion_createdById_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
  ],
).enableRLS();

export const staffOperationsPolicy = pgTable(
  "StaffOperationsPolicy",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    currentVersion: integer().default(0).notNull(),
    createdById: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("StaffOperationsPolicy_org_scope_key")
      .using("btree", table.organizationId.asc().nullsLast().op("text_ops"))
      .where(sql`${table.locationId} IS NULL`),
    uniqueIndex("StaffOperationsPolicy_location_scope_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.locationId} IS NOT NULL`),
    uniqueIndex("StaffOperationsPolicy_organization_id_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
    check(
      "StaffOperationsPolicy_currentVersion_check",
      sql`${table.currentVersion} >= 0`,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "StaffOperationsPolicy_organizationId_fkey",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "StaffOperationsPolicy_scope_location_fkey",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.createdById],
      foreignColumns: [user.id],
      name: "StaffOperationsPolicy_createdById_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
  ],
).enableRLS();

export const staffOperationsPolicyVersion = pgTable(
  "StaffOperationsPolicyVersion",
  {
    id: text().primaryKey().notNull(),
    policyId: text().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    version: integer().notNull(),
    publicInstructorProfilesByDefault: boolean().notNull(),
    availabilityMode: text({
      enum: ["AVAILABILITY_REQUIRED", "ROTA_REQUIRED"],
    }).notNull(),
    staffCanEditAvailability: boolean().notNull(),
    shiftSwapRequiresApproval: boolean().notNull(),
    timeOffRequiresApproval: boolean().notNull(),
    timeClockRoundingMinutes: integer().notNull(),
    breakRequiredAfterMinutes: integer(),
    minimumBreakMinutes: integer().notNull(),
    timeEntryApprovalMode: text({
      enum: ["MANAGER_REQUIRED", "AUTO_APPROVE"],
    }).notNull(),
    effectiveFrom: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    changeNote: text(),
    createdById: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("StaffOperationsPolicyVersion_policy_version_key").using(
      "btree",
      table.policyId.asc().nullsLast().op("text_ops"),
      table.version.asc().nullsLast().op("int4_ops"),
    ),
    index("StaffOperationsPolicyVersion_scope_effective_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.effectiveFrom.asc().nullsLast().op("timestamp_ops"),
    ),
    check(
      "StaffOperationsPolicyVersion_version_check",
      sql`${table.version} > 0`,
    ),
    check(
      "StaffOperationsPolicyVersion_availabilityMode_check",
      sql`${table.availabilityMode} IN ('AVAILABILITY_REQUIRED', 'ROTA_REQUIRED')`,
    ),
    check(
      "StaffOperationsPolicyVersion_rounding_check",
      sql`${table.timeClockRoundingMinutes} IN (1, 5, 6, 10, 15, 30)`,
    ),
    check(
      "StaffOperationsPolicyVersion_break_check",
      sql`(${table.breakRequiredAfterMinutes} IS NULL AND ${table.minimumBreakMinutes} = 0) OR (${table.breakRequiredAfterMinutes} BETWEEN 1 AND 1440 AND ${table.minimumBreakMinutes} BETWEEN 1 AND 240 AND ${table.minimumBreakMinutes} < ${table.breakRequiredAfterMinutes})`,
    ),
    check(
      "StaffOperationsPolicyVersion_note_check",
      sql`${table.changeNote} IS NULL OR length(${table.changeNote}) <= 240`,
    ),
    check(
      "StaffOperationsPolicyVersion_approval_check",
      sql`${table.timeEntryApprovalMode} IN ('MANAGER_REQUIRED', 'AUTO_APPROVE')`,
    ),
    foreignKey({
      columns: [table.organizationId, table.policyId],
      foreignColumns: [
        staffOperationsPolicy.organizationId,
        staffOperationsPolicy.id,
      ],
      name: "StaffOperationsPolicyVersion_scope_policy_fkey",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "StaffOperationsPolicyVersion_scope_location_fkey",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.createdById],
      foreignColumns: [user.id],
      name: "StaffOperationsPolicyVersion_createdById_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
  ],
).enableRLS();

export const staffCompensationTemplate = pgTable(
  "StaffCompensationTemplate",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    name: text().notNull(),
    description: text(),
    currentVersion: integer().default(0).notNull(),
    archivedAt: timestamp({ precision: 3, mode: "date" }),
    archivedById: text(),
    createdById: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("StaffCompensationTemplate_active_org_name_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        sql`lower(${table.name})`,
      )
      .where(sql`${table.locationId} IS NULL AND ${table.archivedAt} IS NULL`),
    uniqueIndex("StaffCompensationTemplate_active_location_name_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
        sql`lower(${table.name})`,
      )
      .where(
        sql`${table.locationId} IS NOT NULL AND ${table.archivedAt} IS NULL`,
      ),
    uniqueIndex("StaffCompensationTemplate_organization_id_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
    check(
      "StaffCompensationTemplate_currentVersion_check",
      sql`${table.currentVersion} >= 0`,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "StaffCompensationTemplate_organizationId_fkey",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "StaffCompensationTemplate_scope_location_fkey",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.archivedById],
      foreignColumns: [user.id],
      name: "StaffCompensationTemplate_archivedById_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
    foreignKey({
      columns: [table.createdById],
      foreignColumns: [user.id],
      name: "StaffCompensationTemplate_createdById_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
  ],
).enableRLS();

export const staffCompensationTemplateVersion = pgTable(
  "StaffCompensationTemplateVersion",
  {
    id: text().primaryKey().notNull(),
    templateId: text().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    version: integer().notNull(),
    compensationBasis: text({ enum: ["HOURLY_RATE"] })
      .default("HOURLY_RATE")
      .notNull(),
    hourlyRate: numeric({ precision: 12, scale: 2 }).notNull(),
    currency: text().notNull(),
    effectiveFrom: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    changeNote: text(),
    createdById: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("StaffCompensationTemplateVersion_template_version_key").using(
      "btree",
      table.templateId.asc().nullsLast().op("text_ops"),
      table.version.asc().nullsLast().op("int4_ops"),
    ),
    uniqueIndex("StaffCompensationTemplateVersion_organization_id_key").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.id.asc().nullsLast().op("text_ops"),
    ),
    check(
      "StaffCompensationTemplateVersion_version_check",
      sql`${table.version} > 0`,
    ),
    check(
      "StaffCompensationTemplateVersion_basis_check",
      sql`${table.compensationBasis} = 'HOURLY_RATE'`,
    ),
    check(
      "StaffCompensationTemplateVersion_rate_check",
      sql`${table.hourlyRate} >= 0`,
    ),
    check(
      "StaffCompensationTemplateVersion_currency_check",
      sql`${table.currency} ~ '^[A-Z]{3}$'`,
    ),
    check(
      "StaffCompensationTemplateVersion_note_check",
      sql`${table.changeNote} IS NULL OR length(${table.changeNote}) <= 240`,
    ),
    foreignKey({
      columns: [table.organizationId, table.templateId],
      foreignColumns: [
        staffCompensationTemplate.organizationId,
        staffCompensationTemplate.id,
      ],
      name: "StaffCompensationTemplateVersion_scope_template_fkey",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "StaffCompensationTemplateVersion_scope_location_fkey",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.createdById],
      foreignColumns: [user.id],
      name: "StaffCompensationTemplateVersion_createdById_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
  ],
).enableRLS();

export const staffCompensationAssignment = pgTable(
  "StaffCompensationAssignment",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    locationId: text(),
    instructorId: text().notNull(),
    templateVersionId: text().notNull(),
    effectiveFrom: timestamp({ precision: 3, mode: "date" }).notNull(),
    effectiveTo: timestamp({ precision: 3, mode: "date" }),
    assignedById: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("StaffCompensationAssignment_active_org_instructor_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.instructorId.asc().nullsLast().op("text_ops"),
      )
      .where(sql`${table.locationId} IS NULL AND ${table.effectiveTo} IS NULL`),
    uniqueIndex("StaffCompensationAssignment_active_location_instructor_key")
      .using(
        "btree",
        table.organizationId.asc().nullsLast().op("text_ops"),
        table.locationId.asc().nullsLast().op("text_ops"),
        table.instructorId.asc().nullsLast().op("text_ops"),
      )
      .where(
        sql`${table.locationId} IS NOT NULL AND ${table.effectiveTo} IS NULL`,
      ),
    index("StaffCompensationAssignment_scope_effective_idx").using(
      "btree",
      table.organizationId.asc().nullsLast().op("text_ops"),
      table.locationId.asc().nullsLast().op("text_ops"),
      table.effectiveFrom.asc().nullsLast().op("timestamp_ops"),
    ),
    check(
      "StaffCompensationAssignment_effective_range_check",
      sql`${table.effectiveTo} IS NULL OR ${table.effectiveTo} > ${table.effectiveFrom}`,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "StaffCompensationAssignment_organizationId_fkey",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.locationId],
      foreignColumns: [location.organizationId, location.id],
      name: "StaffCompensationAssignment_scope_location_fkey",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.instructorId],
      foreignColumns: [instructor.id],
      name: "StaffCompensationAssignment_instructorId_fkey",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.templateVersionId],
      foreignColumns: [
        staffCompensationTemplateVersion.organizationId,
        staffCompensationTemplateVersion.id,
      ],
      name: "StaffCompensationAssignment_scope_templateVersion_fkey",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.assignedById],
      foreignColumns: [user.id],
      name: "StaffCompensationAssignment_assignedById_fkey",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
  ],
).enableRLS();
