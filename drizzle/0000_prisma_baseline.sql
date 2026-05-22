-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."AILogStatus" AS ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."AccessControlProvider" AS ENUM('KISI', 'BRIVO', 'SALTO', 'HID', 'GANTNER', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."AcquisitionStage" AS ENUM('INQUIRY', 'TRIAL', 'ACTIVE', 'LOST');--> statement-breakpoint
CREATE TYPE "public"."ActivityAction" AS ENUM('CREATED', 'UPDATED', 'DELETED', 'ASSIGNED', 'UNASSIGNED', 'STAGE_CHANGED', 'STATUS_CHANGED', 'COMPLETED', 'ARCHIVED', 'RESTORED');--> statement-breakpoint
CREATE TYPE "public"."ActivityType" AS ENUM('CONTACT', 'DEAL', 'WORKFLOW', 'EXECUTION', 'PIPELINE', 'TASK', 'EMAIL', 'CALL', 'MEETING', 'NOTE', 'WORKER', 'TIME_LOG', 'INVOICE', 'CREDENTIAL', 'WEBHOOK', 'INTEGRATION', 'SUBACCOUNT', 'ORGANIZATION', 'BOOKING', 'FUNNEL', 'CAMPAIGN');--> statement-breakpoint
CREATE TYPE "public"."AppProvider" AS ENUM('GOOGLE_CALENDAR', 'GMAIL', 'GOOGLE', 'TELEGRAM', 'MICROSOFT', 'OUTLOOK', 'ONEDRIVE', 'MINDBODY', 'SLACK', 'DISCORD', 'GOOGLE_DRIVE', 'GOOGLE_FORMS');--> statement-breakpoint
CREATE TYPE "public"."ApprovalStatus" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."AutomationEventType" AS ENUM('WORKFLOW_COMPLETED', 'MEMBERSHIP_SIGNUP', 'INTRO_OFFER_REDEEMED', 'INTRO_OFFER_COMPLETED', 'CLASS_MILESTONE', 'LEAD_CONVERTED', 'BIRTHDAY', 'NO_SHOW', 'WAITLIST_SPOT_OPENED', 'MEMBERSHIP_EXPIRING', 'MEMBERSHIP_CANCELLED', 'CLASS_BOOKED', 'CLASS_CANCELLED', 'TAG_CHANGED', 'PAYMENT_SUCCEEDED', 'PAYMENT_FAILED');--> statement-breakpoint
CREATE TYPE "public"."BankTransferStatus" AS ENUM('PENDING', 'PROOF_UPLOADED', 'VERIFIED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."BillingInterval" AS ENUM('WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY', 'ONE_TIME');--> statement-breakpoint
CREATE TYPE "public"."BillingModel" AS ENUM('HOURLY', 'PER_SHIFT', 'WEEKLY_ROLLUP', 'MONTHLY_ROLLUP', 'RETAINER', 'PROJECT_MILESTONE', 'SUBSCRIPTION', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."BookingLocationType" AS ENUM('CAL_VIDEO', 'PHONE', 'IN_PERSON', 'GOOGLE_MEET', 'ZOOM', 'MS_TEAMS', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."BookingStatus" AS ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'RESCHEDULED', 'NO_SHOW', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."CampaignRecipientStatus" AS ENUM('PENDING', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'COMPLAINED', 'UNSUBSCRIBED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."CampaignSegmentType" AS ENUM('ALL', 'BY_TYPE', 'BY_TAGS', 'BY_LIFECYCLE', 'BY_COUNTRY', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."CampaignStatus" AS ENUM('DRAFT', 'SCHEDULED', 'QUEUED', 'SENDING', 'SENT', 'PAUSED', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."CancellationChargeType" AS ENUM('LATE_CANCEL', 'NO_SHOW');--> statement-breakpoint
CREATE TYPE "public"."CheckInMethod" AS ENUM('MANUAL', 'QR_CODE', 'GPS', 'BIOMETRIC', 'NFC');--> statement-breakpoint
CREATE TYPE "public"."ChurnRiskLevel" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."ClassDifficulty" AS ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS');--> statement-breakpoint
CREATE TYPE "public"."ClassInstanceStatus" AS ENUM('SCHEDULED', 'CANCELLED', 'COMPLETED', 'IN_PROGRESS');--> statement-breakpoint
CREATE TYPE "public"."ContactType" AS ENUM('LEAD', 'PROSPECT', 'CUSTOMER', 'CHURN', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."ContentAccessLevel" AS ENUM('PUBLIC', 'MEMBERS_ONLY', 'PAID');--> statement-breakpoint
CREATE TYPE "public"."ConversationChannel" AS ENUM('SMS', 'EMAIL', 'APP');--> statement-breakpoint
CREATE TYPE "public"."ConversationStatus" AS ENUM('OPEN', 'DONE', 'SNOOZED');--> statement-breakpoint
CREATE TYPE "public"."CredentialType" AS ENUM('ANTHROPIC', 'GEMINI', 'OPENAI', 'TELEGRAM_BOT', 'MINDBODY', 'RESEND', 'CAL_COM');--> statement-breakpoint
CREATE TYPE "public"."DevicePlatform" AS ENUM('IOS', 'ANDROID', 'WEB');--> statement-breakpoint
CREATE TYPE "public"."DeviceType" AS ENUM('DESKTOP', 'TABLET', 'MOBILE');--> statement-breakpoint
CREATE TYPE "public"."DiscountType" AS ENUM('PERCENT', 'FIXED');--> statement-breakpoint
CREATE TYPE "public"."EmailDomainStatus" AS ENUM('PENDING', 'VERIFYING', 'VERIFIED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."EmailTemplateType" AS ENUM('MARKETING', 'ANNOUNCEMENT', 'PLAIN', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."ExecutionStatus" AS ENUM('RUNNING', 'SUCCESS', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."ExternalChannelProvider" AS ENUM('RESERVE_WITH_GOOGLE', 'CLASSPASS', 'GYMPASS', 'WELLHUB');--> statement-breakpoint
CREATE TYPE "public"."ExternalChannelStatus" AS ENUM('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."FormFieldType" AS ENUM('SHORT_TEXT', 'LONG_TEXT', 'EMAIL', 'PHONE', 'NUMBER', 'URL', 'DATE', 'TIME', 'DATETIME', 'SELECT', 'RADIO', 'CHECKBOX', 'MULTI_SELECT', 'FILE_UPLOAD', 'RATING', 'SLIDER', 'SIGNATURE', 'PAYMENT');--> statement-breakpoint
CREATE TYPE "public"."FormStatus" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."FunnelBlockType" AS ENUM('CONTAINER', 'ONE_COLUMN', 'TWO_COLUMN', 'THREE_COLUMN', 'SECTION', 'HEADING', 'PARAGRAPH', 'LABEL', 'RICH_TEXT', 'IMAGE', 'VIDEO', 'ICON', 'INPUT', 'TEXTAREA', 'SELECT', 'CHECKBOX', 'BUTTON', 'FORM', 'CARD', 'FAQ', 'TESTIMONIAL', 'PRICING', 'FEATURE_GRID', 'IFRAME', 'CUSTOM_HTML', 'SCRIPT', 'POPUP', 'COUNTDOWN_TIMER', 'STICKY_BAR');--> statement-breakpoint
CREATE TYPE "public"."FunnelDomainType" AS ENUM('SUBDOMAIN', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."FunnelStatus" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."FunnelType" AS ENUM('INTERNAL', 'EXTERNAL');--> statement-breakpoint
CREATE TYPE "public"."HouseholdRole" AS ENUM('PRIMARY', 'PARTNER', 'CHILD', 'DEPENDENT', 'MEMBER');--> statement-breakpoint
CREATE TYPE "public"."ImportSource" AS ENUM('CSV', 'MINDBODY', 'GLOFOX', 'MOMOYOGA', 'ZEN_PLANNER');--> statement-breakpoint
CREATE TYPE "public"."ImportStatus" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'ROLLED_BACK');--> statement-breakpoint
CREATE TYPE "public"."InstallmentInterval" AS ENUM('WEEKLY', 'BIWEEKLY', 'MONTHLY');--> statement-breakpoint
CREATE TYPE "public"."InstallmentProvider" AS ENUM('INTERNAL', 'STRIPE', 'AFFIRM', 'KLARNA', 'CLEARPAY', 'PAYPAL');--> statement-breakpoint
CREATE TYPE "public"."InstructorSubstitutionStatus" AS ENUM('OPEN', 'OFFERED', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."IntroOfferRedemptionStatus" AS ENUM('ACTIVE', 'EXPIRED', 'CONVERTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."IntroOfferType" AS ENUM('TRIAL_CLASSES', 'UNLIMITED_TRIAL', 'DISCOUNTED_PACK', 'FREE_CLASS', 'FIRST_MONTH_DISCOUNT');--> statement-breakpoint
CREATE TYPE "public"."InvoiceStatus" AS ENUM('DRAFT', 'SENT', 'VIEWED', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."InvoiceType" AS ENUM('SENT', 'RECEIVED');--> statement-breakpoint
CREATE TYPE "public"."LifecycleStage" AS ENUM('SUBSCRIBER', 'LEAD', 'MQL', 'SQL', 'OPPORTUNITY', 'CUSTOMER', 'EVANGELIST');--> statement-breakpoint
CREATE TYPE "public"."LoyaltyRewardType" AS ENUM('FREE_CLASS', 'DISCOUNT_PERCENT', 'DISCOUNT_FIXED', 'MERCHANDISE', 'EXPERIENCE');--> statement-breakpoint
CREATE TYPE "public"."LoyaltyTier" AS ENUM('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');--> statement-breakpoint
CREATE TYPE "public"."LoyaltyTransactionType" AS ENUM('EARN_CLASS', 'EARN_PURCHASE', 'EARN_REFERRAL', 'EARN_CHALLENGE', 'EARN_BONUS', 'REDEEM', 'EXPIRE', 'ADJUST');--> statement-breakpoint
CREATE TYPE "public"."MarketplaceListingStatus" AS ENUM('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'PAUSED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."MembershipPlanType" AS ENUM('UNLIMITED', 'CLASS_PACK', 'DROP_IN', 'TIME_BASED', 'TIERED', 'INTRO_OFFER', 'TRIAL');--> statement-breakpoint
CREATE TYPE "public"."MessageDirection" AS ENUM('INBOUND', 'OUTBOUND');--> statement-breakpoint
CREATE TYPE "public"."ModuleType" AS ENUM('TIME_TRACKING', 'INVOICING', 'INVENTORY', 'BOOKING_CALENDAR', 'DOCUMENT_SIGNING', 'PROJECT_MANAGEMENT', 'PILATES_STUDIO', 'STUDIO_CORE');--> statement-breakpoint
CREATE TYPE "public"."NodeType" AS ENUM('INITIAL', 'MANUAL_TRIGGER', 'GOOGLE_FORM_TRIGGER', 'GOOGLE_CALENDAR_TRIGGER', 'GOOGLE_CALENDAR_EXECUTION', 'GMAIL_TRIGGER', 'GMAIL_EXECUTION', 'TELEGRAM_TRIGGER', 'TELEGRAM_EXECUTION', 'STRIPE_TRIGGER', 'HTTP_REQUEST', 'GEMINI', 'ANTHROPIC', 'OPENAI', 'DISCORD', 'SLACK', 'WAIT', 'CREATE_CONTACT', 'UPDATE_CONTACT', 'DELETE_CONTACT', 'CREATE_DEAL', 'UPDATE_DEAL', 'DELETE_DEAL', 'UPDATE_PIPELINE', 'CONTACT_CREATED_TRIGGER', 'CONTACT_UPDATED_TRIGGER', 'CONTACT_FIELD_CHANGED_TRIGGER', 'CONTACT_DELETED_TRIGGER', 'CONTACT_TYPE_CHANGED_TRIGGER', 'CONTACT_LIFECYCLE_STAGE_CHANGED_TRIGGER', 'IF_ELSE', 'SWITCH', 'LOOP', 'SET_VARIABLE', 'STOP_WORKFLOW', 'BUNDLE_WORKFLOW', 'OUTLOOK_TRIGGER', 'OUTLOOK_EXECUTION', 'ONEDRIVE_TRIGGER', 'ONEDRIVE_EXECUTION', 'GOOGLE_CALENDAR_EVENT_CREATED', 'GOOGLE_CALENDAR_EVENT_UPDATED', 'GOOGLE_CALENDAR_EVENT_DELETED', 'GOOGLE_DRIVE_FILE_CREATED', 'GOOGLE_DRIVE_FILE_UPDATED', 'GOOGLE_DRIVE_FILE_DELETED', 'GOOGLE_DRIVE_FOLDER_CREATED', 'GOOGLE_CALENDAR_CREATE_EVENT', 'GOOGLE_CALENDAR_UPDATE_EVENT', 'GOOGLE_CALENDAR_DELETE_EVENT', 'GOOGLE_CALENDAR_FIND_AVAILABLE_TIMES', 'GMAIL_SEND_EMAIL', 'GMAIL_REPLY_TO_EMAIL', 'GMAIL_SEARCH_EMAILS', 'GMAIL_ADD_LABEL', 'GOOGLE_DRIVE_UPLOAD_FILE', 'GOOGLE_DRIVE_DOWNLOAD_FILE', 'GOOGLE_DRIVE_MOVE_FILE', 'GOOGLE_DRIVE_DELETE_FILE', 'GOOGLE_DRIVE_CREATE_FOLDER', 'GOOGLE_FORM_READ_RESPONSES', 'GOOGLE_FORM_CREATE_RESPONSE', 'OUTLOOK_NEW_EMAIL', 'OUTLOOK_EMAIL_MOVED', 'OUTLOOK_EMAIL_DELETED', 'ONEDRIVE_FILE_CREATED', 'ONEDRIVE_FILE_UPDATED', 'ONEDRIVE_FILE_DELETED', 'OUTLOOK_CALENDAR_EVENT_CREATED', 'OUTLOOK_CALENDAR_EVENT_UPDATED', 'OUTLOOK_CALENDAR_EVENT_DELETED', 'OUTLOOK_SEND_EMAIL', 'OUTLOOK_REPLY_TO_EMAIL', 'OUTLOOK_MOVE_EMAIL', 'OUTLOOK_SEARCH_EMAILS', 'ONEDRIVE_UPLOAD_FILE', 'ONEDRIVE_DOWNLOAD_FILE', 'ONEDRIVE_MOVE_FILE', 'ONEDRIVE_DELETE_FILE', 'OUTLOOK_CALENDAR_CREATE_EVENT', 'OUTLOOK_CALENDAR_UPDATE_EVENT', 'OUTLOOK_CALENDAR_DELETE_EVENT', 'SLACK_NEW_MESSAGE', 'SLACK_MESSAGE_REACTION', 'SLACK_CHANNEL_JOINED', 'DISCORD_NEW_MESSAGE', 'DISCORD_NEW_REACTION', 'DISCORD_USER_JOINED', 'TELEGRAM_NEW_MESSAGE', 'TELEGRAM_COMMAND_RECEIVED', 'SLACK_SEND_MESSAGE', 'SLACK_UPDATE_MESSAGE', 'SLACK_SEND_DM', 'SLACK_UPLOAD_FILE', 'DISCORD_SEND_MESSAGE', 'DISCORD_EDIT_MESSAGE', 'DISCORD_SEND_EMBED', 'DISCORD_SEND_DM', 'TELEGRAM_SEND_MESSAGE', 'TELEGRAM_SEND_PHOTO', 'TELEGRAM_SEND_DOCUMENT', 'FIND_CONTACTS', 'ADD_TAG_TO_CONTACT', 'REMOVE_TAG_FROM_CONTACT', 'DEAL_CREATED_TRIGGER', 'DEAL_UPDATED_TRIGGER', 'DEAL_DELETED_TRIGGER', 'DEAL_STAGE_CHANGED_TRIGGER', 'MOVE_DEAL_STAGE', 'ADD_DEAL_NOTE', 'APPOINTMENT_CREATED_TRIGGER', 'APPOINTMENT_CANCELLED_TRIGGER', 'SCHEDULE_APPOINTMENT', 'UPDATE_APPOINTMENT', 'CANCEL_APPOINTMENT', 'STRIPE_PAYMENT_SUCCEEDED', 'STRIPE_PAYMENT_FAILED', 'STRIPE_SUBSCRIPTION_CREATED', 'STRIPE_SUBSCRIPTION_UPDATED', 'STRIPE_SUBSCRIPTION_CANCELLED', 'STRIPE_CREATE_CHECKOUT_SESSION', 'STRIPE_CREATE_INVOICE', 'STRIPE_SEND_INVOICE', 'STRIPE_REFUND_PAYMENT', 'GEMINI_GENERATE_TEXT', 'GEMINI_SUMMARISE', 'GEMINI_TRANSFORM', 'GEMINI_CLASSIFY', 'EXECUTE_WORKFLOW', 'BIRTHDAY_TRIGGER', 'CLASS_BOOKED_TRIGGER', 'CLASS_CANCELLED_TRIGGER', 'MEMBER_CHECKED_IN_TRIGGER', 'MEMBER_NO_SHOW_TRIGGER', 'MEMBERSHIP_CREATED_TRIGGER', 'MEMBERSHIP_EXPIRING_TRIGGER', 'MEMBERSHIP_CANCELLED_TRIGGER', 'WAITLIST_SPOT_OPENED_TRIGGER', 'INTRO_OFFER_REDEEMED_TRIGGER', 'SEND_CLASS_REMINDER', 'AWARD_LOYALTY_POINTS', 'CALCULATE_CHURN_SCORE', 'SEND_SMS', 'INTRO_OFFER_COMPLETED_TRIGGER', 'MEMBER_CLASS_COUNT_TRIGGER', 'CONTACT_TAG_ADDED_TRIGGER', 'CONTACT_TAG_REMOVED_TRIGGER', 'STUDIO_PAYMENT_SUCCEEDED_TRIGGER', 'STUDIO_PAYMENT_FAILED_TRIGGER');--> statement-breakpoint
CREATE TYPE "public"."OrganizationMemberRole" AS ENUM('owner', 'admin', 'manager', 'staff', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."PaymentMethod" AS ENUM('STRIPE', 'MANUAL', 'XERO', 'BANK_TRANSFER');--> statement-breakpoint
CREATE TYPE "public"."PayoutStatus" AS ENUM('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."PayrollRunStatus" AS ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."PerformanceMetricSource" AS ENUM('MANUAL', 'WEARABLE', 'IMPORT');--> statement-breakpoint
CREATE TYPE "public"."PixelProvider" AS ENUM('META_PIXEL', 'GOOGLE_ANALYTICS', 'TIKTOK_PIXEL', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."PricingAdjustmentType" AS ENUM('PERCENT', 'FIXED_AMOUNT');--> statement-breakpoint
CREATE TYPE "public"."RecurringFrequency" AS ENUM('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMIANNUALLY', 'ANNUALLY');--> statement-breakpoint
CREATE TYPE "public"."RecurringInvoiceStatus" AS ENUM('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."ReferralRewardType" AS ENUM('CREDIT', 'DISCOUNT', 'FREE_CLASS', 'CASH');--> statement-breakpoint
CREATE TYPE "public"."ReferralStatus" AS ENUM('PENDING', 'SIGNED_UP', 'CONVERTED', 'REWARDED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."RetentionAutomationType" AS ENUM('WELCOME_SEQUENCE', 'CLASS_REMINDER', 'NO_SHOW_FOLLOW_UP', 'MEMBERSHIP_EXPIRING', 'WIN_BACK', 'MILESTONE_CELEBRATION', 'ATTENDANCE_DROP', 'BIRTHDAY', 'REFERRAL_REQUEST', 'INTRO_OFFER_EXPIRING');--> statement-breakpoint
CREATE TYPE "public"."RotaStatus" AS ENUM('SCHEDULED', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');--> statement-breakpoint
CREATE TYPE "public"."ShiftSwapStatus" AS ENUM('PENDING', 'WORKER_ACCEPTED', 'WORKER_REJECTED', 'ADMIN_APPROVED', 'ADMIN_REJECTED', 'CANCELLED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."SmsProvider" AS ENUM('TWILIO', 'VONAGE', 'MESSAGEBIRD');--> statement-breakpoint
CREATE TYPE "public"."SmsStatus" AS ENUM('QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'FAILED', 'UNDELIVERED');--> statement-breakpoint
CREATE TYPE "public"."SpotType" AS ENUM('STANDARD', 'PREMIUM', 'INSTRUCTOR', 'BLOCKED', 'EQUIPMENT');--> statement-breakpoint
CREATE TYPE "public"."StudioBookingStatus" AS ENUM('BOOKED', 'ATTENDED', 'CANCELLED', 'NO_SHOW', 'LATE_CANCEL');--> statement-breakpoint
CREATE TYPE "public"."StudioCheckInMethod" AS ENUM('QR_CODE', 'NFC', 'KIOSK', 'GEO', 'MANUAL', 'PIN');--> statement-breakpoint
CREATE TYPE "public"."StudioMembershipStatus" AS ENUM('ACTIVE', 'INACTIVE', 'CANCELLED', 'EXPIRED', 'PAUSED');--> statement-breakpoint
CREATE TYPE "public"."StudioPaymentStatus" AS ENUM('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."StudioPaymentType" AS ENUM('MEMBERSHIP', 'CLASS_PACK', 'DROP_IN', 'GIFT_CARD', 'POS');--> statement-breakpoint
CREATE TYPE "public"."StudioType" AS ENUM('YOGA', 'PILATES', 'GYM', 'CROSSFIT', 'BARRE', 'DANCE', 'MARTIAL_ARTS', 'SPIN', 'SWIM', 'MULTI_DISCIPLINE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."SubaccountMemberRole" AS ENUM('AGENCY', 'ADMIN', 'MANAGER', 'STANDARD', 'LIMITED', 'VIEWER');--> statement-breakpoint
CREATE TYPE "public"."SubscriptionStatus" AS ENUM('ACTIVE', 'FROZEN', 'CANCELLED', 'EXPIRED', 'PAST_DUE', 'TRIALING');--> statement-breakpoint
CREATE TYPE "public"."TaskPriority" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT');--> statement-breakpoint
CREATE TYPE "public"."TaskStatus" AS ENUM('TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."TimeLogStatus" AS ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'INVOICED');--> statement-breakpoint
CREATE TYPE "public"."TimeOffType" AS ENUM('VACATION', 'SICK', 'PERSONAL', 'BEREAVEMENT', 'PARENTAL', 'UNPAID', 'COMPENSATORY', 'PUBLIC_HOLIDAY', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."UserStatus" AS ENUM('ONLINE', 'WORKING', 'DO_NOT_DISTURB', 'AWAY', 'OFFLINE');--> statement-breakpoint
CREATE TYPE "public"."WaitlistStatus" AS ENUM('WAITING', 'NOTIFIED', 'CONFIRMED', 'EXPIRED', 'CANCELLED_WAITLIST');--> statement-breakpoint
CREATE TYPE "public"."WebVitalMetric" AS ENUM('LCP', 'INP', 'CLS', 'FCP', 'TTFB', 'FID');--> statement-breakpoint
CREATE TYPE "public"."WebVitalRating" AS ENUM('GOOD', 'NEEDS_IMPROVEMENT', 'POOR');--> statement-breakpoint
CREATE TYPE "public"."WebhookProvider" AS ENUM('SLACK', 'DISCORD', 'STRIPE', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."WidgetType" AS ENUM('SCHEDULE', 'BOOKING', 'MEMBERSHIP', 'INSTRUCTORS');--> statement-breakpoint
CREATE TYPE "public"."WorkerDocumentStatus" AS ENUM('PENDING_UPLOAD', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."WorkerDocumentType" AS ENUM('PASSPORT', 'DRIVING_LICENCE', 'NATIONAL_ID', 'VISA', 'RIGHT_TO_WORK', 'BIRTH_CERTIFICATE', 'DBS_CERTIFICATE', 'DBS_UPDATE_SERVICE', 'PROOF_OF_ADDRESS', 'PROOF_OF_NI', 'QUALIFICATION', 'CERTIFICATION', 'TRAINING_CERTIFICATE', 'FIRST_AID_CERTIFICATE', 'FOOD_HYGIENE', 'MANUAL_HANDLING', 'SAFEGUARDING', 'CONTRACT', 'SIGNED_POLICY', 'REFERENCE', 'HEALTH_DECLARATION', 'FIT_NOTE', 'VACCINATION_RECORD', 'OCCUPATIONAL_HEALTH', 'PHOTO', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."WorkerPaymentMethod" AS ENUM('BANK_TRANSFER', 'CASH', 'CHEQUE', 'PAYPAL', 'STRIPE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."WorkerPaymentStatus" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED');--> statement-breakpoint
CREATE TABLE "Organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"createdAt" timestamp(3) NOT NULL,
	"metadata" text,
	"accentColor" text,
	"brandColor" text,
	"businessAddress" jsonb,
	"businessEmail" text,
	"businessPhone" text,
	"taxId" text,
	"website" text,
	"dunningDays" jsonb,
	"dunningEnabled" boolean DEFAULT true NOT NULL,
	"currency" text DEFAULT 'USD',
	"studioType" "StudioType"
);
--> statement-breakpoint
ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "_prisma_migrations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"finished_at" timestamp with time zone,
	"migration_name" varchar(255) NOT NULL,
	"logs" text,
	"rolled_back_at" timestamp with time zone,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applied_steps_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "StudioClass" (
	"id" text PRIMARY KEY NOT NULL,
	"subaccountId" text,
	"externalId" text,
	"name" text NOT NULL,
	"description" text,
	"instructorName" text,
	"location" text,
	"startTime" timestamp(3) NOT NULL,
	"endTime" timestamp(3) NOT NULL,
	"maxCapacity" integer,
	"bookedCount" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"organizationId" text NOT NULL,
	"bookingWindowHours" integer DEFAULT 168,
	"cancellationWindowHours" integer DEFAULT 12,
	"classTypeId" text,
	"color" text,
	"difficulty" "ClassDifficulty",
	"equipmentNeeded" text[] DEFAULT '{}',
	"instructorId" text,
	"isRecurring" boolean DEFAULT false NOT NULL,
	"isVirtual" boolean DEFAULT false NOT NULL,
	"minCapacity" integer,
	"recurrenceRule" text,
	"roomId" text,
	"roomName" text,
	"status" "ClassInstanceStatus" DEFAULT 'SCHEDULED' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "StudioClass" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "StudioMembership" (
	"id" text PRIMARY KEY NOT NULL,
	"contactId" text NOT NULL,
	"externalId" text,
	"name" text NOT NULL,
	"type" text,
	"status" "StudioMembershipStatus" DEFAULT 'ACTIVE' NOT NULL,
	"startDate" timestamp(3) NOT NULL,
	"endDate" timestamp(3),
	"renewalDate" timestamp(3),
	"totalClasses" integer,
	"usedClasses" integer DEFAULT 0,
	"price" double precision,
	"currency" text DEFAULT 'USD',
	"metadata" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"autoRenew" boolean DEFAULT true NOT NULL,
	"cancelReason" text,
	"cancelledAt" timestamp(3),
	"frozenAt" timestamp(3),
	"frozenUntil" timestamp(3),
	"organizationId" text,
	"planId" text,
	"stripeSubscriptionId" text,
	"subaccountId" text
);
--> statement-breakpoint
ALTER TABLE "StudioMembership" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Workflows" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"userId" text NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"isTemplate" boolean DEFAULT false NOT NULL,
	"description" text,
	"subaccountId" text,
	"bundleInputs" jsonb,
	"bundleOutputs" jsonb,
	"isBundle" boolean DEFAULT false NOT NULL,
	"organizationId" text
);
--> statement-breakpoint
ALTER TABLE "Workflows" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Node" (
	"id" text PRIMARY KEY NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"name" text NOT NULL,
	"type" "NodeType" NOT NULL,
	"position" jsonb NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"workflowId" text NOT NULL,
	"credentialId" text
);
--> statement-breakpoint
ALTER TABLE "Node" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Credential" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"value" text NOT NULL,
	"type" "CredentialType" NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"userId" text NOT NULL,
	"metadata" jsonb,
	"subaccountId" text
);
--> statement-breakpoint
ALTER TABLE "Credential" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Connection" (
	"id" text PRIMARY KEY NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"fromNodeId" text NOT NULL,
	"toNodeId" text NOT NULL,
	"fromOutput" text DEFAULT 'main' NOT NULL,
	"toInput" text DEFAULT 'main' NOT NULL,
	"workflowId" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Connection" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Execution" (
	"id" text PRIMARY KEY NOT NULL,
	"startedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"completedAt" timestamp(3),
	"status" "ExecutionStatus" DEFAULT 'RUNNING' NOT NULL,
	"inngestEventId" text NOT NULL,
	"output" jsonb,
	"workflowId" text NOT NULL,
	"error" text,
	"errorStack" text,
	"subaccountId" text
);
--> statement-breakpoint
ALTER TABLE "Execution" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "GoogleCalendarSubscription" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"workflowId" text NOT NULL,
	"nodeId" text NOT NULL,
	"calendarId" text NOT NULL,
	"calendarName" text,
	"listenFor" text[],
	"channelId" text NOT NULL,
	"resourceId" text NOT NULL,
	"webhookToken" text NOT NULL,
	"syncToken" text,
	"expiresAt" timestamp(3),
	"lastSyncedAt" timestamp(3),
	"timezone" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"variableName" text
);
--> statement-breakpoint
ALTER TABLE "GoogleCalendarSubscription" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "TelegramTriggerState" (
	"id" text PRIMARY KEY NOT NULL,
	"nodeId" text NOT NULL,
	"workflowId" text NOT NULL,
	"lastUpdateId" text,
	"lastTriggeredAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "TelegramTriggerState" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "GmailSubscription" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"emailAddress" text NOT NULL,
	"labelIds" text[],
	"topicName" text NOT NULL,
	"historyId" text,
	"expiresAt" timestamp(3),
	"lastSyncedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "GmailSubscription" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "GmailTriggerState" (
	"id" text PRIMARY KEY NOT NULL,
	"nodeId" text NOT NULL,
	"workflowId" text NOT NULL,
	"lastMessageId" text,
	"lastTriggeredAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "GmailTriggerState" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ClassType" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"color" text,
	"icon" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ClassType" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Room" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"capacity" integer,
	"description" text,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Room" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Webhook" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"provider" "WebhookProvider" NOT NULL,
	"url" text NOT NULL,
	"signingSecret" text,
	"description" text,
	"metadata" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"userId" text NOT NULL,
	"subaccountId" text
);
--> statement-breakpoint
ALTER TABLE "Webhook" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ClassCredit" (
	"id" text PRIMARY KEY NOT NULL,
	"membershipId" text NOT NULL,
	"contactId" text NOT NULL,
	"totalCredits" integer NOT NULL,
	"usedCredits" integer DEFAULT 0 NOT NULL,
	"expiresAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ClassCredit" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ClassWaitlist" (
	"id" text PRIMARY KEY NOT NULL,
	"classId" text NOT NULL,
	"contactId" text NOT NULL,
	"position" integer NOT NULL,
	"joinedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"notifiedAt" timestamp(3),
	"respondedAt" timestamp(3),
	"status" "WaitlistStatus" DEFAULT 'WAITING' NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ClassWaitlist" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "CheckIn" (
	"id" text PRIMARY KEY NOT NULL,
	"contactId" text NOT NULL,
	"classId" text NOT NULL,
	"method" "StudioCheckInMethod" DEFAULT 'MANUAL' NOT NULL,
	"checkedInAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"checkedInBy" text,
	"isLateArrival" boolean DEFAULT false NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "CheckIn" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "MembershipPlan" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" "MembershipPlanType" NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"billingInterval" "BillingInterval" DEFAULT 'MONTHLY' NOT NULL,
	"classCredits" integer,
	"durationDays" integer,
	"maxFreezeDays" integer,
	"allowedClassTypeIds" text[] DEFAULT '{}',
	"isIntroOffer" boolean DEFAULT false NOT NULL,
	"trialDays" integer,
	"cancellationNoticeDays" integer,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"isPublic" boolean DEFAULT true NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"platformFeePercent" numeric(5, 2) DEFAULT '0',
	"stripePriceId" text,
	"stripeProductId" text
);
--> statement-breakpoint
ALTER TABLE "MembershipPlan" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "StripeEvent" (
	"id" text PRIMARY KEY NOT NULL,
	"stripeEventId" text NOT NULL,
	"type" text NOT NULL,
	"organizationId" text,
	"subaccountId" text,
	"processedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "StripeEvent" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Apps" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" "AppProvider" NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"expiresAt" timestamp(3),
	"scopes" text[],
	"metadata" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"userId" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Apps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "AILog" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"intent" text,
	"userMessage" text NOT NULL,
	"status" "AILogStatus" DEFAULT 'RUNNING' NOT NULL,
	"error" text,
	"result" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"completedAt" timestamp(3),
	"userId" text NOT NULL,
	"organizationId" text,
	"subaccountId" text
);
--> statement-breakpoint
ALTER TABLE "AILog" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "OutlookSubscription" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"emailAddress" text NOT NULL,
	"subscriptionId" text,
	"expiresAt" timestamp(3),
	"lastSyncedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "OutlookSubscription" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "OutlookTriggerState" (
	"id" text PRIMARY KEY NOT NULL,
	"nodeId" text NOT NULL,
	"workflowId" text NOT NULL,
	"lastMessageId" text,
	"lastTriggeredAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "OutlookTriggerState" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "OneDriveSubscription" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"subscriptionId" text,
	"expiresAt" timestamp(3),
	"lastSyncedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "OneDriveSubscription" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "OneDriveTriggerState" (
	"id" text PRIMARY KEY NOT NULL,
	"nodeId" text NOT NULL,
	"workflowId" text NOT NULL,
	"lastDeltaLink" text,
	"lastTriggeredAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "OneDriveTriggerState" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "StudioPayment" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"contactId" text,
	"membershipId" text,
	"stripePaymentIntentId" text,
	"stripeCustomerId" text,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"status" "StudioPaymentStatus" DEFAULT 'PENDING' NOT NULL,
	"type" "StudioPaymentType" NOT NULL,
	"description" text,
	"metadata" jsonb,
	"promoCodeId" text,
	"discountAmount" numeric(10, 2),
	"deletedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "StudioPayment" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "PromoCode" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"code" text NOT NULL,
	"discountType" "DiscountType" DEFAULT 'PERCENT' NOT NULL,
	"discountValue" numeric(10, 2) NOT NULL,
	"maxRedemptions" integer,
	"redemptionCount" integer DEFAULT 0 NOT NULL,
	"applicablePlanIds" text[] DEFAULT '{}',
	"expiresAt" timestamp(3),
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "PromoCode" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "InstructorPayout" (
	"id" text PRIMARY KEY NOT NULL,
	"workerId" text NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"stripeTransferId" text,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"status" "PayoutStatus" DEFAULT 'PENDING' NOT NULL,
	"periodStart" timestamp(3) NOT NULL,
	"periodEnd" timestamp(3) NOT NULL,
	"classesCount" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"paidAt" timestamp(3),
	"deletedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "InstructorPayout" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "GiftCard" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"code" text NOT NULL,
	"initialValue" numeric(10, 2) NOT NULL,
	"remainingBalance" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"purchasedByContactId" text,
	"redeemedByContactId" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"purchasedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"redeemedAt" timestamp(3),
	"expiresAt" timestamp(3),
	"notes" text,
	"stripePaymentIntentId" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "GiftCard" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ApiKey" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"keyHash" text NOT NULL,
	"keyPrefix" text NOT NULL,
	"scopes" text[] DEFAULT '{}',
	"lastUsedAt" timestamp(3),
	"expiresAt" timestamp(3),
	"isActive" boolean DEFAULT true NOT NULL,
	"createdBy" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ApiKey" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "WidgetConfig" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"type" "WidgetType" DEFAULT 'SCHEDULE' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "WidgetConfig" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ImportJob" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"source" "ImportSource" DEFAULT 'CSV' NOT NULL,
	"status" "ImportStatus" DEFAULT 'PENDING' NOT NULL,
	"totalRecords" integer DEFAULT 0 NOT NULL,
	"processedRecords" integer DEFAULT 0 NOT NULL,
	"failedRecords" integer DEFAULT 0 NOT NULL,
	"columnMapping" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rawFileUrl" text,
	"errorLog" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"importedBy" text NOT NULL,
	"startedAt" timestamp(3),
	"completedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ImportJob" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "DeviceToken" (
	"id" text PRIMARY KEY NOT NULL,
	"contactId" text NOT NULL,
	"organizationId" text NOT NULL,
	"token" text NOT NULL,
	"platform" "DevicePlatform" NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"lastUsedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "DeviceToken" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "MobileSession" (
	"id" text PRIMARY KEY NOT NULL,
	"contactId" text NOT NULL,
	"organizationId" text NOT NULL,
	"sessionToken" text NOT NULL,
	"expiresAt" timestamp(3) NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "MobileSession" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "InboxConversation" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"contactId" text,
	"channel" "ConversationChannel" NOT NULL,
	"status" "ConversationStatus" DEFAULT 'OPEN' NOT NULL,
	"subject" text,
	"isRead" boolean DEFAULT true NOT NULL,
	"lastMessageAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "InboxConversation" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "InboxMessage" (
	"id" text PRIMARY KEY NOT NULL,
	"conversationId" text NOT NULL,
	"direction" "MessageDirection" NOT NULL,
	"content" text NOT NULL,
	"isRead" boolean DEFAULT false NOT NULL,
	"senderUserId" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "InboxMessage" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ContactInstructor" (
	"id" text PRIMARY KEY NOT NULL,
	"contactId" text NOT NULL,
	"workerId" text NOT NULL,
	"assignedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ContactInstructor" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ExternalChannelIntegration" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"provider" "ExternalChannelProvider" NOT NULL,
	"status" "ExternalChannelStatus" DEFAULT 'DRAFT' NOT NULL,
	"accountName" text,
	"externalAccountId" text,
	"bookingUrl" text,
	"credentials" jsonb,
	"config" jsonb,
	"lastSyncedAt" timestamp(3),
	"enabledAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ExternalChannelIntegration" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ContactHousehold" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"name" text NOT NULL,
	"primaryContactId" text,
	"notes" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ContactHousehold" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ContactHouseholdMember" (
	"id" text PRIMARY KEY NOT NULL,
	"householdId" text NOT NULL,
	"contactId" text NOT NULL,
	"role" "HouseholdRole" DEFAULT 'MEMBER' NOT NULL,
	"relationship" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ContactHouseholdMember" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "InstructorSubstitutionRequest" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"classId" text NOT NULL,
	"originalInstructorId" text,
	"substituteId" text,
	"status" "InstructorSubstitutionStatus" DEFAULT 'OPEN' NOT NULL,
	"reason" text,
	"requestedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"acceptedAt" timestamp(3),
	"declinedAt" timestamp(3),
	"expiresAt" timestamp(3),
	"notes" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "InstructorSubstitutionRequest" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "DynamicPricingRule" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"name" text NOT NULL,
	"classTypeId" text,
	"daysOfWeek" integer[] DEFAULT '{}',
	"startsAt" timestamp(3),
	"endsAt" timestamp(3),
	"adjustmentType" "PricingAdjustmentType" NOT NULL,
	"adjustmentValue" numeric(10, 2) NOT NULL,
	"minPrice" numeric(10, 2),
	"maxPrice" numeric(10, 2),
	"demandThresholdPercent" integer,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "DynamicPricingRule" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "StudioPaymentPlan" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"membershipPlanId" text,
	"name" text NOT NULL,
	"provider" "InstallmentProvider" DEFAULT 'INTERNAL' NOT NULL,
	"depositAmount" numeric(10, 2),
	"installmentCount" integer NOT NULL,
	"interval" "InstallmentInterval" DEFAULT 'MONTHLY' NOT NULL,
	"feeAmount" numeric(10, 2),
	"feePercent" numeric(5, 2),
	"isActive" boolean DEFAULT true NOT NULL,
	"terms" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "StudioPaymentPlan" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "VideoOnDemandAsset" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"title" text NOT NULL,
	"description" text,
	"videoUrl" text NOT NULL,
	"thumbnailUrl" text,
	"durationSeconds" integer,
	"classTypeId" text,
	"instructorId" text,
	"accessLevel" "ContentAccessLevel" DEFAULT 'MEMBERS_ONLY' NOT NULL,
	"price" numeric(10, 2),
	"isPublished" boolean DEFAULT false NOT NULL,
	"publishedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "VideoOnDemandAsset" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "AccessControlIntegration" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"provider" "AccessControlProvider" NOT NULL,
	"locationName" text,
	"status" "ExternalChannelStatus" DEFAULT 'DRAFT' NOT NULL,
	"config" jsonb,
	"credentials" jsonb,
	"lastSyncedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "AccessControlIntegration" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "PerformanceMetric" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"contactId" text NOT NULL,
	"source" "PerformanceMetricSource" DEFAULT 'MANUAL' NOT NULL,
	"metricType" text NOT NULL,
	"value" numeric(12, 4) NOT NULL,
	"unit" text NOT NULL,
	"recordedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"notes" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "PerformanceMetric" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "WorkoutProgram" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"title" text NOT NULL,
	"description" text,
	"classTypeId" text,
	"coachId" text,
	"difficulty" "ClassDifficulty",
	"blocks" jsonb NOT NULL,
	"isPublished" boolean DEFAULT false NOT NULL,
	"publishedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "WorkoutProgram" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "SoapNote" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"contactId" text NOT NULL,
	"authorId" text,
	"subjective" text NOT NULL,
	"objective" text,
	"assessment" text,
	"plan" text,
	"privateNote" boolean DEFAULT true NOT NULL,
	"signedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "SoapNote" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "MarketplaceListing" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"categories" text[] DEFAULT '{}',
	"bookingUrl" text,
	"status" "MarketplaceListingStatus" DEFAULT 'DRAFT' NOT NULL,
	"publishedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "MarketplaceListing" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "AutomationEvent" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"workflowId" text,
	"executionId" text,
	"contactId" text,
	"type" "AutomationEventType" NOT NULL,
	"name" text NOT NULL,
	"entityType" text,
	"entityId" text,
	"sourceNodeType" "NodeType",
	"sourceNodeId" text,
	"value" numeric(12, 2),
	"metadata" jsonb,
	"deduplicationKey" text,
	"occurredAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "AutomationEvent" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "SmsConfig" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"provider" "SmsProvider" DEFAULT 'TWILIO' NOT NULL,
	"accountSid" text NOT NULL,
	"authToken" text NOT NULL,
	"fromNumber" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"monthlyLimit" integer DEFAULT 5000 NOT NULL,
	"sentThisMonth" integer DEFAULT 0 NOT NULL,
	"lastResetAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "SmsConfig" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "SmsMessage" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"contactId" text,
	"to" text NOT NULL,
	"from" text NOT NULL,
	"body" text NOT NULL,
	"direction" "MessageDirection" NOT NULL,
	"status" "SmsStatus" DEFAULT 'QUEUED' NOT NULL,
	"providerSid" text,
	"errorCode" text,
	"errorMessage" text,
	"sentAt" timestamp(3),
	"deliveredAt" timestamp(3),
	"automationId" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "SmsMessage" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "WaiverTemplate" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"name" text NOT NULL,
	"content" text NOT NULL,
	"isRequired" boolean DEFAULT true NOT NULL,
	"requiresMinor" boolean DEFAULT false NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "WaiverTemplate" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "WaiverSignature" (
	"id" text PRIMARY KEY NOT NULL,
	"templateId" text NOT NULL,
	"contactId" text NOT NULL,
	"signatureData" text NOT NULL,
	"signedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"ipAddress" text,
	"emergencyName" text,
	"emergencyPhone" text,
	"healthConditions" text,
	"agreedToTerms" boolean DEFAULT true NOT NULL,
	"minorName" text,
	"guardianName" text,
	"expiresAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "WaiverSignature" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "RoomLayout" (
	"id" text PRIMARY KEY NOT NULL,
	"roomId" text NOT NULL,
	"name" text NOT NULL,
	"rows" integer DEFAULT 5 NOT NULL,
	"columns" integer DEFAULT 5 NOT NULL,
	"layoutData" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "RoomLayout" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "CancellationCharge" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"contactId" text NOT NULL,
	"classId" text NOT NULL,
	"bookingId" text NOT NULL,
	"type" "CancellationChargeType" NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"creditsDeducted" integer DEFAULT 0 NOT NULL,
	"waived" boolean DEFAULT false NOT NULL,
	"waivedBy" text,
	"waivedReason" text,
	"stripeChargeId" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "CancellationCharge" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ClassReminderConfig" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"emailEnabled" boolean DEFAULT true NOT NULL,
	"smsEnabled" boolean DEFAULT false NOT NULL,
	"reminder24h" boolean DEFAULT true NOT NULL,
	"reminder1h" boolean DEFAULT true NOT NULL,
	"reminderCustom" integer,
	"messageTemplate" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ClassReminderConfig" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "RetentionAutomation" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"name" text NOT NULL,
	"type" "RetentionAutomationType" NOT NULL,
	"trigger" jsonb NOT NULL,
	"actions" jsonb NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"lastRunAt" timestamp(3),
	"runsCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "RetentionAutomation" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "BillingRule" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"name" text NOT NULL,
	"description" text,
	"billingModel" "BillingModel" NOT NULL,
	"config" jsonb NOT NULL,
	"autoGenerate" boolean DEFAULT false NOT NULL,
	"generateDay" integer,
	"defaultTerms" text,
	"defaultNotes" text,
	"defaultDueDays" integer DEFAULT 30 NOT NULL,
	"defaultTaxRate" numeric(5, 2),
	"isActive" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "BillingRule" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "IntroOffer" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"name" text NOT NULL,
	"description" text,
	"offerType" "IntroOfferType" NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"originalPrice" numeric(10, 2),
	"currency" text DEFAULT 'GBP' NOT NULL,
	"durationDays" integer DEFAULT 7 NOT NULL,
	"classCredits" integer,
	"allowedClassTypes" text[] DEFAULT '{}',
	"maxRedemptions" integer,
	"redemptionCount" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"displayOnWidget" boolean DEFAULT true NOT NULL,
	"followUpPlanId" text,
	"autoConvert" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "IntroOffer" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "IntroOfferRedemption" (
	"id" text PRIMARY KEY NOT NULL,
	"offerId" text NOT NULL,
	"contactId" text NOT NULL,
	"redeemedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"expiresAt" timestamp(3) NOT NULL,
	"classesUsed" integer DEFAULT 0 NOT NULL,
	"convertedAt" timestamp(3),
	"convertedToPlanId" text,
	"status" "IntroOfferRedemptionStatus" DEFAULT 'ACTIVE' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "IntroOfferRedemption" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ChurnRiskScore" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"contactId" text NOT NULL,
	"score" integer NOT NULL,
	"riskLevel" "ChurnRiskLevel" NOT NULL,
	"factors" jsonb NOT NULL,
	"suggestedActions" jsonb,
	"calculatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"expiresAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ChurnRiskScore" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ReferralProgram" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text DEFAULT 'Refer a Friend' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"referrerRewardType" "ReferralRewardType" DEFAULT 'CREDIT' NOT NULL,
	"referrerRewardValue" numeric(10, 2) NOT NULL,
	"refereeRewardType" "ReferralRewardType" DEFAULT 'DISCOUNT' NOT NULL,
	"refereeRewardValue" numeric(10, 2) NOT NULL,
	"refereeOfferDays" integer DEFAULT 30 NOT NULL,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"maxReferralsPerMember" integer,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ReferralProgram" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Referral" (
	"id" text PRIMARY KEY NOT NULL,
	"programId" text NOT NULL,
	"referrerContactId" text NOT NULL,
	"refereeContactId" text,
	"refereeEmail" text NOT NULL,
	"refereePhone" text,
	"code" text NOT NULL,
	"status" "ReferralStatus" DEFAULT 'PENDING' NOT NULL,
	"referrerRewarded" boolean DEFAULT false NOT NULL,
	"refereeRewarded" boolean DEFAULT false NOT NULL,
	"convertedAt" timestamp(3),
	"expiresAt" timestamp(3) NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Referral" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "LoyaltyProgram" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text DEFAULT 'Rewards' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"pointsPerClass" integer DEFAULT 10 NOT NULL,
	"pointsPerReferral" integer DEFAULT 50 NOT NULL,
	"pointsPerPurchase" integer DEFAULT 1 NOT NULL,
	"purchasePointsUnit" numeric(10, 2) DEFAULT '1.00' NOT NULL,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "LoyaltyProgram" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "LoyaltyBalance" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"contactId" text NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"lifetimePoints" integer DEFAULT 0 NOT NULL,
	"tier" "LoyaltyTier" DEFAULT 'BRONZE' NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "LoyaltyBalance" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "LoyaltyTransaction" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"contactId" text NOT NULL,
	"points" integer NOT NULL,
	"type" "LoyaltyTransactionType" NOT NULL,
	"description" text NOT NULL,
	"referenceId" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "LoyaltyTransaction" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "LoyaltyReward" (
	"id" text PRIMARY KEY NOT NULL,
	"programId" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"pointsCost" integer NOT NULL,
	"type" "LoyaltyRewardType" NOT NULL,
	"value" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"stock" integer,
	"imageUrl" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "LoyaltyReward" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Spot" (
	"id" text PRIMARY KEY NOT NULL,
	"layoutId" text NOT NULL,
	"label" text NOT NULL,
	"row" integer NOT NULL,
	"col" integer NOT NULL,
	"type" "SpotType" DEFAULT 'STANDARD' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"equipment" text,
	"metadata" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Spot" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "SpotBooking" (
	"id" text PRIMARY KEY NOT NULL,
	"spotId" text NOT NULL,
	"bookingId" text NOT NULL,
	"contactId" text NOT NULL,
	"classId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "SpotBooking" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "PaymentIntegration" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"provider" text NOT NULL,
	"credentials" jsonb NOT NULL,
	"config" jsonb,
	"isActive" boolean DEFAULT true NOT NULL,
	"lastSyncedAt" timestamp(3),
	"metadata" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "PaymentIntegration" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "CancellationPolicy" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"name" text NOT NULL,
	"lateCancelWindow" integer DEFAULT 12 NOT NULL,
	"noShowFeeAmount" numeric(10, 2) NOT NULL,
	"lateCancelFee" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"deductCredits" boolean DEFAULT true NOT NULL,
	"creditsDeducted" integer DEFAULT 1 NOT NULL,
	"chargeCard" boolean DEFAULT false NOT NULL,
	"sendNotification" boolean DEFAULT true NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "CancellationPolicy" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "SpotReservation" (
	"id" text PRIMARY KEY NOT NULL,
	"spotId" text NOT NULL,
	"layoutId" text NOT NULL,
	"guestName" text NOT NULL,
	"sessionId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "SpotReservation" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp(3) NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Verification" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Subaccount" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"companyName" text NOT NULL,
	"website" text,
	"billingEmail" text,
	"phone" text,
	"addressLine1" text,
	"addressLine2" text,
	"city" text,
	"state" text,
	"postalCode" text,
	"country" text,
	"timezone" text DEFAULT 'UTC',
	"createdByUserId" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"industry" text,
	"logo" text,
	"slug" text,
	"accentColor" text,
	"brandColor" text,
	"businessEmail" text,
	"businessPhone" text,
	"taxId" text,
	"dunningDays" jsonb,
	"dunningEnabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Subaccount" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "User" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"status" "UserStatus" DEFAULT 'ONLINE' NOT NULL,
	"statusMessage" text
);
--> statement-breakpoint
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp(3),
	"refreshTokenExpiresAt" timestamp(3),
	"scope" text,
	"password" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Activity" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"userId" text NOT NULL,
	"type" "ActivityType" NOT NULL,
	"action" "ActivityAction" NOT NULL,
	"entityType" text NOT NULL,
	"entityId" text NOT NULL,
	"entityName" text NOT NULL,
	"changes" jsonb,
	"metadata" jsonb,
	"ipAddress" text,
	"userAgent" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Activity" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "BankTransferSettings" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"bankName" text,
	"accountName" text,
	"accountNumber" text,
	"routingNumber" text,
	"iban" text,
	"swiftBic" text,
	"bankAddress" jsonb,
	"accountType" text,
	"currency" text DEFAULT 'GBP',
	"instructions" text,
	"referenceFormat" text,
	"autoReminders" boolean DEFAULT true NOT NULL,
	"reminderDays" jsonb,
	"metadata" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"sortCode" text,
	"transferType" text DEFAULT 'UK_DOMESTIC'
);
--> statement-breakpoint
ALTER TABLE "BankTransferSettings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ContactAssignee" (
	"id" text PRIMARY KEY NOT NULL,
	"contactId" text NOT NULL,
	"subaccountMemberId" text NOT NULL,
	"assignedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ContactAssignee" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "SubaccountMember" (
	"id" text PRIMARY KEY NOT NULL,
	"subaccountId" text NOT NULL,
	"userId" text NOT NULL,
	"role" "SubaccountMemberRole" DEFAULT 'STANDARD' NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "SubaccountMember" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Deal" (
	"id" text PRIMARY KEY NOT NULL,
	"subaccountId" text,
	"name" text NOT NULL,
	"value" numeric(12, 2),
	"currency" text DEFAULT 'USD',
	"deadline" timestamp(3),
	"source" text,
	"tags" text[] DEFAULT '{}',
	"description" text,
	"lastActivityAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"pipelineId" text,
	"pipelineStageId" text,
	"organizationId" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Deal" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Pipeline" (
	"id" text PRIMARY KEY NOT NULL,
	"subaccountId" text,
	"name" text NOT NULL,
	"description" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"organizationId" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Pipeline" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "PipelineStage" (
	"id" text PRIMARY KEY NOT NULL,
	"pipelineId" text NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	"probability" integer DEFAULT 0 NOT NULL,
	"rottingDays" integer,
	"color" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "PipelineStage" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "DealContact" (
	"id" text PRIMARY KEY NOT NULL,
	"dealId" text NOT NULL,
	"contactId" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "DealContact" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "DealMember" (
	"id" text PRIMARY KEY NOT NULL,
	"dealId" text NOT NULL,
	"subaccountMemberId" text NOT NULL,
	"assignedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "DealMember" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Form" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"name" text NOT NULL,
	"description" text,
	"status" "FormStatus" DEFAULT 'DRAFT' NOT NULL,
	"isMultiStep" boolean DEFAULT false NOT NULL,
	"showProgress" boolean DEFAULT true NOT NULL,
	"submitUrl" text,
	"successMessage" text DEFAULT 'Thank you for your submission!' NOT NULL,
	"redirectUrl" text,
	"workflowId" text,
	"stylePresetId" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"publishedAt" timestamp(3)
);
--> statement-breakpoint
ALTER TABLE "Form" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "GlobalStylePreset" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"name" text NOT NULL,
	"description" text,
	"primaryColor" text DEFAULT '#3b82f6' NOT NULL,
	"secondaryColor" text DEFAULT '#8b5cf6' NOT NULL,
	"accentColor" text DEFAULT '#f59e0b' NOT NULL,
	"backgroundColor" text DEFAULT '#ffffff' NOT NULL,
	"textColor" text DEFAULT '#1f2937' NOT NULL,
	"mutedColor" text DEFAULT '#6b7280' NOT NULL,
	"borderColor" text DEFAULT '#e5e7eb' NOT NULL,
	"fontFamily" text DEFAULT 'Inter, system-ui, sans-serif' NOT NULL,
	"headingFont" text DEFAULT 'Inter, system-ui, sans-serif' NOT NULL,
	"fontSize" jsonb DEFAULT '{"lg":18,"sm":14,"xl":20,"2xl":24,"3xl":30,"4xl":36,"base":16}'::jsonb NOT NULL,
	"fontWeight" jsonb DEFAULT '{"bold":700,"medium":500,"normal":400,"semibold":600}'::jsonb NOT NULL,
	"lineHeight" jsonb DEFAULT '{"tight":1.25,"normal":1.5,"relaxed":1.75}'::jsonb NOT NULL,
	"spacing" jsonb DEFAULT '{"lg":24,"md":16,"sm":8,"xl":32,"xs":4,"2xl":48,"3xl":64}'::jsonb NOT NULL,
	"borderRadius" jsonb DEFAULT '{"lg":12,"md":8,"sm":4,"xl":16,"full":9999,"none":0}'::jsonb NOT NULL,
	"buttonPresets" jsonb DEFAULT '{"outline":{"bg":"transparent","text":"#3b82f6","border":"2px solid #3b82f6","padding":"12px 24px","borderRadius":8},"primary":{"bg":"#3b82f6","text":"#ffffff","padding":"12px 24px","borderRadius":8},"secondary":{"bg":"#8b5cf6","text":"#ffffff","padding":"12px 24px","borderRadius":8}}'::jsonb NOT NULL,
	"shadows" jsonb DEFAULT '{"lg":"0 10px 15px rgba(0,0,0,0.1)","md":"0 4px 6px rgba(0,0,0,0.1)","sm":"0 1px 2px rgba(0,0,0,0.05)","xl":"0 20px 25px rgba(0,0,0,0.1)"}'::jsonb NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "GlobalStylePreset" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "FormStep" (
	"id" text PRIMARY KEY NOT NULL,
	"formId" text NOT NULL,
	"name" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"showConditions" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "FormStep" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "FormField" (
	"id" text PRIMARY KEY NOT NULL,
	"stepId" text NOT NULL,
	"type" "FormFieldType" NOT NULL,
	"label" text NOT NULL,
	"placeholder" text,
	"helpText" text,
	"required" boolean DEFAULT false NOT NULL,
	"validation" jsonb,
	"options" jsonb,
	"defaultValue" text,
	"showConditions" jsonb,
	"order" integer DEFAULT 0 NOT NULL,
	"styles" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "FormField" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "FormSubmission" (
	"id" text PRIMARY KEY NOT NULL,
	"formId" text NOT NULL,
	"data" jsonb NOT NULL,
	"contactId" text,
	"utmSource" text,
	"utmMedium" text,
	"utmCampaign" text,
	"utmTerm" text,
	"utmContent" text,
	"ipAddress" text,
	"userAgent" text,
	"referrer" text,
	"submittedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "FormSubmission" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "FunnelAnalytics" (
	"id" text PRIMARY KEY NOT NULL,
	"funnelId" text NOT NULL,
	"pageId" text,
	"pageViews" integer DEFAULT 0 NOT NULL,
	"uniqueVisitors" integer DEFAULT 0 NOT NULL,
	"leads" integer DEFAULT 0 NOT NULL,
	"conversions" integer DEFAULT 0 NOT NULL,
	"date" date NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "FunnelAnalytics" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "FunnelPage" (
	"id" text PRIMARY KEY NOT NULL,
	"funnelId" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"isPublished" boolean DEFAULT false NOT NULL,
	"metaTitle" text,
	"metaDescription" text,
	"metaImage" text,
	"customCss" text,
	"customJs" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "FunnelPage" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "FunnelBlock" (
	"id" text PRIMARY KEY NOT NULL,
	"pageId" text,
	"parentBlockId" text,
	"type" "FunnelBlockType" NOT NULL,
	"props" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"styles" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"locked" boolean DEFAULT false NOT NULL,
	"targetWorkflowId" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"smartSectionId" text,
	"smartSectionInstanceId" text
);
--> statement-breakpoint
ALTER TABLE "FunnelBlock" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "SmartSection" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"thumbnail" text,
	"blockStructure" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"usageCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "SmartSection" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "SmartSectionInstance" (
	"id" text PRIMARY KEY NOT NULL,
	"sectionId" text NOT NULL,
	"funnelPageId" text,
	"formId" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "SmartSectionInstance" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "FunnelBlockAnalytics" (
	"id" text PRIMARY KEY NOT NULL,
	"blockId" text NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"engagementTime" integer DEFAULT 0 NOT NULL,
	"date" date NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "FunnelBlockAnalytics" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "FunnelBlockEvent" (
	"id" text PRIMARY KEY NOT NULL,
	"blockId" text NOT NULL,
	"eventType" text NOT NULL,
	"eventName" text,
	"parameters" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "FunnelBlockEvent" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "FunnelBreakpoint" (
	"id" text PRIMARY KEY NOT NULL,
	"blockId" text NOT NULL,
	"device" "DeviceType" NOT NULL,
	"styles" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "FunnelBreakpoint" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "FunnelPixelIntegration" (
	"id" text PRIMARY KEY NOT NULL,
	"funnelId" text NOT NULL,
	"provider" "PixelProvider" NOT NULL,
	"pixelId" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "FunnelPixelIntegration" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text NOT NULL,
	"expiresAt" timestamp(3) NOT NULL,
	"inviterId" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Invitation" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "InvoiceTemplate" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"name" text NOT NULL,
	"description" text,
	"isDefault" boolean DEFAULT false NOT NULL,
	"isSystem" boolean DEFAULT false NOT NULL,
	"layout" jsonb NOT NULL,
	"styles" jsonb NOT NULL,
	"variables" jsonb,
	"thumbnailUrl" text,
	"metadata" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "InvoiceTemplate" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "InvoiceLineItem" (
	"id" text PRIMARY KEY NOT NULL,
	"invoiceId" text NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unitPrice" numeric(10, 2) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"timeLogId" text,
	"order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "InvoiceLineItem" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "InvoicePayment" (
	"id" text PRIMARY KEY NOT NULL,
	"invoiceId" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"method" "PaymentMethod" NOT NULL,
	"paidAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"stripePaymentId" text,
	"xeroPaymentId" text,
	"referenceNumber" text,
	"notes" text,
	"metadata" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "InvoicePayment" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "InvoiceReminder" (
	"id" text PRIMARY KEY NOT NULL,
	"invoiceId" text NOT NULL,
	"sentAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"sentTo" text NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"opened" boolean DEFAULT false NOT NULL,
	"openedAt" timestamp(3),
	"metadata" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"daysOverdue" integer,
	"isDunning" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "InvoiceReminder" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Member" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp(3) NOT NULL,
	"role" "OrganizationMemberRole" DEFAULT 'viewer' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Member" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Notification" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"organizationId" text,
	"subaccountId" text,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"data" jsonb,
	"entityType" text,
	"entityId" text,
	"actorId" text,
	"read" boolean DEFAULT false NOT NULL,
	"readAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "NotificationPreference" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"emailEnabled" boolean DEFAULT true NOT NULL,
	"emailDigest" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "NotificationPreference" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "QRCode" (
	"id" text PRIMARY KEY NOT NULL,
	"subaccountId" text,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"dealId" text,
	"location" jsonb,
	"enabled" boolean DEFAULT true NOT NULL,
	"expiresAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"organizationId" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "QRCode" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "RecurringInvoice" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"name" text NOT NULL,
	"description" text,
	"status" "RecurringInvoiceStatus" DEFAULT 'ACTIVE' NOT NULL,
	"contactId" text,
	"contactName" text NOT NULL,
	"contactEmail" text,
	"contactAddress" jsonb,
	"billingModel" "BillingModel" DEFAULT 'RETAINER' NOT NULL,
	"templateId" text,
	"frequency" "RecurringFrequency" NOT NULL,
	"interval" integer DEFAULT 1 NOT NULL,
	"startDate" timestamp(3) NOT NULL,
	"endDate" timestamp(3),
	"nextRunDate" timestamp(3) NOT NULL,
	"dayOfMonth" integer,
	"dayOfWeek" integer,
	"lineItems" jsonb NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	"taxRate" numeric(5, 2),
	"taxAmount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discountAmount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"dueDays" integer DEFAULT 30 NOT NULL,
	"notes" text,
	"termsConditions" text,
	"autoSend" boolean DEFAULT false NOT NULL,
	"sendReminders" boolean DEFAULT false NOT NULL,
	"lastRunDate" timestamp(3),
	"invoicesGenerated" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "RecurringInvoice" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "RecurringInvoiceGeneration" (
	"id" text PRIMARY KEY NOT NULL,
	"recurringInvoiceId" text NOT NULL,
	"invoiceId" text NOT NULL,
	"generatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"periodStart" timestamp(3) NOT NULL,
	"periodEnd" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "RecurringInvoiceGeneration" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Rota" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"workerId" text NOT NULL,
	"contactId" text,
	"companyName" text,
	"dealId" text,
	"startTime" timestamp(3) NOT NULL,
	"endTime" timestamp(3) NOT NULL,
	"title" text,
	"description" text,
	"location" text,
	"status" "RotaStatus" DEFAULT 'SCHEDULED' NOT NULL,
	"hourlyRate" numeric(10, 2),
	"currency" text DEFAULT 'GBP',
	"billable" boolean DEFAULT true NOT NULL,
	"notes" text,
	"customFields" jsonb,
	"isRecurring" boolean DEFAULT false NOT NULL,
	"recurrenceRule" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"magicLinkSentAt" timestamp(3),
	"color" text DEFAULT 'blue',
	"actualEndTime" timestamp(3),
	"actualHours" numeric(10, 2),
	"actualStartTime" timestamp(3),
	"actualValue" numeric(10, 2),
	"scheduledHours" numeric(10, 2),
	"scheduledValue" numeric(10, 2)
);
--> statement-breakpoint
ALTER TABLE "Rota" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp(3) NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	"activeOrganizationId" text,
	"activeSubaccountId" text,
	"isOnline" boolean DEFAULT true NOT NULL,
	"lastActivityAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "StripeConnection" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"stripeAccountId" text NOT NULL,
	"accountType" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"chargesEnabled" boolean DEFAULT false NOT NULL,
	"payoutsEnabled" boolean DEFAULT false NOT NULL,
	"detailsSubmitted" boolean DEFAULT false NOT NULL,
	"email" text,
	"businessName" text,
	"country" text,
	"currency" text,
	"applicationFeePercent" numeric(5, 2),
	"applicationFeeFixed" numeric(10, 2),
	"metadata" jsonb,
	"lastSyncedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "StripeConnection" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "StudioBooking" (
	"id" text PRIMARY KEY NOT NULL,
	"classId" text NOT NULL,
	"contactId" text NOT NULL,
	"externalId" text,
	"status" "StudioBookingStatus" DEFAULT 'BOOKED' NOT NULL,
	"bookedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"checkedInAt" timestamp(3),
	"cancelledAt" timestamp(3),
	"notes" text,
	"cancellationReason" text,
	"metadata" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "StudioBooking" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "SubaccountModule" (
	"id" text PRIMARY KEY NOT NULL,
	"subaccountId" text,
	"moduleType" "ModuleType" NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"config" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"organizationId" text
);
--> statement-breakpoint
ALTER TABLE "SubaccountModule" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "UserPresence" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"organizationId" text,
	"subaccountId" text,
	"status" text DEFAULT 'offline' NOT NULL,
	"lastSeenAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"lastActivityAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"userAgent" text,
	"ipAddress" text,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "UserPresence" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "WorkerDocument" (
	"id" text PRIMARY KEY NOT NULL,
	"workerId" text NOT NULL,
	"type" "WorkerDocumentType" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"fileUrl" text,
	"fileName" text,
	"fileSize" integer,
	"mimeType" text,
	"documentNumber" text,
	"issueDate" timestamp(3),
	"expiryDate" timestamp(3),
	"issuingAuthority" text,
	"status" "WorkerDocumentStatus" DEFAULT 'PENDING_UPLOAD' NOT NULL,
	"reviewedAt" timestamp(3),
	"reviewedBy" text,
	"rejectionReason" text,
	"expiryNotificationSent" boolean DEFAULT false NOT NULL,
	"expiryNotificationDate" timestamp(3),
	"metadata" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "WorkerDocument" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "TimeLog" (
	"id" text PRIMARY KEY NOT NULL,
	"subaccountId" text,
	"contactId" text,
	"dealId" text,
	"startTime" timestamp(3) NOT NULL,
	"endTime" timestamp(3),
	"duration" integer,
	"breakDuration" integer,
	"checkInMethod" "CheckInMethod" DEFAULT 'MANUAL' NOT NULL,
	"checkInLocation" jsonb,
	"checkOutLocation" jsonb,
	"qrCodeId" text,
	"title" text,
	"description" text,
	"status" "TimeLogStatus" DEFAULT 'DRAFT' NOT NULL,
	"billable" boolean DEFAULT true NOT NULL,
	"hourlyRate" numeric(10, 2),
	"totalAmount" numeric(12, 2),
	"currency" text DEFAULT 'USD',
	"submittedAt" timestamp(3),
	"submittedBy" text,
	"approvedAt" timestamp(3),
	"approvedBy" text,
	"rejectedAt" timestamp(3),
	"rejectedBy" text,
	"rejectionReason" text,
	"invoiceId" text,
	"customFields" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"workerId" text,
	"organizationId" text NOT NULL,
	"descriptionMode" text DEFAULT 'single',
	"sections" jsonb,
	"complianceFlags" jsonb,
	"isOvertime" boolean DEFAULT false,
	"overtimeHours" numeric(6, 2)
);
--> statement-breakpoint
ALTER TABLE "TimeLog" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ShiftSwapRequest" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"rotaId" text NOT NULL,
	"requesterId" text NOT NULL,
	"targetWorkerId" text,
	"status" "ShiftSwapStatus" DEFAULT 'PENDING' NOT NULL,
	"reason" text,
	"requestedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"respondedAt" timestamp(3),
	"respondedBy" text,
	"adminApprovedAt" timestamp(3),
	"adminApprovedBy" text,
	"adminRejectedAt" timestamp(3),
	"adminRejectedBy" text,
	"rejectionReason" text,
	"expiresAt" timestamp(3),
	"notificationsSent" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ShiftSwapRequest" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "WorkerAvailability" (
	"id" text PRIMARY KEY NOT NULL,
	"workerId" text NOT NULL,
	"organizationId" text NOT NULL,
	"dayOfWeek" integer NOT NULL,
	"startTime" text NOT NULL,
	"endTime" text NOT NULL,
	"isRecurring" boolean DEFAULT true NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"effectiveFrom" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"effectiveTo" timestamp(3),
	"notes" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "WorkerAvailability" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "TimeOffRequest" (
	"id" text PRIMARY KEY NOT NULL,
	"workerId" text NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"type" "TimeOffType" DEFAULT 'VACATION' NOT NULL,
	"startDate" timestamp(3) NOT NULL,
	"endDate" timestamp(3) NOT NULL,
	"startHalfDay" boolean DEFAULT false NOT NULL,
	"endHalfDay" boolean DEFAULT false NOT NULL,
	"totalDays" numeric(4, 1) NOT NULL,
	"reason" text,
	"status" "ApprovalStatus" DEFAULT 'PENDING' NOT NULL,
	"requestedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"approvedAt" timestamp(3),
	"approvedBy" text,
	"rejectedAt" timestamp(3),
	"rejectedBy" text,
	"rejectionReason" text,
	"cancelledAt" timestamp(3),
	"cancelledBy" text,
	"cancellationReason" text,
	"notes" text,
	"attachments" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "TimeOffRequest" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "OvertimeTracking" (
	"id" text PRIMARY KEY NOT NULL,
	"workerId" text NOT NULL,
	"organizationId" text NOT NULL,
	"weekStartDate" timestamp(3) NOT NULL,
	"weekEndDate" timestamp(3) NOT NULL,
	"regularHours" numeric(6, 2) NOT NULL,
	"overtimeHours" numeric(6, 2) NOT NULL,
	"totalHours" numeric(6, 2) NOT NULL,
	"weeklyLimit" numeric(6, 2),
	"isOverLimit" boolean DEFAULT false NOT NULL,
	"complianceFlags" jsonb,
	"calculatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "OvertimeTracking" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Invoice" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"invoiceNumber" text NOT NULL,
	"contactId" text,
	"contactName" text NOT NULL,
	"contactEmail" text,
	"contactAddress" jsonb,
	"title" text,
	"status" "InvoiceStatus" DEFAULT 'DRAFT' NOT NULL,
	"billingModel" "BillingModel" DEFAULT 'CUSTOM' NOT NULL,
	"issueDate" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"dueDate" timestamp(3) NOT NULL,
	"paidAt" timestamp(3),
	"subtotal" numeric(12, 2) NOT NULL,
	"taxRate" numeric(5, 2),
	"taxAmount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discountAmount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"amountPaid" numeric(12, 2) DEFAULT '0' NOT NULL,
	"amountDue" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"notes" text,
	"internalNotes" text,
	"termsConditions" text,
	"stripeInvoiceId" text,
	"stripePaymentIntentId" text,
	"xeroInvoiceId" text,
	"lastReminderSentAt" timestamp(3),
	"reminderCount" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"templateId" text,
	"bankTransferNotes" text,
	"bankTransferProof" text,
	"bankTransferStatus" "BankTransferStatus",
	"bankTransferVerifiedAt" timestamp(3),
	"bankTransferVerifiedBy" text,
	"paymentMethods" "PaymentMethod"[] DEFAULT '{}',
	"type" "InvoiceType" DEFAULT 'SENT' NOT NULL,
	"documentUrl" text,
	"documentName" text
);
--> statement-breakpoint
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "PayrollRun" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"periodStart" timestamp(3) NOT NULL,
	"periodEnd" timestamp(3) NOT NULL,
	"paymentDate" timestamp(3) NOT NULL,
	"status" "PayrollRunStatus" DEFAULT 'DRAFT' NOT NULL,
	"totalGrossPay" numeric(12, 2) NOT NULL,
	"totalDeductions" numeric(12, 2) DEFAULT '0' NOT NULL,
	"totalNetPay" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"notes" text,
	"approvedBy" text,
	"approvedAt" timestamp(3),
	"processedBy" text,
	"processedAt" timestamp(3),
	"completedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"createdBy" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "PayrollRun" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "WorkerPayment" (
	"id" text PRIMARY KEY NOT NULL,
	"workerId" text NOT NULL,
	"payrollRunId" text,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"periodStart" timestamp(3) NOT NULL,
	"periodEnd" timestamp(3) NOT NULL,
	"paymentDate" timestamp(3) NOT NULL,
	"grossAmount" numeric(12, 2) NOT NULL,
	"deductions" numeric(12, 2) DEFAULT '0' NOT NULL,
	"netAmount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"paymentMethod" "WorkerPaymentMethod" DEFAULT 'BANK_TRANSFER' NOT NULL,
	"paymentStatus" "WorkerPaymentStatus" DEFAULT 'PENDING' NOT NULL,
	"paymentReference" text,
	"bankAccountName" text,
	"bankAccountNumber" text,
	"bankSortCode" text,
	"notes" text,
	"paidBy" text,
	"paidAt" timestamp(3),
	"failureReason" text,
	"metadata" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "WorkerPayment" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "PayrollRunWorker" (
	"id" text PRIMARY KEY NOT NULL,
	"payrollRunId" text NOT NULL,
	"workerId" text NOT NULL,
	"regularHours" numeric(8, 2) NOT NULL,
	"overtimeHours" numeric(8, 2) DEFAULT '0' NOT NULL,
	"regularPay" numeric(12, 2) NOT NULL,
	"overtimePay" numeric(12, 2) DEFAULT '0' NOT NULL,
	"bonuses" numeric(12, 2) DEFAULT '0' NOT NULL,
	"deductions" numeric(12, 2) DEFAULT '0' NOT NULL,
	"grossPay" numeric(12, 2) NOT NULL,
	"netPay" numeric(12, 2) NOT NULL,
	"notes" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"housingAllowance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"incomeTax" numeric(12, 2) DEFAULT '0' NOT NULL,
	"mealAllowance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"nationalInsurance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"otherAllowances" numeric(12, 2) DEFAULT '0' NOT NULL,
	"otherDeductions" numeric(12, 2) DEFAULT '0' NOT NULL,
	"payslipSentAt" timestamp(3),
	"payslipUrl" text,
	"pensionContribution" numeric(12, 2) DEFAULT '0' NOT NULL,
	"studentLoan" numeric(12, 2) DEFAULT '0' NOT NULL,
	"transportAllowance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"ytdGrossPay" numeric(12, 2),
	"ytdNI" numeric(12, 2),
	"ytdNetPay" numeric(12, 2),
	"ytdTax" numeric(12, 2)
);
--> statement-breakpoint
ALTER TABLE "PayrollRunWorker" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Worker" (
	"id" text PRIMARY KEY NOT NULL,
	"subaccountId" text,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"employeeId" text,
	"portalToken" text,
	"portalTokenExpiry" timestamp(3),
	"lastLoginAt" timestamp(3),
	"hourlyRate" numeric(10, 2),
	"currency" text DEFAULT 'GBP',
	"role" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"customFields" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"organizationId" text NOT NULL,
	"addressLine1" text,
	"addressLine2" text,
	"bankAccountName" text,
	"bankAccountNumber" text,
	"bankSortCode" text,
	"city" text,
	"country" text DEFAULT 'United Kingdom',
	"county" text,
	"dateOfBirth" timestamp(3),
	"emergencyContactEmail" text,
	"emergencyContactName" text,
	"emergencyContactPhone" text,
	"emergencyContactRelation" text,
	"firstName" text,
	"gender" text,
	"hasOwnTransport" boolean DEFAULT false NOT NULL,
	"languages" text[] DEFAULT '{}',
	"lastName" text,
	"maxHoursPerWeek" integer,
	"nationalInsuranceNumber" text,
	"onboardingCompleted" boolean DEFAULT false NOT NULL,
	"onboardingCompletedAt" timestamp(3),
	"postcode" text,
	"preferredShiftTypes" text[] DEFAULT '{}',
	"profilePhoto" text,
	"qualifications" text[] DEFAULT '{}',
	"sessionToken" text,
	"sessionTokenExpiry" timestamp(3),
	"skills" text[] DEFAULT '{}',
	"travelRadius" integer,
	"employerPensionRate" numeric(5, 2) DEFAULT '3',
	"housingAllowance" numeric(10, 2) DEFAULT '0' NOT NULL,
	"mealAllowance" numeric(10, 2) DEFAULT '0' NOT NULL,
	"otherAllowances" numeric(10, 2) DEFAULT '0' NOT NULL,
	"pensionContributionRate" numeric(5, 2) DEFAULT '5',
	"pensionSchemeEnrolled" boolean DEFAULT false NOT NULL,
	"studentLoanPlan" text,
	"taxCode" text DEFAULT '1257L',
	"transportAllowance" numeric(10, 2) DEFAULT '0' NOT NULL,
	"bio" text,
	"instructorCertifications" text[] DEFAULT '{}',
	"instructorClassTypes" text[] DEFAULT '{}',
	"instructorSpecialties" text[] DEFAULT '{}',
	"publicProfileSlug" text,
	"stripeAccountId" text,
	"stripeAccountStatus" text,
	"stripeOnboardingComplete" boolean DEFAULT false NOT NULL,
	"userId" text
);
--> statement-breakpoint
ALTER TABLE "Worker" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Funnel" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "FunnelStatus" DEFAULT 'DRAFT' NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"publishedAt" timestamp(3),
	"stylePresetId" text,
	"customDomain" text,
	"domainType" "FunnelDomainType" DEFAULT 'SUBDOMAIN' NOT NULL,
	"domainVerified" boolean DEFAULT false NOT NULL,
	"subdomain" text,
	"apiKey" text,
	"externalDomains" text[],
	"externalMetadata" jsonb,
	"externalUrl" text,
	"funnelType" "FunnelType" DEFAULT 'INTERNAL' NOT NULL,
	"isReadOnly" boolean DEFAULT false NOT NULL,
	"lastSyncedAt" timestamp(3),
	"trackingConfig" jsonb
);
--> statement-breakpoint
ALTER TABLE "Funnel" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "anonymous_user_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"displayName" text NOT NULL,
	"firstSeen" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"lastSeen" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"totalSessions" integer DEFAULT 0 NOT NULL,
	"totalEvents" integer DEFAULT 0 NOT NULL,
	"avgEngagementRate" double precision,
	"avgExperienceScore" double precision,
	"identifiedAt" timestamp(3),
	"identifiedUserId" text,
	"lifecycleStage" text,
	"tags" text[] DEFAULT '{}',
	"userProperties" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"consentGiven" boolean DEFAULT false NOT NULL,
	"consentTimestamp" timestamp(3),
	"consentVersion" text DEFAULT '1.0',
	"dataRetentionDays" integer DEFAULT 90 NOT NULL,
	"deletionRequestedAt" timestamp(3)
);
--> statement-breakpoint
ALTER TABLE "anonymous_user_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "FunnelWebVital" (
	"id" text PRIMARY KEY NOT NULL,
	"funnelId" text NOT NULL,
	"subaccountId" text,
	"sessionId" text NOT NULL,
	"anonymousId" text,
	"pageUrl" text NOT NULL,
	"pagePath" text NOT NULL,
	"pageTitle" text,
	"metric" "WebVitalMetric" NOT NULL,
	"value" double precision NOT NULL,
	"rating" "WebVitalRating" NOT NULL,
	"delta" double precision,
	"id_metric" text,
	"deviceType" text,
	"browserName" text,
	"browserVersion" text,
	"osName" text,
	"osVersion" text,
	"screenWidth" integer,
	"screenHeight" integer,
	"countryCode" text,
	"countryName" text,
	"region" text,
	"city" text,
	"timestamp" timestamp(3) NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "FunnelWebVital" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "FunnelEvent" (
	"id" text PRIMARY KEY NOT NULL,
	"eventId" text NOT NULL,
	"funnelId" text NOT NULL,
	"subaccountId" text,
	"eventName" text NOT NULL,
	"eventProperties" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sessionId" text NOT NULL,
	"userId" text,
	"anonymousId" text,
	"pageUrl" text,
	"pagePath" text,
	"pageTitle" text,
	"referrer" text,
	"utmSource" text,
	"utmMedium" text,
	"utmCampaign" text,
	"utmTerm" text,
	"utmContent" text,
	"userAgent" text,
	"deviceType" text,
	"browserName" text,
	"browserVersion" text,
	"osName" text,
	"osVersion" text,
	"screenWidth" integer,
	"screenHeight" integer,
	"ipAddress" text,
	"countryCode" text,
	"region" text,
	"city" text,
	"timezone" text,
	"isConversion" boolean DEFAULT false NOT NULL,
	"conversionType" text,
	"revenue" numeric(10, 2),
	"currency" text,
	"orderId" text,
	"timestamp" timestamp(3) NOT NULL,
	"serverTimestamp" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"countryName" text,
	"cls" double precision,
	"fcp" double precision,
	"inp" double precision,
	"lcp" double precision,
	"ttfb" double precision,
	"vitalRating" text,
	"funnelStage" text,
	"isMicroConversion" boolean DEFAULT false NOT NULL,
	"microConversionType" text,
	"microConversionValue" double precision,
	"eventCategory" text,
	"eventDescription" text,
	"eventColor" text,
	"ScCid" text,
	"dclid" text,
	"epik" text,
	"fbc" text,
	"fbclid" text,
	"fbp" text,
	"gbraid" text,
	"gclid" text,
	"li_fat_id" text,
	"msclkid" text,
	"rdt_cid" text,
	"ttclid" text,
	"ttp" text,
	"twclid" text,
	"wbraid" text,
	"abTestId" text,
	"abTestVariant" text,
	"customDimensions" jsonb,
	"engagementLevel" text,
	"engagementScore" double precision,
	"eventSource" text,
	"firstTouchTimestamp" timestamp(3),
	"firstTouchUtmCampaign" text,
	"firstTouchUtmContent" text,
	"firstTouchUtmMedium" text,
	"firstTouchUtmSource" text,
	"firstTouchUtmTerm" text,
	"lastTouchTimestamp" timestamp(3),
	"lastTouchUtmCampaign" text,
	"lastTouchUtmContent" text,
	"lastTouchUtmMedium" text,
	"lastTouchUtmSource" text,
	"lastTouchUtmTerm" text,
	"leadScore" double precision,
	"leadScoreGrade" text
);
--> statement-breakpoint
ALTER TABLE "FunnelEvent" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "FunnelSession" (
	"id" text PRIMARY KEY NOT NULL,
	"sessionId" text NOT NULL,
	"funnelId" text NOT NULL,
	"subaccountId" text,
	"userId" text,
	"anonymousId" text,
	"startedAt" timestamp(3) NOT NULL,
	"endedAt" timestamp(3),
	"durationSeconds" integer,
	"firstSource" text,
	"firstMedium" text,
	"firstCampaign" text,
	"firstReferrer" text,
	"firstPageUrl" text,
	"lastSource" text,
	"lastMedium" text,
	"lastCampaign" text,
	"lastPageUrl" text,
	"pageViews" integer DEFAULT 0 NOT NULL,
	"eventsCount" integer DEFAULT 0 NOT NULL,
	"converted" boolean DEFAULT false NOT NULL,
	"conversionValue" numeric(10, 2),
	"conversionType" text,
	"ipAddress" text,
	"userAgent" text,
	"deviceType" text,
	"countryCode" text,
	"city" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"profileId" text,
	"browserName" text,
	"browserVersion" text,
	"countryName" text,
	"osName" text,
	"osVersion" text,
	"region" text,
	"activeTimeSeconds" integer,
	"avgCls" double precision,
	"avgFcp" double precision,
	"avgInp" double precision,
	"avgLcp" double precision,
	"avgTtfb" double precision,
	"engagementRate" double precision,
	"experienceScore" integer,
	"idleTimeSeconds" integer,
	"abandonReason" text,
	"abandonedAt" timestamp(3),
	"checkoutCompletedAt" timestamp(3),
	"checkoutDuration" integer,
	"checkoutStartedAt" timestamp(3),
	"currentStage" text,
	"firstTouchSource" text,
	"isAbandoned" boolean DEFAULT false NOT NULL,
	"lastTouchSource" text,
	"linkedSessionId" text,
	"stageHistory" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"touchpoints" text[] DEFAULT '{}',
	"consentGiven" boolean DEFAULT false NOT NULL,
	"consentTimestamp" timestamp(3),
	"consentVersion" text DEFAULT '1.0',
	"conversionPlatform" text,
	"fbc" text,
	"fbp" text,
	"firstFbclid" text,
	"firstGclid" text,
	"firstLiFatId" text,
	"firstMsclkid" text,
	"firstTtclid" text,
	"firstTwclid" text,
	"lastFbclid" text,
	"lastGclid" text,
	"lastLiFatId" text,
	"lastMsclkid" text,
	"lastTtclid" text,
	"lastTwclid" text,
	"ttp" text,
	"gbraid" text,
	"wbraid" text,
	"latitude" double precision,
	"longitude" double precision
);
--> statement-breakpoint
ALTER TABLE "FunnelSession" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "AdSpend" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"funnelId" text,
	"platform" text NOT NULL,
	"campaignId" text,
	"campaignName" text,
	"adSetId" text,
	"adSetName" text,
	"adId" text,
	"adName" text,
	"date" date NOT NULL,
	"spend" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"impressions" integer,
	"clicks" integer,
	"conversions" integer,
	"revenue" numeric(10, 2),
	"cpc" numeric(10, 2),
	"cpm" numeric(10, 2),
	"ctr" numeric(5, 2),
	"conversionRate" numeric(5, 2),
	"roas" numeric(10, 2),
	"rawData" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "AdSpend" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "AdPlatformCredential" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"platform" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"apiKey" text,
	"apiSecret" text,
	"accountId" text,
	"pixelId" text,
	"developerId" text,
	"customerId" text,
	"expiresAt" timestamp(3),
	"isActive" boolean DEFAULT true NOT NULL,
	"lastSyncedAt" timestamp(3),
	"lastError" text,
	"scopes" text[] DEFAULT '{}',
	"metadata" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "AdPlatformCredential" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Contact" (
	"id" text PRIMARY KEY NOT NULL,
	"subaccountId" text,
	"logo" text,
	"name" text NOT NULL,
	"companyName" text,
	"email" text,
	"position" text,
	"phone" text,
	"country" text,
	"city" text,
	"score" integer DEFAULT 0,
	"type" "ContactType" DEFAULT 'LEAD' NOT NULL,
	"source" text,
	"website" text,
	"linkedin" text,
	"tags" text[] DEFAULT '{}',
	"lastInteractionAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"lifecycleStage" "LifecycleStage",
	"organizationId" text NOT NULL,
	"metadata" jsonb,
	"emailUnsubscribed" boolean DEFAULT false NOT NULL,
	"emailUnsubscribedAt" timestamp(3),
	"attendanceCount" integer DEFAULT 0 NOT NULL,
	"currentStreak" integer DEFAULT 0 NOT NULL,
	"emergencyContactName" text,
	"emergencyContactPhone" text,
	"fitnessGoals" text,
	"healthNotes" text,
	"waiverSignedAt" timestamp(3),
	"contraindications" text,
	"trustedMember" boolean DEFAULT false NOT NULL,
	"stripeCustomerId" text,
	"portalToken" text,
	"portalTokenExpiry" timestamp(3),
	"birthMonth" integer,
	"birthDay" integer,
	"acquisitionStage" "AcquisitionStage" DEFAULT 'INQUIRY' NOT NULL,
	"acquiredAt" timestamp(3),
	"trialStartedAt" timestamp(3)
);
--> statement-breakpoint
ALTER TABLE "Contact" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "EmailDomain" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"domain" text NOT NULL,
	"resendDomainId" text,
	"status" "EmailDomainStatus" DEFAULT 'PENDING' NOT NULL,
	"dnsRecords" jsonb,
	"defaultFromName" text,
	"defaultFromEmail" text,
	"defaultReplyTo" text,
	"verifiedAt" timestamp(3),
	"lastCheckedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "EmailDomain" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "EmailTemplate" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"name" text NOT NULL,
	"description" text,
	"type" "EmailTemplateType" DEFAULT 'MARKETING' NOT NULL,
	"content" jsonb NOT NULL,
	"design" jsonb,
	"isSystemTemplate" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "EmailTemplate" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "CampaignRecipient" (
	"id" text PRIMARY KEY NOT NULL,
	"campaignId" text NOT NULL,
	"contactId" text NOT NULL,
	"resendEmailId" text,
	"status" "CampaignRecipientStatus" DEFAULT 'PENDING' NOT NULL,
	"deliveredAt" timestamp(3),
	"openedAt" timestamp(3),
	"clickedAt" timestamp(3),
	"bouncedAt" timestamp(3),
	"complainedAt" timestamp(3),
	"unsubscribedAt" timestamp(3),
	"clickCount" integer DEFAULT 0 NOT NULL,
	"clickedLinks" jsonb,
	"openCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "CampaignRecipient" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "UnsubscribeToken" (
	"id" text PRIMARY KEY NOT NULL,
	"contactId" text NOT NULL,
	"campaignId" text,
	"token" text NOT NULL,
	"usedAt" timestamp(3),
	"expiresAt" timestamp(3) NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "UnsubscribeToken" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Campaign" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"name" text NOT NULL,
	"status" "CampaignStatus" DEFAULT 'DRAFT' NOT NULL,
	"templateId" text,
	"subject" text NOT NULL,
	"preheaderText" text,
	"content" jsonb NOT NULL,
	"emailDomainId" text,
	"fromName" text,
	"fromEmail" text,
	"replyTo" text,
	"segmentType" "CampaignSegmentType" DEFAULT 'ALL' NOT NULL,
	"segmentFilter" jsonb,
	"scheduledAt" timestamp(3),
	"sentAt" timestamp(3),
	"resendBroadcastId" text,
	"totalRecipients" integer DEFAULT 0 NOT NULL,
	"delivered" integer DEFAULT 0 NOT NULL,
	"opened" integer DEFAULT 0 NOT NULL,
	"clicked" integer DEFAULT 0 NOT NULL,
	"bounced" integer DEFAULT 0 NOT NULL,
	"complained" integer DEFAULT 0 NOT NULL,
	"unsubscribed" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"resendTemplateId" text
);
--> statement-breakpoint
ALTER TABLE "Campaign" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Booking" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"calBookingId" integer,
	"calBookingUid" text,
	"eventTypeId" text NOT NULL,
	"contactId" text,
	"dealId" text,
	"title" text NOT NULL,
	"description" text,
	"status" "BookingStatus" DEFAULT 'CONFIRMED' NOT NULL,
	"attendeeName" text NOT NULL,
	"attendeeEmail" text NOT NULL,
	"attendeePhone" text,
	"attendeeTimezone" text NOT NULL,
	"additionalNotes" text,
	"guests" text[] DEFAULT '{}',
	"startTime" timestamp(3) NOT NULL,
	"endTime" timestamp(3) NOT NULL,
	"duration" integer NOT NULL,
	"locationType" "BookingLocationType" NOT NULL,
	"locationValue" text,
	"paid" boolean DEFAULT false NOT NULL,
	"paymentId" text,
	"amount" numeric(10, 2),
	"currency" text,
	"cancelledAt" timestamp(3),
	"cancelledBy" text,
	"cancellationReason" text,
	"rescheduledFrom" text,
	"rescheduledTo" text,
	"customFieldsResponses" jsonb,
	"metadata" jsonb,
	"lastSyncedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Booking" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "CalComCredential" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"apiKey" text NOT NULL,
	"calUserId" integer,
	"calUsername" text,
	"calOrgId" integer,
	"calOrgSlug" text,
	"accessToken" text,
	"refreshToken" text,
	"expiresAt" timestamp(3),
	"isActive" boolean DEFAULT true NOT NULL,
	"lastSyncedAt" timestamp(3),
	"lastError" text,
	"metadata" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "CalComCredential" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "BookingEventType" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"calEventTypeId" integer,
	"calTeamId" integer,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"length" integer NOT NULL,
	"availableDurations" integer[] DEFAULT '{}',
	"minimumBookingNotice" integer,
	"slotInterval" integer,
	"beforeEventBuffer" integer,
	"afterEventBuffer" integer,
	"locationType" "BookingLocationType" DEFAULT 'CAL_VIDEO' NOT NULL,
	"locationValue" text,
	"scheduleId" text,
	"isTeamEvent" boolean DEFAULT false NOT NULL,
	"teamMembers" jsonb,
	"color" text,
	"customFields" jsonb,
	"requiresPayment" boolean DEFAULT false NOT NULL,
	"price" numeric(10, 2),
	"currency" text DEFAULT 'USD',
	"metadata" jsonb,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"lastSyncedAt" timestamp(3),
	"requiresConfirmation" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "BookingEventType" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "BookingAvailability" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"title" text,
	"startTime" timestamp(3) NOT NULL,
	"endTime" timestamp(3) NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "BookingAvailability" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "BookingHoliday" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"name" text NOT NULL,
	"startDate" timestamp(3) NOT NULL,
	"endDate" timestamp(3) NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "BookingHoliday" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "note" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"contactId" text,
	"dealId" text,
	"authorId" text,
	"content" text NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "note" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "note_mention" (
	"id" text PRIMARY KEY NOT NULL,
	"noteId" text NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "note_mention" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "task" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subaccountId" text,
	"title" text NOT NULL,
	"description" text,
	"status" "TaskStatus" DEFAULT 'TODO' NOT NULL,
	"priority" "TaskPriority" DEFAULT 'MEDIUM' NOT NULL,
	"dueDate" timestamp(3),
	"completedAt" timestamp(3),
	"contactId" text,
	"dealId" text,
	"createdById" text NOT NULL,
	"assigneeId" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "StudioClass" ADD CONSTRAINT "StudioClass_classTypeId_fkey" FOREIGN KEY ("classTypeId") REFERENCES "public"."ClassType"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioClass" ADD CONSTRAINT "StudioClass_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "public"."Worker"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioClass" ADD CONSTRAINT "StudioClass_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioClass" ADD CONSTRAINT "StudioClass_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioClass" ADD CONSTRAINT "StudioClass_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioMembership" ADD CONSTRAINT "StudioMembership_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioMembership" ADD CONSTRAINT "StudioMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioMembership" ADD CONSTRAINT "StudioMembership_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."MembershipPlan"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioMembership" ADD CONSTRAINT "StudioMembership_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Workflows" ADD CONSTRAINT "Workflows_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Workflows" ADD CONSTRAINT "Workflows_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Workflows" ADD CONSTRAINT "Workflows_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Node" ADD CONSTRAINT "Node_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "public"."Credential"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Node" ADD CONSTRAINT "Node_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "public"."Workflows"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_fromNodeId_fkey" FOREIGN KEY ("fromNodeId") REFERENCES "public"."Node"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_toNodeId_fkey" FOREIGN KEY ("toNodeId") REFERENCES "public"."Node"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "public"."Workflows"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "public"."Workflows"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "GoogleCalendarSubscription" ADD CONSTRAINT "GoogleCalendarSubscription_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "public"."Node"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "GoogleCalendarSubscription" ADD CONSTRAINT "GoogleCalendarSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "GoogleCalendarSubscription" ADD CONSTRAINT "GoogleCalendarSubscription_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "public"."Workflows"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "TelegramTriggerState" ADD CONSTRAINT "TelegramTriggerState_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "public"."Node"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "TelegramTriggerState" ADD CONSTRAINT "TelegramTriggerState_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "public"."Workflows"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "GmailSubscription" ADD CONSTRAINT "GmailSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "GmailTriggerState" ADD CONSTRAINT "GmailTriggerState_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "public"."Node"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "GmailTriggerState" ADD CONSTRAINT "GmailTriggerState_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "public"."Workflows"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClassType" ADD CONSTRAINT "ClassType_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClassType" ADD CONSTRAINT "ClassType_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Room" ADD CONSTRAINT "Room_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Room" ADD CONSTRAINT "Room_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClassCredit" ADD CONSTRAINT "ClassCredit_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClassCredit" ADD CONSTRAINT "ClassCredit_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "public"."StudioMembership"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClassWaitlist" ADD CONSTRAINT "ClassWaitlist_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."StudioClass"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClassWaitlist" ADD CONSTRAINT "ClassWaitlist_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."StudioClass"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "MembershipPlan" ADD CONSTRAINT "MembershipPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "MembershipPlan" ADD CONSTRAINT "MembershipPlan_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Apps" ADD CONSTRAINT "Apps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AILog" ADD CONSTRAINT "AILog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AILog" ADD CONSTRAINT "AILog_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AILog" ADD CONSTRAINT "AILog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "OutlookSubscription" ADD CONSTRAINT "OutlookSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "OutlookTriggerState" ADD CONSTRAINT "OutlookTriggerState_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "public"."Node"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "OutlookTriggerState" ADD CONSTRAINT "OutlookTriggerState_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "public"."Workflows"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "OneDriveSubscription" ADD CONSTRAINT "OneDriveSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "OneDriveTriggerState" ADD CONSTRAINT "OneDriveTriggerState_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "public"."Node"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "OneDriveTriggerState" ADD CONSTRAINT "OneDriveTriggerState_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "public"."Workflows"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioPayment" ADD CONSTRAINT "StudioPayment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioPayment" ADD CONSTRAINT "StudioPayment_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "public"."StudioMembership"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioPayment" ADD CONSTRAINT "StudioPayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioPayment" ADD CONSTRAINT "StudioPayment_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "public"."PromoCode"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioPayment" ADD CONSTRAINT "StudioPayment_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "InstructorPayout" ADD CONSTRAINT "InstructorPayout_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "InstructorPayout" ADD CONSTRAINT "InstructorPayout_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "InstructorPayout" ADD CONSTRAINT "InstructorPayout_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "public"."Worker"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_purchasedByContactId_fkey" FOREIGN KEY ("purchasedByContactId") REFERENCES "public"."Contact"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_redeemedByContactId_fkey" FOREIGN KEY ("redeemedByContactId") REFERENCES "public"."Contact"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WidgetConfig" ADD CONSTRAINT "WidgetConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "MobileSession" ADD CONSTRAINT "MobileSession_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "MobileSession" ADD CONSTRAINT "MobileSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "InboxConversation" ADD CONSTRAINT "InboxConversation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "InboxConversation" ADD CONSTRAINT "InboxConversation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "InboxConversation" ADD CONSTRAINT "InboxConversation_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "InboxMessage" ADD CONSTRAINT "InboxMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."InboxConversation"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ContactInstructor" ADD CONSTRAINT "ContactInstructor_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ContactInstructor" ADD CONSTRAINT "ContactInstructor_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "public"."Worker"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ExternalChannelIntegration" ADD CONSTRAINT "ExternalChannelIntegration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ExternalChannelIntegration" ADD CONSTRAINT "ExternalChannelIntegration_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ContactHousehold" ADD CONSTRAINT "ContactHousehold_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ContactHousehold" ADD CONSTRAINT "ContactHousehold_primaryContactId_fkey" FOREIGN KEY ("primaryContactId") REFERENCES "public"."Contact"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ContactHousehold" ADD CONSTRAINT "ContactHousehold_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ContactHouseholdMember" ADD CONSTRAINT "ContactHouseholdMember_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ContactHouseholdMember" ADD CONSTRAINT "ContactHouseholdMember_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "public"."ContactHousehold"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "InstructorSubstitutionRequest" ADD CONSTRAINT "InstructorSubstitutionRequest_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."StudioClass"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "InstructorSubstitutionRequest" ADD CONSTRAINT "InstructorSubstitutionRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "InstructorSubstitutionRequest" ADD CONSTRAINT "InstructorSubstitutionRequest_originalInstructorId_fkey" FOREIGN KEY ("originalInstructorId") REFERENCES "public"."Worker"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "InstructorSubstitutionRequest" ADD CONSTRAINT "InstructorSubstitutionRequest_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "InstructorSubstitutionRequest" ADD CONSTRAINT "InstructorSubstitutionRequest_substituteId_fkey" FOREIGN KEY ("substituteId") REFERENCES "public"."Worker"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "DynamicPricingRule" ADD CONSTRAINT "DynamicPricingRule_classTypeId_fkey" FOREIGN KEY ("classTypeId") REFERENCES "public"."ClassType"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "DynamicPricingRule" ADD CONSTRAINT "DynamicPricingRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "DynamicPricingRule" ADD CONSTRAINT "DynamicPricingRule_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioPaymentPlan" ADD CONSTRAINT "StudioPaymentPlan_membershipPlanId_fkey" FOREIGN KEY ("membershipPlanId") REFERENCES "public"."MembershipPlan"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioPaymentPlan" ADD CONSTRAINT "StudioPaymentPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioPaymentPlan" ADD CONSTRAINT "StudioPaymentPlan_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "VideoOnDemandAsset" ADD CONSTRAINT "VideoOnDemandAsset_classTypeId_fkey" FOREIGN KEY ("classTypeId") REFERENCES "public"."ClassType"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "VideoOnDemandAsset" ADD CONSTRAINT "VideoOnDemandAsset_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "public"."Worker"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "VideoOnDemandAsset" ADD CONSTRAINT "VideoOnDemandAsset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "VideoOnDemandAsset" ADD CONSTRAINT "VideoOnDemandAsset_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AccessControlIntegration" ADD CONSTRAINT "AccessControlIntegration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AccessControlIntegration" ADD CONSTRAINT "AccessControlIntegration_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "PerformanceMetric" ADD CONSTRAINT "PerformanceMetric_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "PerformanceMetric" ADD CONSTRAINT "PerformanceMetric_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "PerformanceMetric" ADD CONSTRAINT "PerformanceMetric_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WorkoutProgram" ADD CONSTRAINT "WorkoutProgram_classTypeId_fkey" FOREIGN KEY ("classTypeId") REFERENCES "public"."ClassType"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WorkoutProgram" ADD CONSTRAINT "WorkoutProgram_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "public"."Worker"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WorkoutProgram" ADD CONSTRAINT "WorkoutProgram_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WorkoutProgram" ADD CONSTRAINT "WorkoutProgram_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SoapNote" ADD CONSTRAINT "SoapNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."Worker"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SoapNote" ADD CONSTRAINT "SoapNote_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SoapNote" ADD CONSTRAINT "SoapNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SoapNote" ADD CONSTRAINT "SoapNote_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AutomationEvent" ADD CONSTRAINT "AutomationEvent_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AutomationEvent" ADD CONSTRAINT "AutomationEvent_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "public"."Execution"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AutomationEvent" ADD CONSTRAINT "AutomationEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AutomationEvent" ADD CONSTRAINT "AutomationEvent_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AutomationEvent" ADD CONSTRAINT "AutomationEvent_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "public"."Workflows"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SmsConfig" ADD CONSTRAINT "SmsConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SmsMessage" ADD CONSTRAINT "SmsMessage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SmsMessage" ADD CONSTRAINT "SmsMessage_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WaiverTemplate" ADD CONSTRAINT "WaiverTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WaiverTemplate" ADD CONSTRAINT "WaiverTemplate_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WaiverSignature" ADD CONSTRAINT "WaiverSignature_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."WaiverTemplate"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "RoomLayout" ADD CONSTRAINT "RoomLayout_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClassReminderConfig" ADD CONSTRAINT "ClassReminderConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClassReminderConfig" ADD CONSTRAINT "ClassReminderConfig_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "RetentionAutomation" ADD CONSTRAINT "RetentionAutomation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "RetentionAutomation" ADD CONSTRAINT "RetentionAutomation_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "IntroOffer" ADD CONSTRAINT "IntroOffer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "IntroOffer" ADD CONSTRAINT "IntroOffer_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "IntroOfferRedemption" ADD CONSTRAINT "IntroOfferRedemption_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "public"."IntroOffer"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ChurnRiskScore" ADD CONSTRAINT "ChurnRiskScore_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ReferralProgram" ADD CONSTRAINT "ReferralProgram_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_programId_fkey" FOREIGN KEY ("programId") REFERENCES "public"."ReferralProgram"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_refereeContactId_fkey" FOREIGN KEY ("refereeContactId") REFERENCES "public"."Contact"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerContactId_fkey" FOREIGN KEY ("referrerContactId") REFERENCES "public"."Contact"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "LoyaltyProgram" ADD CONSTRAINT "LoyaltyProgram_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "LoyaltyBalance" ADD CONSTRAINT "LoyaltyBalance_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "LoyaltyBalance" ADD CONSTRAINT "LoyaltyBalance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "LoyaltyReward" ADD CONSTRAINT "LoyaltyReward_programId_fkey" FOREIGN KEY ("programId") REFERENCES "public"."LoyaltyProgram"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Spot" ADD CONSTRAINT "Spot_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "public"."RoomLayout"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SpotBooking" ADD CONSTRAINT "SpotBooking_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."StudioBooking"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SpotBooking" ADD CONSTRAINT "SpotBooking_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "public"."Spot"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CancellationPolicy" ADD CONSTRAINT "CancellationPolicy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CancellationPolicy" ADD CONSTRAINT "CancellationPolicy_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SpotReservation" ADD CONSTRAINT "SpotReservation_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "public"."RoomLayout"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SpotReservation" ADD CONSTRAINT "SpotReservation_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "public"."Spot"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Subaccount" ADD CONSTRAINT "Subaccount_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Subaccount" ADD CONSTRAINT "Subaccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BankTransferSettings" ADD CONSTRAINT "BankTransferSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BankTransferSettings" ADD CONSTRAINT "BankTransferSettings_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ContactAssignee" ADD CONSTRAINT "ContactAssignee_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ContactAssignee" ADD CONSTRAINT "ContactAssignee_subaccountMemberId_fkey" FOREIGN KEY ("subaccountMemberId") REFERENCES "public"."SubaccountMember"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SubaccountMember" ADD CONSTRAINT "SubaccountMember_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SubaccountMember" ADD CONSTRAINT "SubaccountMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "public"."Pipeline"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_pipelineStageId_fkey" FOREIGN KEY ("pipelineStageId") REFERENCES "public"."PipelineStage"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Pipeline" ADD CONSTRAINT "Pipeline_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Pipeline" ADD CONSTRAINT "Pipeline_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "public"."Pipeline"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "DealContact" ADD CONSTRAINT "DealContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "DealContact" ADD CONSTRAINT "DealContact_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."Deal"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "DealMember" ADD CONSTRAINT "DealMember_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."Deal"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "DealMember" ADD CONSTRAINT "DealMember_subaccountMemberId_fkey" FOREIGN KEY ("subaccountMemberId") REFERENCES "public"."SubaccountMember"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Form" ADD CONSTRAINT "Form_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Form" ADD CONSTRAINT "Form_stylePresetId_fkey" FOREIGN KEY ("stylePresetId") REFERENCES "public"."GlobalStylePreset"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Form" ADD CONSTRAINT "Form_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Form" ADD CONSTRAINT "Form_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "public"."Workflows"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "GlobalStylePreset" ADD CONSTRAINT "GlobalStylePreset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "GlobalStylePreset" ADD CONSTRAINT "GlobalStylePreset_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "FormStep" ADD CONSTRAINT "FormStep_formId_fkey" FOREIGN KEY ("formId") REFERENCES "public"."Form"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "FormField" ADD CONSTRAINT "FormField_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "public"."FormStep"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "public"."Form"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "FunnelAnalytics" ADD CONSTRAINT "FunnelAnalytics_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "public"."Funnel"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "FunnelAnalytics" ADD CONSTRAINT "FunnelAnalytics_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "public"."FunnelPage"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "FunnelPage" ADD CONSTRAINT "FunnelPage_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "public"."Funnel"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "FunnelBlock" ADD CONSTRAINT "FunnelBlock_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "public"."FunnelPage"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "FunnelBlock" ADD CONSTRAINT "FunnelBlock_parentBlockId_fkey" FOREIGN KEY ("parentBlockId") REFERENCES "public"."FunnelBlock"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "FunnelBlock" ADD CONSTRAINT "FunnelBlock_smartSectionId_fkey" FOREIGN KEY ("smartSectionId") REFERENCES "public"."SmartSection"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "FunnelBlock" ADD CONSTRAINT "FunnelBlock_smartSectionInstanceId_fkey" FOREIGN KEY ("smartSectionInstanceId") REFERENCES "public"."SmartSectionInstance"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SmartSection" ADD CONSTRAINT "SmartSection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SmartSection" ADD CONSTRAINT "SmartSection_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SmartSectionInstance" ADD CONSTRAINT "SmartSectionInstance_formId_fkey" FOREIGN KEY ("formId") REFERENCES "public"."Form"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SmartSectionInstance" ADD CONSTRAINT "SmartSectionInstance_funnelPageId_fkey" FOREIGN KEY ("funnelPageId") REFERENCES "public"."FunnelPage"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SmartSectionInstance" ADD CONSTRAINT "SmartSectionInstance_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "public"."SmartSection"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "FunnelBlockAnalytics" ADD CONSTRAINT "FunnelBlockAnalytics_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "public"."FunnelBlock"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "FunnelBlockEvent" ADD CONSTRAINT "FunnelBlockEvent_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "public"."FunnelBlock"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "FunnelBreakpoint" ADD CONSTRAINT "FunnelBreakpoint_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "public"."FunnelBlock"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "FunnelPixelIntegration" ADD CONSTRAINT "FunnelPixelIntegration_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "public"."Funnel"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "InvoiceReminder" ADD CONSTRAINT "InvoiceReminder_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Member" ADD CONSTRAINT "Member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "QRCode" ADD CONSTRAINT "QRCode_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "QRCode" ADD CONSTRAINT "QRCode_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "RecurringInvoice" ADD CONSTRAINT "RecurringInvoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "RecurringInvoiceGeneration" ADD CONSTRAINT "RecurringInvoiceGeneration_recurringInvoiceId_fkey" FOREIGN KEY ("recurringInvoiceId") REFERENCES "public"."RecurringInvoice"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Rota" ADD CONSTRAINT "Rota_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Rota" ADD CONSTRAINT "Rota_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."Deal"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Rota" ADD CONSTRAINT "Rota_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Rota" ADD CONSTRAINT "Rota_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Rota" ADD CONSTRAINT "Rota_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "public"."Worker"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StripeConnection" ADD CONSTRAINT "StripeConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StripeConnection" ADD CONSTRAINT "StripeConnection_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioBooking" ADD CONSTRAINT "StudioBooking_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."StudioClass"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioBooking" ADD CONSTRAINT "StudioBooking_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SubaccountModule" ADD CONSTRAINT "SubaccountModule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SubaccountModule" ADD CONSTRAINT "SubaccountModule_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "UserPresence" ADD CONSTRAINT "UserPresence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WorkerDocument" ADD CONSTRAINT "WorkerDocument_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "public"."Worker"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."Deal"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "public"."Worker"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ShiftSwapRequest" ADD CONSTRAINT "ShiftSwapRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ShiftSwapRequest" ADD CONSTRAINT "ShiftSwapRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "public"."Worker"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ShiftSwapRequest" ADD CONSTRAINT "ShiftSwapRequest_rotaId_fkey" FOREIGN KEY ("rotaId") REFERENCES "public"."Rota"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ShiftSwapRequest" ADD CONSTRAINT "ShiftSwapRequest_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ShiftSwapRequest" ADD CONSTRAINT "ShiftSwapRequest_targetWorkerId_fkey" FOREIGN KEY ("targetWorkerId") REFERENCES "public"."Worker"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WorkerAvailability" ADD CONSTRAINT "WorkerAvailability_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WorkerAvailability" ADD CONSTRAINT "WorkerAvailability_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "public"."Worker"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "TimeOffRequest" ADD CONSTRAINT "TimeOffRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "TimeOffRequest" ADD CONSTRAINT "TimeOffRequest_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "TimeOffRequest" ADD CONSTRAINT "TimeOffRequest_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "public"."Worker"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "OvertimeTracking" ADD CONSTRAINT "OvertimeTracking_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "OvertimeTracking" ADD CONSTRAINT "OvertimeTracking_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "public"."Worker"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."InvoiceTemplate"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WorkerPayment" ADD CONSTRAINT "WorkerPayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WorkerPayment" ADD CONSTRAINT "WorkerPayment_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "public"."PayrollRun"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WorkerPayment" ADD CONSTRAINT "WorkerPayment_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WorkerPayment" ADD CONSTRAINT "WorkerPayment_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "public"."Worker"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "PayrollRunWorker" ADD CONSTRAINT "PayrollRunWorker_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "public"."PayrollRun"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "PayrollRunWorker" ADD CONSTRAINT "PayrollRunWorker_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "public"."Worker"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Funnel" ADD CONSTRAINT "Funnel_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Funnel" ADD CONSTRAINT "Funnel_stylePresetId_fkey" FOREIGN KEY ("stylePresetId") REFERENCES "public"."GlobalStylePreset"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Funnel" ADD CONSTRAINT "Funnel_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "FunnelWebVital" ADD CONSTRAINT "FunnelWebVital_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."FunnelSession"("sessionId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "FunnelEvent" ADD CONSTRAINT "FunnelEvent_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "public"."Funnel"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "FunnelEvent" ADD CONSTRAINT "FunnelEvent_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "FunnelSession" ADD CONSTRAINT "FunnelSession_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "public"."Funnel"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "FunnelSession" ADD CONSTRAINT "FunnelSession_linkedSessionId_fkey" FOREIGN KEY ("linkedSessionId") REFERENCES "public"."FunnelSession"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "FunnelSession" ADD CONSTRAINT "FunnelSession_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."anonymous_user_profiles"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "FunnelSession" ADD CONSTRAINT "FunnelSession_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AdSpend" ADD CONSTRAINT "AdSpend_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "public"."Funnel"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AdSpend" ADD CONSTRAINT "AdSpend_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AdSpend" ADD CONSTRAINT "AdSpend_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AdPlatformCredential" ADD CONSTRAINT "AdPlatformCredential_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AdPlatformCredential" ADD CONSTRAINT "AdPlatformCredential_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "EmailDomain" ADD CONSTRAINT "EmailDomain_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "EmailDomain" ADD CONSTRAINT "EmailDomain_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "UnsubscribeToken" ADD CONSTRAINT "UnsubscribeToken_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_emailDomainId_fkey" FOREIGN KEY ("emailDomainId") REFERENCES "public"."EmailDomain"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."EmailTemplate"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."Deal"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "public"."BookingEventType"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CalComCredential" ADD CONSTRAINT "CalComCredential_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CalComCredential" ADD CONSTRAINT "CalComCredential_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BookingEventType" ADD CONSTRAINT "BookingEventType_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BookingEventType" ADD CONSTRAINT "BookingEventType_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BookingAvailability" ADD CONSTRAINT "BookingAvailability_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BookingAvailability" ADD CONSTRAINT "BookingAvailability_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BookingHoliday" ADD CONSTRAINT "BookingHoliday_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BookingHoliday" ADD CONSTRAINT "BookingHoliday_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "note" ADD CONSTRAINT "note_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "note" ADD CONSTRAINT "note_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "note" ADD CONSTRAINT "note_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."Deal"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "note_mention" ADD CONSTRAINT "note_mention_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "public"."note"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "note_mention" ADD CONSTRAINT "note_mention_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."Deal"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "public"."Subaccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization" USING btree ("slug" text_ops);--> statement-breakpoint
CREATE INDEX "StudioClass_classTypeId_idx" ON "StudioClass" USING btree ("classTypeId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioClass_externalId_idx" ON "StudioClass" USING btree ("externalId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioClass_instructorId_idx" ON "StudioClass" USING btree ("instructorId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioClass_organizationId_idx" ON "StudioClass" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioClass_startTime_idx" ON "StudioClass" USING btree ("startTime" timestamp_ops);--> statement-breakpoint
CREATE INDEX "StudioClass_status_idx" ON "StudioClass" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "StudioClass_subaccountId_idx" ON "StudioClass" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioMembership_contactId_idx" ON "StudioMembership" USING btree ("contactId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioMembership_endDate_idx" ON "StudioMembership" USING btree ("endDate" timestamp_ops);--> statement-breakpoint
CREATE INDEX "StudioMembership_externalId_idx" ON "StudioMembership" USING btree ("externalId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioMembership_organizationId_idx" ON "StudioMembership" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioMembership_planId_idx" ON "StudioMembership" USING btree ("planId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioMembership_status_idx" ON "StudioMembership" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "StudioMembership_subaccountId_idx" ON "StudioMembership" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "Workflows_isBundle_idx" ON "Workflows" USING btree ("isBundle" bool_ops);--> statement-breakpoint
CREATE INDEX "Workflows_organizationId_idx" ON "Workflows" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "Workflows_subaccountId_idx" ON "Workflows" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "Credential_subaccountId_idx" ON "Credential" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "Connection_fromNodeId_toNodeId_fromOutput_toInput_key" ON "Connection" USING btree ("fromNodeId" text_ops,"toNodeId" text_ops,"fromOutput" text_ops,"toInput" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "Execution_inngestEventId_key" ON "Execution" USING btree ("inngestEventId" text_ops);--> statement-breakpoint
CREATE INDEX "Execution_subaccountId_idx" ON "Execution" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "GoogleCalendarSubscription_channelId_idx" ON "GoogleCalendarSubscription" USING btree ("channelId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "GoogleCalendarSubscription_nodeId_key" ON "GoogleCalendarSubscription" USING btree ("nodeId" text_ops);--> statement-breakpoint
CREATE INDEX "GoogleCalendarSubscription_workflowId_idx" ON "GoogleCalendarSubscription" USING btree ("workflowId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "TelegramTriggerState_nodeId_key" ON "TelegramTriggerState" USING btree ("nodeId" text_ops);--> statement-breakpoint
CREATE INDEX "TelegramTriggerState_workflowId_idx" ON "TelegramTriggerState" USING btree ("workflowId" text_ops);--> statement-breakpoint
CREATE INDEX "GmailSubscription_emailAddress_idx" ON "GmailSubscription" USING btree ("emailAddress" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "GmailSubscription_userId_key" ON "GmailSubscription" USING btree ("userId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "GmailTriggerState_nodeId_key" ON "GmailTriggerState" USING btree ("nodeId" text_ops);--> statement-breakpoint
CREATE INDEX "GmailTriggerState_workflowId_idx" ON "GmailTriggerState" USING btree ("workflowId" text_ops);--> statement-breakpoint
CREATE INDEX "ClassType_isActive_idx" ON "ClassType" USING btree ("isActive" bool_ops);--> statement-breakpoint
CREATE INDEX "ClassType_organizationId_idx" ON "ClassType" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ClassType_organizationId_slug_key" ON "ClassType" USING btree ("organizationId" text_ops,"slug" text_ops);--> statement-breakpoint
CREATE INDEX "ClassType_subaccountId_idx" ON "ClassType" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "Room_organizationId_idx" ON "Room" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "Room_subaccountId_idx" ON "Room" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "Webhook_subaccountId_idx" ON "Webhook" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "ClassCredit_contactId_idx" ON "ClassCredit" USING btree ("contactId" text_ops);--> statement-breakpoint
CREATE INDEX "ClassCredit_expiresAt_idx" ON "ClassCredit" USING btree ("expiresAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "ClassCredit_membershipId_idx" ON "ClassCredit" USING btree ("membershipId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ClassWaitlist_classId_contactId_key" ON "ClassWaitlist" USING btree ("classId" text_ops,"contactId" text_ops);--> statement-breakpoint
CREATE INDEX "ClassWaitlist_classId_idx" ON "ClassWaitlist" USING btree ("classId" text_ops);--> statement-breakpoint
CREATE INDEX "ClassWaitlist_contactId_idx" ON "ClassWaitlist" USING btree ("contactId" text_ops);--> statement-breakpoint
CREATE INDEX "ClassWaitlist_status_idx" ON "ClassWaitlist" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "CheckIn_checkedInAt_idx" ON "CheckIn" USING btree ("checkedInAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "CheckIn_classId_idx" ON "CheckIn" USING btree ("classId" text_ops);--> statement-breakpoint
CREATE INDEX "CheckIn_contactId_idx" ON "CheckIn" USING btree ("contactId" text_ops);--> statement-breakpoint
CREATE INDEX "CheckIn_organizationId_idx" ON "CheckIn" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "CheckIn_subaccountId_idx" ON "CheckIn" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "MembershipPlan_isActive_idx" ON "MembershipPlan" USING btree ("isActive" bool_ops);--> statement-breakpoint
CREATE INDEX "MembershipPlan_organizationId_idx" ON "MembershipPlan" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "MembershipPlan_subaccountId_idx" ON "MembershipPlan" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "MembershipPlan_type_idx" ON "MembershipPlan" USING btree ("type" enum_ops);--> statement-breakpoint
CREATE INDEX "StripeEvent_organizationId_idx" ON "StripeEvent" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "StripeEvent_stripeEventId_key" ON "StripeEvent" USING btree ("stripeEventId" text_ops);--> statement-breakpoint
CREATE INDEX "StripeEvent_subaccountId_idx" ON "StripeEvent" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "StripeEvent_type_idx" ON "StripeEvent" USING btree ("type" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "Apps_userId_provider_key" ON "Apps" USING btree ("userId" text_ops,"provider" text_ops);--> statement-breakpoint
CREATE INDEX "AILog_organizationId_idx" ON "AILog" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "AILog_subaccountId_idx" ON "AILog" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "AILog_userId_idx" ON "AILog" USING btree ("userId" text_ops);--> statement-breakpoint
CREATE INDEX "OutlookSubscription_emailAddress_idx" ON "OutlookSubscription" USING btree ("emailAddress" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "OutlookSubscription_userId_key" ON "OutlookSubscription" USING btree ("userId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "OutlookTriggerState_nodeId_key" ON "OutlookTriggerState" USING btree ("nodeId" text_ops);--> statement-breakpoint
CREATE INDEX "OutlookTriggerState_workflowId_idx" ON "OutlookTriggerState" USING btree ("workflowId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "OneDriveSubscription_userId_key" ON "OneDriveSubscription" USING btree ("userId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "OneDriveTriggerState_nodeId_key" ON "OneDriveTriggerState" USING btree ("nodeId" text_ops);--> statement-breakpoint
CREATE INDEX "OneDriveTriggerState_workflowId_idx" ON "OneDriveTriggerState" USING btree ("workflowId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioPayment_contactId_idx" ON "StudioPayment" USING btree ("contactId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioPayment_createdAt_idx" ON "StudioPayment" USING btree ("createdAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "StudioPayment_membershipId_idx" ON "StudioPayment" USING btree ("membershipId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioPayment_organizationId_idx" ON "StudioPayment" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioPayment_status_idx" ON "StudioPayment" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "StudioPayment_stripePaymentIntentId_key" ON "StudioPayment" USING btree ("stripePaymentIntentId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioPayment_subaccountId_idx" ON "StudioPayment" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioPayment_type_idx" ON "StudioPayment" USING btree ("type" enum_ops);--> statement-breakpoint
CREATE INDEX "PromoCode_isActive_idx" ON "PromoCode" USING btree ("isActive" bool_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "PromoCode_organizationId_code_key" ON "PromoCode" USING btree ("organizationId" text_ops,"code" text_ops);--> statement-breakpoint
CREATE INDEX "PromoCode_organizationId_idx" ON "PromoCode" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "PromoCode_subaccountId_idx" ON "PromoCode" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "InstructorPayout_organizationId_idx" ON "InstructorPayout" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "InstructorPayout_periodStart_idx" ON "InstructorPayout" USING btree ("periodStart" timestamp_ops);--> statement-breakpoint
CREATE INDEX "InstructorPayout_status_idx" ON "InstructorPayout" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "InstructorPayout_stripeTransferId_key" ON "InstructorPayout" USING btree ("stripeTransferId" text_ops);--> statement-breakpoint
CREATE INDEX "InstructorPayout_subaccountId_idx" ON "InstructorPayout" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "InstructorPayout_workerId_idx" ON "InstructorPayout" USING btree ("workerId" text_ops);--> statement-breakpoint
CREATE INDEX "GiftCard_isActive_idx" ON "GiftCard" USING btree ("isActive" bool_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "GiftCard_organizationId_code_key" ON "GiftCard" USING btree ("organizationId" text_ops,"code" text_ops);--> statement-breakpoint
CREATE INDEX "GiftCard_organizationId_idx" ON "GiftCard" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "GiftCard_purchasedByContactId_idx" ON "GiftCard" USING btree ("purchasedByContactId" text_ops);--> statement-breakpoint
CREATE INDEX "GiftCard_redeemedByContactId_idx" ON "GiftCard" USING btree ("redeemedByContactId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "GiftCard_stripePaymentIntentId_key" ON "GiftCard" USING btree ("stripePaymentIntentId" text_ops);--> statement-breakpoint
CREATE INDEX "GiftCard_subaccountId_idx" ON "GiftCard" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "ApiKey_isActive_idx" ON "ApiKey" USING btree ("isActive" bool_ops);--> statement-breakpoint
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey" USING btree ("keyHash" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey" USING btree ("keyHash" text_ops);--> statement-breakpoint
CREATE INDEX "ApiKey_organizationId_idx" ON "ApiKey" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "WidgetConfig_organizationId_idx" ON "WidgetConfig" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "WidgetConfig_type_idx" ON "WidgetConfig" USING btree ("type" enum_ops);--> statement-breakpoint
CREATE INDEX "ImportJob_organizationId_idx" ON "ImportJob" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "ImportJob_source_idx" ON "ImportJob" USING btree ("source" enum_ops);--> statement-breakpoint
CREATE INDEX "ImportJob_status_idx" ON "ImportJob" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "DeviceToken_contactId_idx" ON "DeviceToken" USING btree ("contactId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "DeviceToken_contactId_token_key" ON "DeviceToken" USING btree ("contactId" text_ops,"token" text_ops);--> statement-breakpoint
CREATE INDEX "DeviceToken_organizationId_idx" ON "DeviceToken" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "DeviceToken_token_idx" ON "DeviceToken" USING btree ("token" text_ops);--> statement-breakpoint
CREATE INDEX "MobileSession_contactId_idx" ON "MobileSession" USING btree ("contactId" text_ops);--> statement-breakpoint
CREATE INDEX "MobileSession_sessionToken_idx" ON "MobileSession" USING btree ("sessionToken" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "MobileSession_sessionToken_key" ON "MobileSession" USING btree ("sessionToken" text_ops);--> statement-breakpoint
CREATE INDEX "InboxConversation_contactId_idx" ON "InboxConversation" USING btree ("contactId" text_ops);--> statement-breakpoint
CREATE INDEX "InboxConversation_lastMessageAt_idx" ON "InboxConversation" USING btree ("lastMessageAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "InboxConversation_organizationId_subaccountId_isRead_idx" ON "InboxConversation" USING btree ("organizationId" text_ops,"subaccountId" bool_ops,"isRead" bool_ops);--> statement-breakpoint
CREATE INDEX "InboxConversation_organizationId_subaccountId_status_idx" ON "InboxConversation" USING btree ("organizationId" enum_ops,"subaccountId" text_ops,"status" enum_ops);--> statement-breakpoint
CREATE INDEX "InboxMessage_conversationId_createdAt_idx" ON "InboxMessage" USING btree ("conversationId" text_ops,"createdAt" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ContactInstructor_contactId_workerId_key" ON "ContactInstructor" USING btree ("contactId" text_ops,"workerId" text_ops);--> statement-breakpoint
CREATE INDEX "ExternalChannelIntegration_organizationId_idx" ON "ExternalChannelIntegration" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ExternalChannelIntegration_organizationId_subaccountId_prov_key" ON "ExternalChannelIntegration" USING btree ("organizationId" text_ops,"subaccountId" text_ops,"provider" text_ops);--> statement-breakpoint
CREATE INDEX "ExternalChannelIntegration_provider_idx" ON "ExternalChannelIntegration" USING btree ("provider" enum_ops);--> statement-breakpoint
CREATE INDEX "ExternalChannelIntegration_status_idx" ON "ExternalChannelIntegration" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "ExternalChannelIntegration_subaccountId_idx" ON "ExternalChannelIntegration" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "ContactHousehold_organizationId_idx" ON "ContactHousehold" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "ContactHousehold_organizationId_subaccountId_idx" ON "ContactHousehold" USING btree ("organizationId" text_ops,"subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "ContactHousehold_primaryContactId_idx" ON "ContactHousehold" USING btree ("primaryContactId" text_ops);--> statement-breakpoint
CREATE INDEX "ContactHousehold_subaccountId_idx" ON "ContactHousehold" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "ContactHouseholdMember_contactId_idx" ON "ContactHouseholdMember" USING btree ("contactId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ContactHouseholdMember_householdId_contactId_key" ON "ContactHouseholdMember" USING btree ("householdId" text_ops,"contactId" text_ops);--> statement-breakpoint
CREATE INDEX "ContactHouseholdMember_householdId_idx" ON "ContactHouseholdMember" USING btree ("householdId" text_ops);--> statement-breakpoint
CREATE INDEX "InstructorSubstitutionRequest_classId_idx" ON "InstructorSubstitutionRequest" USING btree ("classId" text_ops);--> statement-breakpoint
CREATE INDEX "InstructorSubstitutionRequest_organizationId_idx" ON "InstructorSubstitutionRequest" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "InstructorSubstitutionRequest_organizationId_status_idx" ON "InstructorSubstitutionRequest" USING btree ("organizationId" text_ops,"status" enum_ops);--> statement-breakpoint
CREATE INDEX "InstructorSubstitutionRequest_originalInstructorId_idx" ON "InstructorSubstitutionRequest" USING btree ("originalInstructorId" text_ops);--> statement-breakpoint
CREATE INDEX "InstructorSubstitutionRequest_status_idx" ON "InstructorSubstitutionRequest" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "InstructorSubstitutionRequest_subaccountId_idx" ON "InstructorSubstitutionRequest" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "InstructorSubstitutionRequest_substituteId_idx" ON "InstructorSubstitutionRequest" USING btree ("substituteId" text_ops);--> statement-breakpoint
CREATE INDEX "DynamicPricingRule_classTypeId_idx" ON "DynamicPricingRule" USING btree ("classTypeId" text_ops);--> statement-breakpoint
CREATE INDEX "DynamicPricingRule_isActive_idx" ON "DynamicPricingRule" USING btree ("isActive" bool_ops);--> statement-breakpoint
CREATE INDEX "DynamicPricingRule_organizationId_idx" ON "DynamicPricingRule" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "DynamicPricingRule_subaccountId_idx" ON "DynamicPricingRule" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioPaymentPlan_isActive_idx" ON "StudioPaymentPlan" USING btree ("isActive" bool_ops);--> statement-breakpoint
CREATE INDEX "StudioPaymentPlan_membershipPlanId_idx" ON "StudioPaymentPlan" USING btree ("membershipPlanId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioPaymentPlan_organizationId_idx" ON "StudioPaymentPlan" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioPaymentPlan_provider_idx" ON "StudioPaymentPlan" USING btree ("provider" enum_ops);--> statement-breakpoint
CREATE INDEX "StudioPaymentPlan_subaccountId_idx" ON "StudioPaymentPlan" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "VideoOnDemandAsset_classTypeId_idx" ON "VideoOnDemandAsset" USING btree ("classTypeId" text_ops);--> statement-breakpoint
CREATE INDEX "VideoOnDemandAsset_instructorId_idx" ON "VideoOnDemandAsset" USING btree ("instructorId" text_ops);--> statement-breakpoint
CREATE INDEX "VideoOnDemandAsset_isPublished_idx" ON "VideoOnDemandAsset" USING btree ("isPublished" bool_ops);--> statement-breakpoint
CREATE INDEX "VideoOnDemandAsset_organizationId_idx" ON "VideoOnDemandAsset" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "VideoOnDemandAsset_subaccountId_idx" ON "VideoOnDemandAsset" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "AccessControlIntegration_organizationId_idx" ON "AccessControlIntegration" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "AccessControlIntegration_provider_idx" ON "AccessControlIntegration" USING btree ("provider" enum_ops);--> statement-breakpoint
CREATE INDEX "AccessControlIntegration_status_idx" ON "AccessControlIntegration" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "AccessControlIntegration_subaccountId_idx" ON "AccessControlIntegration" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "PerformanceMetric_contactId_recordedAt_idx" ON "PerformanceMetric" USING btree ("contactId" timestamp_ops,"recordedAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "PerformanceMetric_metricType_idx" ON "PerformanceMetric" USING btree ("metricType" text_ops);--> statement-breakpoint
CREATE INDEX "PerformanceMetric_organizationId_idx" ON "PerformanceMetric" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "PerformanceMetric_subaccountId_idx" ON "PerformanceMetric" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "WorkoutProgram_classTypeId_idx" ON "WorkoutProgram" USING btree ("classTypeId" text_ops);--> statement-breakpoint
CREATE INDEX "WorkoutProgram_coachId_idx" ON "WorkoutProgram" USING btree ("coachId" text_ops);--> statement-breakpoint
CREATE INDEX "WorkoutProgram_isPublished_idx" ON "WorkoutProgram" USING btree ("isPublished" bool_ops);--> statement-breakpoint
CREATE INDEX "WorkoutProgram_organizationId_idx" ON "WorkoutProgram" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "WorkoutProgram_subaccountId_idx" ON "WorkoutProgram" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "SoapNote_authorId_idx" ON "SoapNote" USING btree ("authorId" text_ops);--> statement-breakpoint
CREATE INDEX "SoapNote_contactId_createdAt_idx" ON "SoapNote" USING btree ("contactId" timestamp_ops,"createdAt" text_ops);--> statement-breakpoint
CREATE INDEX "SoapNote_organizationId_idx" ON "SoapNote" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "SoapNote_subaccountId_idx" ON "SoapNote" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "MarketplaceListing_organizationId_idx" ON "MarketplaceListing" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "MarketplaceListing_status_idx" ON "MarketplaceListing" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "MarketplaceListing_subaccountId_idx" ON "MarketplaceListing" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "AutomationEvent_contactId_idx" ON "AutomationEvent" USING btree ("contactId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "AutomationEvent_deduplicationKey_key" ON "AutomationEvent" USING btree ("deduplicationKey" text_ops);--> statement-breakpoint
CREATE INDEX "AutomationEvent_executionId_idx" ON "AutomationEvent" USING btree ("executionId" text_ops);--> statement-breakpoint
CREATE INDEX "AutomationEvent_occurredAt_idx" ON "AutomationEvent" USING btree ("occurredAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "AutomationEvent_organizationId_occurredAt_idx" ON "AutomationEvent" USING btree ("organizationId" timestamp_ops,"occurredAt" text_ops);--> statement-breakpoint
CREATE INDEX "AutomationEvent_organizationId_subaccountId_occurredAt_idx" ON "AutomationEvent" USING btree ("organizationId" text_ops,"subaccountId" text_ops,"occurredAt" text_ops);--> statement-breakpoint
CREATE INDEX "AutomationEvent_subaccountId_idx" ON "AutomationEvent" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "AutomationEvent_type_occurredAt_idx" ON "AutomationEvent" USING btree ("type" timestamp_ops,"occurredAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "AutomationEvent_workflowId_occurredAt_idx" ON "AutomationEvent" USING btree ("workflowId" text_ops,"occurredAt" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "SmsConfig_organizationId_key" ON "SmsConfig" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "SmsMessage_automationId_idx" ON "SmsMessage" USING btree ("automationId" text_ops);--> statement-breakpoint
CREATE INDEX "SmsMessage_contactId_idx" ON "SmsMessage" USING btree ("contactId" text_ops);--> statement-breakpoint
CREATE INDEX "SmsMessage_createdAt_idx" ON "SmsMessage" USING btree ("createdAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "SmsMessage_organizationId_subaccountId_idx" ON "SmsMessage" USING btree ("organizationId" text_ops,"subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "SmsMessage_status_idx" ON "SmsMessage" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "WaiverTemplate_isActive_idx" ON "WaiverTemplate" USING btree ("isActive" bool_ops);--> statement-breakpoint
CREATE INDEX "WaiverTemplate_organizationId_idx" ON "WaiverTemplate" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "WaiverTemplate_subaccountId_idx" ON "WaiverTemplate" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "WaiverSignature_contactId_idx" ON "WaiverSignature" USING btree ("contactId" text_ops);--> statement-breakpoint
CREATE INDEX "WaiverSignature_signedAt_idx" ON "WaiverSignature" USING btree ("signedAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "WaiverSignature_templateId_idx" ON "WaiverSignature" USING btree ("templateId" text_ops);--> statement-breakpoint
CREATE INDEX "RoomLayout_roomId_idx" ON "RoomLayout" USING btree ("roomId" text_ops);--> statement-breakpoint
CREATE INDEX "CancellationCharge_classId_idx" ON "CancellationCharge" USING btree ("classId" text_ops);--> statement-breakpoint
CREATE INDEX "CancellationCharge_contactId_idx" ON "CancellationCharge" USING btree ("contactId" text_ops);--> statement-breakpoint
CREATE INDEX "CancellationCharge_createdAt_idx" ON "CancellationCharge" USING btree ("createdAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "CancellationCharge_organizationId_idx" ON "CancellationCharge" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ClassReminderConfig_organizationId_key" ON "ClassReminderConfig" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "RetentionAutomation_isActive_idx" ON "RetentionAutomation" USING btree ("isActive" bool_ops);--> statement-breakpoint
CREATE INDEX "RetentionAutomation_organizationId_idx" ON "RetentionAutomation" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "RetentionAutomation_subaccountId_idx" ON "RetentionAutomation" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "RetentionAutomation_type_idx" ON "RetentionAutomation" USING btree ("type" enum_ops);--> statement-breakpoint
CREATE INDEX "BillingRule_isActive_idx" ON "BillingRule" USING btree ("isActive" bool_ops);--> statement-breakpoint
CREATE INDEX "BillingRule_organizationId_idx" ON "BillingRule" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "BillingRule_organizationId_subaccountId_idx" ON "BillingRule" USING btree ("organizationId" text_ops,"subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "BillingRule_subaccountId_idx" ON "BillingRule" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "IntroOffer_isActive_idx" ON "IntroOffer" USING btree ("isActive" bool_ops);--> statement-breakpoint
CREATE INDEX "IntroOffer_organizationId_idx" ON "IntroOffer" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "IntroOffer_subaccountId_idx" ON "IntroOffer" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "IntroOfferRedemption_contactId_idx" ON "IntroOfferRedemption" USING btree ("contactId" text_ops);--> statement-breakpoint
CREATE INDEX "IntroOfferRedemption_expiresAt_idx" ON "IntroOfferRedemption" USING btree ("expiresAt" timestamp_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "IntroOfferRedemption_offerId_contactId_key" ON "IntroOfferRedemption" USING btree ("offerId" text_ops,"contactId" text_ops);--> statement-breakpoint
CREATE INDEX "IntroOfferRedemption_status_idx" ON "IntroOfferRedemption" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "ChurnRiskScore_contactId_idx" ON "ChurnRiskScore" USING btree ("contactId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ChurnRiskScore_organizationId_contactId_key" ON "ChurnRiskScore" USING btree ("organizationId" text_ops,"contactId" text_ops);--> statement-breakpoint
CREATE INDEX "ChurnRiskScore_organizationId_riskLevel_idx" ON "ChurnRiskScore" USING btree ("organizationId" enum_ops,"riskLevel" enum_ops);--> statement-breakpoint
CREATE INDEX "ChurnRiskScore_score_idx" ON "ChurnRiskScore" USING btree ("score" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ReferralProgram_organizationId_key" ON "ReferralProgram" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "Referral_code_idx" ON "Referral" USING btree ("code" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "Referral_code_key" ON "Referral" USING btree ("code" text_ops);--> statement-breakpoint
CREATE INDEX "Referral_programId_idx" ON "Referral" USING btree ("programId" text_ops);--> statement-breakpoint
CREATE INDEX "Referral_refereeContactId_idx" ON "Referral" USING btree ("refereeContactId" text_ops);--> statement-breakpoint
CREATE INDEX "Referral_refereeEmail_idx" ON "Referral" USING btree ("refereeEmail" text_ops);--> statement-breakpoint
CREATE INDEX "Referral_referrerContactId_idx" ON "Referral" USING btree ("referrerContactId" text_ops);--> statement-breakpoint
CREATE INDEX "Referral_status_idx" ON "Referral" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "LoyaltyProgram_organizationId_key" ON "LoyaltyProgram" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "LoyaltyBalance_contactId_idx" ON "LoyaltyBalance" USING btree ("contactId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "LoyaltyBalance_organizationId_contactId_key" ON "LoyaltyBalance" USING btree ("organizationId" text_ops,"contactId" text_ops);--> statement-breakpoint
CREATE INDEX "LoyaltyBalance_tier_idx" ON "LoyaltyBalance" USING btree ("tier" enum_ops);--> statement-breakpoint
CREATE INDEX "LoyaltyTransaction_createdAt_idx" ON "LoyaltyTransaction" USING btree ("createdAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "LoyaltyTransaction_organizationId_contactId_idx" ON "LoyaltyTransaction" USING btree ("organizationId" text_ops,"contactId" text_ops);--> statement-breakpoint
CREATE INDEX "LoyaltyReward_isActive_idx" ON "LoyaltyReward" USING btree ("isActive" bool_ops);--> statement-breakpoint
CREATE INDEX "LoyaltyReward_programId_idx" ON "LoyaltyReward" USING btree ("programId" text_ops);--> statement-breakpoint
CREATE INDEX "Spot_layoutId_idx" ON "Spot" USING btree ("layoutId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "Spot_layoutId_row_col_key" ON "Spot" USING btree ("layoutId" int4_ops,"row" text_ops,"col" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "SpotBooking_bookingId_key" ON "SpotBooking" USING btree ("bookingId" text_ops);--> statement-breakpoint
CREATE INDEX "SpotBooking_classId_idx" ON "SpotBooking" USING btree ("classId" text_ops);--> statement-breakpoint
CREATE INDEX "SpotBooking_contactId_idx" ON "SpotBooking" USING btree ("contactId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "SpotBooking_spotId_classId_key" ON "SpotBooking" USING btree ("spotId" text_ops,"classId" text_ops);--> statement-breakpoint
CREATE INDEX "PaymentIntegration_organizationId_idx" ON "PaymentIntegration" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "PaymentIntegration_organizationId_provider_key" ON "PaymentIntegration" USING btree ("organizationId" text_ops,"provider" text_ops);--> statement-breakpoint
CREATE INDEX "PaymentIntegration_subaccountId_idx" ON "PaymentIntegration" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "PaymentIntegration_subaccountId_provider_key" ON "PaymentIntegration" USING btree ("subaccountId" text_ops,"provider" text_ops);--> statement-breakpoint
CREATE INDEX "CancellationPolicy_isDefault_idx" ON "CancellationPolicy" USING btree ("isDefault" bool_ops);--> statement-breakpoint
CREATE INDEX "CancellationPolicy_organizationId_idx" ON "CancellationPolicy" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "CancellationPolicy_subaccountId_idx" ON "CancellationPolicy" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "SpotReservation_layoutId_idx" ON "SpotReservation" USING btree ("layoutId" text_ops);--> statement-breakpoint
CREATE INDEX "SpotReservation_sessionId_idx" ON "SpotReservation" USING btree ("sessionId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "SpotReservation_spotId_key" ON "SpotReservation" USING btree ("spotId" text_ops);--> statement-breakpoint
CREATE INDEX "Subaccount_organizationId_idx" ON "Subaccount" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "User_email_key" ON "User" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "Activity_createdAt_idx" ON "Activity" USING btree ("createdAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "Activity_entityType_entityId_idx" ON "Activity" USING btree ("entityType" text_ops,"entityId" text_ops);--> statement-breakpoint
CREATE INDEX "Activity_organizationId_entityType_entityId_idx" ON "Activity" USING btree ("organizationId" text_ops,"entityType" text_ops,"entityId" text_ops);--> statement-breakpoint
CREATE INDEX "Activity_organizationId_idx" ON "Activity" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "Activity_organizationId_subaccountId_idx" ON "Activity" USING btree ("organizationId" text_ops,"subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "Activity_subaccountId_idx" ON "Activity" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "Activity_type_idx" ON "Activity" USING btree ("type" enum_ops);--> statement-breakpoint
CREATE INDEX "Activity_userId_idx" ON "Activity" USING btree ("userId" text_ops);--> statement-breakpoint
CREATE INDEX "BankTransferSettings_enabled_idx" ON "BankTransferSettings" USING btree ("enabled" bool_ops);--> statement-breakpoint
CREATE INDEX "BankTransferSettings_organizationId_idx" ON "BankTransferSettings" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "BankTransferSettings_organizationId_subaccountId_key" ON "BankTransferSettings" USING btree ("organizationId" text_ops,"subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "BankTransferSettings_subaccountId_idx" ON "BankTransferSettings" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "BankTransferSettings_subaccountId_key" ON "BankTransferSettings" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ContactAssignee_contactId_subaccountMemberId_key" ON "ContactAssignee" USING btree ("contactId" text_ops,"subaccountMemberId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "SubaccountMember_subaccountId_userId_key" ON "SubaccountMember" USING btree ("subaccountId" text_ops,"userId" text_ops);--> statement-breakpoint
CREATE INDEX "Deal_organizationId_subaccountId_idx" ON "Deal" USING btree ("organizationId" text_ops,"subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "Deal_pipelineId_idx" ON "Deal" USING btree ("pipelineId" text_ops);--> statement-breakpoint
CREATE INDEX "Deal_subaccountId_pipelineStageId_idx" ON "Deal" USING btree ("subaccountId" text_ops,"pipelineStageId" text_ops);--> statement-breakpoint
CREATE INDEX "Pipeline_organizationId_subaccountId_idx" ON "Pipeline" USING btree ("organizationId" text_ops,"subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "Pipeline_subaccountId_isActive_idx" ON "Pipeline" USING btree ("subaccountId" text_ops,"isActive" text_ops);--> statement-breakpoint
CREATE INDEX "PipelineStage_pipelineId_idx" ON "PipelineStage" USING btree ("pipelineId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "PipelineStage_pipelineId_position_key" ON "PipelineStage" USING btree ("pipelineId" int4_ops,"position" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "DealContact_dealId_contactId_key" ON "DealContact" USING btree ("dealId" text_ops,"contactId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "DealMember_dealId_subaccountMemberId_key" ON "DealMember" USING btree ("dealId" text_ops,"subaccountMemberId" text_ops);--> statement-breakpoint
CREATE INDEX "Form_organizationId_idx" ON "Form" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "Form_status_idx" ON "Form" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "Form_subaccountId_idx" ON "Form" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "Form_workflowId_idx" ON "Form" USING btree ("workflowId" text_ops);--> statement-breakpoint
CREATE INDEX "GlobalStylePreset_organizationId_idx" ON "GlobalStylePreset" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "GlobalStylePreset_subaccountId_idx" ON "GlobalStylePreset" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "FormStep_formId_idx" ON "FormStep" USING btree ("formId" text_ops);--> statement-breakpoint
CREATE INDEX "FormField_stepId_idx" ON "FormField" USING btree ("stepId" text_ops);--> statement-breakpoint
CREATE INDEX "FormSubmission_contactId_idx" ON "FormSubmission" USING btree ("contactId" text_ops);--> statement-breakpoint
CREATE INDEX "FormSubmission_formId_idx" ON "FormSubmission" USING btree ("formId" text_ops);--> statement-breakpoint
CREATE INDEX "FormSubmission_submittedAt_idx" ON "FormSubmission" USING btree ("submittedAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "FunnelAnalytics_funnelId_date_idx" ON "FunnelAnalytics" USING btree ("funnelId" date_ops,"date" date_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "FunnelAnalytics_funnelId_pageId_date_key" ON "FunnelAnalytics" USING btree ("funnelId" text_ops,"pageId" text_ops,"date" date_ops);--> statement-breakpoint
CREATE INDEX "FunnelAnalytics_pageId_date_idx" ON "FunnelAnalytics" USING btree ("pageId" text_ops,"date" date_ops);--> statement-breakpoint
CREATE INDEX "FunnelPage_funnelId_idx" ON "FunnelPage" USING btree ("funnelId" text_ops);--> statement-breakpoint
CREATE INDEX "FunnelPage_funnelId_order_idx" ON "FunnelPage" USING btree ("funnelId" int4_ops,"order" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "FunnelPage_funnelId_slug_key" ON "FunnelPage" USING btree ("funnelId" text_ops,"slug" text_ops);--> statement-breakpoint
CREATE INDEX "FunnelBlock_pageId_idx" ON "FunnelBlock" USING btree ("pageId" text_ops);--> statement-breakpoint
CREATE INDEX "FunnelBlock_pageId_order_idx" ON "FunnelBlock" USING btree ("pageId" int4_ops,"order" int4_ops);--> statement-breakpoint
CREATE INDEX "FunnelBlock_pageId_parentBlockId_order_idx" ON "FunnelBlock" USING btree ("pageId" text_ops,"parentBlockId" int4_ops,"order" int4_ops);--> statement-breakpoint
CREATE INDEX "FunnelBlock_parentBlockId_idx" ON "FunnelBlock" USING btree ("parentBlockId" text_ops);--> statement-breakpoint
CREATE INDEX "FunnelBlock_smartSectionId_idx" ON "FunnelBlock" USING btree ("smartSectionId" text_ops);--> statement-breakpoint
CREATE INDEX "FunnelBlock_smartSectionId_order_idx" ON "FunnelBlock" USING btree ("smartSectionId" int4_ops,"order" int4_ops);--> statement-breakpoint
CREATE INDEX "FunnelBlock_smartSectionInstanceId_idx" ON "FunnelBlock" USING btree ("smartSectionInstanceId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "FunnelBlock_smartSectionInstanceId_key" ON "FunnelBlock" USING btree ("smartSectionInstanceId" text_ops);--> statement-breakpoint
CREATE INDEX "SmartSection_category_idx" ON "SmartSection" USING btree ("category" text_ops);--> statement-breakpoint
CREATE INDEX "SmartSection_organizationId_idx" ON "SmartSection" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "SmartSection_subaccountId_idx" ON "SmartSection" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "SmartSectionInstance_formId_idx" ON "SmartSectionInstance" USING btree ("formId" text_ops);--> statement-breakpoint
CREATE INDEX "SmartSectionInstance_funnelPageId_idx" ON "SmartSectionInstance" USING btree ("funnelPageId" text_ops);--> statement-breakpoint
CREATE INDEX "SmartSectionInstance_sectionId_idx" ON "SmartSectionInstance" USING btree ("sectionId" text_ops);--> statement-breakpoint
CREATE INDEX "FunnelBlockAnalytics_blockId_date_idx" ON "FunnelBlockAnalytics" USING btree ("blockId" date_ops,"date" date_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "FunnelBlockAnalytics_blockId_date_key" ON "FunnelBlockAnalytics" USING btree ("blockId" text_ops,"date" text_ops);--> statement-breakpoint
CREATE INDEX "FunnelBlockEvent_blockId_idx" ON "FunnelBlockEvent" USING btree ("blockId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "FunnelBlockEvent_blockId_key" ON "FunnelBlockEvent" USING btree ("blockId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "FunnelBreakpoint_blockId_device_key" ON "FunnelBreakpoint" USING btree ("blockId" text_ops,"device" text_ops);--> statement-breakpoint
CREATE INDEX "FunnelBreakpoint_blockId_idx" ON "FunnelBreakpoint" USING btree ("blockId" text_ops);--> statement-breakpoint
CREATE INDEX "FunnelPixelIntegration_funnelId_idx" ON "FunnelPixelIntegration" USING btree ("funnelId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "FunnelPixelIntegration_funnelId_provider_key" ON "FunnelPixelIntegration" USING btree ("funnelId" text_ops,"provider" text_ops);--> statement-breakpoint
CREATE INDEX "InvoiceTemplate_isDefault_idx" ON "InvoiceTemplate" USING btree ("isDefault" bool_ops);--> statement-breakpoint
CREATE INDEX "InvoiceTemplate_organizationId_idx" ON "InvoiceTemplate" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "InvoiceTemplate_organizationId_subaccountId_idx" ON "InvoiceTemplate" USING btree ("organizationId" text_ops,"subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "InvoiceTemplate_subaccountId_idx" ON "InvoiceTemplate" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "InvoiceLineItem_invoiceId_idx" ON "InvoiceLineItem" USING btree ("invoiceId" text_ops);--> statement-breakpoint
CREATE INDEX "InvoiceLineItem_timeLogId_idx" ON "InvoiceLineItem" USING btree ("timeLogId" text_ops);--> statement-breakpoint
CREATE INDEX "InvoicePayment_invoiceId_idx" ON "InvoicePayment" USING btree ("invoiceId" text_ops);--> statement-breakpoint
CREATE INDEX "InvoicePayment_paidAt_idx" ON "InvoicePayment" USING btree ("paidAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "InvoiceReminder_invoiceId_idx" ON "InvoiceReminder" USING btree ("invoiceId" text_ops);--> statement-breakpoint
CREATE INDEX "InvoiceReminder_isDunning_idx" ON "InvoiceReminder" USING btree ("isDunning" bool_ops);--> statement-breakpoint
CREATE INDEX "InvoiceReminder_sentAt_idx" ON "InvoiceReminder" USING btree ("sentAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "Notification_organizationId_idx" ON "Notification" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "Notification_subaccountId_idx" ON "Notification" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification" USING btree ("userId" text_ops,"createdAt" text_ops);--> statement-breakpoint
CREATE INDEX "Notification_userId_read_idx" ON "Notification" USING btree ("userId" text_ops,"read" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference" USING btree ("userId" text_ops);--> statement-breakpoint
CREATE INDEX "QRCode_code_idx" ON "QRCode" USING btree ("code" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "QRCode_code_key" ON "QRCode" USING btree ("code" text_ops);--> statement-breakpoint
CREATE INDEX "QRCode_organizationId_idx" ON "QRCode" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "QRCode_organizationId_subaccountId_idx" ON "QRCode" USING btree ("organizationId" text_ops,"subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "QRCode_subaccountId_idx" ON "QRCode" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "RecurringInvoice_frequency_idx" ON "RecurringInvoice" USING btree ("frequency" enum_ops);--> statement-breakpoint
CREATE INDEX "RecurringInvoice_nextRunDate_idx" ON "RecurringInvoice" USING btree ("nextRunDate" timestamp_ops);--> statement-breakpoint
CREATE INDEX "RecurringInvoice_organizationId_idx" ON "RecurringInvoice" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "RecurringInvoice_status_idx" ON "RecurringInvoice" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "RecurringInvoice_subaccountId_idx" ON "RecurringInvoice" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "RecurringInvoiceGeneration_invoiceId_key" ON "RecurringInvoiceGeneration" USING btree ("invoiceId" text_ops);--> statement-breakpoint
CREATE INDEX "RecurringInvoiceGeneration_recurringInvoiceId_idx" ON "RecurringInvoiceGeneration" USING btree ("recurringInvoiceId" text_ops);--> statement-breakpoint
CREATE INDEX "Rota_contactId_idx" ON "Rota" USING btree ("contactId" text_ops);--> statement-breakpoint
CREATE INDEX "Rota_organizationId_idx" ON "Rota" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "Rota_organizationId_workerId_startTime_idx" ON "Rota" USING btree ("organizationId" text_ops,"workerId" timestamp_ops,"startTime" text_ops);--> statement-breakpoint
CREATE INDEX "Rota_organizationId_workerId_status_idx" ON "Rota" USING btree ("organizationId" text_ops,"workerId" text_ops,"status" text_ops);--> statement-breakpoint
CREATE INDEX "Rota_startTime_idx" ON "Rota" USING btree ("startTime" timestamp_ops);--> statement-breakpoint
CREATE INDEX "Rota_status_idx" ON "Rota" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "Rota_subaccountId_idx" ON "Rota" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "Rota_workerId_idx" ON "Rota" USING btree ("workerId" text_ops);--> statement-breakpoint
CREATE INDEX "Rota_workerId_startTime_endTime_idx" ON "Rota" USING btree ("workerId" text_ops,"startTime" text_ops,"endTime" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "Session_token_key" ON "Session" USING btree ("token" text_ops);--> statement-breakpoint
CREATE INDEX "StripeConnection_organizationId_idx" ON "StripeConnection" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "StripeConnection_organizationId_subaccountId_key" ON "StripeConnection" USING btree ("organizationId" text_ops,"subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "StripeConnection_stripeAccountId_idx" ON "StripeConnection" USING btree ("stripeAccountId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "StripeConnection_stripeAccountId_key" ON "StripeConnection" USING btree ("stripeAccountId" text_ops);--> statement-breakpoint
CREATE INDEX "StripeConnection_subaccountId_idx" ON "StripeConnection" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "StripeConnection_subaccountId_key" ON "StripeConnection" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioBooking_classId_idx" ON "StudioBooking" USING btree ("classId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioBooking_contactId_idx" ON "StudioBooking" USING btree ("contactId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioBooking_externalId_idx" ON "StudioBooking" USING btree ("externalId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioBooking_status_idx" ON "StudioBooking" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "SubaccountModule_organizationId_enabled_idx" ON "SubaccountModule" USING btree ("organizationId" text_ops,"enabled" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "SubaccountModule_organizationId_moduleType_key" ON "SubaccountModule" USING btree ("organizationId" text_ops,"moduleType" text_ops);--> statement-breakpoint
CREATE INDEX "SubaccountModule_subaccountId_enabled_idx" ON "SubaccountModule" USING btree ("subaccountId" bool_ops,"enabled" bool_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "SubaccountModule_subaccountId_moduleType_key" ON "SubaccountModule" USING btree ("subaccountId" text_ops,"moduleType" text_ops);--> statement-breakpoint
CREATE INDEX "UserPresence_organizationId_idx" ON "UserPresence" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "UserPresence_subaccountId_idx" ON "UserPresence" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "UserPresence_userId_key" ON "UserPresence" USING btree ("userId" text_ops);--> statement-breakpoint
CREATE INDEX "UserPresence_userId_status_idx" ON "UserPresence" USING btree ("userId" text_ops,"status" text_ops);--> statement-breakpoint
CREATE INDEX "WorkerDocument_expiryDate_idx" ON "WorkerDocument" USING btree ("expiryDate" timestamp_ops);--> statement-breakpoint
CREATE INDEX "WorkerDocument_status_idx" ON "WorkerDocument" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "WorkerDocument_type_idx" ON "WorkerDocument" USING btree ("type" enum_ops);--> statement-breakpoint
CREATE INDEX "WorkerDocument_workerId_idx" ON "WorkerDocument" USING btree ("workerId" text_ops);--> statement-breakpoint
CREATE INDEX "WorkerDocument_workerId_status_idx" ON "WorkerDocument" USING btree ("workerId" enum_ops,"status" text_ops);--> statement-breakpoint
CREATE INDEX "WorkerDocument_workerId_type_idx" ON "WorkerDocument" USING btree ("workerId" text_ops,"type" text_ops);--> statement-breakpoint
CREATE INDEX "TimeLog_organizationId_contactId_idx" ON "TimeLog" USING btree ("organizationId" text_ops,"contactId" text_ops);--> statement-breakpoint
CREATE INDEX "TimeLog_organizationId_dealId_idx" ON "TimeLog" USING btree ("organizationId" text_ops,"dealId" text_ops);--> statement-breakpoint
CREATE INDEX "TimeLog_organizationId_idx" ON "TimeLog" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "TimeLog_organizationId_startTime_idx" ON "TimeLog" USING btree ("organizationId" timestamp_ops,"startTime" text_ops);--> statement-breakpoint
CREATE INDEX "TimeLog_organizationId_status_idx" ON "TimeLog" USING btree ("organizationId" text_ops,"status" text_ops);--> statement-breakpoint
CREATE INDEX "TimeLog_organizationId_subaccountId_idx" ON "TimeLog" USING btree ("organizationId" text_ops,"subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "TimeLog_organizationId_workerId_idx" ON "TimeLog" USING btree ("organizationId" text_ops,"workerId" text_ops);--> statement-breakpoint
CREATE INDEX "TimeLog_organizationId_workerId_startTime_idx" ON "TimeLog" USING btree ("organizationId" text_ops,"workerId" text_ops,"startTime" text_ops);--> statement-breakpoint
CREATE INDEX "TimeLog_status_invoiceId_idx" ON "TimeLog" USING btree ("status" text_ops,"invoiceId" text_ops);--> statement-breakpoint
CREATE INDEX "TimeLog_subaccountId_idx" ON "TimeLog" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "TimeLog_workerId_status_idx" ON "TimeLog" USING btree ("workerId" text_ops,"status" text_ops);--> statement-breakpoint
CREATE INDEX "ShiftSwapRequest_organizationId_idx" ON "ShiftSwapRequest" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "ShiftSwapRequest_organizationId_status_idx" ON "ShiftSwapRequest" USING btree ("organizationId" text_ops,"status" enum_ops);--> statement-breakpoint
CREATE INDEX "ShiftSwapRequest_requestedAt_idx" ON "ShiftSwapRequest" USING btree ("requestedAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "ShiftSwapRequest_requesterId_idx" ON "ShiftSwapRequest" USING btree ("requesterId" text_ops);--> statement-breakpoint
CREATE INDEX "ShiftSwapRequest_rotaId_idx" ON "ShiftSwapRequest" USING btree ("rotaId" text_ops);--> statement-breakpoint
CREATE INDEX "ShiftSwapRequest_status_idx" ON "ShiftSwapRequest" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "ShiftSwapRequest_subaccountId_idx" ON "ShiftSwapRequest" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "ShiftSwapRequest_targetWorkerId_idx" ON "ShiftSwapRequest" USING btree ("targetWorkerId" text_ops);--> statement-breakpoint
CREATE INDEX "WorkerAvailability_dayOfWeek_idx" ON "WorkerAvailability" USING btree ("dayOfWeek" int4_ops);--> statement-breakpoint
CREATE INDEX "WorkerAvailability_organizationId_idx" ON "WorkerAvailability" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "WorkerAvailability_workerId_dayOfWeek_isActive_idx" ON "WorkerAvailability" USING btree ("workerId" bool_ops,"dayOfWeek" bool_ops,"isActive" int4_ops);--> statement-breakpoint
CREATE INDEX "WorkerAvailability_workerId_idx" ON "WorkerAvailability" USING btree ("workerId" text_ops);--> statement-breakpoint
CREATE INDEX "TimeOffRequest_organizationId_idx" ON "TimeOffRequest" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "TimeOffRequest_organizationId_status_idx" ON "TimeOffRequest" USING btree ("organizationId" text_ops,"status" enum_ops);--> statement-breakpoint
CREATE INDEX "TimeOffRequest_startDate_endDate_idx" ON "TimeOffRequest" USING btree ("startDate" timestamp_ops,"endDate" timestamp_ops);--> statement-breakpoint
CREATE INDEX "TimeOffRequest_status_idx" ON "TimeOffRequest" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "TimeOffRequest_subaccountId_idx" ON "TimeOffRequest" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "TimeOffRequest_workerId_idx" ON "TimeOffRequest" USING btree ("workerId" text_ops);--> statement-breakpoint
CREATE INDEX "TimeOffRequest_workerId_status_idx" ON "TimeOffRequest" USING btree ("workerId" enum_ops,"status" enum_ops);--> statement-breakpoint
CREATE INDEX "OvertimeTracking_isOverLimit_idx" ON "OvertimeTracking" USING btree ("isOverLimit" bool_ops);--> statement-breakpoint
CREATE INDEX "OvertimeTracking_organizationId_idx" ON "OvertimeTracking" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "OvertimeTracking_weekStartDate_idx" ON "OvertimeTracking" USING btree ("weekStartDate" timestamp_ops);--> statement-breakpoint
CREATE INDEX "OvertimeTracking_workerId_idx" ON "OvertimeTracking" USING btree ("workerId" text_ops);--> statement-breakpoint
CREATE INDEX "OvertimeTracking_workerId_weekStartDate_idx" ON "OvertimeTracking" USING btree ("workerId" timestamp_ops,"weekStartDate" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "OvertimeTracking_workerId_weekStartDate_key" ON "OvertimeTracking" USING btree ("workerId" text_ops,"weekStartDate" text_ops);--> statement-breakpoint
CREATE INDEX "Invoice_contactId_idx" ON "Invoice" USING btree ("contactId" text_ops);--> statement-breakpoint
CREATE INDEX "Invoice_dueDate_idx" ON "Invoice" USING btree ("dueDate" timestamp_ops);--> statement-breakpoint
CREATE INDEX "Invoice_invoiceNumber_idx" ON "Invoice" USING btree ("invoiceNumber" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice" USING btree ("invoiceNumber" text_ops);--> statement-breakpoint
CREATE INDEX "Invoice_issueDate_idx" ON "Invoice" USING btree ("issueDate" timestamp_ops);--> statement-breakpoint
CREATE INDEX "Invoice_organizationId_idx" ON "Invoice" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "Invoice_organizationId_subaccountId_idx" ON "Invoice" USING btree ("organizationId" text_ops,"subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "Invoice_organizationId_type_idx" ON "Invoice" USING btree ("organizationId" enum_ops,"type" text_ops);--> statement-breakpoint
CREATE INDEX "Invoice_status_idx" ON "Invoice" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "Invoice_stripeInvoiceId_key" ON "Invoice" USING btree ("stripeInvoiceId" text_ops);--> statement-breakpoint
CREATE INDEX "Invoice_subaccountId_idx" ON "Invoice" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "Invoice_templateId_idx" ON "Invoice" USING btree ("templateId" text_ops);--> statement-breakpoint
CREATE INDEX "Invoice_type_idx" ON "Invoice" USING btree ("type" enum_ops);--> statement-breakpoint
CREATE INDEX "PayrollRun_organizationId_idx" ON "PayrollRun" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "PayrollRun_paymentDate_idx" ON "PayrollRun" USING btree ("paymentDate" timestamp_ops);--> statement-breakpoint
CREATE INDEX "PayrollRun_periodStart_periodEnd_idx" ON "PayrollRun" USING btree ("periodStart" timestamp_ops,"periodEnd" timestamp_ops);--> statement-breakpoint
CREATE INDEX "PayrollRun_status_idx" ON "PayrollRun" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "PayrollRun_subaccountId_idx" ON "PayrollRun" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "WorkerPayment_organizationId_idx" ON "WorkerPayment" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "WorkerPayment_paymentDate_idx" ON "WorkerPayment" USING btree ("paymentDate" timestamp_ops);--> statement-breakpoint
CREATE INDEX "WorkerPayment_paymentStatus_idx" ON "WorkerPayment" USING btree ("paymentStatus" enum_ops);--> statement-breakpoint
CREATE INDEX "WorkerPayment_payrollRunId_idx" ON "WorkerPayment" USING btree ("payrollRunId" text_ops);--> statement-breakpoint
CREATE INDEX "WorkerPayment_periodStart_periodEnd_idx" ON "WorkerPayment" USING btree ("periodStart" timestamp_ops,"periodEnd" timestamp_ops);--> statement-breakpoint
CREATE INDEX "WorkerPayment_subaccountId_idx" ON "WorkerPayment" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "WorkerPayment_workerId_idx" ON "WorkerPayment" USING btree ("workerId" text_ops);--> statement-breakpoint
CREATE INDEX "PayrollRunWorker_payrollRunId_idx" ON "PayrollRunWorker" USING btree ("payrollRunId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "PayrollRunWorker_payrollRunId_workerId_key" ON "PayrollRunWorker" USING btree ("payrollRunId" text_ops,"workerId" text_ops);--> statement-breakpoint
CREATE INDEX "PayrollRunWorker_workerId_idx" ON "PayrollRunWorker" USING btree ("workerId" text_ops);--> statement-breakpoint
CREATE INDEX "Worker_email_idx" ON "Worker" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "Worker_organizationId_idx" ON "Worker" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "Worker_organizationId_subaccountId_idx" ON "Worker" USING btree ("organizationId" text_ops,"subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "Worker_phone_idx" ON "Worker" USING btree ("phone" text_ops);--> statement-breakpoint
CREATE INDEX "Worker_portalToken_idx" ON "Worker" USING btree ("portalToken" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "Worker_portalToken_key" ON "Worker" USING btree ("portalToken" text_ops);--> statement-breakpoint
CREATE INDEX "Worker_sessionToken_idx" ON "Worker" USING btree ("sessionToken" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "Worker_sessionToken_key" ON "Worker" USING btree ("sessionToken" text_ops);--> statement-breakpoint
CREATE INDEX "Worker_subaccountId_idx" ON "Worker" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "Worker_userId_idx" ON "Worker" USING btree ("userId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "Worker_userId_key" ON "Worker" USING btree ("userId" text_ops);--> statement-breakpoint
CREATE INDEX "Funnel_apiKey_idx" ON "Funnel" USING btree ("apiKey" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "Funnel_apiKey_key" ON "Funnel" USING btree ("apiKey" text_ops);--> statement-breakpoint
CREATE INDEX "Funnel_customDomain_idx" ON "Funnel" USING btree ("customDomain" text_ops);--> statement-breakpoint
CREATE INDEX "Funnel_funnelType_idx" ON "Funnel" USING btree ("funnelType" enum_ops);--> statement-breakpoint
CREATE INDEX "Funnel_organizationId_idx" ON "Funnel" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "Funnel_organizationId_subaccountId_idx" ON "Funnel" USING btree ("organizationId" text_ops,"subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "Funnel_status_idx" ON "Funnel" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "Funnel_subaccountId_idx" ON "Funnel" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "Funnel_subdomain_idx" ON "Funnel" USING btree ("subdomain" text_ops);--> statement-breakpoint
CREATE INDEX "anonymous_user_profiles_consentGiven_idx" ON "anonymous_user_profiles" USING btree ("consentGiven" bool_ops);--> statement-breakpoint
CREATE INDEX "anonymous_user_profiles_deletionRequestedAt_idx" ON "anonymous_user_profiles" USING btree ("deletionRequestedAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "anonymous_user_profiles_identifiedUserId_idx" ON "anonymous_user_profiles" USING btree ("identifiedUserId" text_ops);--> statement-breakpoint
CREATE INDEX "anonymous_user_profiles_lifecycleStage_idx" ON "anonymous_user_profiles" USING btree ("lifecycleStage" text_ops);--> statement-breakpoint
CREATE INDEX "FunnelWebVital_anonymousId_idx" ON "FunnelWebVital" USING btree ("anonymousId" text_ops);--> statement-breakpoint
CREATE INDEX "FunnelWebVital_funnelId_timestamp_idx" ON "FunnelWebVital" USING btree ("funnelId" text_ops,"timestamp" text_ops);--> statement-breakpoint
CREATE INDEX "FunnelWebVital_metric_rating_idx" ON "FunnelWebVital" USING btree ("metric" enum_ops,"rating" enum_ops);--> statement-breakpoint
CREATE INDEX "FunnelWebVital_pageUrl_metric_idx" ON "FunnelWebVital" USING btree ("pageUrl" text_ops,"metric" enum_ops);--> statement-breakpoint
CREATE INDEX "FunnelWebVital_sessionId_idx" ON "FunnelWebVital" USING btree ("sessionId" text_ops);--> statement-breakpoint
CREATE INDEX "FunnelWebVital_subaccountId_timestamp_idx" ON "FunnelWebVital" USING btree ("subaccountId" timestamp_ops,"timestamp" timestamp_ops);--> statement-breakpoint
CREATE INDEX "FunnelEvent_abTestId_idx" ON "FunnelEvent" USING btree ("abTestId" text_ops);--> statement-breakpoint
CREATE INDEX "FunnelEvent_anonymousId_idx" ON "FunnelEvent" USING btree ("anonymousId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "FunnelEvent_eventId_key" ON "FunnelEvent" USING btree ("eventId" text_ops);--> statement-breakpoint
CREATE INDEX "FunnelEvent_eventName_funnelId_idx" ON "FunnelEvent" USING btree ("eventName" text_ops,"funnelId" text_ops);--> statement-breakpoint
CREATE INDEX "FunnelEvent_fbclid_idx" ON "FunnelEvent" USING btree ("fbclid" text_ops);--> statement-breakpoint
CREATE INDEX "FunnelEvent_funnelId_timestamp_idx" ON "FunnelEvent" USING btree ("funnelId" text_ops,"timestamp" text_ops);--> statement-breakpoint
CREATE INDEX "FunnelEvent_gclid_idx" ON "FunnelEvent" USING btree ("gclid" text_ops);--> statement-breakpoint
CREATE INDEX "FunnelEvent_isConversion_funnelId_idx" ON "FunnelEvent" USING btree ("isConversion" bool_ops,"funnelId" bool_ops);--> statement-breakpoint
CREATE INDEX "FunnelEvent_leadScoreGrade_idx" ON "FunnelEvent" USING btree ("leadScoreGrade" text_ops);--> statement-breakpoint
CREATE INDEX "FunnelEvent_msclkid_idx" ON "FunnelEvent" USING btree ("msclkid" text_ops);--> statement-breakpoint
CREATE INDEX "FunnelEvent_sessionId_idx" ON "FunnelEvent" USING btree ("sessionId" text_ops);--> statement-breakpoint
CREATE INDEX "FunnelEvent_subaccountId_timestamp_idx" ON "FunnelEvent" USING btree ("subaccountId" text_ops,"timestamp" timestamp_ops);--> statement-breakpoint
CREATE INDEX "FunnelEvent_ttclid_idx" ON "FunnelEvent" USING btree ("ttclid" text_ops);--> statement-breakpoint
CREATE INDEX "FunnelEvent_userId_timestamp_idx" ON "FunnelEvent" USING btree ("userId" timestamp_ops,"timestamp" text_ops);--> statement-breakpoint
CREATE INDEX "FunnelSession_anonymousId_idx" ON "FunnelSession" USING btree ("anonymousId" text_ops);--> statement-breakpoint
CREATE INDEX "FunnelSession_consentGiven_idx" ON "FunnelSession" USING btree ("consentGiven" bool_ops);--> statement-breakpoint
CREATE INDEX "FunnelSession_converted_funnelId_idx" ON "FunnelSession" USING btree ("converted" text_ops,"funnelId" bool_ops);--> statement-breakpoint
CREATE INDEX "FunnelSession_funnelId_startedAt_idx" ON "FunnelSession" USING btree ("funnelId" text_ops,"startedAt" text_ops);--> statement-breakpoint
CREATE INDEX "FunnelSession_profileId_idx" ON "FunnelSession" USING btree ("profileId" text_ops);--> statement-breakpoint
CREATE INDEX "FunnelSession_subaccountId_startedAt_idx" ON "FunnelSession" USING btree ("subaccountId" text_ops,"startedAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "FunnelSession_userId_idx" ON "FunnelSession" USING btree ("userId" text_ops);--> statement-breakpoint
CREATE INDEX "AdSpend_funnelId_date_idx" ON "AdSpend" USING btree ("funnelId" date_ops,"date" text_ops);--> statement-breakpoint
CREATE INDEX "AdSpend_organizationId_date_idx" ON "AdSpend" USING btree ("organizationId" text_ops,"date" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "AdSpend_organizationId_platform_campaignId_date_key" ON "AdSpend" USING btree ("organizationId" text_ops,"platform" date_ops,"campaignId" date_ops,"date" date_ops);--> statement-breakpoint
CREATE INDEX "AdSpend_platform_date_idx" ON "AdSpend" USING btree ("platform" text_ops,"date" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "AdPlatformCredential_organizationId_platform_accountId_key" ON "AdPlatformCredential" USING btree ("organizationId" text_ops,"platform" text_ops,"accountId" text_ops);--> statement-breakpoint
CREATE INDEX "AdPlatformCredential_organizationId_platform_idx" ON "AdPlatformCredential" USING btree ("organizationId" text_ops,"platform" text_ops);--> statement-breakpoint
CREATE INDEX "Contact_organizationId_subaccountId_acquisitionStage_idx" ON "Contact" USING btree ("organizationId" text_ops,"subaccountId" text_ops,"acquisitionStage" text_ops);--> statement-breakpoint
CREATE INDEX "Contact_organizationId_subaccountId_idx" ON "Contact" USING btree ("organizationId" text_ops,"subaccountId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "Contact_portalToken_key" ON "Contact" USING btree ("portalToken" text_ops);--> statement-breakpoint
CREATE INDEX "Contact_subaccountId_email_idx" ON "Contact" USING btree ("subaccountId" text_ops,"email" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "EmailDomain_domain_key" ON "EmailDomain" USING btree ("domain" text_ops);--> statement-breakpoint
CREATE INDEX "EmailDomain_organizationId_subaccountId_idx" ON "EmailDomain" USING btree ("organizationId" text_ops,"subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "EmailTemplate_organizationId_subaccountId_idx" ON "EmailTemplate" USING btree ("organizationId" text_ops,"subaccountId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "CampaignRecipient_campaignId_contactId_key" ON "CampaignRecipient" USING btree ("campaignId" text_ops,"contactId" text_ops);--> statement-breakpoint
CREATE INDEX "CampaignRecipient_contactId_idx" ON "CampaignRecipient" USING btree ("contactId" text_ops);--> statement-breakpoint
CREATE INDEX "CampaignRecipient_status_idx" ON "CampaignRecipient" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "UnsubscribeToken_contactId_idx" ON "UnsubscribeToken" USING btree ("contactId" text_ops);--> statement-breakpoint
CREATE INDEX "UnsubscribeToken_token_idx" ON "UnsubscribeToken" USING btree ("token" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "UnsubscribeToken_token_key" ON "UnsubscribeToken" USING btree ("token" text_ops);--> statement-breakpoint
CREATE INDEX "Campaign_organizationId_subaccountId_idx" ON "Campaign" USING btree ("organizationId" text_ops,"subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "Campaign_scheduledAt_idx" ON "Campaign" USING btree ("scheduledAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "Campaign_status_idx" ON "Campaign" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "Booking_attendeeEmail_idx" ON "Booking" USING btree ("attendeeEmail" text_ops);--> statement-breakpoint
CREATE INDEX "Booking_calBookingId_idx" ON "Booking" USING btree ("calBookingId" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "Booking_calBookingUid_key" ON "Booking" USING btree ("calBookingUid" text_ops);--> statement-breakpoint
CREATE INDEX "Booking_contactId_idx" ON "Booking" USING btree ("contactId" text_ops);--> statement-breakpoint
CREATE INDEX "Booking_dealId_idx" ON "Booking" USING btree ("dealId" text_ops);--> statement-breakpoint
CREATE INDEX "Booking_organizationId_subaccountId_idx" ON "Booking" USING btree ("organizationId" text_ops,"subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "Booking_startTime_idx" ON "Booking" USING btree ("startTime" timestamp_ops);--> statement-breakpoint
CREATE INDEX "Booking_status_startTime_idx" ON "Booking" USING btree ("status" enum_ops,"startTime" timestamp_ops);--> statement-breakpoint
CREATE INDEX "CalComCredential_organizationId_idx" ON "CalComCredential" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "CalComCredential_subaccountId_idx" ON "CalComCredential" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "CalComCredential_subaccountId_key" ON "CalComCredential" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "BookingEventType_calEventTypeId_idx" ON "BookingEventType" USING btree ("calEventTypeId" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "BookingEventType_organizationId_slug_key" ON "BookingEventType" USING btree ("organizationId" text_ops,"slug" text_ops);--> statement-breakpoint
CREATE INDEX "BookingEventType_organizationId_subaccountId_idx" ON "BookingEventType" USING btree ("organizationId" text_ops,"subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "BookingAvailability_organizationId_idx" ON "BookingAvailability" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "BookingAvailability_organizationId_subaccountId_idx" ON "BookingAvailability" USING btree ("organizationId" text_ops,"subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "BookingAvailability_startTime_endTime_idx" ON "BookingAvailability" USING btree ("startTime" timestamp_ops,"endTime" timestamp_ops);--> statement-breakpoint
CREATE INDEX "BookingAvailability_subaccountId_idx" ON "BookingAvailability" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "BookingHoliday_organizationId_idx" ON "BookingHoliday" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "BookingHoliday_organizationId_subaccountId_idx" ON "BookingHoliday" USING btree ("organizationId" text_ops,"subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "BookingHoliday_startDate_endDate_idx" ON "BookingHoliday" USING btree ("startDate" timestamp_ops,"endDate" timestamp_ops);--> statement-breakpoint
CREATE INDEX "BookingHoliday_subaccountId_idx" ON "BookingHoliday" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "note_contactId_idx" ON "note" USING btree ("contactId" text_ops);--> statement-breakpoint
CREATE INDEX "note_dealId_idx" ON "note" USING btree ("dealId" text_ops);--> statement-breakpoint
CREATE INDEX "note_organizationId_idx" ON "note" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "note_pinned_idx" ON "note" USING btree ("pinned" bool_ops);--> statement-breakpoint
CREATE INDEX "note_subaccountId_idx" ON "note" USING btree ("subaccountId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "note_mention_noteId_userId_key" ON "note_mention" USING btree ("noteId" text_ops,"userId" text_ops);--> statement-breakpoint
CREATE INDEX "note_mention_userId_idx" ON "note_mention" USING btree ("userId" text_ops);--> statement-breakpoint
CREATE INDEX "task_assigneeId_idx" ON "task" USING btree ("assigneeId" text_ops);--> statement-breakpoint
CREATE INDEX "task_contactId_idx" ON "task" USING btree ("contactId" text_ops);--> statement-breakpoint
CREATE INDEX "task_dealId_idx" ON "task" USING btree ("dealId" text_ops);--> statement-breakpoint
CREATE INDEX "task_dueDate_idx" ON "task" USING btree ("dueDate" timestamp_ops);--> statement-breakpoint
CREATE INDEX "task_organizationId_subaccountId_idx" ON "task" USING btree ("organizationId" text_ops,"subaccountId" text_ops);--> statement-breakpoint
CREATE INDEX "task_status_idx" ON "task" USING btree ("status" enum_ops);
*/