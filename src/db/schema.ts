import { pgTable, uniqueIndex, text, timestamp, jsonb, boolean, varchar, integer, index, foreignKey, doublePrecision, numeric, date, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const aiLogStatus = pgEnum("AILogStatus", ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'])
export const accessControlProvider = pgEnum("AccessControlProvider", ['KISI', 'BRIVO', 'SALTO', 'HID', 'GANTNER', 'OTHER'])
export const acquisitionStage = pgEnum("AcquisitionStage", ['INQUIRY', 'TRIAL', 'ACTIVE', 'LOST'])
export const activityAction = pgEnum("ActivityAction", ['CREATED', 'UPDATED', 'DELETED', 'ASSIGNED', 'UNASSIGNED', 'STAGE_CHANGED', 'STATUS_CHANGED', 'COMPLETED', 'ARCHIVED', 'RESTORED'])
export const activityType = pgEnum("ActivityType", ['CLIENT', 'DEAL', 'WORKFLOW', 'EXECUTION', 'PIPELINE', 'TASK', 'EMAIL', 'CALL', 'MEETING', 'NOTE', 'INSTRUCTOR', 'TIME_LOG', 'INVOICE', 'CREDENTIAL', 'WEBHOOK', 'INTEGRATION', 'LOCATION', 'ORGANIZATION', 'BOOKING', 'FUNNEL', 'CAMPAIGN'])
export const appProvider = pgEnum("AppProvider", ['GOOGLE_CALENDAR', 'GMAIL', 'GOOGLE', 'TELEGRAM', 'MICROSOFT', 'OUTLOOK', 'ONEDRIVE', 'MINDBODY', 'SLACK', 'DISCORD', 'GOOGLE_DRIVE', 'GOOGLE_FORMS'])
export const approvalStatus = pgEnum("ApprovalStatus", ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'])
export const automationEventType = pgEnum("AutomationEventType", ['WORKFLOW_COMPLETED', 'MEMBERSHIP_SIGNUP', 'INTRO_OFFER_REDEEMED', 'INTRO_OFFER_COMPLETED', 'CLASS_MILESTONE', 'LEAD_CONVERTED', 'BIRTHDAY', 'NO_SHOW', 'WAITLIST_SPOT_OPENED', 'MEMBERSHIP_EXPIRING', 'MEMBERSHIP_CANCELLED', 'CLASS_BOOKED', 'CLASS_CANCELLED', 'TAG_CHANGED', 'PAYMENT_SUCCEEDED', 'PAYMENT_FAILED'])
export const bankTransferStatus = pgEnum("BankTransferStatus", ['PENDING', 'PROOF_UPLOADED', 'VERIFIED', 'REJECTED'])
export const billingInterval = pgEnum("BillingInterval", ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY', 'ONE_TIME'])
export const billingModel = pgEnum("BillingModel", ['HOURLY', 'PER_SHIFT', 'WEEKLY_ROLLUP', 'MONTHLY_ROLLUP', 'RETAINER', 'PROJECT_MILESTONE', 'SUBSCRIPTION', 'CUSTOM'])
export const bookingLocationType = pgEnum("BookingLocationType", ['CAL_VIDEO', 'PHONE', 'IN_PERSON', 'GOOGLE_MEET', 'ZOOM', 'MS_TEAMS', 'CUSTOM'])
export const bookingStatus = pgEnum("BookingStatus", ['PENDING', 'CONFIRMED', 'CANCELLED', 'RESCHEDULED', 'NO_SHOW', 'COMPLETED'])
export const campaignRecipientStatus = pgEnum("CampaignRecipientStatus", ['PENDING', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'COMPLAINED', 'UNSUBSCRIBED', 'FAILED'])
export const campaignSegmentType = pgEnum("CampaignSegmentType", ['ALL', 'BY_TYPE', 'BY_TAGS', 'BY_LIFECYCLE', 'BY_COUNTRY', 'CUSTOM'])
export const campaignStatus = pgEnum("CampaignStatus", ['DRAFT', 'SCHEDULED', 'QUEUED', 'SENDING', 'SENT', 'PAUSED', 'FAILED', 'CANCELLED'])
export const cancellationChargeType = pgEnum("CancellationChargeType", ['LATE_CANCEL', 'NO_SHOW'])
export const checkInMethod = pgEnum("CheckInMethod", ['MANUAL', 'QR_CODE', 'GPS', 'BIOMETRIC', 'NFC'])
export const churnRiskLevel = pgEnum("ChurnRiskLevel", ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
export const classDifficulty = pgEnum("ClassDifficulty", ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'])
export const classInstanceStatus = pgEnum("ClassInstanceStatus", ['SCHEDULED', 'CANCELLED', 'COMPLETED', 'IN_PROGRESS'])
export const clientType = pgEnum("ClientType", ['LEAD', 'PROSPECT', 'CUSTOMER', 'CHURN', 'CLOSED'])
export const contentAccessLevel = pgEnum("ContentAccessLevel", ['PUBLIC', 'MEMBERS_ONLY', 'PAID'])
export const conversationChannel = pgEnum("ConversationChannel", ['SMS', 'EMAIL', 'APP'])
export const conversationStatus = pgEnum("ConversationStatus", ['OPEN', 'DONE', 'SNOOZED'])
export const credentialType = pgEnum("CredentialType", ['ANTHROPIC', 'GEMINI', 'OPENAI', 'TELEGRAM_BOT', 'MINDBODY', 'RESEND', 'CAL_COM'])
export const devicePlatform = pgEnum("DevicePlatform", ['IOS', 'ANDROID', 'WEB'])
export const deviceType = pgEnum("DeviceType", ['DESKTOP', 'TABLET', 'MOBILE'])
export const discountType = pgEnum("DiscountType", ['PERCENT', 'FIXED'])
export const emailDomainStatus = pgEnum("EmailDomainStatus", ['PENDING', 'VERIFYING', 'VERIFIED', 'FAILED'])
export const emailTemplateType = pgEnum("EmailTemplateType", ['MARKETING', 'ANNOUNCEMENT', 'PLAIN', 'CUSTOM'])
export const executionStatus = pgEnum("ExecutionStatus", ['RUNNING', 'SUCCESS', 'FAILED'])
export const externalChannelProvider = pgEnum("ExternalChannelProvider", ['RESERVE_WITH_GOOGLE', 'CLASSPASS', 'GYMPASS', 'WELLHUB'])
export const externalChannelStatus = pgEnum("ExternalChannelStatus", ['DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'ERROR'])
export const formFieldType = pgEnum("FormFieldType", ['SHORT_TEXT', 'LONG_TEXT', 'EMAIL', 'PHONE', 'NUMBER', 'URL', 'DATE', 'TIME', 'DATETIME', 'SELECT', 'RADIO', 'CHECKBOX', 'MULTI_SELECT', 'FILE_UPLOAD', 'RATING', 'SLIDER', 'SIGNATURE', 'PAYMENT'])
export const formStatus = pgEnum("FormStatus", ['DRAFT', 'PUBLISHED', 'ARCHIVED'])
export const funnelBlockType = pgEnum("FunnelBlockType", ['CONTAINER', 'ONE_COLUMN', 'TWO_COLUMN', 'THREE_COLUMN', 'SECTION', 'HEADING', 'PARAGRAPH', 'LABEL', 'RICH_TEXT', 'IMAGE', 'VIDEO', 'ICON', 'INPUT', 'TEXTAREA', 'SELECT', 'CHECKBOX', 'BUTTON', 'FORM', 'CARD', 'FAQ', 'TESTIMONIAL', 'PRICING', 'FEATURE_GRID', 'IFRAME', 'CUSTOM_HTML', 'SCRIPT', 'POPUP', 'COUNTDOWN_TIMER', 'STICKY_BAR'])
export const funnelDomainType = pgEnum("FunnelDomainType", ['SUBDOMAIN', 'CUSTOM'])
export const funnelStatus = pgEnum("FunnelStatus", ['DRAFT', 'PUBLISHED', 'ARCHIVED'])
export const funnelType = pgEnum("FunnelType", ['INTERNAL', 'EXTERNAL'])
export const householdRole = pgEnum("HouseholdRole", ['PRIMARY', 'PARTNER', 'CHILD', 'DEPENDENT', 'MEMBER'])
export const importSource = pgEnum("ImportSource", ['CSV', 'MINDBODY', 'GLOFOX', 'MOMOYOGA', 'ZEN_PLANNER'])
export const importStatus = pgEnum("ImportStatus", ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'ROLLED_BACK'])
export const installmentInterval = pgEnum("InstallmentInterval", ['WEEKLY', 'BIWEEKLY', 'MONTHLY'])
export const installmentProvider = pgEnum("InstallmentProvider", ['INTERNAL', 'STRIPE', 'AFFIRM', 'KLARNA', 'CLEARPAY', 'PAYPAL'])
export const instructorSubstitutionStatus = pgEnum("InstructorSubstitutionStatus", ['OPEN', 'OFFERED', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED'])
export const introOfferRedemptionStatus = pgEnum("IntroOfferRedemptionStatus", ['ACTIVE', 'EXPIRED', 'CONVERTED', 'CANCELLED'])
export const introOfferType = pgEnum("IntroOfferType", ['TRIAL_CLASSES', 'UNLIMITED_TRIAL', 'DISCOUNTED_PACK', 'FREE_CLASS', 'FIRST_MONTH_DISCOUNT'])
export const invoiceStatus = pgEnum("InvoiceStatus", ['DRAFT', 'SENT', 'VIEWED', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED'])
export const invoiceType = pgEnum("InvoiceType", ['SENT', 'RECEIVED'])
export const lifecycleStage = pgEnum("LifecycleStage", ['SUBSCRIBER', 'LEAD', 'MQL', 'SQL', 'OPPORTUNITY', 'CUSTOMER', 'EVANGELIST'])
export const loyaltyRewardType = pgEnum("LoyaltyRewardType", ['FREE_CLASS', 'DISCOUNT_PERCENT', 'DISCOUNT_FIXED', 'MERCHANDISE', 'EXPERIENCE'])
export const loyaltyTier = pgEnum("LoyaltyTier", ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'])
export const loyaltyTransactionType = pgEnum("LoyaltyTransactionType", ['EARN_CLASS', 'EARN_PURCHASE', 'EARN_REFERRAL', 'EARN_CHALLENGE', 'EARN_BONUS', 'REDEEM', 'EXPIRE', 'ADJUST'])
export const marketplaceListingStatus = pgEnum("MarketplaceListingStatus", ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'PAUSED', 'REJECTED'])
export const membershipPlanType = pgEnum("MembershipPlanType", ['UNLIMITED', 'CLASS_PACK', 'DROP_IN', 'TIME_BASED', 'TIERED', 'INTRO_OFFER', 'TRIAL'])
export const messageDirection = pgEnum("MessageDirection", ['INBOUND', 'OUTBOUND'])
export const moduleType = pgEnum("ModuleType", ['TIME_TRACKING', 'INVOICING', 'INVENTORY', 'BOOKING_CALENDAR', 'DOCUMENT_SIGNING', 'PROJECT_MANAGEMENT', 'PILATES_STUDIO', 'STUDIO_CORE'])
export const nodeType = pgEnum("NodeType", ['INITIAL', 'MANUAL_TRIGGER', 'GOOGLE_FORM_TRIGGER', 'GOOGLE_CALENDAR_TRIGGER', 'GOOGLE_CALENDAR_EXECUTION', 'GMAIL_TRIGGER', 'GMAIL_EXECUTION', 'TELEGRAM_TRIGGER', 'TELEGRAM_EXECUTION', 'STRIPE_TRIGGER', 'HTTP_REQUEST', 'GEMINI', 'ANTHROPIC', 'OPENAI', 'DISCORD', 'SLACK', 'WAIT', 'CREATE_CLIENT', 'UPDATE_CLIENT', 'DELETE_CLIENT', 'CREATE_DEAL', 'UPDATE_DEAL', 'DELETE_DEAL', 'UPDATE_PIPELINE', 'CLIENT_CREATED_TRIGGER', 'CLIENT_UPDATED_TRIGGER', 'CLIENT_FIELD_CHANGED_TRIGGER', 'CLIENT_DELETED_TRIGGER', 'CLIENT_TYPE_CHANGED_TRIGGER', 'CLIENT_LIFECYCLE_STAGE_CHANGED_TRIGGER', 'IF_ELSE', 'SWITCH', 'LOOP', 'SET_VARIABLE', 'STOP_WORKFLOW', 'BUNDLE_WORKFLOW', 'OUTLOOK_TRIGGER', 'OUTLOOK_EXECUTION', 'ONEDRIVE_TRIGGER', 'ONEDRIVE_EXECUTION', 'GOOGLE_CALENDAR_EVENT_CREATED', 'GOOGLE_CALENDAR_EVENT_UPDATED', 'GOOGLE_CALENDAR_EVENT_DELETED', 'GOOGLE_DRIVE_FILE_CREATED', 'GOOGLE_DRIVE_FILE_UPDATED', 'GOOGLE_DRIVE_FILE_DELETED', 'GOOGLE_DRIVE_FOLDER_CREATED', 'GOOGLE_CALENDAR_CREATE_EVENT', 'GOOGLE_CALENDAR_UPDATE_EVENT', 'GOOGLE_CALENDAR_DELETE_EVENT', 'GOOGLE_CALENDAR_FIND_AVAILABLE_TIMES', 'GMAIL_SEND_EMAIL', 'GMAIL_REPLY_TO_EMAIL', 'GMAIL_SEARCH_EMAILS', 'GMAIL_ADD_LABEL', 'GOOGLE_DRIVE_UPLOAD_FILE', 'GOOGLE_DRIVE_DOWNLOAD_FILE', 'GOOGLE_DRIVE_MOVE_FILE', 'GOOGLE_DRIVE_DELETE_FILE', 'GOOGLE_DRIVE_CREATE_FOLDER', 'GOOGLE_FORM_READ_RESPONSES', 'GOOGLE_FORM_CREATE_RESPONSE', 'OUTLOOK_NEW_EMAIL', 'OUTLOOK_EMAIL_MOVED', 'OUTLOOK_EMAIL_DELETED', 'ONEDRIVE_FILE_CREATED', 'ONEDRIVE_FILE_UPDATED', 'ONEDRIVE_FILE_DELETED', 'OUTLOOK_CALENDAR_EVENT_CREATED', 'OUTLOOK_CALENDAR_EVENT_UPDATED', 'OUTLOOK_CALENDAR_EVENT_DELETED', 'OUTLOOK_SEND_EMAIL', 'OUTLOOK_REPLY_TO_EMAIL', 'OUTLOOK_MOVE_EMAIL', 'OUTLOOK_SEARCH_EMAILS', 'ONEDRIVE_UPLOAD_FILE', 'ONEDRIVE_DOWNLOAD_FILE', 'ONEDRIVE_MOVE_FILE', 'ONEDRIVE_DELETE_FILE', 'OUTLOOK_CALENDAR_CREATE_EVENT', 'OUTLOOK_CALENDAR_UPDATE_EVENT', 'OUTLOOK_CALENDAR_DELETE_EVENT', 'SLACK_NEW_MESSAGE', 'SLACK_MESSAGE_REACTION', 'SLACK_CHANNEL_JOINED', 'DISCORD_NEW_MESSAGE', 'DISCORD_NEW_REACTION', 'DISCORD_USER_JOINED', 'TELEGRAM_NEW_MESSAGE', 'TELEGRAM_COMMAND_RECEIVED', 'SLACK_SEND_MESSAGE', 'SLACK_UPDATE_MESSAGE', 'SLACK_SEND_DM', 'SLACK_UPLOAD_FILE', 'DISCORD_SEND_MESSAGE', 'DISCORD_EDIT_MESSAGE', 'DISCORD_SEND_EMBED', 'DISCORD_SEND_DM', 'TELEGRAM_SEND_MESSAGE', 'TELEGRAM_SEND_PHOTO', 'TELEGRAM_SEND_DOCUMENT', 'FIND_CLIENTS', 'ADD_TAG_TO_CLIENT', 'REMOVE_TAG_FROM_CLIENT', 'DEAL_CREATED_TRIGGER', 'DEAL_UPDATED_TRIGGER', 'DEAL_DELETED_TRIGGER', 'DEAL_STAGE_CHANGED_TRIGGER', 'MOVE_DEAL_STAGE', 'ADD_DEAL_NOTE', 'APPOINTMENT_CREATED_TRIGGER', 'APPOINTMENT_CANCELLED_TRIGGER', 'SCHEDULE_APPOINTMENT', 'UPDATE_APPOINTMENT', 'CANCEL_APPOINTMENT', 'STRIPE_PAYMENT_SUCCEEDED', 'STRIPE_PAYMENT_FAILED', 'STRIPE_SUBSCRIPTION_CREATED', 'STRIPE_SUBSCRIPTION_UPDATED', 'STRIPE_SUBSCRIPTION_CANCELLED', 'STRIPE_CREATE_CHECKOUT_SESSION', 'STRIPE_CREATE_INVOICE', 'STRIPE_SEND_INVOICE', 'STRIPE_REFUND_PAYMENT', 'GEMINI_GENERATE_TEXT', 'GEMINI_SUMMARISE', 'GEMINI_TRANSFORM', 'GEMINI_CLASSIFY', 'EXECUTE_WORKFLOW', 'BIRTHDAY_TRIGGER', 'CLASS_BOOKED_TRIGGER', 'CLASS_CANCELLED_TRIGGER', 'MEMBER_CHECKED_IN_TRIGGER', 'MEMBER_NO_SHOW_TRIGGER', 'MEMBERSHIP_CREATED_TRIGGER', 'MEMBERSHIP_EXPIRING_TRIGGER', 'MEMBERSHIP_CANCELLED_TRIGGER', 'WAITLIST_SPOT_OPENED_TRIGGER', 'INTRO_OFFER_REDEEMED_TRIGGER', 'SEND_CLASS_REMINDER', 'AWARD_LOYALTY_POINTS', 'CALCULATE_CHURN_SCORE', 'SEND_SMS', 'INTRO_OFFER_COMPLETED_TRIGGER', 'MEMBER_CLASS_COUNT_TRIGGER', 'CLIENT_TAG_ADDED_TRIGGER', 'CLIENT_TAG_REMOVED_TRIGGER', 'STUDIO_PAYMENT_SUCCEEDED_TRIGGER', 'STUDIO_PAYMENT_FAILED_TRIGGER'])
export const organizationMemberRole = pgEnum("OrganizationMemberRole", ['owner', 'admin', 'manager', 'staff', 'viewer'])
export const paymentMethod = pgEnum("PaymentMethod", ['STRIPE', 'MANUAL', 'XERO', 'BANK_TRANSFER'])
export const payoutStatus = pgEnum("PayoutStatus", ['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED'])
export const payrollRunStatus = pgEnum("PayrollRunStatus", ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'])
export const performanceMetricSource = pgEnum("PerformanceMetricSource", ['MANUAL', 'WEARABLE', 'IMPORT'])
export const pixelProvider = pgEnum("PixelProvider", ['META_PIXEL', 'GOOGLE_ANALYTICS', 'TIKTOK_PIXEL', 'CUSTOM'])
export const pricingAdjustmentType = pgEnum("PricingAdjustmentType", ['PERCENT', 'FIXED_AMOUNT'])
export const recurringFrequency = pgEnum("RecurringFrequency", ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMIANNUALLY', 'ANNUALLY'])
export const recurringInvoiceStatus = pgEnum("RecurringInvoiceStatus", ['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'])
export const referralRewardType = pgEnum("ReferralRewardType", ['CREDIT', 'DISCOUNT', 'FREE_CLASS', 'CASH'])
export const referralStatus = pgEnum("ReferralStatus", ['PENDING', 'SIGNED_UP', 'CONVERTED', 'REWARDED', 'EXPIRED'])
export const retentionAutomationType = pgEnum("RetentionAutomationType", ['WELCOME_SEQUENCE', 'CLASS_REMINDER', 'NO_SHOW_FOLLOW_UP', 'MEMBERSHIP_EXPIRING', 'WIN_BACK', 'MILESTONE_CELEBRATION', 'ATTENDANCE_DROP', 'BIRTHDAY', 'REFERRAL_REQUEST', 'INTRO_OFFER_EXPIRING'])
export const rotaStatus = pgEnum("RotaStatus", ['SCHEDULED', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'])
export const shiftSwapStatus = pgEnum("ShiftSwapStatus", ['PENDING', 'INSTRUCTOR_ACCEPTED', 'INSTRUCTOR_REJECTED', 'ADMIN_APPROVED', 'ADMIN_REJECTED', 'CANCELLED', 'EXPIRED'])
export const smsProvider = pgEnum("SmsProvider", ['TWILIO', 'VONAGE', 'MESSAGEBIRD'])
export const smsStatus = pgEnum("SmsStatus", ['QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'FAILED', 'UNDELIVERED'])
export const spotType = pgEnum("SpotType", ['STANDARD', 'PREMIUM', 'INSTRUCTOR', 'BLOCKED', 'EQUIPMENT'])
export const studioBookingStatus = pgEnum("StudioBookingStatus", ['BOOKED', 'ATTENDED', 'CANCELLED', 'NO_SHOW', 'LATE_CANCEL'])
export const studioCheckInMethod = pgEnum("StudioCheckInMethod", ['QR_CODE', 'NFC', 'KIOSK', 'GEO', 'MANUAL', 'PIN', 'IMPORT'])
export const studioMembershipStatus = pgEnum("StudioMembershipStatus", ['ACTIVE', 'INACTIVE', 'CANCELLED', 'EXPIRED', 'PAUSED'])
export const studioPaymentStatus = pgEnum("StudioPaymentStatus", ['PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'CANCELLED'])
export const studioPaymentType = pgEnum("StudioPaymentType", ['MEMBERSHIP', 'CLASS_PACK', 'DROP_IN', 'GIFT_CARD', 'POS'])
export const studioProductType = pgEnum("StudioProductType", ['MEMBERSHIP_PLAN', 'CLASS_PACK', 'RETAIL', 'FEE', 'ACCOUNT_CREDIT', 'SHIPPING', 'TIP', 'EXTERNAL_REVENUE', 'GIFT_CARD', 'OTHER'])
export const clientDocumentType = pgEnum("ClientDocumentType", ['WAIVER', 'CONTRACT_SIGNATURE', 'PROFILE_FILE', 'SALE_IMAGE', 'OTHER'])
export const studioType = pgEnum("StudioType", ['YOGA', 'PILATES', 'GYM', 'CROSSFIT', 'BARRE', 'DANCE', 'MARTIAL_ARTS', 'SPIN', 'SWIM', 'MULTI_DISCIPLINE', 'OTHER'])
export const locationMemberRole = pgEnum("LocationMemberRole", ['AGENCY', 'ADMIN', 'MANAGER', 'STANDARD', 'LIMITED', 'VIEWER'])
export const subscriptionStatus = pgEnum("SubscriptionStatus", ['ACTIVE', 'FROZEN', 'CANCELLED', 'EXPIRED', 'PAST_DUE', 'TRIALING'])
export const taskPriority = pgEnum("TaskPriority", ['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
export const taskStatus = pgEnum("TaskStatus", ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'])
export const timeLogStatus = pgEnum("TimeLogStatus", ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'INVOICED'])
export const timeOffType = pgEnum("TimeOffType", ['VACATION', 'SICK', 'PERSONAL', 'BEREAVEMENT', 'PARENTAL', 'UNPAID', 'COMPENSATORY', 'PUBLIC_HOLIDAY', 'OTHER'])
export const userStatus = pgEnum("UserStatus", ['ONLINE', 'WORKING', 'DO_NOT_DISTURB', 'AWAY', 'OFFLINE'])
export const waitlistStatus = pgEnum("WaitlistStatus", ['WAITING', 'NOTIFIED', 'CONFIRMED', 'EXPIRED', 'CANCELLED_WAITLIST'])
export const webVitalMetric = pgEnum("WebVitalMetric", ['LCP', 'INP', 'CLS', 'FCP', 'TTFB', 'FID'])
export const webVitalRating = pgEnum("WebVitalRating", ['GOOD', 'NEEDS_IMPROVEMENT', 'POOR'])
export const webhookProvider = pgEnum("WebhookProvider", ['SLACK', 'DISCORD', 'STRIPE', 'CUSTOM'])
export const widgetType = pgEnum("WidgetType", ['SCHEDULE', 'BOOKING', 'MEMBERSHIP', 'INSTRUCTORS'])
export const instructorDocumentStatus = pgEnum("InstructorDocumentStatus", ['PENDING_UPLOAD', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED'])
export const instructorDocumentType = pgEnum("InstructorDocumentType", ['PASSPORT', 'DRIVING_LICENCE', 'NATIONAL_ID', 'VISA', 'RIGHT_TO_WORK', 'BIRTH_CERTIFICATE', 'DBS_CERTIFICATE', 'DBS_UPDATE_SERVICE', 'PROOF_OF_ADDRESS', 'PROOF_OF_NI', 'QUALIFICATION', 'CERTIFICATION', 'TRAINING_CERTIFICATE', 'FIRST_AID_CERTIFICATE', 'FOOD_HYGIENE', 'MANUAL_HANDLING', 'SAFEGUARDING', 'CONTRACT', 'SIGNED_POLICY', 'REFERENCE', 'HEALTH_DECLARATION', 'FIT_NOTE', 'VACCINATION_RECORD', 'OCCUPATIONAL_HEALTH', 'PHOTO', 'OTHER'])
export const instructorPaymentMethod = pgEnum("InstructorPaymentMethod", ['BANK_TRANSFER', 'CASH', 'CHEQUE', 'PAYPAL', 'STRIPE', 'OTHER'])
export const instructorPaymentStatus = pgEnum("InstructorPaymentStatus", ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED'])


export const organization = pgTable("Organization", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	logo: text(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
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
	currency: text().default('USD'),
	studioType: studioType(),
}, (table) => [
	uniqueIndex("Organization_slug_key").using("btree", table.slug.asc().nullsLast().op("text_ops")),
]).enableRLS();

export const prismaMigrations = pgTable("_prisma_migrations", {
	id: varchar({ length: 36 }).primaryKey().notNull(),
	checksum: varchar({ length: 64 }).notNull(),
	finishedAt: timestamp("finished_at", { withTimezone: true, mode: 'date' }),
	migrationName: varchar("migration_name", { length: 255 }).notNull(),
	logs: text(),
	rolledBackAt: timestamp("rolled_back_at", { withTimezone: true, mode: 'date' }),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
	appliedStepsCount: integer("applied_steps_count").default(0).notNull(),
}).enableRLS();

export const studioClass = pgTable("StudioClass", {
	id: text().primaryKey().notNull(),
	locationId: text(),
	externalId: text(),
	name: text().notNull(),
	description: text(),
	instructorName: text(),
	location: text(),
	startTime: timestamp({ precision: 3, mode: 'date' }).notNull(),
	endTime: timestamp({ precision: 3, mode: 'date' }).notNull(),
	maxCapacity: integer(),
	bookedCount: integer().default(0).notNull(),
	metadata: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	organizationId: text().notNull(),
	bookingWindowHours: integer().default(168),
	cancellationWindowHours: integer().default(12),
	classTypeId: text(),
	color: text(),
	difficulty: classDifficulty(),
	equipmentNeeded: text().array().default([]),
	instructorId: text(),
	isRecurring: boolean().default(false).notNull(),
	isVirtual: boolean().default(false).notNull(),
	minCapacity: integer(),
	recurrenceRule: text(),
	roomId: text(),
	roomName: text(),
	status: classInstanceStatus().default('SCHEDULED').notNull(),
}, (table) => [
	index("StudioClass_classTypeId_idx").using("btree", table.classTypeId.asc().nullsLast().op("text_ops")),
	index("StudioClass_externalId_idx").using("btree", table.externalId.asc().nullsLast().op("text_ops")),
	index("StudioClass_instructorId_idx").using("btree", table.instructorId.asc().nullsLast().op("text_ops")),
	index("StudioClass_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("StudioClass_startTime_idx").using("btree", table.startTime.asc().nullsLast().op("timestamp_ops")),
	index("StudioClass_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("StudioClass_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.classTypeId],
			foreignColumns: [classType.id],
			name: "StudioClass_classTypeId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.instructorId],
			foreignColumns: [instructor.id],
			name: "StudioClass_instructorId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "StudioClass_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.roomId],
			foreignColumns: [room.id],
			name: "StudioClass_roomId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "StudioClass_locationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const studioMembership = pgTable("StudioMembership", {
	id: text().primaryKey().notNull(),
	clientId: text().notNull(),
	externalId: text(),
	name: text().notNull(),
	type: text(),
	status: studioMembershipStatus().default('ACTIVE').notNull(),
	startDate: timestamp({ precision: 3, mode: 'date' }).notNull(),
	endDate: timestamp({ precision: 3, mode: 'date' }),
	renewalDate: timestamp({ precision: 3, mode: 'date' }),
	totalClasses: integer(),
	usedClasses: integer().default(0),
	price: numeric({ precision: 10, scale:  2 }),
	currency: text().default('USD'),
	metadata: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	autoRenew: boolean().default(true).notNull(),
	cancelReason: text(),
	cancelledAt: timestamp({ precision: 3, mode: 'date' }),
	frozenAt: timestamp({ precision: 3, mode: 'date' }),
	frozenUntil: timestamp({ precision: 3, mode: 'date' }),
	organizationId: text(),
	planId: text(),
	stripeSubscriptionId: text(),
	locationId: text(),
	paymentMethod: text(),
	paymentFrequency: text(),
	suspendNotes: text(),
	totalPayments: integer(),
	remainingPayments: integer(),
}, (table) => [
	index("StudioMembership_clientId_idx").using("btree", table.clientId.asc().nullsLast().op("text_ops")),
	index("StudioMembership_endDate_idx").using("btree", table.endDate.asc().nullsLast().op("timestamp_ops")),
	index("StudioMembership_externalId_idx").using("btree", table.externalId.asc().nullsLast().op("text_ops")),
	index("StudioMembership_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("StudioMembership_planId_idx").using("btree", table.planId.asc().nullsLast().op("text_ops")),
	index("StudioMembership_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("StudioMembership_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
			name: "StudioMembership_clientId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "StudioMembership_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.planId],
			foreignColumns: [membershipPlan.id],
			name: "StudioMembership_planId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "StudioMembership_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const workflows = pgTable("Workflows", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	userId: text().notNull(),
	archived: boolean().default(false).notNull(),
	isTemplate: boolean().default(false).notNull(),
	description: text(),
	locationId: text(),
	bundleInputs: jsonb(),
	bundleOutputs: jsonb(),
	isBundle: boolean().default(false).notNull(),
	organizationId: text(),
}, (table) => [
	index("Workflows_isBundle_idx").using("btree", table.isBundle.asc().nullsLast().op("bool_ops")),
	index("Workflows_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("Workflows_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "Workflows_organizationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "Workflows_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "Workflows_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const node = pgTable("Node", {
	id: text().primaryKey().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	name: text().notNull(),
	type: nodeType().notNull(),
	position: jsonb().notNull(),
	data: jsonb().default({}).notNull(),
	workflowId: text().notNull(),
	credentialId: text(),
}, (table) => [
	foreignKey({
			columns: [table.credentialId],
			foreignColumns: [credential.id],
			name: "Node_credentialId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.workflowId],
			foreignColumns: [workflows.id],
			name: "Node_workflowId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const credential = pgTable("Credential", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	value: text().notNull(),
	type: credentialType().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	userId: text().notNull(),
	metadata: jsonb(),
	locationId: text(),
}, (table) => [
	index("Credential_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "Credential_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "Credential_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const connection = pgTable("Connection", {
	id: text().primaryKey().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	fromNodeId: text().notNull(),
	toNodeId: text().notNull(),
	fromOutput: text().default('main').notNull(),
	toInput: text().default('main').notNull(),
	workflowId: text().notNull(),
}, (table) => [
	uniqueIndex("Connection_fromNodeId_toNodeId_fromOutput_toInput_key").using("btree", table.fromNodeId.asc().nullsLast().op("text_ops"), table.toNodeId.asc().nullsLast().op("text_ops"), table.fromOutput.asc().nullsLast().op("text_ops"), table.toInput.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.fromNodeId],
			foreignColumns: [node.id],
			name: "Connection_fromNodeId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.toNodeId],
			foreignColumns: [node.id],
			name: "Connection_toNodeId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.workflowId],
			foreignColumns: [workflows.id],
			name: "Connection_workflowId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const execution = pgTable("Execution", {
	id: text().primaryKey().notNull(),
	startedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	completedAt: timestamp({ precision: 3, mode: 'date' }),
	status: executionStatus().default('RUNNING').notNull(),
	inngestEventId: text().notNull(),
	output: jsonb(),
	workflowId: text().notNull(),
	error: text(),
	errorStack: text(),
	locationId: text(),
}, (table) => [
	uniqueIndex("Execution_inngestEventId_key").using("btree", table.inngestEventId.asc().nullsLast().op("text_ops")),
	index("Execution_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "Execution_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.workflowId],
			foreignColumns: [workflows.id],
			name: "Execution_workflowId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const googleCalendarSubscription = pgTable("GoogleCalendarSubscription", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	workflowId: text().notNull(),
	nodeId: text().notNull(),
	calendarId: text().notNull(),
	calendarName: text(),
	listenFor: text().array(),
	channelId: text().notNull(),
	resourceId: text().notNull(),
	webhookToken: text().notNull(),
	syncToken: text(),
	expiresAt: timestamp({ precision: 3, mode: 'date' }),
	lastSyncedAt: timestamp({ precision: 3, mode: 'date' }),
	timezone: text(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	variableName: text(),
}, (table) => [
	index("GoogleCalendarSubscription_channelId_idx").using("btree", table.channelId.asc().nullsLast().op("text_ops")),
	uniqueIndex("GoogleCalendarSubscription_nodeId_key").using("btree", table.nodeId.asc().nullsLast().op("text_ops")),
	index("GoogleCalendarSubscription_workflowId_idx").using("btree", table.workflowId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.nodeId],
			foreignColumns: [node.id],
			name: "GoogleCalendarSubscription_nodeId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "GoogleCalendarSubscription_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.workflowId],
			foreignColumns: [workflows.id],
			name: "GoogleCalendarSubscription_workflowId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const telegramTriggerState = pgTable("TelegramTriggerState", {
	id: text().primaryKey().notNull(),
	nodeId: text().notNull(),
	workflowId: text().notNull(),
	lastUpdateId: text(),
	lastTriggeredAt: timestamp({ precision: 3, mode: 'date' }),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	uniqueIndex("TelegramTriggerState_nodeId_key").using("btree", table.nodeId.asc().nullsLast().op("text_ops")),
	index("TelegramTriggerState_workflowId_idx").using("btree", table.workflowId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.nodeId],
			foreignColumns: [node.id],
			name: "TelegramTriggerState_nodeId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.workflowId],
			foreignColumns: [workflows.id],
			name: "TelegramTriggerState_workflowId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const gmailSubscription = pgTable("GmailSubscription", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	emailAddress: text().notNull(),
	labelIds: text().array(),
	topicName: text().notNull(),
	historyId: text(),
	expiresAt: timestamp({ precision: 3, mode: 'date' }),
	lastSyncedAt: timestamp({ precision: 3, mode: 'date' }),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("GmailSubscription_emailAddress_idx").using("btree", table.emailAddress.asc().nullsLast().op("text_ops")),
	uniqueIndex("GmailSubscription_userId_key").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "GmailSubscription_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const gmailTriggerState = pgTable("GmailTriggerState", {
	id: text().primaryKey().notNull(),
	nodeId: text().notNull(),
	workflowId: text().notNull(),
	lastMessageId: text(),
	lastTriggeredAt: timestamp({ precision: 3, mode: 'date' }),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	uniqueIndex("GmailTriggerState_nodeId_key").using("btree", table.nodeId.asc().nullsLast().op("text_ops")),
	index("GmailTriggerState_workflowId_idx").using("btree", table.workflowId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.nodeId],
			foreignColumns: [node.id],
			name: "GmailTriggerState_nodeId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.workflowId],
			foreignColumns: [workflows.id],
			name: "GmailTriggerState_workflowId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const classType = pgTable("ClassType", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	description: text(),
	color: text(),
	icon: text(),
	isActive: boolean().default(true).notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("ClassType_isActive_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("ClassType_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	uniqueIndex("ClassType_organizationId_slug_key").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.slug.asc().nullsLast().op("text_ops")),
	index("ClassType_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "ClassType_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "ClassType_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const room = pgTable("Room", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	capacity: integer(),
	description: text(),
	organizationId: text().notNull(),
	locationId: text(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("Room_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("Room_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "Room_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "Room_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const webhook = pgTable("Webhook", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	provider: webhookProvider().notNull(),
	url: text().notNull(),
	signingSecret: text(),
	description: text(),
	metadata: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	userId: text().notNull(),
	locationId: text(),
}, (table) => [
	index("Webhook_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "Webhook_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "Webhook_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const classCredit = pgTable("ClassCredit", {
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
	expiresAt: timestamp({ precision: 3, mode: 'date' }),
	metadata: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("ClassCredit_clientId_idx").using("btree", table.clientId.asc().nullsLast().op("text_ops")),
	index("ClassCredit_expiresAt_idx").using("btree", table.expiresAt.asc().nullsLast().op("timestamp_ops")),
	index("ClassCredit_externalId_idx").using("btree", table.externalId.asc().nullsLast().op("text_ops")),
	index("ClassCredit_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	index("ClassCredit_membershipId_idx").using("btree", table.membershipId.asc().nullsLast().op("text_ops")),
	index("ClassCredit_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("ClassCredit_paymentRefNo_idx").using("btree", table.paymentRefNo.asc().nullsLast().op("text_ops")),
	index("ClassCredit_productId_idx").using("btree", table.productId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
			name: "ClassCredit_clientId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "ClassCredit_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "ClassCredit_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.membershipId],
			foreignColumns: [studioMembership.id],
			name: "ClassCredit_membershipId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const classWaitlist = pgTable("ClassWaitlist", {
	id: text().primaryKey().notNull(),
	classId: text().notNull(),
	clientId: text().notNull(),
	position: integer().notNull(),
	joinedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	notifiedAt: timestamp({ precision: 3, mode: 'date' }),
	respondedAt: timestamp({ precision: 3, mode: 'date' }),
	status: waitlistStatus().default('WAITING').notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	uniqueIndex("ClassWaitlist_classId_clientId_key").using("btree", table.classId.asc().nullsLast().op("text_ops"), table.clientId.asc().nullsLast().op("text_ops")),
	index("ClassWaitlist_classId_idx").using("btree", table.classId.asc().nullsLast().op("text_ops")),
	index("ClassWaitlist_clientId_idx").using("btree", table.clientId.asc().nullsLast().op("text_ops")),
	index("ClassWaitlist_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.classId],
			foreignColumns: [studioClass.id],
			name: "ClassWaitlist_classId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
			name: "ClassWaitlist_clientId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const checkIn = pgTable("CheckIn", {
	id: text().primaryKey().notNull(),
	clientId: text().notNull(),
	classId: text().notNull(),
	method: studioCheckInMethod().default('MANUAL').notNull(),
	checkedInAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	checkedInBy: text(),
	isLateArrival: boolean().default(false).notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	metadata: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("CheckIn_checkedInAt_idx").using("btree", table.checkedInAt.asc().nullsLast().op("timestamp_ops")),
	index("CheckIn_classId_idx").using("btree", table.classId.asc().nullsLast().op("text_ops")),
	index("CheckIn_clientId_idx").using("btree", table.clientId.asc().nullsLast().op("text_ops")),
	index("CheckIn_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("CheckIn_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.classId],
			foreignColumns: [studioClass.id],
			name: "CheckIn_classId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
			name: "CheckIn_clientId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "CheckIn_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "CheckIn_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const membershipPlan = pgTable("MembershipPlan", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	type: membershipPlanType().notNull(),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
	currency: text().default('USD').notNull(),
	billingInterval: billingInterval().default('MONTHLY').notNull(),
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
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	platformFeePercent: numeric({ precision: 5, scale:  2 }).default('0'),
	stripePriceId: text(),
	stripeProductId: text(),
}, (table) => [
	index("MembershipPlan_isActive_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("MembershipPlan_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("MembershipPlan_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	index("MembershipPlan_type_idx").using("btree", table.type.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "MembershipPlan_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "MembershipPlan_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const stripeEvent = pgTable("StripeEvent", {
	id: text().primaryKey().notNull(),
	stripeEventId: text().notNull(),
	type: text().notNull(),
	organizationId: text(),
	locationId: text(),
	processedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("StripeEvent_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	uniqueIndex("StripeEvent_stripeEventId_key").using("btree", table.stripeEventId.asc().nullsLast().op("text_ops")),
	index("StripeEvent_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	index("StripeEvent_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
]).enableRLS();

export const apps = pgTable("Apps", {
	id: text().primaryKey().notNull(),
	provider: appProvider().notNull(),
	accessToken: text(),
	refreshToken: text(),
	expiresAt: timestamp({ precision: 3, mode: 'date' }),
	scopes: text().array(),
	metadata: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	userId: text().notNull(),
}, (table) => [
	uniqueIndex("Apps_userId_provider_key").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.provider.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "Apps_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const aiLog = pgTable("AILog", {
	id: text().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	intent: text(),
	userMessage: text().notNull(),
	status: aiLogStatus().default('RUNNING').notNull(),
	error: text(),
	result: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	completedAt: timestamp({ precision: 3, mode: 'date' }),
	userId: text().notNull(),
	organizationId: text(),
	locationId: text(),
}, (table) => [
	index("AILog_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("AILog_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	index("AILog_userId_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "AILog_organizationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "AILog_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "AILog_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const outlookSubscription = pgTable("OutlookSubscription", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	emailAddress: text().notNull(),
	subscriptionId: text(),
	expiresAt: timestamp({ precision: 3, mode: 'date' }),
	lastSyncedAt: timestamp({ precision: 3, mode: 'date' }),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("OutlookSubscription_emailAddress_idx").using("btree", table.emailAddress.asc().nullsLast().op("text_ops")),
	uniqueIndex("OutlookSubscription_userId_key").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "OutlookSubscription_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const outlookTriggerState = pgTable("OutlookTriggerState", {
	id: text().primaryKey().notNull(),
	nodeId: text().notNull(),
	workflowId: text().notNull(),
	lastMessageId: text(),
	lastTriggeredAt: timestamp({ precision: 3, mode: 'date' }),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	uniqueIndex("OutlookTriggerState_nodeId_key").using("btree", table.nodeId.asc().nullsLast().op("text_ops")),
	index("OutlookTriggerState_workflowId_idx").using("btree", table.workflowId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.nodeId],
			foreignColumns: [node.id],
			name: "OutlookTriggerState_nodeId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.workflowId],
			foreignColumns: [workflows.id],
			name: "OutlookTriggerState_workflowId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const oneDriveSubscription = pgTable("OneDriveSubscription", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	subscriptionId: text(),
	expiresAt: timestamp({ precision: 3, mode: 'date' }),
	lastSyncedAt: timestamp({ precision: 3, mode: 'date' }),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	uniqueIndex("OneDriveSubscription_userId_key").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "OneDriveSubscription_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const oneDriveTriggerState = pgTable("OneDriveTriggerState", {
	id: text().primaryKey().notNull(),
	nodeId: text().notNull(),
	workflowId: text().notNull(),
	lastDeltaLink: text(),
	lastTriggeredAt: timestamp({ precision: 3, mode: 'date' }),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	uniqueIndex("OneDriveTriggerState_nodeId_key").using("btree", table.nodeId.asc().nullsLast().op("text_ops")),
	index("OneDriveTriggerState_workflowId_idx").using("btree", table.workflowId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.nodeId],
			foreignColumns: [node.id],
			name: "OneDriveTriggerState_nodeId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.workflowId],
			foreignColumns: [workflows.id],
			name: "OneDriveTriggerState_workflowId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const studioPayment = pgTable("StudioPayment", {
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
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	currency: text().default('GBP').notNull(),
	status: studioPaymentStatus().default('PENDING').notNull(),
	type: studioPaymentType().notNull(),
	description: text(),
	metadata: jsonb(),
	promoCodeId: text(),
	discountAmount: numeric({ precision: 10, scale:  2 }),
	taxAmount: numeric({ precision: 10, scale:  2 }),
	deletedAt: timestamp({ precision: 3, mode: 'date' }),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("StudioPayment_clientId_idx").using("btree", table.clientId.asc().nullsLast().op("text_ops")),
	index("StudioPayment_createdAt_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("StudioPayment_externalId_idx").using("btree", table.externalId.asc().nullsLast().op("text_ops")),
	index("StudioPayment_membershipId_idx").using("btree", table.membershipId.asc().nullsLast().op("text_ops")),
	index("StudioPayment_mindbodyPmtRefNo_idx").using("btree", table.mindbodyPmtRefNo.asc().nullsLast().op("text_ops")),
	index("StudioPayment_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("StudioPayment_paymentMethod_idx").using("btree", table.paymentMethod.asc().nullsLast().op("text_ops")),
	index("StudioPayment_productId_idx").using("btree", table.productId.asc().nullsLast().op("text_ops")),
	index("StudioPayment_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	uniqueIndex("StudioPayment_stripePaymentIntentId_key").using("btree", table.stripePaymentIntentId.asc().nullsLast().op("text_ops")),
	index("StudioPayment_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	index("StudioPayment_type_idx").using("btree", table.type.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
			name: "StudioPayment_clientId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.membershipId],
			foreignColumns: [studioMembership.id],
			name: "StudioPayment_membershipId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "StudioPayment_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.promoCodeId],
			foreignColumns: [promoCode.id],
			name: "StudioPayment_promoCodeId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "StudioPayment_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const promoCode = pgTable("PromoCode", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	code: text().notNull(),
	discountType: discountType().default('PERCENT').notNull(),
	discountValue: numeric({ precision: 10, scale:  2 }).notNull(),
	maxRedemptions: integer(),
	redemptionCount: integer().default(0).notNull(),
	applicablePlanIds: text().array().default([]),
	expiresAt: timestamp({ precision: 3, mode: 'date' }),
	isActive: boolean().default(true).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("PromoCode_isActive_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	uniqueIndex("PromoCode_organizationId_code_key").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.code.asc().nullsLast().op("text_ops")),
	index("PromoCode_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("PromoCode_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "PromoCode_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "PromoCode_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const instructorPayout = pgTable("InstructorPayout", {
	id: text().primaryKey().notNull(),
	instructorId: text().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	stripeTransferId: text(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	currency: text().default('GBP').notNull(),
	status: payoutStatus().default('PENDING').notNull(),
	periodStart: timestamp({ precision: 3, mode: 'date' }).notNull(),
	periodEnd: timestamp({ precision: 3, mode: 'date' }).notNull(),
	classesCount: integer().default(0).notNull(),
	notes: text(),
	paidAt: timestamp({ precision: 3, mode: 'date' }),
	deletedAt: timestamp({ precision: 3, mode: 'date' }),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("InstructorPayout_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("InstructorPayout_periodStart_idx").using("btree", table.periodStart.asc().nullsLast().op("timestamp_ops")),
	index("InstructorPayout_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	uniqueIndex("InstructorPayout_stripeTransferId_key").using("btree", table.stripeTransferId.asc().nullsLast().op("text_ops")),
	index("InstructorPayout_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	index("InstructorPayout_instructorId_idx").using("btree", table.instructorId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "InstructorPayout_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "InstructorPayout_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.instructorId],
			foreignColumns: [instructor.id],
			name: "InstructorPayout_instructorId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const giftCard = pgTable("GiftCard", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	code: text().notNull(),
	initialValue: numeric({ precision: 10, scale:  2 }).notNull(),
	remainingBalance: numeric({ precision: 10, scale:  2 }).notNull(),
	currency: text().default('GBP').notNull(),
	purchasedByClientId: text(),
	redeemedByClientId: text(),
	isActive: boolean().default(true).notNull(),
	purchasedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	redeemedAt: timestamp({ precision: 3, mode: 'date' }),
	expiresAt: timestamp({ precision: 3, mode: 'date' }),
	notes: text(),
	stripePaymentIntentId: text(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("GiftCard_isActive_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	uniqueIndex("GiftCard_organizationId_code_key").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.code.asc().nullsLast().op("text_ops")),
	index("GiftCard_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("GiftCard_purchasedByClientId_idx").using("btree", table.purchasedByClientId.asc().nullsLast().op("text_ops")),
	index("GiftCard_redeemedByClientId_idx").using("btree", table.redeemedByClientId.asc().nullsLast().op("text_ops")),
	uniqueIndex("GiftCard_stripePaymentIntentId_key").using("btree", table.stripePaymentIntentId.asc().nullsLast().op("text_ops")),
	index("GiftCard_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "GiftCard_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.purchasedByClientId],
			foreignColumns: [client.id],
			name: "GiftCard_purchasedByClientId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.redeemedByClientId],
			foreignColumns: [client.id],
			name: "GiftCard_redeemedByClientId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "GiftCard_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const studioProduct = pgTable("StudioProduct", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	externalId: text(),
	sku: text(),
	name: text().notNull(),
	description: text(),
	type: studioProductType().default('OTHER').notNull(),
	category: text(),
	price: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	cost: numeric({ precision: 10, scale:  2 }),
	currency: text().default('GBP').notNull(),
	taxRate: numeric({ precision: 5, scale:  2 }),
	trackInventory: boolean().default(false).notNull(),
	stockQuantity: integer(),
	lowStockThreshold: integer(),
	isActive: boolean().default(true).notNull(),
	isPublic: boolean().default(true).notNull(),
	metadata: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	deletedAt: timestamp({ precision: 3, mode: 'date' }),
}, (table) => [
	index("StudioProduct_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("StudioProduct_isActive_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("StudioProduct_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	index("StudioProduct_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("StudioProduct_organizationId_locationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.locationId.asc().nullsLast().op("text_ops")),
	index("StudioProduct_type_idx").using("btree", table.type.asc().nullsLast().op("enum_ops")),
	uniqueIndex("StudioProduct_organizationId_externalId_key").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.externalId.asc().nullsLast().op("text_ops")),
	uniqueIndex("StudioProduct_organizationId_sku_key").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.sku.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "StudioProduct_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "StudioProduct_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const studioPaymentLineItem = pgTable("StudioPaymentLineItem", {
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
	unitPrice: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	discountAmount: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	amount: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	currency: text().default('GBP').notNull(),
	returned: boolean().default(false).notNull(),
	soldAt: timestamp({ precision: 3, mode: 'date' }),
	metadata: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	deletedAt: timestamp({ precision: 3, mode: 'date' }),
}, (table) => [
	index("StudioPaymentLineItem_clientId_idx").using("btree", table.clientId.asc().nullsLast().op("text_ops")),
	index("StudioPaymentLineItem_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	index("StudioPaymentLineItem_mindbodyPmtRefNo_idx").using("btree", table.mindbodyPmtRefNo.asc().nullsLast().op("text_ops")),
	index("StudioPaymentLineItem_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("StudioPaymentLineItem_paymentId_idx").using("btree", table.paymentId.asc().nullsLast().op("text_ops")),
	index("StudioPaymentLineItem_productId_idx").using("btree", table.productId.asc().nullsLast().op("text_ops")),
	index("StudioPaymentLineItem_saleId_idx").using("btree", table.saleId.asc().nullsLast().op("text_ops")),
	index("StudioPaymentLineItem_soldAt_idx").using("btree", table.soldAt.asc().nullsLast().op("timestamp_ops")),
	uniqueIndex("StudioPaymentLineItem_organizationId_externalId_key").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.externalId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
			name: "StudioPaymentLineItem_clientId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "StudioPaymentLineItem_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "StudioPaymentLineItem_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.paymentId],
			foreignColumns: [studioPayment.id],
			name: "StudioPaymentLineItem_paymentId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [studioProduct.id],
			name: "StudioPaymentLineItem_productId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const apiKey = pgTable("ApiKey", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	name: text().notNull(),
	keyHash: text().notNull(),
	keyPrefix: text().notNull(),
	scopes: text().array().default([]),
	lastUsedAt: timestamp({ precision: 3, mode: 'date' }),
	expiresAt: timestamp({ precision: 3, mode: 'date' }),
	isActive: boolean().default(true).notNull(),
	createdBy: text().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("ApiKey_isActive_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("ApiKey_keyHash_idx").using("btree", table.keyHash.asc().nullsLast().op("text_ops")),
	uniqueIndex("ApiKey_keyHash_key").using("btree", table.keyHash.asc().nullsLast().op("text_ops")),
	index("ApiKey_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "ApiKey_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const widgetConfig = pgTable("WidgetConfig", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	name: text().notNull(),
	type: widgetType().default('SCHEDULE').notNull(),
	config: jsonb().default({}).notNull(),
	isActive: boolean().default(true).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("WidgetConfig_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("WidgetConfig_type_idx").using("btree", table.type.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "WidgetConfig_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const importJob = pgTable("ImportJob", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	source: importSource().default('CSV').notNull(),
	status: importStatus().default('PENDING').notNull(),
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
	startedAt: timestamp({ precision: 3, mode: 'date' }),
	completedAt: timestamp({ precision: 3, mode: 'date' }),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("ImportJob_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	index("ImportJob_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("ImportJob_source_idx").using("btree", table.source.asc().nullsLast().op("enum_ops")),
	index("ImportJob_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "ImportJob_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "ImportJob_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const deviceToken = pgTable("DeviceToken", {
	id: text().primaryKey().notNull(),
	clientId: text().notNull(),
	organizationId: text().notNull(),
	token: text().notNull(),
	platform: devicePlatform().notNull(),
	isActive: boolean().default(true).notNull(),
	lastUsedAt: timestamp({ precision: 3, mode: 'date' }),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("DeviceToken_clientId_idx").using("btree", table.clientId.asc().nullsLast().op("text_ops")),
	uniqueIndex("DeviceToken_clientId_token_key").using("btree", table.clientId.asc().nullsLast().op("text_ops"), table.token.asc().nullsLast().op("text_ops")),
	index("DeviceToken_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("DeviceToken_token_idx").using("btree", table.token.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
			name: "DeviceToken_clientId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "DeviceToken_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const mobileSession = pgTable("MobileSession", {
	id: text().primaryKey().notNull(),
	clientId: text().notNull(),
	organizationId: text().notNull(),
	sessionToken: text().notNull(),
	expiresAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("MobileSession_clientId_idx").using("btree", table.clientId.asc().nullsLast().op("text_ops")),
	index("MobileSession_sessionToken_idx").using("btree", table.sessionToken.asc().nullsLast().op("text_ops")),
	uniqueIndex("MobileSession_sessionToken_key").using("btree", table.sessionToken.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
			name: "MobileSession_clientId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "MobileSession_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const inboxConversation = pgTable("InboxConversation", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	clientId: text(),
	channel: conversationChannel().notNull(),
	status: conversationStatus().default('OPEN').notNull(),
	subject: text(),
	isRead: boolean().default(true).notNull(),
	lastMessageAt: timestamp({ precision: 3, mode: 'date' }),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("InboxConversation_clientId_idx").using("btree", table.clientId.asc().nullsLast().op("text_ops")),
	index("InboxConversation_lastMessageAt_idx").using("btree", table.lastMessageAt.asc().nullsLast().op("timestamp_ops")),
	index("InboxConversation_organizationId_locationId_isRead_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.locationId.asc().nullsLast().op("text_ops"), table.isRead.asc().nullsLast().op("bool_ops")),
	index("InboxConversation_organizationId_locationId_status_idx").using("btree", table.organizationId.asc().nullsLast().op("enum_ops"), table.locationId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
			name: "InboxConversation_clientId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "InboxConversation_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "InboxConversation_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const inboxMessage = pgTable("InboxMessage", {
	id: text().primaryKey().notNull(),
	conversationId: text().notNull(),
	direction: messageDirection().notNull(),
	content: text().notNull(),
	isRead: boolean().default(false).notNull(),
	senderUserId: text(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("InboxMessage_conversationId_createdAt_idx").using("btree", table.conversationId.asc().nullsLast().op("text_ops"), table.createdAt.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [inboxConversation.id],
			name: "InboxMessage_conversationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const clientInstructor = pgTable("ClientInstructor", {
	id: text().primaryKey().notNull(),
	clientId: text().notNull(),
	instructorId: text().notNull(),
	assignedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	uniqueIndex("ClientInstructor_clientId_instructorId_key").using("btree", table.clientId.asc().nullsLast().op("text_ops"), table.instructorId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
			name: "ClientInstructor_clientId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.instructorId],
			foreignColumns: [instructor.id],
			name: "ClientInstructor_instructorId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const externalChannelIntegration = pgTable("ExternalChannelIntegration", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	provider: externalChannelProvider().notNull(),
	status: externalChannelStatus().default('DRAFT').notNull(),
	accountName: text(),
	externalAccountId: text(),
	bookingUrl: text(),
	credentials: jsonb(),
	config: jsonb(),
	lastSyncedAt: timestamp({ precision: 3, mode: 'date' }),
	enabledAt: timestamp({ precision: 3, mode: 'date' }),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("ExternalChannelIntegration_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	uniqueIndex("ExternalChannelIntegration_organizationId_locationId_prov_key").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.locationId.asc().nullsLast().op("text_ops"), table.provider.asc().nullsLast().op("text_ops")),
	index("ExternalChannelIntegration_provider_idx").using("btree", table.provider.asc().nullsLast().op("enum_ops")),
	index("ExternalChannelIntegration_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("ExternalChannelIntegration_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "ExternalChannelIntegration_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "ExternalChannelIntegration_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const clientHousehold = pgTable("ClientHousehold", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	name: text().notNull(),
	primaryContactId: text(),
	notes: text(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("ClientHousehold_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("ClientHousehold_organizationId_locationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.locationId.asc().nullsLast().op("text_ops")),
	index("ClientHousehold_primaryContactId_idx").using("btree", table.primaryContactId.asc().nullsLast().op("text_ops")),
	index("ClientHousehold_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "ClientHousehold_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.primaryContactId],
			foreignColumns: [client.id],
			name: "ClientHousehold_primaryContactId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "ClientHousehold_locationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const clientHouseholdMember = pgTable("ClientHouseholdMember", {
	id: text().primaryKey().notNull(),
	householdId: text().notNull(),
	clientId: text().notNull(),
	role: householdRole().default('MEMBER').notNull(),
	relationship: text(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("ClientHouseholdMember_clientId_idx").using("btree", table.clientId.asc().nullsLast().op("text_ops")),
	uniqueIndex("ClientHouseholdMember_householdId_clientId_key").using("btree", table.householdId.asc().nullsLast().op("text_ops"), table.clientId.asc().nullsLast().op("text_ops")),
	index("ClientHouseholdMember_householdId_idx").using("btree", table.householdId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
			name: "ClientHouseholdMember_clientId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.householdId],
			foreignColumns: [clientHousehold.id],
			name: "ClientHouseholdMember_householdId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const instructorSubstitutionRequest = pgTable("InstructorSubstitutionRequest", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	classId: text().notNull(),
	originalInstructorId: text(),
	substituteId: text(),
	status: instructorSubstitutionStatus().default('OPEN').notNull(),
	reason: text(),
	requestedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	acceptedAt: timestamp({ precision: 3, mode: 'date' }),
	declinedAt: timestamp({ precision: 3, mode: 'date' }),
	expiresAt: timestamp({ precision: 3, mode: 'date' }),
	notes: text(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("InstructorSubstitutionRequest_classId_idx").using("btree", table.classId.asc().nullsLast().op("text_ops")),
	index("InstructorSubstitutionRequest_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("InstructorSubstitutionRequest_organizationId_status_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("enum_ops")),
	index("InstructorSubstitutionRequest_originalInstructorId_idx").using("btree", table.originalInstructorId.asc().nullsLast().op("text_ops")),
	index("InstructorSubstitutionRequest_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("InstructorSubstitutionRequest_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	index("InstructorSubstitutionRequest_substituteId_idx").using("btree", table.substituteId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.classId],
			foreignColumns: [studioClass.id],
			name: "InstructorSubstitutionRequest_classId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "InstructorSubstitutionRequest_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.originalInstructorId],
			foreignColumns: [instructor.id],
			name: "InstructorSubstitutionRequest_originalInstructorId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "InstructorSubstitutionRequest_locationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.substituteId],
			foreignColumns: [instructor.id],
			name: "InstructorSubstitutionRequest_substituteId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const dynamicPricingRule = pgTable("DynamicPricingRule", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	name: text().notNull(),
	classTypeId: text(),
	daysOfWeek: integer().array().default([]),
	startsAt: timestamp({ precision: 3, mode: 'date' }),
	endsAt: timestamp({ precision: 3, mode: 'date' }),
	adjustmentType: pricingAdjustmentType().notNull(),
	adjustmentValue: numeric({ precision: 10, scale:  2 }).notNull(),
	minPrice: numeric({ precision: 10, scale:  2 }),
	maxPrice: numeric({ precision: 10, scale:  2 }),
	demandThresholdPercent: integer(),
	isActive: boolean().default(true).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("DynamicPricingRule_classTypeId_idx").using("btree", table.classTypeId.asc().nullsLast().op("text_ops")),
	index("DynamicPricingRule_isActive_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("DynamicPricingRule_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("DynamicPricingRule_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.classTypeId],
			foreignColumns: [classType.id],
			name: "DynamicPricingRule_classTypeId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "DynamicPricingRule_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "DynamicPricingRule_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const studioPaymentPlan = pgTable("StudioPaymentPlan", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	membershipPlanId: text(),
	name: text().notNull(),
	provider: installmentProvider().default('INTERNAL').notNull(),
	depositAmount: numeric({ precision: 10, scale:  2 }),
	installmentCount: integer().notNull(),
	interval: installmentInterval().default('MONTHLY').notNull(),
	feeAmount: numeric({ precision: 10, scale:  2 }),
	feePercent: numeric({ precision: 5, scale:  2 }),
	isActive: boolean().default(true).notNull(),
	terms: text(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("StudioPaymentPlan_isActive_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("StudioPaymentPlan_membershipPlanId_idx").using("btree", table.membershipPlanId.asc().nullsLast().op("text_ops")),
	index("StudioPaymentPlan_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("StudioPaymentPlan_provider_idx").using("btree", table.provider.asc().nullsLast().op("enum_ops")),
	index("StudioPaymentPlan_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.membershipPlanId],
			foreignColumns: [membershipPlan.id],
			name: "StudioPaymentPlan_membershipPlanId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "StudioPaymentPlan_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "StudioPaymentPlan_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const videoOnDemandAsset = pgTable("VideoOnDemandAsset", {
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
	accessLevel: contentAccessLevel().default('MEMBERS_ONLY').notNull(),
	price: numeric({ precision: 10, scale:  2 }),
	isPublished: boolean().default(false).notNull(),
	publishedAt: timestamp({ precision: 3, mode: 'date' }),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("VideoOnDemandAsset_classTypeId_idx").using("btree", table.classTypeId.asc().nullsLast().op("text_ops")),
	index("VideoOnDemandAsset_instructorId_idx").using("btree", table.instructorId.asc().nullsLast().op("text_ops")),
	index("VideoOnDemandAsset_isPublished_idx").using("btree", table.isPublished.asc().nullsLast().op("bool_ops")),
	index("VideoOnDemandAsset_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("VideoOnDemandAsset_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.classTypeId],
			foreignColumns: [classType.id],
			name: "VideoOnDemandAsset_classTypeId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.instructorId],
			foreignColumns: [instructor.id],
			name: "VideoOnDemandAsset_instructorId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "VideoOnDemandAsset_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "VideoOnDemandAsset_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const accessControlIntegration = pgTable("AccessControlIntegration", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	provider: accessControlProvider().notNull(),
	locationName: text(),
	status: externalChannelStatus().default('DRAFT').notNull(),
	config: jsonb(),
	credentials: jsonb(),
	lastSyncedAt: timestamp({ precision: 3, mode: 'date' }),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("AccessControlIntegration_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("AccessControlIntegration_provider_idx").using("btree", table.provider.asc().nullsLast().op("enum_ops")),
	index("AccessControlIntegration_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("AccessControlIntegration_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "AccessControlIntegration_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "AccessControlIntegration_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const performanceMetric = pgTable("PerformanceMetric", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	clientId: text().notNull(),
	source: performanceMetricSource().default('MANUAL').notNull(),
	metricType: text().notNull(),
	value: numeric({ precision: 12, scale:  4 }).notNull(),
	unit: text().notNull(),
	recordedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	notes: text(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("PerformanceMetric_clientId_recordedAt_idx").using("btree", table.clientId.asc().nullsLast().op("text_ops"), table.recordedAt.asc().nullsLast().op("timestamp_ops")),
	index("PerformanceMetric_metricType_idx").using("btree", table.metricType.asc().nullsLast().op("text_ops")),
	index("PerformanceMetric_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("PerformanceMetric_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
			name: "PerformanceMetric_clientId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "PerformanceMetric_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "PerformanceMetric_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const workoutProgram = pgTable("WorkoutProgram", {
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
	publishedAt: timestamp({ precision: 3, mode: 'date' }),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("WorkoutProgram_classTypeId_idx").using("btree", table.classTypeId.asc().nullsLast().op("text_ops")),
	index("WorkoutProgram_coachId_idx").using("btree", table.coachId.asc().nullsLast().op("text_ops")),
	index("WorkoutProgram_isPublished_idx").using("btree", table.isPublished.asc().nullsLast().op("bool_ops")),
	index("WorkoutProgram_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("WorkoutProgram_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.classTypeId],
			foreignColumns: [classType.id],
			name: "WorkoutProgram_classTypeId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.coachId],
			foreignColumns: [instructor.id],
			name: "WorkoutProgram_coachId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "WorkoutProgram_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "WorkoutProgram_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const soapNote = pgTable("SoapNote", {
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
	signedAt: timestamp({ precision: 3, mode: 'date' }),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("SoapNote_authorId_idx").using("btree", table.authorId.asc().nullsLast().op("text_ops")),
	index("SoapNote_clientId_createdAt_idx").using("btree", table.clientId.asc().nullsLast().op("text_ops"), table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("SoapNote_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("SoapNote_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [instructor.id],
			name: "SoapNote_authorId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
			name: "SoapNote_clientId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "SoapNote_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "SoapNote_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const marketplaceListing = pgTable("MarketplaceListing", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	title: text().notNull(),
	description: text().notNull(),
	categories: text().array().default([]),
	bookingUrl: text(),
	status: marketplaceListingStatus().default('DRAFT').notNull(),
	publishedAt: timestamp({ precision: 3, mode: 'date' }),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("MarketplaceListing_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("MarketplaceListing_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("MarketplaceListing_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "MarketplaceListing_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "MarketplaceListing_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const automationEvent = pgTable("AutomationEvent", {
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
	occurredAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("AutomationEvent_clientId_idx").using("btree", table.clientId.asc().nullsLast().op("text_ops")),
	uniqueIndex("AutomationEvent_deduplicationKey_key").using("btree", table.deduplicationKey.asc().nullsLast().op("text_ops")),
	index("AutomationEvent_executionId_idx").using("btree", table.executionId.asc().nullsLast().op("text_ops")),
	index("AutomationEvent_occurredAt_idx").using("btree", table.occurredAt.asc().nullsLast().op("timestamp_ops")),
	index("AutomationEvent_organizationId_occurredAt_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.occurredAt.asc().nullsLast().op("timestamp_ops")),
	index("AutomationEvent_organizationId_locationId_occurredAt_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.locationId.asc().nullsLast().op("text_ops"), table.occurredAt.asc().nullsLast().op("text_ops")),
	index("AutomationEvent_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	index("AutomationEvent_type_occurredAt_idx").using("btree", table.type.asc().nullsLast().op("enum_ops"), table.occurredAt.asc().nullsLast().op("timestamp_ops")),
	index("AutomationEvent_workflowId_occurredAt_idx").using("btree", table.workflowId.asc().nullsLast().op("text_ops"), table.occurredAt.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
			name: "AutomationEvent_clientId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.executionId],
			foreignColumns: [execution.id],
			name: "AutomationEvent_executionId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "AutomationEvent_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "AutomationEvent_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.workflowId],
			foreignColumns: [workflows.id],
			name: "AutomationEvent_workflowId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const smsConfig = pgTable("SmsConfig", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	provider: smsProvider().default('TWILIO').notNull(),
	accountSid: text().notNull(),
	authToken: text().notNull(),
	fromNumber: text().notNull(),
	isActive: boolean().default(true).notNull(),
	monthlyLimit: integer().default(5000).notNull(),
	sentThisMonth: integer().default(0).notNull(),
	lastResetAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	uniqueIndex("SmsConfig_organizationId_key").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "SmsConfig_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const smsMessage = pgTable("SmsMessage", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	clientId: text(),
	to: text().notNull(),
	from: text().notNull(),
	body: text().notNull(),
	direction: messageDirection().notNull(),
	status: smsStatus().default('QUEUED').notNull(),
	providerSid: text(),
	errorCode: text(),
	errorMessage: text(),
	sentAt: timestamp({ precision: 3, mode: 'date' }),
	deliveredAt: timestamp({ precision: 3, mode: 'date' }),
	automationId: text(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("SmsMessage_automationId_idx").using("btree", table.automationId.asc().nullsLast().op("text_ops")),
	index("SmsMessage_clientId_idx").using("btree", table.clientId.asc().nullsLast().op("text_ops")),
	index("SmsMessage_createdAt_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("SmsMessage_organizationId_locationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.locationId.asc().nullsLast().op("text_ops")),
	index("SmsMessage_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "SmsMessage_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "SmsMessage_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const waiverTemplate = pgTable("WaiverTemplate", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	name: text().notNull(),
	content: text().notNull(),
	isRequired: boolean().default(true).notNull(),
	requiresMinor: boolean().default(false).notNull(),
	isActive: boolean().default(true).notNull(),
	version: integer().default(1).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("WaiverTemplate_isActive_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("WaiverTemplate_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("WaiverTemplate_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "WaiverTemplate_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "WaiverTemplate_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const waiverSignature = pgTable("WaiverSignature", {
	id: text().primaryKey().notNull(),
	templateId: text().notNull(),
	clientId: text().notNull(),
	signatureData: text().notNull(),
	signedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	ipAddress: text(),
	emergencyName: text(),
	emergencyPhone: text(),
	healthConditions: text(),
	agreedToTerms: boolean().default(true).notNull(),
	minorName: text(),
	guardianName: text(),
	expiresAt: timestamp({ precision: 3, mode: 'date' }),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("WaiverSignature_clientId_idx").using("btree", table.clientId.asc().nullsLast().op("text_ops")),
	index("WaiverSignature_signedAt_idx").using("btree", table.signedAt.asc().nullsLast().op("timestamp_ops")),
	index("WaiverSignature_templateId_idx").using("btree", table.templateId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [waiverTemplate.id],
			name: "WaiverSignature_templateId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const clientDocument = pgTable("ClientDocument", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	clientId: text().notNull(),
	membershipId: text(),
	paymentId: text(),
	paymentLineItemId: text(),
	source: importSource().default('MINDBODY').notNull(),
	sourcePath: text(),
	fileName: text().notNull(),
	fileType: text(),
	storageUrl: text(),
	documentType: clientDocumentType().default('OTHER').notNull(),
	metadata: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("ClientDocument_clientId_idx").using("btree", table.clientId.asc().nullsLast().op("text_ops")),
	index("ClientDocument_documentType_idx").using("btree", table.documentType.asc().nullsLast().op("enum_ops")),
	index("ClientDocument_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	index("ClientDocument_membershipId_idx").using("btree", table.membershipId.asc().nullsLast().op("text_ops")),
	index("ClientDocument_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("ClientDocument_paymentId_idx").using("btree", table.paymentId.asc().nullsLast().op("text_ops")),
	index("ClientDocument_paymentLineItemId_idx").using("btree", table.paymentLineItemId.asc().nullsLast().op("text_ops")),
	uniqueIndex("ClientDocument_organizationId_sourcePath_key").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.sourcePath.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
			name: "ClientDocument_clientId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "ClientDocument_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "ClientDocument_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.membershipId],
			foreignColumns: [studioMembership.id],
			name: "ClientDocument_membershipId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.paymentId],
			foreignColumns: [studioPayment.id],
			name: "ClientDocument_paymentId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.paymentLineItemId],
			foreignColumns: [studioPaymentLineItem.id],
			name: "ClientDocument_paymentLineItemId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const roomLayout = pgTable("RoomLayout", {
	id: text().primaryKey().notNull(),
	roomId: text().notNull(),
	name: text().notNull(),
	rows: integer().default(5).notNull(),
	columns: integer().default(5).notNull(),
	layoutData: jsonb().default([]).notNull(),
	isDefault: boolean().default(false).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("RoomLayout_roomId_idx").using("btree", table.roomId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.roomId],
			foreignColumns: [room.id],
			name: "RoomLayout_roomId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const cancellationCharge = pgTable("CancellationCharge", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	clientId: text().notNull(),
	classId: text().notNull(),
	bookingId: text().notNull(),
	type: cancellationChargeType().notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	currency: text().default('GBP').notNull(),
	creditsDeducted: integer().default(0).notNull(),
	waived: boolean().default(false).notNull(),
	waivedBy: text(),
	waivedReason: text(),
	stripeChargeId: text(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("CancellationCharge_classId_idx").using("btree", table.classId.asc().nullsLast().op("text_ops")),
	index("CancellationCharge_clientId_idx").using("btree", table.clientId.asc().nullsLast().op("text_ops")),
	index("CancellationCharge_createdAt_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("CancellationCharge_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
]).enableRLS();

export const classReminderConfig = pgTable("ClassReminderConfig", {
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
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	uniqueIndex("ClassReminderConfig_organizationId_key").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "ClassReminderConfig_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "ClassReminderConfig_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const retentionAutomation = pgTable("RetentionAutomation", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	name: text().notNull(),
	type: retentionAutomationType().notNull(),
	trigger: jsonb().notNull(),
	actions: jsonb().notNull(),
	isActive: boolean().default(true).notNull(),
	lastRunAt: timestamp({ precision: 3, mode: 'date' }),
	runsCount: integer().default(0).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("RetentionAutomation_isActive_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("RetentionAutomation_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("RetentionAutomation_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	index("RetentionAutomation_type_idx").using("btree", table.type.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "RetentionAutomation_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "RetentionAutomation_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const billingRule = pgTable("BillingRule", {
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
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("BillingRule_isActive_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("BillingRule_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("BillingRule_organizationId_locationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.locationId.asc().nullsLast().op("text_ops")),
	index("BillingRule_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
]).enableRLS();

export const introOffer = pgTable("IntroOffer", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	name: text().notNull(),
	description: text(),
	offerType: introOfferType().notNull(),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
	originalPrice: numeric({ precision: 10, scale:  2 }),
	currency: text().default('GBP').notNull(),
	durationDays: integer().default(7).notNull(),
	classCredits: integer(),
	allowedClassTypes: text().array().default([]),
	maxRedemptions: integer(),
	redemptionCount: integer().default(0).notNull(),
	isActive: boolean().default(true).notNull(),
	displayOnWidget: boolean().default(true).notNull(),
	followUpPlanId: text(),
	autoConvert: boolean().default(false).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("IntroOffer_isActive_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("IntroOffer_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("IntroOffer_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "IntroOffer_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "IntroOffer_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const introOfferRedemption = pgTable("IntroOfferRedemption", {
	id: text().primaryKey().notNull(),
	offerId: text().notNull(),
	clientId: text().notNull(),
	redeemedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	expiresAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	classesUsed: integer().default(0).notNull(),
	convertedAt: timestamp({ precision: 3, mode: 'date' }),
	convertedToPlanId: text(),
	status: introOfferRedemptionStatus().default('ACTIVE').notNull(),
}, (table) => [
	index("IntroOfferRedemption_clientId_idx").using("btree", table.clientId.asc().nullsLast().op("text_ops")),
	index("IntroOfferRedemption_expiresAt_idx").using("btree", table.expiresAt.asc().nullsLast().op("timestamp_ops")),
	uniqueIndex("IntroOfferRedemption_offerId_clientId_key").using("btree", table.offerId.asc().nullsLast().op("text_ops"), table.clientId.asc().nullsLast().op("text_ops")),
	index("IntroOfferRedemption_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.offerId],
			foreignColumns: [introOffer.id],
			name: "IntroOfferRedemption_offerId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const churnRiskScore = pgTable("ChurnRiskScore", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	clientId: text().notNull(),
	score: integer().notNull(),
	riskLevel: churnRiskLevel().notNull(),
	factors: jsonb().notNull(),
	suggestedActions: jsonb(),
	calculatedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	expiresAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("ChurnRiskScore_clientId_idx").using("btree", table.clientId.asc().nullsLast().op("text_ops")),
	uniqueIndex("ChurnRiskScore_organizationId_clientId_key").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.clientId.asc().nullsLast().op("text_ops")),
	index("ChurnRiskScore_organizationId_riskLevel_idx").using("btree", table.organizationId.asc().nullsLast().op("enum_ops"), table.riskLevel.asc().nullsLast().op("enum_ops")),
	index("ChurnRiskScore_score_idx").using("btree", table.score.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "ChurnRiskScore_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const referralProgram = pgTable("ReferralProgram", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	name: text().default('Refer a Friend').notNull(),
	isActive: boolean().default(true).notNull(),
	referrerRewardType: referralRewardType().default('CREDIT').notNull(),
	referrerRewardValue: numeric({ precision: 10, scale:  2 }).notNull(),
	refereeRewardType: referralRewardType().default('DISCOUNT').notNull(),
	refereeRewardValue: numeric({ precision: 10, scale:  2 }).notNull(),
	refereeOfferDays: integer().default(30).notNull(),
	currency: text().default('GBP').notNull(),
	maxReferralsPerMember: integer(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	uniqueIndex("ReferralProgram_organizationId_key").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "ReferralProgram_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const referral = pgTable("Referral", {
	id: text().primaryKey().notNull(),
	programId: text().notNull(),
	referrerClientId: text().notNull(),
	refereeClientId: text(),
	refereeEmail: text().notNull(),
	refereePhone: text(),
	code: text().notNull(),
	status: referralStatus().default('PENDING').notNull(),
	referrerRewarded: boolean().default(false).notNull(),
	refereeRewarded: boolean().default(false).notNull(),
	convertedAt: timestamp({ precision: 3, mode: 'date' }),
	expiresAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("Referral_code_idx").using("btree", table.code.asc().nullsLast().op("text_ops")),
	uniqueIndex("Referral_code_key").using("btree", table.code.asc().nullsLast().op("text_ops")),
	index("Referral_programId_idx").using("btree", table.programId.asc().nullsLast().op("text_ops")),
	index("Referral_refereeClientId_idx").using("btree", table.refereeClientId.asc().nullsLast().op("text_ops")),
	index("Referral_refereeEmail_idx").using("btree", table.refereeEmail.asc().nullsLast().op("text_ops")),
	index("Referral_referrerClientId_idx").using("btree", table.referrerClientId.asc().nullsLast().op("text_ops")),
	index("Referral_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.programId],
			foreignColumns: [referralProgram.id],
			name: "Referral_programId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.refereeClientId],
			foreignColumns: [client.id],
			name: "Referral_refereeClientId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.referrerClientId],
			foreignColumns: [client.id],
			name: "Referral_referrerClientId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const loyaltyProgram = pgTable("LoyaltyProgram", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	name: text().default('Rewards').notNull(),
	isActive: boolean().default(true).notNull(),
	pointsPerClass: integer().default(10).notNull(),
	pointsPerReferral: integer().default(50).notNull(),
	pointsPerPurchase: integer().default(1).notNull(),
	purchasePointsUnit: numeric({ precision: 10, scale:  2 }).default('1.00').notNull(),
	currency: text().default('GBP').notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	uniqueIndex("LoyaltyProgram_organizationId_key").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "LoyaltyProgram_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const loyaltyBalance = pgTable("LoyaltyBalance", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	clientId: text().notNull(),
	points: integer().default(0).notNull(),
	lifetimePoints: integer().default(0).notNull(),
	tier: loyaltyTier().default('BRONZE').notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("LoyaltyBalance_clientId_idx").using("btree", table.clientId.asc().nullsLast().op("text_ops")),
	uniqueIndex("LoyaltyBalance_organizationId_clientId_key").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.clientId.asc().nullsLast().op("text_ops")),
	index("LoyaltyBalance_tier_idx").using("btree", table.tier.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
			name: "LoyaltyBalance_clientId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "LoyaltyBalance_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const loyaltyTransaction = pgTable("LoyaltyTransaction", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	clientId: text().notNull(),
	points: integer().notNull(),
	type: loyaltyTransactionType().notNull(),
	description: text().notNull(),
	referenceId: text(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("LoyaltyTransaction_createdAt_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("LoyaltyTransaction_organizationId_clientId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.clientId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "LoyaltyTransaction_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const loyaltyReward = pgTable("LoyaltyReward", {
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
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("LoyaltyReward_isActive_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("LoyaltyReward_programId_idx").using("btree", table.programId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.programId],
			foreignColumns: [loyaltyProgram.id],
			name: "LoyaltyReward_programId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const spot = pgTable("Spot", {
	id: text().primaryKey().notNull(),
	layoutId: text().notNull(),
	label: text().notNull(),
	row: integer().notNull(),
	col: integer().notNull(),
	type: spotType().default('STANDARD').notNull(),
	isActive: boolean().default(true).notNull(),
	equipment: text(),
	metadata: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("Spot_layoutId_idx").using("btree", table.layoutId.asc().nullsLast().op("text_ops")),
	uniqueIndex("Spot_layoutId_row_col_key").using("btree", table.layoutId.asc().nullsLast().op("text_ops"), table.row.asc().nullsLast().op("int4_ops"), table.col.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.layoutId],
			foreignColumns: [roomLayout.id],
			name: "Spot_layoutId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const spotBooking = pgTable("SpotBooking", {
	id: text().primaryKey().notNull(),
	spotId: text().notNull(),
	bookingId: text().notNull(),
	clientId: text().notNull(),
	classId: text().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	uniqueIndex("SpotBooking_bookingId_key").using("btree", table.bookingId.asc().nullsLast().op("text_ops")),
	index("SpotBooking_classId_idx").using("btree", table.classId.asc().nullsLast().op("text_ops")),
	index("SpotBooking_clientId_idx").using("btree", table.clientId.asc().nullsLast().op("text_ops")),
	uniqueIndex("SpotBooking_spotId_classId_key").using("btree", table.spotId.asc().nullsLast().op("text_ops"), table.classId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.bookingId],
			foreignColumns: [studioBooking.id],
			name: "SpotBooking_bookingId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.spotId],
			foreignColumns: [spot.id],
			name: "SpotBooking_spotId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const paymentIntegration = pgTable("PaymentIntegration", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	provider: text().notNull(),
	credentials: jsonb().notNull(),
	config: jsonb(),
	isActive: boolean().default(true).notNull(),
	lastSyncedAt: timestamp({ precision: 3, mode: 'date' }),
	metadata: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("PaymentIntegration_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	uniqueIndex("PaymentIntegration_organizationId_provider_key").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.provider.asc().nullsLast().op("text_ops")),
	index("PaymentIntegration_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	uniqueIndex("PaymentIntegration_locationId_provider_key").using("btree", table.locationId.asc().nullsLast().op("text_ops"), table.provider.asc().nullsLast().op("text_ops")),
]).enableRLS();

export const cancellationPolicy = pgTable("CancellationPolicy", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	name: text().notNull(),
	lateCancelWindow: integer().default(12).notNull(),
	noShowFeeAmount: numeric({ precision: 10, scale:  2 }).notNull(),
	lateCancelFee: numeric({ precision: 10, scale:  2 }).notNull(),
	currency: text().default('GBP').notNull(),
	deductCredits: boolean().default(true).notNull(),
	creditsDeducted: integer().default(1).notNull(),
	chargeCard: boolean().default(false).notNull(),
	sendNotification: boolean().default(true).notNull(),
	isDefault: boolean().default(false).notNull(),
	isActive: boolean().default(true).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("CancellationPolicy_isDefault_idx").using("btree", table.isDefault.asc().nullsLast().op("bool_ops")),
	index("CancellationPolicy_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("CancellationPolicy_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "CancellationPolicy_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "CancellationPolicy_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const spotReservation = pgTable("SpotReservation", {
	id: text().primaryKey().notNull(),
	spotId: text().notNull(),
	layoutId: text().notNull(),
	guestName: text().notNull(),
	sessionId: text().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("SpotReservation_layoutId_idx").using("btree", table.layoutId.asc().nullsLast().op("text_ops")),
	index("SpotReservation_sessionId_idx").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	uniqueIndex("SpotReservation_spotId_key").using("btree", table.spotId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.layoutId],
			foreignColumns: [roomLayout.id],
			name: "SpotReservation_layoutId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.spotId],
			foreignColumns: [spot.id],
			name: "SpotReservation_spotId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const verification = pgTable("Verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}).enableRLS();

export const location = pgTable("Location", {
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
	timezone: text().default('UTC'),
	createdByUserId: text(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
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
}, (table) => [
	index("Location_externalId_idx").using("btree", table.externalId.asc().nullsLast().op("text_ops")),
	index("Location_isActive_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("Location_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	uniqueIndex("Location_organizationId_externalId_key").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.externalId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdByUserId],
			foreignColumns: [user.id],
			name: "Location_createdByUserId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "Location_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const user = pgTable("User", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	emailVerified: boolean().default(false).notNull(),
	image: text(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	status: userStatus().default('ONLINE').notNull(),
	statusMessage: text(),
}, (table) => [
	uniqueIndex("User_email_key").using("btree", table.email.asc().nullsLast().op("text_ops")),
]).enableRLS();

export const account = pgTable("Account", {
	id: text().primaryKey().notNull(),
	accountId: text().notNull(),
	providerId: text().notNull(),
	userId: text().notNull(),
	accessToken: text(),
	refreshToken: text(),
	idToken: text(),
	accessTokenExpiresAt: timestamp({ precision: 3, mode: 'date' }),
	refreshTokenExpiresAt: timestamp({ precision: 3, mode: 'date' }),
	scope: text(),
	password: text(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "Account_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const activity = pgTable("Activity", {
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
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("Activity_createdAt_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("Activity_entityType_entityId_idx").using("btree", table.entityType.asc().nullsLast().op("text_ops"), table.entityId.asc().nullsLast().op("text_ops")),
	index("Activity_organizationId_entityType_entityId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.entityType.asc().nullsLast().op("text_ops"), table.entityId.asc().nullsLast().op("text_ops")),
	index("Activity_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("Activity_organizationId_locationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.locationId.asc().nullsLast().op("text_ops")),
	index("Activity_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	index("Activity_type_idx").using("btree", table.type.asc().nullsLast().op("enum_ops")),
	index("Activity_userId_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "Activity_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const bankTransferSettings = pgTable("BankTransferSettings", {
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
	currency: text().default('GBP'),
	instructions: text(),
	referenceFormat: text(),
	autoReminders: boolean().default(true).notNull(),
	reminderDays: jsonb(),
	metadata: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	sortCode: text(),
	transferType: text().default('UK_DOMESTIC'),
}, (table) => [
	index("BankTransferSettings_enabled_idx").using("btree", table.enabled.asc().nullsLast().op("bool_ops")),
	index("BankTransferSettings_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	uniqueIndex("BankTransferSettings_organizationId_locationId_key").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.locationId.asc().nullsLast().op("text_ops")),
	index("BankTransferSettings_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	uniqueIndex("BankTransferSettings_locationId_key").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "BankTransferSettings_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "BankTransferSettings_locationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const clientAssignee = pgTable("ClientAssignee", {
	id: text().primaryKey().notNull(),
	clientId: text().notNull(),
	locationMemberId: text().notNull(),
	assignedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	uniqueIndex("ClientAssignee_clientId_locationMemberId_key").using("btree", table.clientId.asc().nullsLast().op("text_ops"), table.locationMemberId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
			name: "ClientAssignee_clientId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationMemberId],
			foreignColumns: [locationMember.id],
			name: "ClientAssignee_locationMemberId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const locationMember = pgTable("LocationMember", {
	id: text().primaryKey().notNull(),
	locationId: text().notNull(),
	userId: text().notNull(),
	role: locationMemberRole().default('STANDARD').notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	uniqueIndex("LocationMember_locationId_userId_key").using("btree", table.locationId.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "LocationMember_locationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "LocationMember_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const deal = pgTable("Deal", {
	id: text().primaryKey().notNull(),
	locationId: text(),
	name: text().notNull(),
	value: numeric({ precision: 12, scale:  2 }),
	currency: text().default('USD'),
	deadline: timestamp({ precision: 3, mode: 'date' }),
	source: text(),
	tags: text().array().default([]),
	description: text(),
	lastActivityAt: timestamp({ precision: 3, mode: 'date' }),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	pipelineId: text(),
	pipelineStageId: text(),
	organizationId: text().notNull(),
}, (table) => [
	index("Deal_organizationId_locationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.locationId.asc().nullsLast().op("text_ops")),
	index("Deal_pipelineId_idx").using("btree", table.pipelineId.asc().nullsLast().op("text_ops")),
	index("Deal_locationId_pipelineStageId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops"), table.pipelineStageId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "Deal_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.pipelineId],
			foreignColumns: [pipeline.id],
			name: "Deal_pipelineId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.pipelineStageId],
			foreignColumns: [pipelineStage.id],
			name: "Deal_pipelineStageId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "Deal_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const pipeline = pgTable("Pipeline", {
	id: text().primaryKey().notNull(),
	locationId: text(),
	name: text().notNull(),
	description: text(),
	isActive: boolean().default(true).notNull(),
	isDefault: boolean().default(false).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	organizationId: text().notNull(),
}, (table) => [
	index("Pipeline_organizationId_locationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.locationId.asc().nullsLast().op("text_ops")),
	index("Pipeline_locationId_isActive_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops"), table.isActive.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "Pipeline_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "Pipeline_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const pipelineStage = pgTable("PipelineStage", {
	id: text().primaryKey().notNull(),
	pipelineId: text().notNull(),
	name: text().notNull(),
	position: integer().notNull(),
	probability: integer().default(0).notNull(),
	rottingDays: integer(),
	color: text(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("PipelineStage_pipelineId_idx").using("btree", table.pipelineId.asc().nullsLast().op("text_ops")),
	uniqueIndex("PipelineStage_pipelineId_position_key").using("btree", table.pipelineId.asc().nullsLast().op("text_ops"), table.position.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.pipelineId],
			foreignColumns: [pipeline.id],
			name: "PipelineStage_pipelineId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const dealClient = pgTable("DealClient", {
	id: text().primaryKey().notNull(),
	dealId: text().notNull(),
	clientId: text().notNull(),
}, (table) => [
	uniqueIndex("DealClient_dealId_clientId_key").using("btree", table.dealId.asc().nullsLast().op("text_ops"), table.clientId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
			name: "DealClient_clientId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.dealId],
			foreignColumns: [deal.id],
			name: "DealClient_dealId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const dealAssignee = pgTable("DealMember", {
	id: text().primaryKey().notNull(),
	dealId: text().notNull(),
	locationMemberId: text().notNull(),
	assignedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	uniqueIndex("DealMember_dealId_locationMemberId_key").using("btree", table.dealId.asc().nullsLast().op("text_ops"), table.locationMemberId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.dealId],
			foreignColumns: [deal.id],
			name: "DealMember_dealId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationMemberId],
			foreignColumns: [locationMember.id],
			name: "DealMember_locationMemberId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const form = pgTable("Form", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	name: text().notNull(),
	description: text(),
	status: formStatus().default('DRAFT').notNull(),
	isMultiStep: boolean().default(false).notNull(),
	showProgress: boolean().default(true).notNull(),
	submitUrl: text(),
	successMessage: text().default('Thank you for your submission!').notNull(),
	redirectUrl: text(),
	workflowId: text(),
	stylePresetId: text(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	publishedAt: timestamp({ precision: 3, mode: 'date' }),
}, (table) => [
	index("Form_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("Form_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("Form_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	index("Form_workflowId_idx").using("btree", table.workflowId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "Form_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.stylePresetId],
			foreignColumns: [globalStylePreset.id],
			name: "Form_stylePresetId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "Form_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.workflowId],
			foreignColumns: [workflows.id],
			name: "Form_workflowId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const globalStylePreset = pgTable("GlobalStylePreset", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	name: text().notNull(),
	description: text(),
	primaryColor: text().default('#3b82f6').notNull(),
	secondaryColor: text().default('#8b5cf6').notNull(),
	accentColor: text().default('#f59e0b').notNull(),
	backgroundColor: text().default('#ffffff').notNull(),
	textColor: text().default('#1f2937').notNull(),
	mutedColor: text().default('#6b7280').notNull(),
	borderColor: text().default('#e5e7eb').notNull(),
	fontFamily: text().default('Inter, system-ui, sans-serif').notNull(),
	headingFont: text().default('Inter, system-ui, sans-serif').notNull(),
	fontSize: jsonb().default({"lg":18,"sm":14,"xl":20,"2xl":24,"3xl":30,"4xl":36,"base":16}).notNull(),
	fontWeight: jsonb().default({"bold":700,"medium":500,"normal":400,"semibold":600}).notNull(),
	lineHeight: jsonb().default({"tight":1.25,"normal":1.5,"relaxed":1.75}).notNull(),
	spacing: jsonb().default({"lg":24,"md":16,"sm":8,"xl":32,"xs":4,"2xl":48,"3xl":64}).notNull(),
	borderRadius: jsonb().default({"lg":12,"md":8,"sm":4,"xl":16,"full":9999,"none":0}).notNull(),
	buttonPresets: jsonb().default({"outline":{"bg":"transparent","text":"#3b82f6","border":"2px solid #3b82f6","padding":"12px 24px","borderRadius":8},"primary":{"bg":"#3b82f6","text":"#ffffff","padding":"12px 24px","borderRadius":8},"secondary":{"bg":"#8b5cf6","text":"#ffffff","padding":"12px 24px","borderRadius":8}}).notNull(),
	shadows: jsonb().default({"lg":"0 10px 15px rgba(0,0,0,0.1)","md":"0 4px 6px rgba(0,0,0,0.1)","sm":"0 1px 2px rgba(0,0,0,0.05)","xl":"0 20px 25px rgba(0,0,0,0.1)"}).notNull(),
	isDefault: boolean().default(false).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("GlobalStylePreset_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("GlobalStylePreset_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "GlobalStylePreset_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "GlobalStylePreset_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const formStep = pgTable("FormStep", {
	id: text().primaryKey().notNull(),
	formId: text().notNull(),
	name: text().notNull(),
	order: integer().default(0).notNull(),
	showConditions: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("FormStep_formId_idx").using("btree", table.formId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.formId],
			foreignColumns: [form.id],
			name: "FormStep_formId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const formField = pgTable("FormField", {
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
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("FormField_stepId_idx").using("btree", table.stepId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.stepId],
			foreignColumns: [formStep.id],
			name: "FormField_stepId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const formSubmission = pgTable("FormSubmission", {
	id: text().primaryKey().notNull(),
	formId: text().notNull(),
	data: jsonb().notNull(),
	clientId: text(),
	utmSource: text(),
	utmMedium: text(),
	utmCampaign: text(),
	utmTerm: text(),
	utmContent: text(),
	ipAddress: text(),
	userAgent: text(),
	referrer: text(),
	submittedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("FormSubmission_clientId_idx").using("btree", table.clientId.asc().nullsLast().op("text_ops")),
	index("FormSubmission_formId_idx").using("btree", table.formId.asc().nullsLast().op("text_ops")),
	index("FormSubmission_submittedAt_idx").using("btree", table.submittedAt.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
			name: "FormSubmission_clientId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.formId],
			foreignColumns: [form.id],
			name: "FormSubmission_formId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const funnelAnalytics = pgTable("FunnelAnalytics", {
	id: text().primaryKey().notNull(),
	funnelId: text().notNull(),
	pageId: text(),
	pageViews: integer().default(0).notNull(),
	uniqueVisitors: integer().default(0).notNull(),
	leads: integer().default(0).notNull(),
	conversions: integer().default(0).notNull(),
	date: date().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("FunnelAnalytics_funnelId_date_idx").using("btree", table.funnelId.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("FunnelAnalytics_funnelId_pageId_date_key").using("btree", table.funnelId.asc().nullsLast().op("text_ops"), table.pageId.asc().nullsLast().op("text_ops"), table.date.asc().nullsLast().op("date_ops")),
	index("FunnelAnalytics_pageId_date_idx").using("btree", table.pageId.asc().nullsLast().op("text_ops"), table.date.asc().nullsLast().op("date_ops")),
	foreignKey({
			columns: [table.funnelId],
			foreignColumns: [funnel.id],
			name: "FunnelAnalytics_funnelId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.pageId],
			foreignColumns: [funnelPage.id],
			name: "FunnelAnalytics_pageId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const funnelPage = pgTable("FunnelPage", {
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
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("FunnelPage_funnelId_idx").using("btree", table.funnelId.asc().nullsLast().op("text_ops")),
	index("FunnelPage_funnelId_order_idx").using("btree", table.funnelId.asc().nullsLast().op("text_ops"), table.order.asc().nullsLast().op("int4_ops")),
	uniqueIndex("FunnelPage_funnelId_slug_key").using("btree", table.funnelId.asc().nullsLast().op("text_ops"), table.slug.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.funnelId],
			foreignColumns: [funnel.id],
			name: "FunnelPage_funnelId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const funnelBlock = pgTable("FunnelBlock", {
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
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	smartSectionId: text(),
	smartSectionInstanceId: text(),
}, (table) => [
	index("FunnelBlock_pageId_idx").using("btree", table.pageId.asc().nullsLast().op("text_ops")),
	index("FunnelBlock_pageId_order_idx").using("btree", table.pageId.asc().nullsLast().op("text_ops"), table.order.asc().nullsLast().op("int4_ops")),
	index("FunnelBlock_pageId_parentBlockId_order_idx").using("btree", table.pageId.asc().nullsLast().op("text_ops"), table.parentBlockId.asc().nullsLast().op("text_ops"), table.order.asc().nullsLast().op("int4_ops")),
	index("FunnelBlock_parentBlockId_idx").using("btree", table.parentBlockId.asc().nullsLast().op("text_ops")),
	index("FunnelBlock_smartSectionId_idx").using("btree", table.smartSectionId.asc().nullsLast().op("text_ops")),
	index("FunnelBlock_smartSectionId_order_idx").using("btree", table.smartSectionId.asc().nullsLast().op("text_ops"), table.order.asc().nullsLast().op("int4_ops")),
	index("FunnelBlock_smartSectionInstanceId_idx").using("btree", table.smartSectionInstanceId.asc().nullsLast().op("text_ops")),
	uniqueIndex("FunnelBlock_smartSectionInstanceId_key").using("btree", table.smartSectionInstanceId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.pageId],
			foreignColumns: [funnelPage.id],
			name: "FunnelBlock_pageId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.parentBlockId],
			foreignColumns: [table.id],
			name: "FunnelBlock_parentBlockId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.smartSectionId],
			foreignColumns: [smartSection.id],
			name: "FunnelBlock_smartSectionId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.smartSectionInstanceId],
			foreignColumns: [smartSectionInstance.id],
			name: "FunnelBlock_smartSectionInstanceId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const smartSection = pgTable("SmartSection", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	name: text().notNull(),
	description: text(),
	category: text(),
	thumbnail: text(),
	blockStructure: jsonb().default([]).notNull(),
	usageCount: integer().default(0).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("SmartSection_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("SmartSection_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("SmartSection_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "SmartSection_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "SmartSection_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const smartSectionInstance = pgTable("SmartSectionInstance", {
	id: text().primaryKey().notNull(),
	sectionId: text().notNull(),
	funnelPageId: text(),
	formId: text(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	order: integer().default(0).notNull(),
}, (table) => [
	index("SmartSectionInstance_formId_idx").using("btree", table.formId.asc().nullsLast().op("text_ops")),
	index("SmartSectionInstance_funnelPageId_idx").using("btree", table.funnelPageId.asc().nullsLast().op("text_ops")),
	index("SmartSectionInstance_sectionId_idx").using("btree", table.sectionId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.formId],
			foreignColumns: [form.id],
			name: "SmartSectionInstance_formId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.funnelPageId],
			foreignColumns: [funnelPage.id],
			name: "SmartSectionInstance_funnelPageId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.sectionId],
			foreignColumns: [smartSection.id],
			name: "SmartSectionInstance_sectionId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const funnelBlockAnalytics = pgTable("FunnelBlockAnalytics", {
	id: text().primaryKey().notNull(),
	blockId: text().notNull(),
	views: integer().default(0).notNull(),
	clicks: integer().default(0).notNull(),
	engagementTime: integer().default(0).notNull(),
	date: date().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("FunnelBlockAnalytics_blockId_date_idx").using("btree", table.blockId.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("FunnelBlockAnalytics_blockId_date_key").using("btree", table.blockId.asc().nullsLast().op("text_ops"), table.date.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.blockId],
			foreignColumns: [funnelBlock.id],
			name: "FunnelBlockAnalytics_blockId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const funnelBlockEvent = pgTable("FunnelBlockEvent", {
	id: text().primaryKey().notNull(),
	blockId: text().notNull(),
	eventType: text().notNull(),
	eventName: text(),
	parameters: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("FunnelBlockEvent_blockId_idx").using("btree", table.blockId.asc().nullsLast().op("text_ops")),
	uniqueIndex("FunnelBlockEvent_blockId_key").using("btree", table.blockId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.blockId],
			foreignColumns: [funnelBlock.id],
			name: "FunnelBlockEvent_blockId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const funnelBreakpoint = pgTable("FunnelBreakpoint", {
	id: text().primaryKey().notNull(),
	blockId: text().notNull(),
	device: deviceType().notNull(),
	styles: jsonb().default({}).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	uniqueIndex("FunnelBreakpoint_blockId_device_key").using("btree", table.blockId.asc().nullsLast().op("text_ops"), table.device.asc().nullsLast().op("text_ops")),
	index("FunnelBreakpoint_blockId_idx").using("btree", table.blockId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.blockId],
			foreignColumns: [funnelBlock.id],
			name: "FunnelBreakpoint_blockId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const funnelPixelIntegration = pgTable("FunnelPixelIntegration", {
	id: text().primaryKey().notNull(),
	funnelId: text().notNull(),
	provider: pixelProvider().notNull(),
	pixelId: text().notNull(),
	enabled: boolean().default(true).notNull(),
	metadata: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("FunnelPixelIntegration_funnelId_idx").using("btree", table.funnelId.asc().nullsLast().op("text_ops")),
	uniqueIndex("FunnelPixelIntegration_funnelId_provider_key").using("btree", table.funnelId.asc().nullsLast().op("text_ops"), table.provider.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.funnelId],
			foreignColumns: [funnel.id],
			name: "FunnelPixelIntegration_funnelId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const invitation = pgTable("Invitation", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	email: text().notNull(),
	role: text(),
	status: text().notNull(),
	expiresAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	inviterId: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.inviterId],
			foreignColumns: [user.id],
			name: "Invitation_inviterId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "Invitation_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const invoiceTemplate = pgTable("InvoiceTemplate", {
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
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("InvoiceTemplate_isDefault_idx").using("btree", table.isDefault.asc().nullsLast().op("bool_ops")),
	index("InvoiceTemplate_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("InvoiceTemplate_organizationId_locationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.locationId.asc().nullsLast().op("text_ops")),
	index("InvoiceTemplate_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
]).enableRLS();

export const invoiceLineItem = pgTable("InvoiceLineItem", {
	id: text().primaryKey().notNull(),
	invoiceId: text().notNull(),
	description: text().notNull(),
	quantity: numeric({ precision: 10, scale:  2 }).notNull(),
	unitPrice: numeric({ precision: 10, scale:  2 }).notNull(),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	timeLogId: text(),
	order: integer().default(0).notNull(),
	metadata: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("InvoiceLineItem_invoiceId_idx").using("btree", table.invoiceId.asc().nullsLast().op("text_ops")),
	index("InvoiceLineItem_timeLogId_idx").using("btree", table.timeLogId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [invoice.id],
			name: "InvoiceLineItem_invoiceId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const invoicePayment = pgTable("InvoicePayment", {
	id: text().primaryKey().notNull(),
	invoiceId: text().notNull(),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	currency: text().default('USD').notNull(),
	method: paymentMethod().notNull(),
	paidAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	stripePaymentId: text(),
	xeroPaymentId: text(),
	referenceNumber: text(),
	notes: text(),
	metadata: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("InvoicePayment_invoiceId_idx").using("btree", table.invoiceId.asc().nullsLast().op("text_ops")),
	index("InvoicePayment_paidAt_idx").using("btree", table.paidAt.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [invoice.id],
			name: "InvoicePayment_invoiceId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const invoiceReminder = pgTable("InvoiceReminder", {
	id: text().primaryKey().notNull(),
	invoiceId: text().notNull(),
	sentAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	sentTo: text().notNull(),
	subject: text().notNull(),
	message: text().notNull(),
	opened: boolean().default(false).notNull(),
	openedAt: timestamp({ precision: 3, mode: 'date' }),
	metadata: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	daysOverdue: integer(),
	isDunning: boolean().default(false).notNull(),
}, (table) => [
	index("InvoiceReminder_invoiceId_idx").using("btree", table.invoiceId.asc().nullsLast().op("text_ops")),
	index("InvoiceReminder_isDunning_idx").using("btree", table.isDunning.asc().nullsLast().op("bool_ops")),
	index("InvoiceReminder_sentAt_idx").using("btree", table.sentAt.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [invoice.id],
			name: "InvoiceReminder_invoiceId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const member = pgTable("Member", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	userId: text().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	role: organizationMemberRole().default('viewer').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "Member_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "Member_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const notification = pgTable("Notification", {
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
	readAt: timestamp({ precision: 3, mode: 'date' }),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("Notification_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("Notification_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	index("Notification_userId_createdAt_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.createdAt.asc().nullsLast().op("text_ops")),
	index("Notification_userId_read_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.read.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.actorId],
			foreignColumns: [user.id],
			name: "Notification_actorId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "Notification_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const notificationPreference = pgTable("NotificationPreference", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	preferences: jsonb().default({}).notNull(),
	emailEnabled: boolean().default(true).notNull(),
	emailDigest: boolean().default(false).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	uniqueIndex("NotificationPreference_userId_key").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "NotificationPreference_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const qrCode = pgTable("QRCode", {
	id: text().primaryKey().notNull(),
	locationId: text(),
	name: text().notNull(),
	code: text().notNull(),
	dealId: text(),
	location: jsonb(),
	enabled: boolean().default(true).notNull(),
	expiresAt: timestamp({ precision: 3, mode: 'date' }),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	organizationId: text().notNull(),
}, (table) => [
	index("QRCode_code_idx").using("btree", table.code.asc().nullsLast().op("text_ops")),
	uniqueIndex("QRCode_code_key").using("btree", table.code.asc().nullsLast().op("text_ops")),
	index("QRCode_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("QRCode_organizationId_locationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.locationId.asc().nullsLast().op("text_ops")),
	index("QRCode_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "QRCode_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "QRCode_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const recurringInvoice = pgTable("RecurringInvoice", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	name: text().notNull(),
	description: text(),
	status: recurringInvoiceStatus().default('ACTIVE').notNull(),
	clientId: text(),
	clientName: text().notNull(),
	clientEmail: text(),
	clientAddress: jsonb(),
	billingModel: billingModel().default('RETAINER').notNull(),
	templateId: text(),
	frequency: recurringFrequency().notNull(),
	interval: integer().default(1).notNull(),
	startDate: timestamp({ precision: 3, mode: 'date' }).notNull(),
	endDate: timestamp({ precision: 3, mode: 'date' }),
	nextRunDate: timestamp({ precision: 3, mode: 'date' }).notNull(),
	dayOfMonth: integer(),
	dayOfWeek: integer(),
	lineItems: jsonb().notNull(),
	subtotal: numeric({ precision: 12, scale:  2 }).notNull(),
	taxRate: numeric({ precision: 5, scale:  2 }),
	taxAmount: numeric({ precision: 12, scale:  2 }).default('0').notNull(),
	discountAmount: numeric({ precision: 12, scale:  2 }).default('0').notNull(),
	total: numeric({ precision: 12, scale:  2 }).notNull(),
	currency: text().default('USD').notNull(),
	dueDays: integer().default(30).notNull(),
	notes: text(),
	termsConditions: text(),
	autoSend: boolean().default(false).notNull(),
	sendReminders: boolean().default(false).notNull(),
	lastRunDate: timestamp({ precision: 3, mode: 'date' }),
	invoicesGenerated: integer().default(0).notNull(),
	metadata: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("RecurringInvoice_frequency_idx").using("btree", table.frequency.asc().nullsLast().op("enum_ops")),
	index("RecurringInvoice_nextRunDate_idx").using("btree", table.nextRunDate.asc().nullsLast().op("timestamp_ops")),
	index("RecurringInvoice_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("RecurringInvoice_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("RecurringInvoice_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "RecurringInvoice_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const recurringInvoiceGeneration = pgTable("RecurringInvoiceGeneration", {
	id: text().primaryKey().notNull(),
	recurringInvoiceId: text().notNull(),
	invoiceId: text().notNull(),
	generatedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	periodStart: timestamp({ precision: 3, mode: 'date' }).notNull(),
	periodEnd: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	uniqueIndex("RecurringInvoiceGeneration_invoiceId_key").using("btree", table.invoiceId.asc().nullsLast().op("text_ops")),
	index("RecurringInvoiceGeneration_recurringInvoiceId_idx").using("btree", table.recurringInvoiceId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.recurringInvoiceId],
			foreignColumns: [recurringInvoice.id],
			name: "RecurringInvoiceGeneration_recurringInvoiceId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const rota = pgTable("Rota", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	instructorId: text().notNull(),
	clientId: text(),
	companyName: text(),
	dealId: text(),
	startTime: timestamp({ precision: 3, mode: 'date' }).notNull(),
	endTime: timestamp({ precision: 3, mode: 'date' }).notNull(),
	title: text(),
	description: text(),
	location: text(),
	status: rotaStatus().default('SCHEDULED').notNull(),
	hourlyRate: numeric({ precision: 10, scale:  2 }),
	currency: text().default('GBP'),
	billable: boolean().default(true).notNull(),
	notes: text(),
	customFields: jsonb(),
	isRecurring: boolean().default(false).notNull(),
	recurrenceRule: text(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	magicLinkSentAt: timestamp({ precision: 3, mode: 'date' }),
	color: text().default('blue'),
	actualEndTime: timestamp({ precision: 3, mode: 'date' }),
	actualHours: numeric({ precision: 10, scale:  2 }),
	actualStartTime: timestamp({ precision: 3, mode: 'date' }),
	actualValue: numeric({ precision: 10, scale:  2 }),
	scheduledHours: numeric({ precision: 10, scale:  2 }),
	scheduledValue: numeric({ precision: 10, scale:  2 }),
}, (table) => [
	index("Rota_clientId_idx").using("btree", table.clientId.asc().nullsLast().op("text_ops")),
	index("Rota_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("Rota_organizationId_instructorId_startTime_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.instructorId.asc().nullsLast().op("text_ops"), table.startTime.asc().nullsLast().op("timestamp_ops")),
	index("Rota_organizationId_instructorId_status_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.instructorId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("Rota_startTime_idx").using("btree", table.startTime.asc().nullsLast().op("timestamp_ops")),
	index("Rota_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("Rota_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	index("Rota_instructorId_idx").using("btree", table.instructorId.asc().nullsLast().op("text_ops")),
	index("Rota_instructorId_startTime_endTime_idx").using("btree", table.instructorId.asc().nullsLast().op("text_ops"), table.startTime.asc().nullsLast().op("text_ops"), table.endTime.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
			name: "Rota_clientId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.dealId],
			foreignColumns: [deal.id],
			name: "Rota_dealId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "Rota_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "Rota_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.instructorId],
			foreignColumns: [instructor.id],
			name: "Rota_instructorId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const session = pgTable("Session", {
	id: text().primaryKey().notNull(),
	expiresAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	token: text().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	ipAddress: text(),
	userAgent: text(),
	userId: text().notNull(),
	activeOrganizationId: text(),
	activeLocationId: text(),
	isOnline: boolean().default(true).notNull(),
	lastActivityAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	uniqueIndex("Session_token_key").using("btree", table.token.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "Session_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const stripeConnection = pgTable("StripeConnection", {
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
	lastSyncedAt: timestamp({ precision: 3, mode: 'date' }),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("StripeConnection_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	uniqueIndex("StripeConnection_organizationId_locationId_key").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.locationId.asc().nullsLast().op("text_ops")),
	index("StripeConnection_stripeAccountId_idx").using("btree", table.stripeAccountId.asc().nullsLast().op("text_ops")),
	uniqueIndex("StripeConnection_stripeAccountId_key").using("btree", table.stripeAccountId.asc().nullsLast().op("text_ops")),
	index("StripeConnection_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	uniqueIndex("StripeConnection_locationId_key").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "StripeConnection_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "StripeConnection_locationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const studioBooking = pgTable("StudioBooking", {
	id: text().primaryKey().notNull(),
	classId: text().notNull(),
	clientId: text().notNull(),
	externalId: text(),
	status: studioBookingStatus().default('BOOKED').notNull(),
	bookedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	checkedInAt: timestamp({ precision: 3, mode: 'date' }),
	cancelledAt: timestamp({ precision: 3, mode: 'date' }),
	notes: text(),
	cancellationReason: text(),
	metadata: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("StudioBooking_classId_idx").using("btree", table.classId.asc().nullsLast().op("text_ops")),
	index("StudioBooking_clientId_idx").using("btree", table.clientId.asc().nullsLast().op("text_ops")),
	index("StudioBooking_externalId_idx").using("btree", table.externalId.asc().nullsLast().op("text_ops")),
	index("StudioBooking_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.classId],
			foreignColumns: [studioClass.id],
			name: "StudioBooking_classId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
			name: "StudioBooking_clientId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const studioBookingPayment = pgTable("StudioBookingPayment", {
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
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("StudioBookingPayment_bookingId_idx").using("btree", table.bookingId.asc().nullsLast().op("text_ops")),
	index("StudioBookingPayment_classCreditId_idx").using("btree", table.classCreditId.asc().nullsLast().op("text_ops")),
	index("StudioBookingPayment_lineItemId_idx").using("btree", table.lineItemId.asc().nullsLast().op("text_ops")),
	index("StudioBookingPayment_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	index("StudioBookingPayment_mindbodyPmtRefNo_idx").using("btree", table.mindbodyPmtRefNo.asc().nullsLast().op("text_ops")),
	index("StudioBookingPayment_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("StudioBookingPayment_paymentId_idx").using("btree", table.paymentId.asc().nullsLast().op("text_ops")),
	uniqueIndex("StudioBookingPayment_organizationId_visitRefNo_pmtRefNo_key").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.visitRefNo.asc().nullsLast().op("text_ops"), table.mindbodyPmtRefNo.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.bookingId],
			foreignColumns: [studioBooking.id],
			name: "StudioBookingPayment_bookingId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.classCreditId],
			foreignColumns: [classCredit.id],
			name: "StudioBookingPayment_classCreditId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.lineItemId],
			foreignColumns: [studioPaymentLineItem.id],
			name: "StudioBookingPayment_lineItemId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "StudioBookingPayment_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "StudioBookingPayment_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.paymentId],
			foreignColumns: [studioPayment.id],
			name: "StudioBookingPayment_paymentId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const locationModule = pgTable("LocationModule", {
	id: text().primaryKey().notNull(),
	locationId: text(),
	moduleType: moduleType().notNull(),
	enabled: boolean().default(false).notNull(),
	config: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	organizationId: text(),
}, (table) => [
	index("LocationModule_organizationId_enabled_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.enabled.asc().nullsLast().op("text_ops")),
	uniqueIndex("LocationModule_organizationId_moduleType_key").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.moduleType.asc().nullsLast().op("text_ops")),
	index("LocationModule_locationId_enabled_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops"), table.enabled.asc().nullsLast().op("bool_ops")),
	uniqueIndex("LocationModule_locationId_moduleType_key").using("btree", table.locationId.asc().nullsLast().op("text_ops"), table.moduleType.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "LocationModule_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "LocationModule_locationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const userPresence = pgTable("UserPresence", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	organizationId: text(),
	locationId: text(),
	status: text().default('offline').notNull(),
	lastSeenAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	lastActivityAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	userAgent: text(),
	ipAddress: text(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("UserPresence_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("UserPresence_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	uniqueIndex("UserPresence_userId_key").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	index("UserPresence_userId_status_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "UserPresence_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const instructorDocument = pgTable("InstructorDocument", {
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
	issueDate: timestamp({ precision: 3, mode: 'date' }),
	expiryDate: timestamp({ precision: 3, mode: 'date' }),
	issuingAuthority: text(),
	status: instructorDocumentStatus().default('PENDING_UPLOAD').notNull(),
	reviewedAt: timestamp({ precision: 3, mode: 'date' }),
	reviewedBy: text(),
	rejectionReason: text(),
	expiryNotificationSent: boolean().default(false).notNull(),
	expiryNotificationDate: timestamp({ precision: 3, mode: 'date' }),
	metadata: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("InstructorDocument_expiryDate_idx").using("btree", table.expiryDate.asc().nullsLast().op("timestamp_ops")),
	index("InstructorDocument_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("InstructorDocument_type_idx").using("btree", table.type.asc().nullsLast().op("enum_ops")),
	index("InstructorDocument_instructorId_idx").using("btree", table.instructorId.asc().nullsLast().op("text_ops")),
	index("InstructorDocument_instructorId_status_idx").using("btree", table.instructorId.asc().nullsLast().op("enum_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("InstructorDocument_instructorId_type_idx").using("btree", table.instructorId.asc().nullsLast().op("text_ops"), table.type.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.instructorId],
			foreignColumns: [instructor.id],
			name: "InstructorDocument_instructorId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const timeLog = pgTable("TimeLog", {
	id: text().primaryKey().notNull(),
	locationId: text(),
	clientId: text(),
	dealId: text(),
	startTime: timestamp({ precision: 3, mode: 'date' }).notNull(),
	endTime: timestamp({ precision: 3, mode: 'date' }),
	duration: integer(),
	breakDuration: integer(),
	checkInMethod: checkInMethod().default('MANUAL').notNull(),
	checkInLocation: jsonb(),
	checkOutLocation: jsonb(),
	qrCodeId: text(),
	title: text(),
	description: text(),
	status: timeLogStatus().default('DRAFT').notNull(),
	billable: boolean().default(true).notNull(),
	hourlyRate: numeric({ precision: 10, scale:  2 }),
	totalAmount: numeric({ precision: 12, scale:  2 }),
	currency: text().default('USD'),
	submittedAt: timestamp({ precision: 3, mode: 'date' }),
	submittedBy: text(),
	approvedAt: timestamp({ precision: 3, mode: 'date' }),
	approvedBy: text(),
	rejectedAt: timestamp({ precision: 3, mode: 'date' }),
	rejectedBy: text(),
	rejectionReason: text(),
	invoiceId: text(),
	customFields: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	instructorId: text(),
	organizationId: text().notNull(),
	descriptionMode: text().default('single'),
	sections: jsonb(),
	complianceFlags: jsonb(),
	isOvertime: boolean().default(false),
	overtimeHours: numeric({ precision: 6, scale:  2 }),
}, (table) => [
	index("TimeLog_organizationId_clientId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.clientId.asc().nullsLast().op("text_ops")),
	index("TimeLog_organizationId_dealId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.dealId.asc().nullsLast().op("text_ops")),
	index("TimeLog_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("TimeLog_organizationId_startTime_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.startTime.asc().nullsLast().op("timestamp_ops")),
	index("TimeLog_organizationId_status_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("TimeLog_organizationId_locationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.locationId.asc().nullsLast().op("text_ops")),
	index("TimeLog_organizationId_instructorId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.instructorId.asc().nullsLast().op("text_ops")),
	index("TimeLog_organizationId_instructorId_startTime_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.instructorId.asc().nullsLast().op("text_ops"), table.startTime.asc().nullsLast().op("text_ops")),
	index("TimeLog_status_invoiceId_idx").using("btree", table.status.asc().nullsLast().op("text_ops"), table.invoiceId.asc().nullsLast().op("text_ops")),
	index("TimeLog_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	index("TimeLog_instructorId_status_idx").using("btree", table.instructorId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
			name: "TimeLog_clientId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.dealId],
			foreignColumns: [deal.id],
			name: "TimeLog_dealId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [invoice.id],
			name: "TimeLog_invoiceId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "TimeLog_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "TimeLog_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.instructorId],
			foreignColumns: [instructor.id],
			name: "TimeLog_instructorId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const shiftSwapRequest = pgTable("ShiftSwapRequest", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	rotaId: text().notNull(),
	requesterId: text().notNull(),
	targetInstructorId: text(),
	status: shiftSwapStatus().default('PENDING').notNull(),
	reason: text(),
	requestedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	respondedAt: timestamp({ precision: 3, mode: 'date' }),
	respondedBy: text(),
	adminApprovedAt: timestamp({ precision: 3, mode: 'date' }),
	adminApprovedBy: text(),
	adminRejectedAt: timestamp({ precision: 3, mode: 'date' }),
	adminRejectedBy: text(),
	rejectionReason: text(),
	expiresAt: timestamp({ precision: 3, mode: 'date' }),
	notificationsSent: boolean().default(false).notNull(),
	metadata: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("ShiftSwapRequest_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("ShiftSwapRequest_organizationId_status_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("enum_ops")),
	index("ShiftSwapRequest_requestedAt_idx").using("btree", table.requestedAt.asc().nullsLast().op("timestamp_ops")),
	index("ShiftSwapRequest_requesterId_idx").using("btree", table.requesterId.asc().nullsLast().op("text_ops")),
	index("ShiftSwapRequest_rotaId_idx").using("btree", table.rotaId.asc().nullsLast().op("text_ops")),
	index("ShiftSwapRequest_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("ShiftSwapRequest_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	index("ShiftSwapRequest_targetInstructorId_idx").using("btree", table.targetInstructorId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "ShiftSwapRequest_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.requesterId],
			foreignColumns: [instructor.id],
			name: "ShiftSwapRequest_requesterId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.rotaId],
			foreignColumns: [rota.id],
			name: "ShiftSwapRequest_rotaId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "ShiftSwapRequest_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.targetInstructorId],
			foreignColumns: [instructor.id],
			name: "ShiftSwapRequest_targetInstructorId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const instructorAvailability = pgTable("InstructorAvailability", {
	id: text().primaryKey().notNull(),
	instructorId: text().notNull(),
	organizationId: text().notNull(),
	dayOfWeek: integer().notNull(),
	startTime: text().notNull(),
	endTime: text().notNull(),
	isRecurring: boolean().default(true).notNull(),
	isActive: boolean().default(true).notNull(),
	effectiveFrom: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	effectiveTo: timestamp({ precision: 3, mode: 'date' }),
	notes: text(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("InstructorAvailability_dayOfWeek_idx").using("btree", table.dayOfWeek.asc().nullsLast().op("int4_ops")),
	index("InstructorAvailability_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("InstructorAvailability_instructorId_dayOfWeek_isActive_idx").using("btree", table.instructorId.asc().nullsLast().op("text_ops"), table.dayOfWeek.asc().nullsLast().op("int4_ops"), table.isActive.asc().nullsLast().op("bool_ops")),
	index("InstructorAvailability_instructorId_idx").using("btree", table.instructorId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "InstructorAvailability_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.instructorId],
			foreignColumns: [instructor.id],
			name: "InstructorAvailability_instructorId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const timeOffRequest = pgTable("TimeOffRequest", {
	id: text().primaryKey().notNull(),
	instructorId: text().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	type: timeOffType().default('VACATION').notNull(),
	startDate: timestamp({ precision: 3, mode: 'date' }).notNull(),
	endDate: timestamp({ precision: 3, mode: 'date' }).notNull(),
	startHalfDay: boolean().default(false).notNull(),
	endHalfDay: boolean().default(false).notNull(),
	totalDays: numeric({ precision: 4, scale:  1 }).notNull(),
	reason: text(),
	status: approvalStatus().default('PENDING').notNull(),
	requestedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	approvedAt: timestamp({ precision: 3, mode: 'date' }),
	approvedBy: text(),
	rejectedAt: timestamp({ precision: 3, mode: 'date' }),
	rejectedBy: text(),
	rejectionReason: text(),
	cancelledAt: timestamp({ precision: 3, mode: 'date' }),
	cancelledBy: text(),
	cancellationReason: text(),
	notes: text(),
	attachments: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("TimeOffRequest_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("TimeOffRequest_organizationId_status_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("enum_ops")),
	index("TimeOffRequest_startDate_endDate_idx").using("btree", table.startDate.asc().nullsLast().op("timestamp_ops"), table.endDate.asc().nullsLast().op("timestamp_ops")),
	index("TimeOffRequest_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("TimeOffRequest_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	index("TimeOffRequest_instructorId_idx").using("btree", table.instructorId.asc().nullsLast().op("text_ops")),
	index("TimeOffRequest_instructorId_status_idx").using("btree", table.instructorId.asc().nullsLast().op("enum_ops"), table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "TimeOffRequest_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "TimeOffRequest_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.instructorId],
			foreignColumns: [instructor.id],
			name: "TimeOffRequest_instructorId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const overtimeTracking = pgTable("OvertimeTracking", {
	id: text().primaryKey().notNull(),
	instructorId: text().notNull(),
	organizationId: text().notNull(),
	weekStartDate: timestamp({ precision: 3, mode: 'date' }).notNull(),
	weekEndDate: timestamp({ precision: 3, mode: 'date' }).notNull(),
	regularHours: numeric({ precision: 6, scale:  2 }).notNull(),
	overtimeHours: numeric({ precision: 6, scale:  2 }).notNull(),
	totalHours: numeric({ precision: 6, scale:  2 }).notNull(),
	weeklyLimit: numeric({ precision: 6, scale:  2 }),
	isOverLimit: boolean().default(false).notNull(),
	complianceFlags: jsonb(),
	calculatedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("OvertimeTracking_isOverLimit_idx").using("btree", table.isOverLimit.asc().nullsLast().op("bool_ops")),
	index("OvertimeTracking_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("OvertimeTracking_weekStartDate_idx").using("btree", table.weekStartDate.asc().nullsLast().op("timestamp_ops")),
	index("OvertimeTracking_instructorId_idx").using("btree", table.instructorId.asc().nullsLast().op("text_ops")),
	index("OvertimeTracking_instructorId_weekStartDate_idx").using("btree", table.instructorId.asc().nullsLast().op("text_ops"), table.weekStartDate.asc().nullsLast().op("timestamp_ops")),
	uniqueIndex("OvertimeTracking_instructorId_weekStartDate_key").using("btree", table.instructorId.asc().nullsLast().op("text_ops"), table.weekStartDate.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "OvertimeTracking_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.instructorId],
			foreignColumns: [instructor.id],
			name: "OvertimeTracking_instructorId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const invoice = pgTable("Invoice", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	invoiceNumber: text().notNull(),
	clientId: text(),
	clientName: text().notNull(),
	clientEmail: text(),
	clientAddress: jsonb(),
	title: text(),
	status: invoiceStatus().default('DRAFT').notNull(),
	billingModel: billingModel().default('CUSTOM').notNull(),
	issueDate: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	dueDate: timestamp({ precision: 3, mode: 'date' }).notNull(),
	paidAt: timestamp({ precision: 3, mode: 'date' }),
	subtotal: numeric({ precision: 12, scale:  2 }).notNull(),
	taxRate: numeric({ precision: 5, scale:  2 }),
	taxAmount: numeric({ precision: 12, scale:  2 }).default('0').notNull(),
	discountAmount: numeric({ precision: 12, scale:  2 }).default('0').notNull(),
	total: numeric({ precision: 12, scale:  2 }).notNull(),
	amountPaid: numeric({ precision: 12, scale:  2 }).default('0').notNull(),
	amountDue: numeric({ precision: 12, scale:  2 }).notNull(),
	currency: text().default('USD').notNull(),
	notes: text(),
	internalNotes: text(),
	termsConditions: text(),
	stripeInvoiceId: text(),
	stripePaymentIntentId: text(),
	xeroInvoiceId: text(),
	lastReminderSentAt: timestamp({ precision: 3, mode: 'date' }),
	reminderCount: integer().default(0).notNull(),
	metadata: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	templateId: text(),
	bankTransferNotes: text(),
	bankTransferProof: text(),
	bankTransferStatus: bankTransferStatus(),
	bankTransferVerifiedAt: timestamp({ precision: 3, mode: 'date' }),
	bankTransferVerifiedBy: text(),
	paymentMethods: paymentMethod("paymentMethods").array().default([]),
	type: invoiceType().default('SENT').notNull(),
	documentUrl: text(),
	documentName: text(),
}, (table) => [
	index("Invoice_clientId_idx").using("btree", table.clientId.asc().nullsLast().op("text_ops")),
	index("Invoice_dueDate_idx").using("btree", table.dueDate.asc().nullsLast().op("timestamp_ops")),
	index("Invoice_invoiceNumber_idx").using("btree", table.invoiceNumber.asc().nullsLast().op("text_ops")),
	uniqueIndex("Invoice_invoiceNumber_key").using("btree", table.invoiceNumber.asc().nullsLast().op("text_ops")),
	index("Invoice_issueDate_idx").using("btree", table.issueDate.asc().nullsLast().op("timestamp_ops")),
	index("Invoice_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("Invoice_organizationId_locationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.locationId.asc().nullsLast().op("text_ops")),
	index("Invoice_organizationId_type_idx").using("btree", table.organizationId.asc().nullsLast().op("enum_ops"), table.type.asc().nullsLast().op("text_ops")),
	index("Invoice_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	uniqueIndex("Invoice_stripeInvoiceId_key").using("btree", table.stripeInvoiceId.asc().nullsLast().op("text_ops")),
	index("Invoice_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	index("Invoice_templateId_idx").using("btree", table.templateId.asc().nullsLast().op("text_ops")),
	index("Invoice_type_idx").using("btree", table.type.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "Invoice_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [invoiceTemplate.id],
			name: "Invoice_templateId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const payrollRun = pgTable("PayrollRun", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	periodStart: timestamp({ precision: 3, mode: 'date' }).notNull(),
	periodEnd: timestamp({ precision: 3, mode: 'date' }).notNull(),
	paymentDate: timestamp({ precision: 3, mode: 'date' }).notNull(),
	status: payrollRunStatus().default('DRAFT').notNull(),
	totalGrossPay: numeric({ precision: 12, scale:  2 }).notNull(),
	totalDeductions: numeric({ precision: 12, scale:  2 }).default('0').notNull(),
	totalNetPay: numeric({ precision: 12, scale:  2 }).notNull(),
	currency: text().default('GBP').notNull(),
	notes: text(),
	approvedBy: text(),
	approvedAt: timestamp({ precision: 3, mode: 'date' }),
	processedBy: text(),
	processedAt: timestamp({ precision: 3, mode: 'date' }),
	completedAt: timestamp({ precision: 3, mode: 'date' }),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	createdBy: text().notNull(),
}, (table) => [
	index("PayrollRun_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("PayrollRun_paymentDate_idx").using("btree", table.paymentDate.asc().nullsLast().op("timestamp_ops")),
	index("PayrollRun_periodStart_periodEnd_idx").using("btree", table.periodStart.asc().nullsLast().op("timestamp_ops"), table.periodEnd.asc().nullsLast().op("timestamp_ops")),
	index("PayrollRun_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("PayrollRun_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "PayrollRun_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "PayrollRun_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const instructorPayment = pgTable("InstructorPayment", {
	id: text().primaryKey().notNull(),
	instructorId: text().notNull(),
	payrollRunId: text(),
	organizationId: text().notNull(),
	locationId: text(),
	periodStart: timestamp({ precision: 3, mode: 'date' }).notNull(),
	periodEnd: timestamp({ precision: 3, mode: 'date' }).notNull(),
	paymentDate: timestamp({ precision: 3, mode: 'date' }).notNull(),
	grossAmount: numeric({ precision: 12, scale:  2 }).notNull(),
	deductions: numeric({ precision: 12, scale:  2 }).default('0').notNull(),
	netAmount: numeric({ precision: 12, scale:  2 }).notNull(),
	currency: text().default('GBP').notNull(),
	paymentMethod: instructorPaymentMethod().default('BANK_TRANSFER').notNull(),
	paymentStatus: instructorPaymentStatus().default('PENDING').notNull(),
	paymentReference: text(),
	bankAccountName: text(),
	bankAccountNumber: text(),
	bankSortCode: text(),
	notes: text(),
	paidBy: text(),
	paidAt: timestamp({ precision: 3, mode: 'date' }),
	failureReason: text(),
	metadata: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("InstructorPayment_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("InstructorPayment_paymentDate_idx").using("btree", table.paymentDate.asc().nullsLast().op("timestamp_ops")),
	index("InstructorPayment_paymentStatus_idx").using("btree", table.paymentStatus.asc().nullsLast().op("enum_ops")),
	index("InstructorPayment_payrollRunId_idx").using("btree", table.payrollRunId.asc().nullsLast().op("text_ops")),
	index("InstructorPayment_periodStart_periodEnd_idx").using("btree", table.periodStart.asc().nullsLast().op("timestamp_ops"), table.periodEnd.asc().nullsLast().op("timestamp_ops")),
	index("InstructorPayment_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	index("InstructorPayment_instructorId_idx").using("btree", table.instructorId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "InstructorPayment_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.payrollRunId],
			foreignColumns: [payrollRun.id],
			name: "InstructorPayment_payrollRunId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "InstructorPayment_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.instructorId],
			foreignColumns: [instructor.id],
			name: "InstructorPayment_instructorId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const payrollRunInstructor = pgTable("PayrollRunInstructor", {
	id: text().primaryKey().notNull(),
	payrollRunId: text().notNull(),
	instructorId: text().notNull(),
	regularHours: numeric({ precision: 8, scale:  2 }).notNull(),
	overtimeHours: numeric({ precision: 8, scale:  2 }).default('0').notNull(),
	regularPay: numeric({ precision: 12, scale:  2 }).notNull(),
	overtimePay: numeric({ precision: 12, scale:  2 }).default('0').notNull(),
	bonuses: numeric({ precision: 12, scale:  2 }).default('0').notNull(),
	deductions: numeric({ precision: 12, scale:  2 }).default('0').notNull(),
	grossPay: numeric({ precision: 12, scale:  2 }).notNull(),
	netPay: numeric({ precision: 12, scale:  2 }).notNull(),
	notes: text(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	housingAllowance: numeric({ precision: 12, scale:  2 }).default('0').notNull(),
	incomeTax: numeric({ precision: 12, scale:  2 }).default('0').notNull(),
	mealAllowance: numeric({ precision: 12, scale:  2 }).default('0').notNull(),
	nationalInsurance: numeric({ precision: 12, scale:  2 }).default('0').notNull(),
	otherAllowances: numeric({ precision: 12, scale:  2 }).default('0').notNull(),
	otherDeductions: numeric({ precision: 12, scale:  2 }).default('0').notNull(),
	payslipSentAt: timestamp({ precision: 3, mode: 'date' }),
	payslipUrl: text(),
	pensionContribution: numeric({ precision: 12, scale:  2 }).default('0').notNull(),
	studentLoan: numeric({ precision: 12, scale:  2 }).default('0').notNull(),
	transportAllowance: numeric({ precision: 12, scale:  2 }).default('0').notNull(),
	ytdGrossPay: numeric({ precision: 12, scale:  2 }),
	ytdNi: numeric({ precision: 12, scale:  2 }),
	ytdNetPay: numeric({ precision: 12, scale:  2 }),
	ytdTax: numeric({ precision: 12, scale:  2 }),
}, (table) => [
	index("PayrollRunInstructor_payrollRunId_idx").using("btree", table.payrollRunId.asc().nullsLast().op("text_ops")),
	uniqueIndex("PayrollRunInstructor_payrollRunId_instructorId_key").using("btree", table.payrollRunId.asc().nullsLast().op("text_ops"), table.instructorId.asc().nullsLast().op("text_ops")),
	index("PayrollRunInstructor_instructorId_idx").using("btree", table.instructorId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.payrollRunId],
			foreignColumns: [payrollRun.id],
			name: "PayrollRunInstructor_payrollRunId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.instructorId],
			foreignColumns: [instructor.id],
			name: "PayrollRunInstructor_instructorId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const instructor = pgTable("Instructor", {
	id: text().primaryKey().notNull(),
	locationId: text(),
	mindbodyTrainerId: text(),
	name: text().notNull(),
	email: text(),
	phone: text(),
	employeeId: text(),
	portalToken: text(),
	portalTokenExpiry: timestamp({ precision: 3, mode: 'date' }),
	lastLoginAt: timestamp({ precision: 3, mode: 'date' }),
	hourlyRate: numeric({ precision: 10, scale:  2 }),
	currency: text().default('GBP'),
	role: text(),
	isActive: boolean().default(true).notNull(),
	customFields: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	organizationId: text().notNull(),
	addressLine1: text(),
	addressLine2: text(),
	bankAccountName: text(),
	bankAccountNumber: text(),
	bankSortCode: text(),
	city: text(),
	country: text().default('United Kingdom'),
	county: text(),
	dateOfBirth: timestamp({ precision: 3, mode: 'date' }),
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
	onboardingCompletedAt: timestamp({ precision: 3, mode: 'date' }),
	postcode: text(),
	preferredShiftTypes: text().array().default([]),
	profilePhoto: text(),
	qualifications: text().array().default([]),
	sessionToken: text(),
	sessionTokenExpiry: timestamp({ precision: 3, mode: 'date' }),
	skills: text().array().default([]),
	travelRadius: integer(),
	commissionConfig: jsonb(),
	employmentStart: timestamp({ precision: 3, mode: 'date' }),
	employmentEnd: timestamp({ precision: 3, mode: 'date' }),
	isSystem: boolean().default(false).notNull(),
	employerPensionRate: numeric({ precision: 5, scale:  2 }).default('3'),
	housingAllowance: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	mealAllowance: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	otherAllowances: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	pensionContributionRate: numeric({ precision: 5, scale:  2 }).default('5'),
	pensionSchemeEnrolled: boolean().default(false).notNull(),
	studentLoanPlan: text(),
	taxCode: text().default('1257L'),
	transportAllowance: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	bio: text(),
	instructorCertifications: text().array().default([]),
	instructorClassTypes: text().array().default([]),
	instructorSpecialties: text().array().default([]),
	publicProfileSlug: text(),
	stripeAccountId: text(),
	stripeAccountStatus: text(),
	stripeOnboardingComplete: boolean().default(false).notNull(),
	userId: text(),
}, (table) => [
	index("Instructor_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("Instructor_mindbodyTrainerId_idx").using("btree", table.mindbodyTrainerId.asc().nullsLast().op("text_ops")),
	index("Instructor_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("Instructor_organizationId_locationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.locationId.asc().nullsLast().op("text_ops")),
	index("Instructor_phone_idx").using("btree", table.phone.asc().nullsLast().op("text_ops")),
	index("Instructor_portalToken_idx").using("btree", table.portalToken.asc().nullsLast().op("text_ops")),
	uniqueIndex("Instructor_organizationId_mindbodyTrainerId_key").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.mindbodyTrainerId.asc().nullsLast().op("text_ops")),
	uniqueIndex("Instructor_portalToken_key").using("btree", table.portalToken.asc().nullsLast().op("text_ops")),
	index("Instructor_sessionToken_idx").using("btree", table.sessionToken.asc().nullsLast().op("text_ops")),
	uniqueIndex("Instructor_sessionToken_key").using("btree", table.sessionToken.asc().nullsLast().op("text_ops")),
	index("Instructor_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	index("Instructor_userId_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	uniqueIndex("Instructor_userId_key").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "Instructor_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "Instructor_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const studioStaffMember = pgTable("StudioStaffMember", {
	id: text().primaryKey().notNull(),
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
	staffType: text().default('TEAM_MEMBER').notNull(),
	isActive: boolean().default(true).notNull(),
	isSystem: boolean().default(false).notNull(),
	isIntegrationAccount: boolean().default(false).notNull(),
	canTeachClasses: boolean().default(false).notNull(),
	canTakeAppointments: boolean().default(false).notNull(),
	canHandleReservations: boolean().default(false).notNull(),
	canLeadWorkshops: boolean().default(false).notNull(),
	hourlyRate: numeric({ precision: 10, scale:  2 }),
	currency: text().default('GBP'),
	employmentStart: timestamp({ precision: 3, mode: 'date' }),
	employmentEnd: timestamp({ precision: 3, mode: 'date' }),
	metadata: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	deletedAt: timestamp({ precision: 3, mode: 'date' }),
}, (table) => [
	index("StudioStaffMember_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("StudioStaffMember_isActive_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("StudioStaffMember_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	index("StudioStaffMember_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("StudioStaffMember_staffType_idx").using("btree", table.staffType.asc().nullsLast().op("text_ops")),
	uniqueIndex("StudioStaffMember_organizationId_externalId_key").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.externalId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "StudioStaffMember_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "StudioStaffMember_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const funnel = pgTable("Funnel", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	status: funnelStatus().default('DRAFT').notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	publishedAt: timestamp({ precision: 3, mode: 'date' }),
	stylePresetId: text(),
	customDomain: text(),
	domainType: funnelDomainType().default('SUBDOMAIN').notNull(),
	domainVerified: boolean().default(false).notNull(),
	subdomain: text(),
	apiKey: text(),
	externalDomains: text().array(),
	externalMetadata: jsonb(),
	externalUrl: text(),
	funnelType: funnelType().default('INTERNAL').notNull(),
	isReadOnly: boolean().default(false).notNull(),
	lastSyncedAt: timestamp({ precision: 3, mode: 'date' }),
	trackingConfig: jsonb(),
}, (table) => [
	index("Funnel_apiKey_idx").using("btree", table.apiKey.asc().nullsLast().op("text_ops")),
	uniqueIndex("Funnel_apiKey_key").using("btree", table.apiKey.asc().nullsLast().op("text_ops")),
	index("Funnel_customDomain_idx").using("btree", table.customDomain.asc().nullsLast().op("text_ops")),
	index("Funnel_funnelType_idx").using("btree", table.funnelType.asc().nullsLast().op("enum_ops")),
	index("Funnel_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("Funnel_organizationId_locationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.locationId.asc().nullsLast().op("text_ops")),
	index("Funnel_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("Funnel_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	index("Funnel_subdomain_idx").using("btree", table.subdomain.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "Funnel_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.stylePresetId],
			foreignColumns: [globalStylePreset.id],
			name: "Funnel_stylePresetId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "Funnel_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const anonymousUserProfiles = pgTable("anonymous_user_profiles", {
	id: text().primaryKey().notNull(),
	displayName: text().notNull(),
	firstSeen: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	lastSeen: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	totalSessions: integer().default(0).notNull(),
	totalEvents: integer().default(0).notNull(),
	avgEngagementRate: doublePrecision(),
	avgExperienceScore: doublePrecision(),
	identifiedAt: timestamp({ precision: 3, mode: 'date' }),
	identifiedUserId: text(),
	lifecycleStage: text(),
	tags: text().array().default([]),
	userProperties: jsonb().default({}).notNull(),
	consentGiven: boolean().default(false).notNull(),
	consentTimestamp: timestamp({ precision: 3, mode: 'date' }),
	consentVersion: text().default('1.0'),
	dataRetentionDays: integer().default(90).notNull(),
	deletionRequestedAt: timestamp({ precision: 3, mode: 'date' }),
}, (table) => [
	index("anonymous_user_profiles_consentGiven_idx").using("btree", table.consentGiven.asc().nullsLast().op("bool_ops")),
	index("anonymous_user_profiles_deletionRequestedAt_idx").using("btree", table.deletionRequestedAt.asc().nullsLast().op("timestamp_ops")),
	index("anonymous_user_profiles_identifiedUserId_idx").using("btree", table.identifiedUserId.asc().nullsLast().op("text_ops")),
	index("anonymous_user_profiles_lifecycleStage_idx").using("btree", table.lifecycleStage.asc().nullsLast().op("text_ops")),
]).enableRLS();

export const funnelWebVital = pgTable("FunnelWebVital", {
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
	timestamp: timestamp({ precision: 3, mode: 'date' }).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("FunnelWebVital_anonymousId_idx").using("btree", table.anonymousId.asc().nullsLast().op("text_ops")),
	index("FunnelWebVital_funnelId_timestamp_idx").using("btree", table.funnelId.asc().nullsLast().op("text_ops"), table.timestamp.asc().nullsLast().op("text_ops")),
	index("FunnelWebVital_metric_rating_idx").using("btree", table.metric.asc().nullsLast().op("enum_ops"), table.rating.asc().nullsLast().op("enum_ops")),
	index("FunnelWebVital_pageUrl_metric_idx").using("btree", table.pageUrl.asc().nullsLast().op("text_ops"), table.metric.asc().nullsLast().op("enum_ops")),
	index("FunnelWebVital_sessionId_idx").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	index("FunnelWebVital_locationId_timestamp_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops"), table.timestamp.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [funnelSession.sessionId],
			name: "FunnelWebVital_sessionId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const funnelEvent = pgTable("FunnelEvent", {
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
	timestamp: timestamp({ precision: 3, mode: 'date' }).notNull(),
	serverTimestamp: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
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
	firstTouchTimestamp: timestamp({ precision: 3, mode: 'date' }),
	firstTouchUtmCampaign: text(),
	firstTouchUtmContent: text(),
	firstTouchUtmMedium: text(),
	firstTouchUtmSource: text(),
	firstTouchUtmTerm: text(),
	lastTouchTimestamp: timestamp({ precision: 3, mode: 'date' }),
	lastTouchUtmCampaign: text(),
	lastTouchUtmContent: text(),
	lastTouchUtmMedium: text(),
	lastTouchUtmSource: text(),
	lastTouchUtmTerm: text(),
	leadScore: doublePrecision(),
	leadScoreGrade: text(),
}, (table) => [
	index("FunnelEvent_abTestId_idx").using("btree", table.abTestId.asc().nullsLast().op("text_ops")),
	index("FunnelEvent_anonymousId_idx").using("btree", table.anonymousId.asc().nullsLast().op("text_ops")),
	uniqueIndex("FunnelEvent_eventId_key").using("btree", table.eventId.asc().nullsLast().op("text_ops")),
	index("FunnelEvent_eventName_funnelId_idx").using("btree", table.eventName.asc().nullsLast().op("text_ops"), table.funnelId.asc().nullsLast().op("text_ops")),
	index("FunnelEvent_fbclid_idx").using("btree", table.fbclid.asc().nullsLast().op("text_ops")),
	index("FunnelEvent_funnelId_timestamp_idx").using("btree", table.funnelId.asc().nullsLast().op("text_ops"), table.timestamp.asc().nullsLast().op("text_ops")),
	index("FunnelEvent_gclid_idx").using("btree", table.gclid.asc().nullsLast().op("text_ops")),
	index("FunnelEvent_isConversion_funnelId_idx").using("btree", table.isConversion.asc().nullsLast().op("bool_ops"), table.funnelId.asc().nullsLast().op("text_ops")),
	index("FunnelEvent_leadScoreGrade_idx").using("btree", table.leadScoreGrade.asc().nullsLast().op("text_ops")),
	index("FunnelEvent_msclkid_idx").using("btree", table.msclkid.asc().nullsLast().op("text_ops")),
	index("FunnelEvent_sessionId_idx").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	index("FunnelEvent_locationId_timestamp_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops"), table.timestamp.asc().nullsLast().op("timestamp_ops")),
	index("FunnelEvent_ttclid_idx").using("btree", table.ttclid.asc().nullsLast().op("text_ops")),
	index("FunnelEvent_userId_timestamp_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.timestamp.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.funnelId],
			foreignColumns: [funnel.id],
			name: "FunnelEvent_funnelId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "FunnelEvent_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const funnelSession = pgTable("FunnelSession", {
	id: text().primaryKey().notNull(),
	sessionId: text().notNull(),
	funnelId: text().notNull(),
	locationId: text(),
	userId: text(),
	anonymousId: text(),
	startedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	endedAt: timestamp({ precision: 3, mode: 'date' }),
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
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
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
	abandonedAt: timestamp({ precision: 3, mode: 'date' }),
	checkoutCompletedAt: timestamp({ precision: 3, mode: 'date' }),
	checkoutDuration: integer(),
	checkoutStartedAt: timestamp({ precision: 3, mode: 'date' }),
	currentStage: text(),
	firstTouchSource: text(),
	isAbandoned: boolean().default(false).notNull(),
	lastTouchSource: text(),
	linkedSessionId: text(),
	stageHistory: jsonb().default([]).notNull(),
	touchpoints: text().array().default([]),
	consentGiven: boolean().default(false).notNull(),
	consentTimestamp: timestamp({ precision: 3, mode: 'date' }),
	consentVersion: text().default('1.0'),
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
}, (table) => [
	index("FunnelSession_anonymousId_idx").using("btree", table.anonymousId.asc().nullsLast().op("text_ops")),
	index("FunnelSession_consentGiven_idx").using("btree", table.consentGiven.asc().nullsLast().op("bool_ops")),
	index("FunnelSession_converted_funnelId_idx").using("btree", table.converted.asc().nullsLast().op("bool_ops"), table.funnelId.asc().nullsLast().op("text_ops")),
	index("FunnelSession_funnelId_startedAt_idx").using("btree", table.funnelId.asc().nullsLast().op("text_ops"), table.startedAt.asc().nullsLast().op("timestamp_ops")),
	index("FunnelSession_profileId_idx").using("btree", table.profileId.asc().nullsLast().op("text_ops")),
	index("FunnelSession_locationId_startedAt_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops"), table.startedAt.asc().nullsLast().op("timestamp_ops")),
	index("FunnelSession_userId_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.funnelId],
			foreignColumns: [funnel.id],
			name: "FunnelSession_funnelId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.linkedSessionId],
			foreignColumns: [table.id],
			name: "FunnelSession_linkedSessionId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.profileId],
			foreignColumns: [anonymousUserProfiles.id],
			name: "FunnelSession_profileId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "FunnelSession_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const adSpend = pgTable("AdSpend", {
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
	currency: text().default('USD').notNull(),
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
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("AdSpend_funnelId_date_idx").using("btree", table.funnelId.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("text_ops")),
	index("AdSpend_organizationId_date_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.date.asc().nullsLast().op("text_ops")),
	uniqueIndex("AdSpend_organizationId_platform_campaignId_date_key").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.platform.asc().nullsLast().op("date_ops"), table.campaignId.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("date_ops")),
	index("AdSpend_platform_date_idx").using("btree", table.platform.asc().nullsLast().op("text_ops"), table.date.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.funnelId],
			foreignColumns: [funnel.id],
			name: "AdSpend_funnelId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "AdSpend_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "AdSpend_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const adPlatformCredential = pgTable("AdPlatformCredential", {
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
	expiresAt: timestamp({ precision: 3, mode: 'date' }),
	isActive: boolean().default(true).notNull(),
	lastSyncedAt: timestamp({ precision: 3, mode: 'date' }),
	lastError: text(),
	scopes: text().array().default([]),
	metadata: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	uniqueIndex("AdPlatformCredential_organizationId_platform_accountId_key").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.platform.asc().nullsLast().op("text_ops"), table.accountId.asc().nullsLast().op("text_ops")),
	index("AdPlatformCredential_organizationId_platform_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.platform.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "AdPlatformCredential_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "AdPlatformCredential_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const client = pgTable("Client", {
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
	dateOfBirth: timestamp({ precision: 3, mode: 'date' }),
	gender: text(),
	score: integer().default(0),
	type: clientType().default('LEAD').notNull(),
	source: text(),
	website: text(),
	linkedin: text(),
	tags: text().array().default([]),
	lastInteractionAt: timestamp({ precision: 3, mode: 'date' }),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	lifecycleStage: lifecycleStage(),
	organizationId: text().notNull(),
	metadata: jsonb(),
	emailUnsubscribed: boolean().default(false).notNull(),
	emailUnsubscribedAt: timestamp({ precision: 3, mode: 'date' }),
	attendanceCount: integer().default(0).notNull(),
	currentStreak: integer().default(0).notNull(),
	emergencyContactName: text(),
	emergencyContactPhone: text(),
	emergencyContactRelation: text(),
	emergencyContactEmail: text(),
	fitnessGoals: text(),
	healthNotes: text(),
	waiverSignedAt: timestamp({ precision: 3, mode: 'date' }),
	contraindications: text(),
	trustedMember: boolean().default(false).notNull(),
	stripeCustomerId: text(),
	portalToken: text(),
	portalTokenExpiry: timestamp({ precision: 3, mode: 'date' }),
	birthMonth: integer(),
	birthDay: integer(),
	acquisitionStage: acquisitionStage().default('INQUIRY').notNull(),
	acquiredAt: timestamp({ precision: 3, mode: 'date' }),
	trialStartedAt: timestamp({ precision: 3, mode: 'date' }),
	notificationPrefs: jsonb(),
}, (table) => [
	index("Client_barcodeId_idx").using("btree", table.barcodeId.asc().nullsLast().op("text_ops")),
	index("Client_mindbodyId_idx").using("btree", table.mindbodyId.asc().nullsLast().op("text_ops")),
	index("Client_organizationId_locationId_acquisitionStage_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.locationId.asc().nullsLast().op("text_ops"), table.acquisitionStage.asc().nullsLast().op("text_ops")),
	index("Client_organizationId_locationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.locationId.asc().nullsLast().op("text_ops")),
	uniqueIndex("Client_organizationId_barcodeId_key").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.barcodeId.asc().nullsLast().op("text_ops")),
	uniqueIndex("Client_organizationId_mindbodyId_key").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.mindbodyId.asc().nullsLast().op("text_ops")),
	uniqueIndex("Client_portalToken_key").using("btree", table.portalToken.asc().nullsLast().op("text_ops")),
	index("Client_locationId_email_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops"), table.email.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "Client_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "Client_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const emailDomain = pgTable("EmailDomain", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	domain: text().notNull(),
	resendDomainId: text(),
	status: emailDomainStatus().default('PENDING').notNull(),
	dnsRecords: jsonb(),
	defaultFromName: text(),
	defaultFromEmail: text(),
	defaultReplyTo: text(),
	verifiedAt: timestamp({ precision: 3, mode: 'date' }),
	lastCheckedAt: timestamp({ precision: 3, mode: 'date' }),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	uniqueIndex("EmailDomain_domain_key").using("btree", table.domain.asc().nullsLast().op("text_ops")),
	index("EmailDomain_organizationId_locationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "EmailDomain_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "EmailDomain_locationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const emailTemplate = pgTable("EmailTemplate", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	name: text().notNull(),
	description: text(),
	type: emailTemplateType().default('MARKETING').notNull(),
	content: jsonb().notNull(),
	design: jsonb(),
	isSystemTemplate: boolean().default(false).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("EmailTemplate_organizationId_locationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "EmailTemplate_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "EmailTemplate_locationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const campaignRecipient = pgTable("CampaignRecipient", {
	id: text().primaryKey().notNull(),
	campaignId: text().notNull(),
	clientId: text().notNull(),
	resendEmailId: text(),
	status: campaignRecipientStatus().default('PENDING').notNull(),
	deliveredAt: timestamp({ precision: 3, mode: 'date' }),
	openedAt: timestamp({ precision: 3, mode: 'date' }),
	clickedAt: timestamp({ precision: 3, mode: 'date' }),
	bouncedAt: timestamp({ precision: 3, mode: 'date' }),
	complainedAt: timestamp({ precision: 3, mode: 'date' }),
	unsubscribedAt: timestamp({ precision: 3, mode: 'date' }),
	clickCount: integer().default(0).notNull(),
	clickedLinks: jsonb(),
	openCount: integer().default(0).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	uniqueIndex("CampaignRecipient_campaignId_clientId_key").using("btree", table.campaignId.asc().nullsLast().op("text_ops"), table.clientId.asc().nullsLast().op("text_ops")),
	index("CampaignRecipient_clientId_idx").using("btree", table.clientId.asc().nullsLast().op("text_ops")),
	index("CampaignRecipient_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.campaignId],
			foreignColumns: [campaign.id],
			name: "CampaignRecipient_campaignId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
			name: "CampaignRecipient_clientId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const unsubscribeToken = pgTable("UnsubscribeToken", {
	id: text().primaryKey().notNull(),
	clientId: text().notNull(),
	campaignId: text(),
	token: text().notNull(),
	usedAt: timestamp({ precision: 3, mode: 'date' }),
	expiresAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("UnsubscribeToken_clientId_idx").using("btree", table.clientId.asc().nullsLast().op("text_ops")),
	index("UnsubscribeToken_token_idx").using("btree", table.token.asc().nullsLast().op("text_ops")),
	uniqueIndex("UnsubscribeToken_token_key").using("btree", table.token.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
			name: "UnsubscribeToken_clientId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const campaign = pgTable("Campaign", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	name: text().notNull(),
	status: campaignStatus().default('DRAFT').notNull(),
	templateId: text(),
	subject: text().notNull(),
	preheaderText: text(),
	content: jsonb().notNull(),
	emailDomainId: text(),
	fromName: text(),
	fromEmail: text(),
	replyTo: text(),
	segmentType: campaignSegmentType().default('ALL').notNull(),
	segmentFilter: jsonb(),
	scheduledAt: timestamp({ precision: 3, mode: 'date' }),
	sentAt: timestamp({ precision: 3, mode: 'date' }),
	resendBroadcastId: text(),
	totalRecipients: integer().default(0).notNull(),
	delivered: integer().default(0).notNull(),
	opened: integer().default(0).notNull(),
	clicked: integer().default(0).notNull(),
	bounced: integer().default(0).notNull(),
	complained: integer().default(0).notNull(),
	unsubscribed: integer().default(0).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	resendTemplateId: text(),
}, (table) => [
	index("Campaign_organizationId_locationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.locationId.asc().nullsLast().op("text_ops")),
	index("Campaign_scheduledAt_idx").using("btree", table.scheduledAt.asc().nullsLast().op("timestamp_ops")),
	index("Campaign_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.emailDomainId],
			foreignColumns: [emailDomain.id],
			name: "Campaign_emailDomainId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "Campaign_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "Campaign_locationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [emailTemplate.id],
			name: "Campaign_templateId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const booking = pgTable("Booking", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	calBookingId: integer(),
	calBookingUid: text(),
	eventTypeId: text().notNull(),
	clientId: text(),
	dealId: text(),
	title: text().notNull(),
	description: text(),
	status: bookingStatus().default('CONFIRMED').notNull(),
	attendeeName: text().notNull(),
	attendeeEmail: text().notNull(),
	attendeePhone: text(),
	attendeeTimezone: text().notNull(),
	additionalNotes: text(),
	guests: text().array().default([]),
	startTime: timestamp({ precision: 3, mode: 'date' }).notNull(),
	endTime: timestamp({ precision: 3, mode: 'date' }).notNull(),
	duration: integer().notNull(),
	locationType: bookingLocationType().notNull(),
	locationValue: text(),
	paid: boolean().default(false).notNull(),
	paymentId: text(),
	amount: numeric({ precision: 10, scale:  2 }),
	currency: text(),
	cancelledAt: timestamp({ precision: 3, mode: 'date' }),
	cancelledBy: text(),
	cancellationReason: text(),
	rescheduledFrom: text(),
	rescheduledTo: text(),
	customFieldsResponses: jsonb(),
	metadata: jsonb(),
	lastSyncedAt: timestamp({ precision: 3, mode: 'date' }),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("Booking_attendeeEmail_idx").using("btree", table.attendeeEmail.asc().nullsLast().op("text_ops")),
	index("Booking_calBookingId_idx").using("btree", table.calBookingId.asc().nullsLast().op("int4_ops")),
	uniqueIndex("Booking_calBookingUid_key").using("btree", table.calBookingUid.asc().nullsLast().op("text_ops")),
	index("Booking_clientId_idx").using("btree", table.clientId.asc().nullsLast().op("text_ops")),
	index("Booking_dealId_idx").using("btree", table.dealId.asc().nullsLast().op("text_ops")),
	index("Booking_organizationId_locationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.locationId.asc().nullsLast().op("text_ops")),
	index("Booking_startTime_idx").using("btree", table.startTime.asc().nullsLast().op("timestamp_ops")),
	index("Booking_status_startTime_idx").using("btree", table.status.asc().nullsLast().op("enum_ops"), table.startTime.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
			name: "Booking_clientId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.dealId],
			foreignColumns: [deal.id],
			name: "Booking_dealId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.eventTypeId],
			foreignColumns: [bookingEventType.id],
			name: "Booking_eventTypeId_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "Booking_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "Booking_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();

export const calComCredential = pgTable("CalComCredential", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	apiKey: text().notNull(),
	calUserId: integer(),
	calUsername: text(),
	calOrgId: integer(),
	calOrgSlug: text(),
	accessToken: text(),
	refreshToken: text(),
	expiresAt: timestamp({ precision: 3, mode: 'date' }),
	isActive: boolean().default(true).notNull(),
	lastSyncedAt: timestamp({ precision: 3, mode: 'date' }),
	lastError: text(),
	metadata: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("CalComCredential_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("CalComCredential_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	uniqueIndex("CalComCredential_locationId_key").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "CalComCredential_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "CalComCredential_locationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const bookingEventType = pgTable("BookingEventType", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	calEventTypeId: integer(),
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
	locationType: bookingLocationType().default('CAL_VIDEO').notNull(),
	locationValue: text(),
	scheduleId: text(),
	isTeamEvent: boolean().default(false).notNull(),
	teamMembers: jsonb(),
	color: text(),
	customFields: jsonb(),
	requiresPayment: boolean().default(false).notNull(),
	price: numeric({ precision: 10, scale:  2 }),
	currency: text().default('USD'),
	metadata: jsonb(),
	isActive: boolean().default(true).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	lastSyncedAt: timestamp({ precision: 3, mode: 'date' }),
	requiresConfirmation: boolean().default(false).notNull(),
}, (table) => [
	index("BookingEventType_calEventTypeId_idx").using("btree", table.calEventTypeId.asc().nullsLast().op("int4_ops")),
	uniqueIndex("BookingEventType_organizationId_slug_key").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.slug.asc().nullsLast().op("text_ops")),
	index("BookingEventType_organizationId_locationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "BookingEventType_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "BookingEventType_locationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const bookingAvailability = pgTable("BookingAvailability", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	title: text(),
	startTime: timestamp({ precision: 3, mode: 'date' }).notNull(),
	endTime: timestamp({ precision: 3, mode: 'date' }).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("BookingAvailability_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("BookingAvailability_organizationId_locationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.locationId.asc().nullsLast().op("text_ops")),
	index("BookingAvailability_startTime_endTime_idx").using("btree", table.startTime.asc().nullsLast().op("timestamp_ops"), table.endTime.asc().nullsLast().op("timestamp_ops")),
	index("BookingAvailability_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "BookingAvailability_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "BookingAvailability_locationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const bookingHoliday = pgTable("BookingHoliday", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	name: text().notNull(),
	startDate: timestamp({ precision: 3, mode: 'date' }).notNull(),
	endDate: timestamp({ precision: 3, mode: 'date' }).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("BookingHoliday_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("BookingHoliday_organizationId_locationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.locationId.asc().nullsLast().op("text_ops")),
	index("BookingHoliday_startDate_endDate_idx").using("btree", table.startDate.asc().nullsLast().op("timestamp_ops"), table.endDate.asc().nullsLast().op("timestamp_ops")),
	index("BookingHoliday_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "BookingHoliday_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "BookingHoliday_locationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const note = pgTable("note", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	clientId: text(),
	dealId: text(),
	authorId: text(),
	content: text().notNull(),
	pinned: boolean().default(false).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("note_clientId_idx").using("btree", table.clientId.asc().nullsLast().op("text_ops")),
	index("note_dealId_idx").using("btree", table.dealId.asc().nullsLast().op("text_ops")),
	index("note_organizationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops")),
	index("note_pinned_idx").using("btree", table.pinned.asc().nullsLast().op("bool_ops")),
	index("note_locationId_idx").using("btree", table.locationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [user.id],
			name: "note_authorId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
			name: "note_clientId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.dealId],
			foreignColumns: [deal.id],
			name: "note_dealId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const noteMention = pgTable("note_mention", {
	id: text().primaryKey().notNull(),
	noteId: text().notNull(),
	userId: text().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	uniqueIndex("note_mention_noteId_userId_key").using("btree", table.noteId.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops")),
	index("note_mention_userId_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.noteId],
			foreignColumns: [note.id],
			name: "note_mention_noteId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "note_mention_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]).enableRLS();

export const task = pgTable("task", {
	id: text().primaryKey().notNull(),
	organizationId: text().notNull(),
	locationId: text(),
	title: text().notNull(),
	description: text(),
	status: taskStatus().default('TODO').notNull(),
	priority: taskPriority().default('MEDIUM').notNull(),
	dueDate: timestamp({ precision: 3, mode: 'date' }),
	completedAt: timestamp({ precision: 3, mode: 'date' }),
	clientId: text(),
	dealId: text(),
	createdById: text().notNull(),
	assigneeId: text(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("task_assigneeId_idx").using("btree", table.assigneeId.asc().nullsLast().op("text_ops")),
	index("task_clientId_idx").using("btree", table.clientId.asc().nullsLast().op("text_ops")),
	index("task_dealId_idx").using("btree", table.dealId.asc().nullsLast().op("text_ops")),
	index("task_dueDate_idx").using("btree", table.dueDate.asc().nullsLast().op("timestamp_ops")),
	index("task_organizationId_locationId_idx").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.locationId.asc().nullsLast().op("text_ops")),
	index("task_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.assigneeId],
			foreignColumns: [user.id],
			name: "task_assigneeId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.id],
			name: "task_clientId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.createdById],
			foreignColumns: [user.id],
			name: "task_createdById_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.dealId],
			foreignColumns: [deal.id],
			name: "task_dealId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "task_organizationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [location.id],
			name: "task_locationId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]).enableRLS();
