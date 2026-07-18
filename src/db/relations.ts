import { relations } from "drizzle-orm/relations";
import { classType, serviceType, studioClass, instructor, organization, room, location, client, studioMembership, membershipPlan, workflows, user, credential, node, connection, execution, googleCalendarSubscription, telegramTriggerState, gmailSubscription, gmailTriggerState, webhook, classCredit, classWaitlist, checkIn, apps, aiLog, outlookSubscription, outlookTriggerState, oneDriveSubscription, oneDriveTriggerState, studioPayment, promoCode, instructorPayout, giftCard, studioProduct, studioPaymentLineItem, apiKey, widgetConfig, importJob, deviceToken, mobileSession, inboxConversation, inboxMessage, clientInstructor, externalChannelIntegration, clientHousehold, clientHouseholdMember, instructorSubstitutionRequest, dynamicPricingRule, studioPaymentPlan, videoOnDemandAsset, accessControlIntegration, performanceMetric, workoutProgram, soapNote, marketplaceListing, automationEvent, smsConfig, smsMessage, waiverTemplate, waiverSignature, clientDocument, roomLayout, classReminderConfig, retentionAutomation, introOffer, introOfferRedemption, churnRiskScore, referralProgram, referral, loyaltyProgram, loyaltyBalance, loyaltyTransaction, loyaltyReward, spot, studioBooking, studioBookingPayment, spotBooking, cancellationPolicy, spotReservation, account, activity, bankTransferSettings, clientAssignee, locationMember, deal, pipeline, pipelineStage, dealClient, dealAssignee, form, globalStylePreset, formStep, formField, formSubmission, publicFormSubmissionReceipt, externalFormSubmission, funnel, funnelAnalytics, funnelPage, funnelBlock, smartSection, smartSectionInstance, funnelBlockAnalytics, funnelBlockEvent, funnelBreakpoint, funnelPixelIntegration, invitation, invoice, invoiceLineItem, invoicePayment, invoiceReminder, member, notification, notificationPreference, qrCode, recurringInvoice, recurringInvoiceGeneration, rota, session, stripeConnection, stripeEvent, commerceOperation, commerceLedgerEntry, locationModule, userPresence, instructorDocument, timeLog, shiftSwapRequest, instructorAvailability, timeOffRequest, overtimeTracking, invoiceTemplate, payrollRun, instructorPayment, payrollRunInstructor, studioStaffMember, funnelSession, funnelWebVital, funnelEvent, adConversionDelivery, anonymousUserProfiles, adSpend, adPlatformCredential, providerAccount, providerOAuthGrant, emailDomain, emailTemplate, campaign, campaignRecipient, unsubscribeToken, booking, bookingEventType, calComCredential, calComWebhookReceipt, bookingAvailability, bookingHoliday, note, noteMention, task, savedAudience } from "./schema";

export const studioClassRelations = relations(studioClass, ({ one, many }) => ({
  classType: one(classType, {
    fields: [studioClass.classTypeId],
    references: [classType.id],
  }),
  serviceType: one(serviceType, {
    fields: [studioClass.serviceTypeId],
    references: [serviceType.id],
  }),
  instructor: one(instructor, {
    fields: [studioClass.instructorId],
    references: [instructor.id],
  }),
  organization: one(organization, {
    fields: [studioClass.organizationId],
    references: [organization.id],
  }),
  room: one(room, {
    fields: [studioClass.roomId],
    references: [room.id],
  }),
  location: one(location, {
    fields: [studioClass.locationId],
    references: [location.id],
  }),
  classWaitlists: many(classWaitlist),
  checkIns: many(checkIn),
  instructorSubstitutionRequests: many(instructorSubstitutionRequest),
  studioBookings: many(studioBooking),
}));

export const classTypeRelations = relations(classType, ({one, many}) => ({
	studioClasses: many(studioClass),
	organization: one(organization, {
		fields: [classType.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [classType.locationId],
		references: [location.id]
	}),
	dynamicPricingRules: many(dynamicPricingRule),
	videoOnDemandAssets: many(videoOnDemandAsset),
	workoutPrograms: many(workoutProgram),
}));

export const instructorRelations = relations(instructor, ({one, many}) => ({
	studioClasses: many(studioClass),
	instructorPayouts: many(instructorPayout),
	clientInstructors: many(clientInstructor),
	instructorSubstitutionRequests_originalInstructorId: many(instructorSubstitutionRequest, {
		relationName: "instructorSubstitutionRequest_originalInstructorId_instructor_id"
	}),
	instructorSubstitutionRequests_substituteId: many(instructorSubstitutionRequest, {
		relationName: "instructorSubstitutionRequest_substituteId_instructor_id"
	}),
	videoOnDemandAssets: many(videoOnDemandAsset),
	workoutPrograms: many(workoutProgram),
	soapNotes: many(soapNote),
	rotas: many(rota),
	instructorDocuments: many(instructorDocument),
	timeLogs: many(timeLog),
	shiftSwapRequests_requesterId: many(shiftSwapRequest, {
		relationName: "shiftSwapRequest_requesterId_instructor_id"
	}),
	shiftSwapRequests_targetInstructorId: many(shiftSwapRequest, {
		relationName: "shiftSwapRequest_targetInstructorId_instructor_id"
	}),
	instructorAvailabilities: many(instructorAvailability),
	timeOffRequests: many(timeOffRequest),
	overtimeTrackings: many(overtimeTracking),
	instructorPayments: many(instructorPayment),
	payrollRunInstructors: many(payrollRunInstructor),
	organization: one(organization, {
		fields: [instructor.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [instructor.locationId],
		references: [location.id]
	}),
}));

export const studioStaffMemberRelations = relations(studioStaffMember, ({one}) => ({
	organization: one(organization, {
		fields: [studioStaffMember.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [studioStaffMember.locationId],
		references: [location.id]
	}),
}));

export const organizationRelations = relations(organization, ({many}) => ({
	studioClasses: many(studioClass),
	studioMemberships: many(studioMembership),
	workflows: many(workflows),
	googleCalendarSubscriptions: many(googleCalendarSubscription),
	gmailSubscriptions: many(gmailSubscription),
	outlookSubscriptions: many(outlookSubscription),
	oneDriveSubscriptions: many(oneDriveSubscription),
	classTypes: many(classType),
	rooms: many(room),
	checkIns: many(checkIn),
	membershipPlans: many(membershipPlan),
	aiLogs: many(aiLog),
	studioPayments: many(studioPayment),
	studioPaymentLineItems: many(studioPaymentLineItem),
	promoCodes: many(promoCode),
	instructorPayouts: many(instructorPayout),
	giftCards: many(giftCard),
	studioProducts: many(studioProduct),
	apiKeys: many(apiKey),
	widgetConfigs: many(widgetConfig),
	importJobs: many(importJob),
	deviceTokens: many(deviceToken),
	mobileSessions: many(mobileSession),
	inboxConversations: many(inboxConversation),
	externalChannelIntegrations: many(externalChannelIntegration),
	clientHouseholds: many(clientHousehold),
	instructorSubstitutionRequests: many(instructorSubstitutionRequest),
	dynamicPricingRules: many(dynamicPricingRule),
	studioPaymentPlans: many(studioPaymentPlan),
	videoOnDemandAssets: many(videoOnDemandAsset),
	accessControlIntegrations: many(accessControlIntegration),
	performanceMetrics: many(performanceMetric),
	workoutPrograms: many(workoutProgram),
	soapNotes: many(soapNote),
	marketplaceListings: many(marketplaceListing),
	automationEvents: many(automationEvent),
	smsConfigs: many(smsConfig),
	smsMessages: many(smsMessage),
	waiverTemplates: many(waiverTemplate),
	clientDocuments: many(clientDocument),
	classReminderConfigs: many(classReminderConfig),
	retentionAutomations: many(retentionAutomation),
	introOffers: many(introOffer),
	churnRiskScores: many(churnRiskScore),
	referralPrograms: many(referralProgram),
	loyaltyPrograms: many(loyaltyProgram),
	loyaltyBalances: many(loyaltyBalance),
	loyaltyTransactions: many(loyaltyTransaction),
	cancellationPolicies: many(cancellationPolicy),
	studioBookingPayments: many(studioBookingPayment),
	locations: many(location),
	bankTransferSettings: many(bankTransferSettings),
	deals: many(deal),
	pipelines: many(pipeline),
	forms: many(form),
	externalFormSubmissions: many(externalFormSubmission),
	globalStylePresets: many(globalStylePreset),
	smartSections: many(smartSection),
	invitations: many(invitation),
	members: many(member),
	qrCodes: many(qrCode),
	recurringInvoices: many(recurringInvoice),
	rotas: many(rota),
	stripeConnections: many(stripeConnection),
	locationModules: many(locationModule),
	timeLogs: many(timeLog),
	shiftSwapRequests: many(shiftSwapRequest),
	instructorAvailabilities: many(instructorAvailability),
	timeOffRequests: many(timeOffRequest),
	overtimeTrackings: many(overtimeTracking),
	invoices: many(invoice),
	payrollRuns: many(payrollRun),
	instructorPayments: many(instructorPayment),
	instructors: many(instructor),
	studioStaffMembers: many(studioStaffMember),
	funnels: many(funnel),
	adSpends: many(adSpend),
	adPlatformCredentials: many(adPlatformCredential),
	clients: many(client),
	emailDomains: many(emailDomain),
	emailTemplates: many(emailTemplate),
	campaigns: many(campaign),
	bookings: many(booking),
	calComCredentials: many(calComCredential),
	bookingEventTypes: many(bookingEventType),
	bookingAvailabilities: many(bookingAvailability),
	bookingHolidays: many(bookingHoliday),
	tasks: many(task),
}));

export const roomRelations = relations(room, ({one, many}) => ({
	studioClasses: many(studioClass),
	organization: one(organization, {
		fields: [room.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [room.locationId],
		references: [location.id]
	}),
	roomLayouts: many(roomLayout),
}));

export const locationRelations = relations(location, ({one, many}) => ({
	studioClasses: many(studioClass),
	studioMemberships: many(studioMembership),
	workflows: many(workflows),
	googleCalendarSubscriptions: many(googleCalendarSubscription),
	gmailSubscriptions: many(gmailSubscription),
	outlookSubscriptions: many(outlookSubscription),
	oneDriveSubscriptions: many(oneDriveSubscription),
	credentials: many(credential),
	executions: many(execution),
	classTypes: many(classType),
	rooms: many(room),
	webhooks: many(webhook),
	checkIns: many(checkIn),
	membershipPlans: many(membershipPlan),
	aiLogs: many(aiLog),
	studioPayments: many(studioPayment),
	studioPaymentLineItems: many(studioPaymentLineItem),
	promoCodes: many(promoCode),
	instructorPayouts: many(instructorPayout),
	giftCards: many(giftCard),
	studioProducts: many(studioProduct),
	inboxConversations: many(inboxConversation),
	externalChannelIntegrations: many(externalChannelIntegration),
	clientHouseholds: many(clientHousehold),
	instructorSubstitutionRequests: many(instructorSubstitutionRequest),
	dynamicPricingRules: many(dynamicPricingRule),
	studioPaymentPlans: many(studioPaymentPlan),
	videoOnDemandAssets: many(videoOnDemandAsset),
	accessControlIntegrations: many(accessControlIntegration),
	performanceMetrics: many(performanceMetric),
	workoutPrograms: many(workoutProgram),
	soapNotes: many(soapNote),
	marketplaceListings: many(marketplaceListing),
	automationEvents: many(automationEvent),
	smsMessages: many(smsMessage),
	waiverTemplates: many(waiverTemplate),
	clientDocuments: many(clientDocument),
	classReminderConfigs: many(classReminderConfig),
	retentionAutomations: many(retentionAutomation),
	introOffers: many(introOffer),
	cancellationPolicies: many(cancellationPolicy),
	studioBookingPayments: many(studioBookingPayment),
	user: one(user, {
		fields: [location.createdByUserId],
		references: [user.id]
	}),
	organization: one(organization, {
		fields: [location.organizationId],
		references: [organization.id]
	}),
	bankTransferSettings: many(bankTransferSettings),
	locationMembers: many(locationMember),
	deals: many(deal),
	pipelines: many(pipeline),
	forms: many(form),
	externalFormSubmissions: many(externalFormSubmission),
	globalStylePresets: many(globalStylePreset),
	smartSections: many(smartSection),
	qrCodes: many(qrCode),
	rotas: many(rota),
	stripeConnections: many(stripeConnection),
	locationModules: many(locationModule),
	timeLogs: many(timeLog),
	shiftSwapRequests: many(shiftSwapRequest),
	timeOffRequests: many(timeOffRequest),
	payrollRuns: many(payrollRun),
	instructorPayments: many(instructorPayment),
	instructors: many(instructor),
	studioStaffMembers: many(studioStaffMember),
	funnels: many(funnel),
	funnelEvents: many(funnelEvent),
	funnelSessions: many(funnelSession),
	adSpends: many(adSpend),
	adPlatformCredentials: many(adPlatformCredential),
	clients: many(client),
	emailDomains: many(emailDomain),
	emailTemplates: many(emailTemplate),
	campaigns: many(campaign),
	bookings: many(booking),
	calComCredentials: many(calComCredential),
	bookingEventTypes: many(bookingEventType),
	bookingAvailabilities: many(bookingAvailability),
	bookingHolidays: many(bookingHoliday),
	tasks: many(task),
}));

export const studioMembershipRelations = relations(studioMembership, ({one, many}) => ({
	client: one(client, {
		fields: [studioMembership.clientId],
		references: [client.id]
	}),
	organization: one(organization, {
		fields: [studioMembership.organizationId],
		references: [organization.id]
	}),
	membershipPlan: one(membershipPlan, {
		fields: [studioMembership.planId],
		references: [membershipPlan.id]
	}),
	location: one(location, {
		fields: [studioMembership.locationId],
		references: [location.id]
	}),
	stripeConnection: one(stripeConnection, {
		fields: [studioMembership.stripeConnectionId],
		references: [stripeConnection.id]
	}),
	classCredits: many(classCredit),
	studioPayments: many(studioPayment),
	clientDocuments: many(clientDocument),
}));

export const clientRelations = relations(client, ({one, many}) => ({
	studioMemberships: many(studioMembership),
	classCredits: many(classCredit),
	classWaitlists: many(classWaitlist),
	checkIns: many(checkIn),
	studioPayments: many(studioPayment),
	studioPaymentLineItems: many(studioPaymentLineItem),
	clientDocuments: many(clientDocument),
	giftCards_purchasedByClientId: many(giftCard, {
		relationName: "giftCard_purchasedByClientId_client_id"
	}),
	giftCards_redeemedByClientId: many(giftCard, {
		relationName: "giftCard_redeemedByClientId_client_id"
	}),
	deviceTokens: many(deviceToken),
	mobileSessions: many(mobileSession),
	inboxConversations: many(inboxConversation),
	clientInstructors: many(clientInstructor),
	clientHouseholds: many(clientHousehold),
	clientHouseholdMembers: many(clientHouseholdMember),
	performanceMetrics: many(performanceMetric),
	soapNotes: many(soapNote),
	automationEvents: many(automationEvent),
	referrals_refereeClientId: many(referral, {
		relationName: "referral_refereeClientId_client_id"
	}),
	referrals_referrerClientId: many(referral, {
		relationName: "referral_referrerClientId_client_id"
	}),
	loyaltyBalances: many(loyaltyBalance),
	clientAssignees: many(clientAssignee),
	dealClients: many(dealClient),
	formSubmissions: many(formSubmission),
	rotas: many(rota),
	studioBookings: many(studioBooking),
	timeLogs: many(timeLog),
	organization: one(organization, {
		fields: [client.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [client.locationId],
		references: [location.id]
	}),
	campaignRecipients: many(campaignRecipient),
	unsubscribeTokens: many(unsubscribeToken),
	bookings: many(booking),
	notes: many(note),
	tasks: many(task),
}));

export const membershipPlanRelations = relations(membershipPlan, ({one, many}) => ({
	studioMemberships: many(studioMembership),
	organization: one(organization, {
		fields: [membershipPlan.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [membershipPlan.locationId],
		references: [location.id]
	}),
	stripeConnection: one(stripeConnection, {
		fields: [membershipPlan.stripeConnectionId],
		references: [stripeConnection.id]
	}),
	studioPaymentPlans: many(studioPaymentPlan),
}));

export const workflowsRelations = relations(workflows, ({one, many}) => ({
	organization: one(organization, {
		fields: [workflows.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [workflows.locationId],
		references: [location.id]
	}),
	user: one(user, {
		fields: [workflows.userId],
		references: [user.id]
	}),
	nodes: many(node),
	connections: many(connection),
	executions: many(execution),
	googleCalendarSubscriptions: many(googleCalendarSubscription),
	telegramTriggerStates: many(telegramTriggerState),
	gmailTriggerStates: many(gmailTriggerState),
	outlookTriggerStates: many(outlookTriggerState),
	oneDriveTriggerStates: many(oneDriveTriggerState),
	automationEvents: many(automationEvent),
	forms: many(form),
}));

export const userRelations = relations(user, ({many}) => ({
	workflows: many(workflows),
	credentials: many(credential),
	googleCalendarSubscriptions: many(googleCalendarSubscription),
	gmailSubscriptions: many(gmailSubscription),
	webhooks: many(webhook),
	apps: many(apps),
	aiLogs: many(aiLog),
	outlookSubscriptions: many(outlookSubscription),
	oneDriveSubscriptions: many(oneDriveSubscription),
	locations: many(location),
	accounts: many(account),
	activities: many(activity),
	locationMembers: many(locationMember),
	invitations: many(invitation),
	members: many(member),
	notifications_actorId: many(notification, {
		relationName: "notification_actorId_user_id"
	}),
	notifications_userId: many(notification, {
		relationName: "notification_userId_user_id"
	}),
	notificationPreferences: many(notificationPreference),
	sessions: many(session),
	userPresences: many(userPresence),
	notes: many(note),
	noteMentions: many(noteMention),
	tasks_assigneeId: many(task, {
		relationName: "task_assigneeId_user_id"
	}),
	tasks_createdById: many(task, {
		relationName: "task_createdById_user_id"
	}),
}));

export const nodeRelations = relations(node, ({one, many}) => ({
	credential: one(credential, {
		fields: [node.credentialId],
		references: [credential.id]
	}),
	providerAccount: one(providerAccount, {
		fields: [node.providerAccountId],
		references: [providerAccount.id]
	}),
	workflow: one(workflows, {
		fields: [node.workflowId],
		references: [workflows.id]
	}),
	connections_fromNodeId: many(connection, {
		relationName: "connection_fromNodeId_node_id"
	}),
	connections_toNodeId: many(connection, {
		relationName: "connection_toNodeId_node_id"
	}),
	googleCalendarSubscriptions: many(googleCalendarSubscription),
	telegramTriggerStates: many(telegramTriggerState),
	gmailTriggerStates: many(gmailTriggerState),
	outlookTriggerStates: many(outlookTriggerState),
	oneDriveTriggerStates: many(oneDriveTriggerState),
}));

export const credentialRelations = relations(credential, ({one, many}) => ({
	nodes: many(node),
	organization: one(organization, {
		fields: [credential.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [credential.locationId],
		references: [location.id]
	}),
	user: one(user, {
		fields: [credential.userId],
		references: [user.id]
	}),
}));

export const connectionRelations = relations(connection, ({one}) => ({
	node_fromNodeId: one(node, {
		fields: [connection.fromNodeId],
		references: [node.id],
		relationName: "connection_fromNodeId_node_id"
	}),
	node_toNodeId: one(node, {
		fields: [connection.toNodeId],
		references: [node.id],
		relationName: "connection_toNodeId_node_id"
	}),
	workflow: one(workflows, {
		fields: [connection.workflowId],
		references: [workflows.id]
	}),
}));

export const executionRelations = relations(execution, ({one, many}) => ({
	organization: one(organization, {
		fields: [execution.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [execution.locationId],
		references: [location.id]
	}),
	workflow: one(workflows, {
		fields: [execution.workflowId],
		references: [workflows.id]
	}),
	automationEvents: many(automationEvent),
}));

export const googleCalendarSubscriptionRelations = relations(googleCalendarSubscription, ({one}) => ({
	organization: one(organization, {
		fields: [googleCalendarSubscription.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [googleCalendarSubscription.locationId],
		references: [location.id]
	}),
	node: one(node, {
		fields: [googleCalendarSubscription.nodeId],
		references: [node.id]
	}),
	providerAccount: one(providerAccount, {
		fields: [googleCalendarSubscription.providerAccountId],
		references: [providerAccount.id]
	}),
	user: one(user, {
		fields: [googleCalendarSubscription.userId],
		references: [user.id]
	}),
	workflow: one(workflows, {
		fields: [googleCalendarSubscription.workflowId],
		references: [workflows.id]
	}),
}));

export const telegramTriggerStateRelations = relations(telegramTriggerState, ({one}) => ({
	node: one(node, {
		fields: [telegramTriggerState.nodeId],
		references: [node.id]
	}),
	workflow: one(workflows, {
		fields: [telegramTriggerState.workflowId],
		references: [workflows.id]
	}),
}));

export const gmailSubscriptionRelations = relations(gmailSubscription, ({one}) => ({
	organization: one(organization, {
		fields: [gmailSubscription.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [gmailSubscription.locationId],
		references: [location.id]
	}),
	providerAccount: one(providerAccount, {
		fields: [gmailSubscription.providerAccountId],
		references: [providerAccount.id]
	}),
	user: one(user, {
		fields: [gmailSubscription.userId],
		references: [user.id]
	}),
}));

export const gmailTriggerStateRelations = relations(gmailTriggerState, ({one}) => ({
	node: one(node, {
		fields: [gmailTriggerState.nodeId],
		references: [node.id]
	}),
	workflow: one(workflows, {
		fields: [gmailTriggerState.workflowId],
		references: [workflows.id]
	}),
}));

export const webhookRelations = relations(webhook, ({one}) => ({
	organization: one(organization, {
		fields: [webhook.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [webhook.locationId],
		references: [location.id]
	}),
	user: one(user, {
		fields: [webhook.userId],
		references: [user.id]
	}),
}));

export const classCreditRelations = relations(classCredit, ({one, many}) => ({
	studioBookingPayments: many(studioBookingPayment),
	client: one(client, {
		fields: [classCredit.clientId],
		references: [client.id]
	}),
	organization: one(organization, {
		fields: [classCredit.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [classCredit.locationId],
		references: [location.id]
	}),
	studioProduct: one(studioProduct, {
		fields: [classCredit.productId],
		references: [studioProduct.id]
	}),
	studioMembership: one(studioMembership, {
		fields: [classCredit.membershipId],
		references: [studioMembership.id]
	}),
}));

export const classWaitlistRelations = relations(classWaitlist, ({one}) => ({
	studioClass: one(studioClass, {
		fields: [classWaitlist.classId],
		references: [studioClass.id]
	}),
	client: one(client, {
		fields: [classWaitlist.clientId],
		references: [client.id]
	}),
}));

export const checkInRelations = relations(checkIn, ({one}) => ({
	studioClass: one(studioClass, {
		fields: [checkIn.classId],
		references: [studioClass.id]
	}),
	client: one(client, {
		fields: [checkIn.clientId],
		references: [client.id]
	}),
	organization: one(organization, {
		fields: [checkIn.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [checkIn.locationId],
		references: [location.id]
	}),
}));

export const appsRelations = relations(apps, ({one}) => ({
	organization: one(organization, {
		fields: [apps.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [apps.locationId],
		references: [location.id]
	}),
	user: one(user, {
		fields: [apps.userId],
		references: [user.id]
	}),
}));

export const aiLogRelations = relations(aiLog, ({one}) => ({
	credential: one(credential, {
		fields: [aiLog.credentialId],
		references: [credential.id]
	}),
	organization: one(organization, {
		fields: [aiLog.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [aiLog.locationId],
		references: [location.id]
	}),
	user: one(user, {
		fields: [aiLog.userId],
		references: [user.id]
	}),
}));

export const outlookSubscriptionRelations = relations(outlookSubscription, ({one}) => ({
	organization: one(organization, {
		fields: [outlookSubscription.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [outlookSubscription.locationId],
		references: [location.id]
	}),
	providerAccount: one(providerAccount, {
		fields: [outlookSubscription.providerAccountId],
		references: [providerAccount.id]
	}),
	user: one(user, {
		fields: [outlookSubscription.userId],
		references: [user.id]
	}),
}));

export const outlookTriggerStateRelations = relations(outlookTriggerState, ({one}) => ({
	node: one(node, {
		fields: [outlookTriggerState.nodeId],
		references: [node.id]
	}),
	workflow: one(workflows, {
		fields: [outlookTriggerState.workflowId],
		references: [workflows.id]
	}),
}));

export const oneDriveSubscriptionRelations = relations(oneDriveSubscription, ({one}) => ({
	organization: one(organization, {
		fields: [oneDriveSubscription.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [oneDriveSubscription.locationId],
		references: [location.id]
	}),
	providerAccount: one(providerAccount, {
		fields: [oneDriveSubscription.providerAccountId],
		references: [providerAccount.id]
	}),
	user: one(user, {
		fields: [oneDriveSubscription.userId],
		references: [user.id]
	}),
}));

export const oneDriveTriggerStateRelations = relations(oneDriveTriggerState, ({one}) => ({
	node: one(node, {
		fields: [oneDriveTriggerState.nodeId],
		references: [node.id]
	}),
	workflow: one(workflows, {
		fields: [oneDriveTriggerState.workflowId],
		references: [workflows.id]
	}),
}));

export const studioPaymentRelations = relations(studioPayment, ({one, many}) => ({
	studioPaymentLineItems: many(studioPaymentLineItem),
	studioBookingPayments: many(studioBookingPayment),
	clientDocuments: many(clientDocument),
	client: one(client, {
		fields: [studioPayment.clientId],
		references: [client.id]
	}),
	studioMembership: one(studioMembership, {
		fields: [studioPayment.membershipId],
		references: [studioMembership.id]
	}),
	studioProduct: one(studioProduct, {
		fields: [studioPayment.productId],
		references: [studioProduct.id]
	}),
	organization: one(organization, {
		fields: [studioPayment.organizationId],
		references: [organization.id]
	}),
	promoCode: one(promoCode, {
		fields: [studioPayment.promoCodeId],
		references: [promoCode.id]
	}),
	location: one(location, {
		fields: [studioPayment.locationId],
		references: [location.id]
	}),
	stripeConnection: one(stripeConnection, {
		fields: [studioPayment.stripeConnectionId],
		references: [stripeConnection.id]
	}),
}));

export const promoCodeRelations = relations(promoCode, ({one, many}) => ({
	studioPayments: many(studioPayment),
	organization: one(organization, {
		fields: [promoCode.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [promoCode.locationId],
		references: [location.id]
	}),
}));

export const instructorPayoutRelations = relations(instructorPayout, ({one}) => ({
	organization: one(organization, {
		fields: [instructorPayout.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [instructorPayout.locationId],
		references: [location.id]
	}),
	instructor: one(instructor, {
		fields: [instructorPayout.instructorId],
		references: [instructor.id]
	}),
}));

export const giftCardRelations = relations(giftCard, ({one}) => ({
	organization: one(organization, {
		fields: [giftCard.organizationId],
		references: [organization.id]
	}),
	client_purchasedByClientId: one(client, {
		fields: [giftCard.purchasedByClientId],
		references: [client.id],
		relationName: "giftCard_purchasedByClientId_client_id"
	}),
	client_redeemedByClientId: one(client, {
		fields: [giftCard.redeemedByClientId],
		references: [client.id],
		relationName: "giftCard_redeemedByClientId_client_id"
	}),
	location: one(location, {
		fields: [giftCard.locationId],
		references: [location.id]
	}),
}));

export const studioProductRelations = relations(studioProduct, ({one, many}) => ({
	organization: one(organization, {
		fields: [studioProduct.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [studioProduct.locationId],
		references: [location.id]
	}),
	studioPayments: many(studioPayment),
	studioPaymentLineItems: many(studioPaymentLineItem),
	classCredits: many(classCredit),
}));

export const studioPaymentLineItemRelations = relations(studioPaymentLineItem, ({one, many}) => ({
	studioPayment: one(studioPayment, {
		fields: [studioPaymentLineItem.paymentId],
		references: [studioPayment.id]
	}),
	client: one(client, {
		fields: [studioPaymentLineItem.clientId],
		references: [client.id]
	}),
	studioProduct: one(studioProduct, {
		fields: [studioPaymentLineItem.productId],
		references: [studioProduct.id]
	}),
	organization: one(organization, {
		fields: [studioPaymentLineItem.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [studioPaymentLineItem.locationId],
		references: [location.id]
	}),
	studioBookingPayments: many(studioBookingPayment),
	clientDocuments: many(clientDocument),
}));

export const apiKeyRelations = relations(apiKey, ({one}) => ({
	organization: one(organization, {
		fields: [apiKey.organizationId],
		references: [organization.id]
	}),
}));

export const widgetConfigRelations = relations(widgetConfig, ({one}) => ({
	organization: one(organization, {
		fields: [widgetConfig.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [widgetConfig.locationId],
		references: [location.id]
	}),
}));

export const importJobRelations = relations(importJob, ({one}) => ({
	organization: one(organization, {
		fields: [importJob.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [importJob.locationId],
		references: [location.id]
	}),
}));

export const deviceTokenRelations = relations(deviceToken, ({one}) => ({
	client: one(client, {
		fields: [deviceToken.clientId],
		references: [client.id]
	}),
	organization: one(organization, {
		fields: [deviceToken.organizationId],
		references: [organization.id]
	}),
}));

export const mobileSessionRelations = relations(mobileSession, ({one}) => ({
	client: one(client, {
		fields: [mobileSession.clientId],
		references: [client.id]
	}),
	organization: one(organization, {
		fields: [mobileSession.organizationId],
		references: [organization.id]
	}),
}));

export const inboxConversationRelations = relations(inboxConversation, ({one, many}) => ({
	client: one(client, {
		fields: [inboxConversation.clientId],
		references: [client.id]
	}),
	organization: one(organization, {
		fields: [inboxConversation.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [inboxConversation.locationId],
		references: [location.id]
	}),
	inboxMessages: many(inboxMessage),
}));

export const inboxMessageRelations = relations(inboxMessage, ({one}) => ({
	inboxConversation: one(inboxConversation, {
		fields: [inboxMessage.conversationId],
		references: [inboxConversation.id]
	}),
}));

export const clientInstructorRelations = relations(clientInstructor, ({one}) => ({
	client: one(client, {
		fields: [clientInstructor.clientId],
		references: [client.id]
	}),
	instructor: one(instructor, {
		fields: [clientInstructor.instructorId],
		references: [instructor.id]
	}),
}));

export const externalChannelIntegrationRelations = relations(externalChannelIntegration, ({one}) => ({
	organization: one(organization, {
		fields: [externalChannelIntegration.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [externalChannelIntegration.locationId],
		references: [location.id]
	}),
}));

export const clientHouseholdRelations = relations(clientHousehold, ({one, many}) => ({
	organization: one(organization, {
		fields: [clientHousehold.organizationId],
		references: [organization.id]
	}),
	client: one(client, {
		fields: [clientHousehold.primaryContactId],
		references: [client.id]
	}),
	location: one(location, {
		fields: [clientHousehold.locationId],
		references: [location.id]
	}),
	clientHouseholdMembers: many(clientHouseholdMember),
}));

export const clientHouseholdMemberRelations = relations(clientHouseholdMember, ({one}) => ({
	client: one(client, {
		fields: [clientHouseholdMember.clientId],
		references: [client.id]
	}),
	clientHousehold: one(clientHousehold, {
		fields: [clientHouseholdMember.householdId],
		references: [clientHousehold.id]
	}),
}));

export const instructorSubstitutionRequestRelations = relations(instructorSubstitutionRequest, ({one}) => ({
	studioClass: one(studioClass, {
		fields: [instructorSubstitutionRequest.classId],
		references: [studioClass.id]
	}),
	organization: one(organization, {
		fields: [instructorSubstitutionRequest.organizationId],
		references: [organization.id]
	}),
	instructor_originalInstructorId: one(instructor, {
		fields: [instructorSubstitutionRequest.originalInstructorId],
		references: [instructor.id],
		relationName: "instructorSubstitutionRequest_originalInstructorId_instructor_id"
	}),
	location: one(location, {
		fields: [instructorSubstitutionRequest.locationId],
		references: [location.id]
	}),
	instructor_substituteId: one(instructor, {
		fields: [instructorSubstitutionRequest.substituteId],
		references: [instructor.id],
		relationName: "instructorSubstitutionRequest_substituteId_instructor_id"
	}),
}));

export const dynamicPricingRuleRelations = relations(dynamicPricingRule, ({one}) => ({
	classType: one(classType, {
		fields: [dynamicPricingRule.classTypeId],
		references: [classType.id]
	}),
	organization: one(organization, {
		fields: [dynamicPricingRule.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [dynamicPricingRule.locationId],
		references: [location.id]
	}),
}));

export const studioPaymentPlanRelations = relations(studioPaymentPlan, ({one}) => ({
	membershipPlan: one(membershipPlan, {
		fields: [studioPaymentPlan.membershipPlanId],
		references: [membershipPlan.id]
	}),
	organization: one(organization, {
		fields: [studioPaymentPlan.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [studioPaymentPlan.locationId],
		references: [location.id]
	}),
}));

export const videoOnDemandAssetRelations = relations(videoOnDemandAsset, ({one}) => ({
	classType: one(classType, {
		fields: [videoOnDemandAsset.classTypeId],
		references: [classType.id]
	}),
	instructor: one(instructor, {
		fields: [videoOnDemandAsset.instructorId],
		references: [instructor.id]
	}),
	organization: one(organization, {
		fields: [videoOnDemandAsset.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [videoOnDemandAsset.locationId],
		references: [location.id]
	}),
}));

export const accessControlIntegrationRelations = relations(accessControlIntegration, ({one}) => ({
	organization: one(organization, {
		fields: [accessControlIntegration.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [accessControlIntegration.locationId],
		references: [location.id]
	}),
}));

export const performanceMetricRelations = relations(performanceMetric, ({one}) => ({
	client: one(client, {
		fields: [performanceMetric.clientId],
		references: [client.id]
	}),
	organization: one(organization, {
		fields: [performanceMetric.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [performanceMetric.locationId],
		references: [location.id]
	}),
}));

export const workoutProgramRelations = relations(workoutProgram, ({one}) => ({
	classType: one(classType, {
		fields: [workoutProgram.classTypeId],
		references: [classType.id]
	}),
	instructor: one(instructor, {
		fields: [workoutProgram.coachId],
		references: [instructor.id]
	}),
	organization: one(organization, {
		fields: [workoutProgram.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [workoutProgram.locationId],
		references: [location.id]
	}),
}));

export const soapNoteRelations = relations(soapNote, ({one}) => ({
	instructor: one(instructor, {
		fields: [soapNote.authorId],
		references: [instructor.id]
	}),
	client: one(client, {
		fields: [soapNote.clientId],
		references: [client.id]
	}),
	organization: one(organization, {
		fields: [soapNote.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [soapNote.locationId],
		references: [location.id]
	}),
}));

export const marketplaceListingRelations = relations(marketplaceListing, ({one}) => ({
	organization: one(organization, {
		fields: [marketplaceListing.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [marketplaceListing.locationId],
		references: [location.id]
	}),
}));

export const automationEventRelations = relations(automationEvent, ({one}) => ({
	client: one(client, {
		fields: [automationEvent.clientId],
		references: [client.id]
	}),
	execution: one(execution, {
		fields: [automationEvent.executionId],
		references: [execution.id]
	}),
	organization: one(organization, {
		fields: [automationEvent.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [automationEvent.locationId],
		references: [location.id]
	}),
	workflow: one(workflows, {
		fields: [automationEvent.workflowId],
		references: [workflows.id]
	}),
}));

export const smsConfigRelations = relations(smsConfig, ({one}) => ({
		organization: one(organization, {
			fields: [smsConfig.organizationId],
			references: [organization.id]
		}),
		location: one(location, {
			fields: [smsConfig.locationId],
			references: [location.id]
		}),
		providerAccount: one(providerAccount, {
			fields: [smsConfig.providerAccountId],
			references: [providerAccount.id]
		}),
}));

export const smsMessageRelations = relations(smsMessage, ({one}) => ({
	organization: one(organization, {
		fields: [smsMessage.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [smsMessage.locationId],
		references: [location.id]
	}),
}));

export const waiverTemplateRelations = relations(waiverTemplate, ({one, many}) => ({
	organization: one(organization, {
		fields: [waiverTemplate.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [waiverTemplate.locationId],
		references: [location.id]
	}),
	waiverSignatures: many(waiverSignature),
}));

export const waiverSignatureRelations = relations(waiverSignature, ({one}) => ({
	waiverTemplate: one(waiverTemplate, {
		fields: [waiverSignature.templateId],
		references: [waiverTemplate.id]
	}),
}));

export const clientDocumentRelations = relations(clientDocument, ({one}) => ({
	client: one(client, {
		fields: [clientDocument.clientId],
		references: [client.id]
	}),
	studioMembership: one(studioMembership, {
		fields: [clientDocument.membershipId],
		references: [studioMembership.id]
	}),
	studioPayment: one(studioPayment, {
		fields: [clientDocument.paymentId],
		references: [studioPayment.id]
	}),
	studioPaymentLineItem: one(studioPaymentLineItem, {
		fields: [clientDocument.paymentLineItemId],
		references: [studioPaymentLineItem.id]
	}),
	organization: one(organization, {
		fields: [clientDocument.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [clientDocument.locationId],
		references: [location.id]
	}),
}));

export const roomLayoutRelations = relations(roomLayout, ({one, many}) => ({
	room: one(room, {
		fields: [roomLayout.roomId],
		references: [room.id]
	}),
	spots: many(spot),
	spotReservations: many(spotReservation),
}));

export const classReminderConfigRelations = relations(classReminderConfig, ({one}) => ({
	organization: one(organization, {
		fields: [classReminderConfig.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [classReminderConfig.locationId],
		references: [location.id]
	}),
}));

export const retentionAutomationRelations = relations(retentionAutomation, ({one}) => ({
	organization: one(organization, {
		fields: [retentionAutomation.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [retentionAutomation.locationId],
		references: [location.id]
	}),
}));

export const introOfferRelations = relations(introOffer, ({one, many}) => ({
	organization: one(organization, {
		fields: [introOffer.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [introOffer.locationId],
		references: [location.id]
	}),
	introOfferRedemptions: many(introOfferRedemption),
}));

export const introOfferRedemptionRelations = relations(introOfferRedemption, ({one}) => ({
	introOffer: one(introOffer, {
		fields: [introOfferRedemption.offerId],
		references: [introOffer.id]
	}),
}));

export const churnRiskScoreRelations = relations(churnRiskScore, ({one}) => ({
	organization: one(organization, {
		fields: [churnRiskScore.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [churnRiskScore.locationId],
		references: [location.id]
	}),
	client: one(client, {
		fields: [churnRiskScore.clientId],
		references: [client.id]
	}),
}));

export const referralProgramRelations = relations(referralProgram, ({one, many}) => ({
	organization: one(organization, {
		fields: [referralProgram.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [referralProgram.locationId],
		references: [location.id]
	}),
	referrals: many(referral),
}));

export const referralRelations = relations(referral, ({one}) => ({
	organization: one(organization, {
		fields: [referral.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [referral.locationId],
		references: [location.id]
	}),
	referralProgram: one(referralProgram, {
		fields: [referral.programId],
		references: [referralProgram.id]
	}),
	client_refereeClientId: one(client, {
		fields: [referral.refereeClientId],
		references: [client.id],
		relationName: "referral_refereeClientId_client_id"
	}),
	client_referrerClientId: one(client, {
		fields: [referral.referrerClientId],
		references: [client.id],
		relationName: "referral_referrerClientId_client_id"
	}),
}));

export const loyaltyProgramRelations = relations(loyaltyProgram, ({one, many}) => ({
	organization: one(organization, {
		fields: [loyaltyProgram.organizationId],
		references: [organization.id]
	}),
	loyaltyRewards: many(loyaltyReward),
}));

export const loyaltyBalanceRelations = relations(loyaltyBalance, ({one}) => ({
	client: one(client, {
		fields: [loyaltyBalance.clientId],
		references: [client.id]
	}),
	organization: one(organization, {
		fields: [loyaltyBalance.organizationId],
		references: [organization.id]
	}),
}));

export const loyaltyTransactionRelations = relations(loyaltyTransaction, ({one}) => ({
	organization: one(organization, {
		fields: [loyaltyTransaction.organizationId],
		references: [organization.id]
	}),
}));

export const loyaltyRewardRelations = relations(loyaltyReward, ({one}) => ({
	loyaltyProgram: one(loyaltyProgram, {
		fields: [loyaltyReward.programId],
		references: [loyaltyProgram.id]
	}),
}));

export const spotRelations = relations(spot, ({one, many}) => ({
	roomLayout: one(roomLayout, {
		fields: [spot.layoutId],
		references: [roomLayout.id]
	}),
	spotBookings: many(spotBooking),
	spotReservations: many(spotReservation),
}));

export const spotBookingRelations = relations(spotBooking, ({one}) => ({
	studioBooking: one(studioBooking, {
		fields: [spotBooking.bookingId],
		references: [studioBooking.id]
	}),
	spot: one(spot, {
		fields: [spotBooking.spotId],
		references: [spot.id]
	}),
}));

export const studioBookingRelations = relations(studioBooking, ({one, many}) => ({
	spotBookings: many(spotBooking),
	studioBookingPayments: many(studioBookingPayment),
	studioClass: one(studioClass, {
		fields: [studioBooking.classId],
		references: [studioClass.id]
	}),
	client: one(client, {
		fields: [studioBooking.clientId],
		references: [client.id]
	}),
}));

export const studioBookingPaymentRelations = relations(studioBookingPayment, ({one}) => ({
	studioBooking: one(studioBooking, {
		fields: [studioBookingPayment.bookingId],
		references: [studioBooking.id]
	}),
	studioPayment: one(studioPayment, {
		fields: [studioBookingPayment.paymentId],
		references: [studioPayment.id]
	}),
	studioPaymentLineItem: one(studioPaymentLineItem, {
		fields: [studioBookingPayment.lineItemId],
		references: [studioPaymentLineItem.id]
	}),
	classCredit: one(classCredit, {
		fields: [studioBookingPayment.classCreditId],
		references: [classCredit.id]
	}),
	organization: one(organization, {
		fields: [studioBookingPayment.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [studioBookingPayment.locationId],
		references: [location.id]
	}),
}));

export const cancellationPolicyRelations = relations(cancellationPolicy, ({one}) => ({
	organization: one(organization, {
		fields: [cancellationPolicy.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [cancellationPolicy.locationId],
		references: [location.id]
	}),
}));

export const spotReservationRelations = relations(spotReservation, ({one}) => ({
	roomLayout: one(roomLayout, {
		fields: [spotReservation.layoutId],
		references: [roomLayout.id]
	}),
	spot: one(spot, {
		fields: [spotReservation.spotId],
		references: [spot.id]
	}),
}));

export const accountRelations = relations(account, ({one, many}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
	providerOAuthGrants: many(providerOAuthGrant),
}));

export const activityRelations = relations(activity, ({one}) => ({
	user: one(user, {
		fields: [activity.userId],
		references: [user.id]
	}),
}));

export const bankTransferSettingsRelations = relations(bankTransferSettings, ({one}) => ({
	organization: one(organization, {
		fields: [bankTransferSettings.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [bankTransferSettings.locationId],
		references: [location.id]
	}),
}));

export const clientAssigneeRelations = relations(clientAssignee, ({one}) => ({
	client: one(client, {
		fields: [clientAssignee.clientId],
		references: [client.id]
	}),
	locationMember: one(locationMember, {
		fields: [clientAssignee.locationMemberId],
		references: [locationMember.id]
	}),
}));

export const locationMemberRelations = relations(locationMember, ({one, many}) => ({
	clientAssignees: many(clientAssignee),
	location: one(location, {
		fields: [locationMember.locationId],
		references: [location.id]
	}),
	user: one(user, {
		fields: [locationMember.userId],
		references: [user.id]
	}),
	dealAssignees: many(dealAssignee),
}));

export const dealRelations = relations(deal, ({one, many}) => ({
	organization: one(organization, {
		fields: [deal.organizationId],
		references: [organization.id]
	}),
	pipeline: one(pipeline, {
		fields: [deal.pipelineId],
		references: [pipeline.id]
	}),
	pipelineStage: one(pipelineStage, {
		fields: [deal.pipelineStageId],
		references: [pipelineStage.id]
	}),
	location: one(location, {
		fields: [deal.locationId],
		references: [location.id]
	}),
	dealClients: many(dealClient),
	dealAssignees: many(dealAssignee),
	rotas: many(rota),
	timeLogs: many(timeLog),
	bookings: many(booking),
	notes: many(note),
	tasks: many(task),
}));

export const pipelineRelations = relations(pipeline, ({one, many}) => ({
	deals: many(deal),
	organization: one(organization, {
		fields: [pipeline.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [pipeline.locationId],
		references: [location.id]
	}),
	pipelineStages: many(pipelineStage),
}));

export const pipelineStageRelations = relations(pipelineStage, ({one, many}) => ({
	deals: many(deal),
	pipeline: one(pipeline, {
		fields: [pipelineStage.pipelineId],
		references: [pipeline.id]
	}),
}));

export const dealClientRelations = relations(dealClient, ({one}) => ({
	client: one(client, {
		fields: [dealClient.clientId],
		references: [client.id]
	}),
	deal: one(deal, {
		fields: [dealClient.dealId],
		references: [deal.id]
	}),
}));

export const dealAssigneeRelations = relations(dealAssignee, ({one}) => ({
	deal: one(deal, {
		fields: [dealAssignee.dealId],
		references: [deal.id]
	}),
	locationMember: one(locationMember, {
		fields: [dealAssignee.locationMemberId],
		references: [locationMember.id]
	}),
}));

export const formRelations = relations(form, ({one, many}) => ({
	organization: one(organization, {
		fields: [form.organizationId],
		references: [organization.id]
	}),
	globalStylePreset: one(globalStylePreset, {
		fields: [form.stylePresetId],
		references: [globalStylePreset.id]
	}),
	location: one(location, {
		fields: [form.locationId],
		references: [location.id]
	}),
	workflow: one(workflows, {
		fields: [form.workflowId],
		references: [workflows.id]
	}),
	formSteps: many(formStep),
	formSubmissions: many(formSubmission),
	externalFormSubmissions: many(externalFormSubmission),
	smartSectionInstances: many(smartSectionInstance),
}));

export const globalStylePresetRelations = relations(globalStylePreset, ({one, many}) => ({
	forms: many(form),
	organization: one(organization, {
		fields: [globalStylePreset.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [globalStylePreset.locationId],
		references: [location.id]
	}),
	funnels: many(funnel),
}));

export const formStepRelations = relations(formStep, ({one, many}) => ({
	form: one(form, {
		fields: [formStep.formId],
		references: [form.id]
	}),
	formFields: many(formField),
}));

export const formFieldRelations = relations(formField, ({one}) => ({
	formStep: one(formStep, {
		fields: [formField.stepId],
		references: [formStep.id]
	}),
}));

export const formSubmissionRelations = relations(formSubmission, ({one}) => ({
	client: one(client, {
		fields: [formSubmission.clientId],
		references: [client.id]
	}),
	form: one(form, {
		fields: [formSubmission.formId],
		references: [form.id]
	}),
	organization: one(organization, {
		fields: [formSubmission.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [formSubmission.locationId],
		references: [location.id]
	}),
	receipt: one(publicFormSubmissionReceipt, {
		fields: [formSubmission.receiptId],
		references: [publicFormSubmissionReceipt.id]
	}),
}));

export const publicFormSubmissionReceiptRelations = relations(publicFormSubmissionReceipt, ({one}) => ({
	organization: one(organization, {
		fields: [publicFormSubmissionReceipt.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [publicFormSubmissionReceipt.locationId],
		references: [location.id]
	}),
	form: one(form, {
		fields: [publicFormSubmissionReceipt.formId],
		references: [form.id]
	}),
	workflow: one(workflows, {
		fields: [publicFormSubmissionReceipt.workflowId],
		references: [workflows.id]
	}),
	submission: one(formSubmission, {
		fields: [publicFormSubmissionReceipt.id],
		references: [formSubmission.receiptId]
	}),
}));

export const externalFormSubmissionRelations = relations(externalFormSubmission, ({one}) => ({
	form: one(form, {
		fields: [externalFormSubmission.formId],
		references: [form.id]
	}),
	funnel: one(funnel, {
		fields: [externalFormSubmission.funnelId],
		references: [funnel.id]
	}),
	location: one(location, {
		fields: [externalFormSubmission.locationId],
		references: [location.id]
	}),
	organization: one(organization, {
		fields: [externalFormSubmission.organizationId],
		references: [organization.id]
	}),
}));

export const funnelAnalyticsRelations = relations(funnelAnalytics, ({one}) => ({
	funnel: one(funnel, {
		fields: [funnelAnalytics.funnelId],
		references: [funnel.id]
	}),
	funnelPage: one(funnelPage, {
		fields: [funnelAnalytics.pageId],
		references: [funnelPage.id]
	}),
}));

export const funnelRelations = relations(funnel, ({one, many}) => ({
	funnelAnalytics: many(funnelAnalytics),
	funnelPages: many(funnelPage),
	funnelPixelIntegrations: many(funnelPixelIntegration),
	organization: one(organization, {
		fields: [funnel.organizationId],
		references: [organization.id]
	}),
	globalStylePreset: one(globalStylePreset, {
		fields: [funnel.stylePresetId],
		references: [globalStylePreset.id]
	}),
	location: one(location, {
		fields: [funnel.locationId],
		references: [location.id]
	}),
	funnelEvents: many(funnelEvent),
	funnelSessions: many(funnelSession),
	externalFormSubmissions: many(externalFormSubmission),
	adSpends: many(adSpend),
}));

export const funnelPageRelations = relations(funnelPage, ({one, many}) => ({
	funnelAnalytics: many(funnelAnalytics),
	funnel: one(funnel, {
		fields: [funnelPage.funnelId],
		references: [funnel.id]
	}),
	funnelBlocks: many(funnelBlock),
	smartSectionInstances: many(smartSectionInstance),
}));

export const funnelBlockRelations = relations(funnelBlock, ({one, many}) => ({
	funnelPage: one(funnelPage, {
		fields: [funnelBlock.pageId],
		references: [funnelPage.id]
	}),
	funnelBlock: one(funnelBlock, {
		fields: [funnelBlock.parentBlockId],
		references: [funnelBlock.id],
		relationName: "funnelBlock_parentBlockId_funnelBlock_id"
	}),
	funnelBlocks: many(funnelBlock, {
		relationName: "funnelBlock_parentBlockId_funnelBlock_id"
	}),
	smartSection: one(smartSection, {
		fields: [funnelBlock.smartSectionId],
		references: [smartSection.id]
	}),
	smartSectionInstance: one(smartSectionInstance, {
		fields: [funnelBlock.smartSectionInstanceId],
		references: [smartSectionInstance.id]
	}),
	funnelBlockAnalytics: many(funnelBlockAnalytics),
	funnelBlockEvents: many(funnelBlockEvent),
	funnelBreakpoints: many(funnelBreakpoint),
}));

export const smartSectionRelations = relations(smartSection, ({one, many}) => ({
	funnelBlocks: many(funnelBlock),
	organization: one(organization, {
		fields: [smartSection.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [smartSection.locationId],
		references: [location.id]
	}),
	smartSectionInstances: many(smartSectionInstance),
}));

export const smartSectionInstanceRelations = relations(smartSectionInstance, ({one, many}) => ({
	funnelBlocks: many(funnelBlock),
	form: one(form, {
		fields: [smartSectionInstance.formId],
		references: [form.id]
	}),
	funnelPage: one(funnelPage, {
		fields: [smartSectionInstance.funnelPageId],
		references: [funnelPage.id]
	}),
	smartSection: one(smartSection, {
		fields: [smartSectionInstance.sectionId],
		references: [smartSection.id]
	}),
}));

export const funnelBlockAnalyticsRelations = relations(funnelBlockAnalytics, ({one}) => ({
	funnelBlock: one(funnelBlock, {
		fields: [funnelBlockAnalytics.blockId],
		references: [funnelBlock.id]
	}),
}));

export const funnelBlockEventRelations = relations(funnelBlockEvent, ({one}) => ({
	funnelBlock: one(funnelBlock, {
		fields: [funnelBlockEvent.blockId],
		references: [funnelBlock.id]
	}),
}));

export const funnelBreakpointRelations = relations(funnelBreakpoint, ({one}) => ({
	funnelBlock: one(funnelBlock, {
		fields: [funnelBreakpoint.blockId],
		references: [funnelBlock.id]
	}),
}));

export const funnelPixelIntegrationRelations = relations(funnelPixelIntegration, ({one}) => ({
	funnel: one(funnel, {
		fields: [funnelPixelIntegration.funnelId],
		references: [funnel.id]
	}),
}));

export const invitationRelations = relations(invitation, ({one}) => ({
	user: one(user, {
		fields: [invitation.inviterId],
		references: [user.id]
	}),
	organization: one(organization, {
		fields: [invitation.organizationId],
		references: [organization.id]
	}),
}));

export const invoiceLineItemRelations = relations(invoiceLineItem, ({one}) => ({
	invoice: one(invoice, {
		fields: [invoiceLineItem.invoiceId],
		references: [invoice.id]
	}),
}));

export const invoiceRelations = relations(invoice, ({one, many}) => ({
	invoiceLineItems: many(invoiceLineItem),
	invoicePayments: many(invoicePayment),
	invoiceReminders: many(invoiceReminder),
	timeLogs: many(timeLog),
	organization: one(organization, {
		fields: [invoice.organizationId],
		references: [organization.id]
	}),
	invoiceTemplate: one(invoiceTemplate, {
		fields: [invoice.templateId],
		references: [invoiceTemplate.id]
	}),
}));

export const invoicePaymentRelations = relations(invoicePayment, ({one}) => ({
	invoice: one(invoice, {
		fields: [invoicePayment.invoiceId],
		references: [invoice.id]
	}),
}));

export const invoiceReminderRelations = relations(invoiceReminder, ({one}) => ({
	invoice: one(invoice, {
		fields: [invoiceReminder.invoiceId],
		references: [invoice.id]
	}),
}));

export const memberRelations = relations(member, ({one}) => ({
	organization: one(organization, {
		fields: [member.organizationId],
		references: [organization.id]
	}),
	user: one(user, {
		fields: [member.userId],
		references: [user.id]
	}),
}));

export const notificationRelations = relations(notification, ({one}) => ({
	user_actorId: one(user, {
		fields: [notification.actorId],
		references: [user.id],
		relationName: "notification_actorId_user_id"
	}),
	user_userId: one(user, {
		fields: [notification.userId],
		references: [user.id],
		relationName: "notification_userId_user_id"
	}),
}));

export const notificationPreferenceRelations = relations(notificationPreference, ({one}) => ({
	user: one(user, {
		fields: [notificationPreference.userId],
		references: [user.id]
	}),
}));

export const qrCodeRelations = relations(qrCode, ({one}) => ({
	organization: one(organization, {
		fields: [qrCode.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [qrCode.locationId],
		references: [location.id]
	}),
}));

export const recurringInvoiceRelations = relations(recurringInvoice, ({one, many}) => ({
	organization: one(organization, {
		fields: [recurringInvoice.organizationId],
		references: [organization.id]
	}),
	recurringInvoiceGenerations: many(recurringInvoiceGeneration),
}));

export const recurringInvoiceGenerationRelations = relations(recurringInvoiceGeneration, ({one}) => ({
	recurringInvoice: one(recurringInvoice, {
		fields: [recurringInvoiceGeneration.recurringInvoiceId],
		references: [recurringInvoice.id]
	}),
}));

export const rotaRelations = relations(rota, ({one, many}) => ({
	client: one(client, {
		fields: [rota.clientId],
		references: [client.id]
	}),
	deal: one(deal, {
		fields: [rota.dealId],
		references: [deal.id]
	}),
	organization: one(organization, {
		fields: [rota.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [rota.locationId],
		references: [location.id]
	}),
	instructor: one(instructor, {
		fields: [rota.instructorId],
		references: [instructor.id]
	}),
	shiftSwapRequests: many(shiftSwapRequest),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const stripeConnectionRelations = relations(stripeConnection, ({one, many}) => ({
	organization: one(organization, {
		fields: [stripeConnection.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [stripeConnection.locationId],
		references: [location.id]
	}),
	stripeEvents: many(stripeEvent),
	commerceOperations: many(commerceOperation),
	commerceLedgerEntries: many(commerceLedgerEntry),
	studioPayments: many(studioPayment),
	studioMemberships: many(studioMembership),
	membershipPlans: many(membershipPlan),
}));

export const stripeEventRelations = relations(stripeEvent, ({one, many}) => ({
	stripeConnection: one(stripeConnection, {
		fields: [stripeEvent.stripeConnectionId],
		references: [stripeConnection.id]
	}),
	instructor: one(instructor, {
		fields: [stripeEvent.instructorId],
		references: [instructor.id]
	}),
	commerceLedgerEntries: many(commerceLedgerEntry),
}));

export const commerceOperationRelations = relations(commerceOperation, ({one, many}) => ({
	stripeConnection: one(stripeConnection, {
		fields: [commerceOperation.stripeConnectionId],
		references: [stripeConnection.id]
	}),
	commerceLedgerEntries: many(commerceLedgerEntry),
}));

export const commerceLedgerEntryRelations = relations(commerceLedgerEntry, ({one}) => ({
	stripeConnection: one(stripeConnection, {
		fields: [commerceLedgerEntry.stripeConnectionId],
		references: [stripeConnection.id]
	}),
	instructor: one(instructor, {
		fields: [commerceLedgerEntry.instructorId],
		references: [instructor.id]
	}),
	commerceOperation: one(commerceOperation, {
		fields: [commerceLedgerEntry.operationId],
		references: [commerceOperation.id]
	}),
	stripeEvent: one(stripeEvent, {
		fields: [commerceLedgerEntry.stripeEventId],
		references: [stripeEvent.id]
	}),
}));

export const locationModuleRelations = relations(locationModule, ({one}) => ({
	organization: one(organization, {
		fields: [locationModule.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [locationModule.locationId],
		references: [location.id]
	}),
}));

export const userPresenceRelations = relations(userPresence, ({one}) => ({
	user: one(user, {
		fields: [userPresence.userId],
		references: [user.id]
	}),
}));

export const instructorDocumentRelations = relations(instructorDocument, ({one}) => ({
	instructor: one(instructor, {
		fields: [instructorDocument.instructorId],
		references: [instructor.id]
	}),
}));

export const timeLogRelations = relations(timeLog, ({one}) => ({
	client: one(client, {
		fields: [timeLog.clientId],
		references: [client.id]
	}),
	deal: one(deal, {
		fields: [timeLog.dealId],
		references: [deal.id]
	}),
	invoice: one(invoice, {
		fields: [timeLog.invoiceId],
		references: [invoice.id]
	}),
	organization: one(organization, {
		fields: [timeLog.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [timeLog.locationId],
		references: [location.id]
	}),
	instructor: one(instructor, {
		fields: [timeLog.instructorId],
		references: [instructor.id]
	}),
}));

export const shiftSwapRequestRelations = relations(shiftSwapRequest, ({one}) => ({
	organization: one(organization, {
		fields: [shiftSwapRequest.organizationId],
		references: [organization.id]
	}),
	instructor_requesterId: one(instructor, {
		fields: [shiftSwapRequest.requesterId],
		references: [instructor.id],
		relationName: "shiftSwapRequest_requesterId_instructor_id"
	}),
	rota: one(rota, {
		fields: [shiftSwapRequest.rotaId],
		references: [rota.id]
	}),
	location: one(location, {
		fields: [shiftSwapRequest.locationId],
		references: [location.id]
	}),
	instructor_targetInstructorId: one(instructor, {
		fields: [shiftSwapRequest.targetInstructorId],
		references: [instructor.id],
		relationName: "shiftSwapRequest_targetInstructorId_instructor_id"
	}),
}));

export const instructorAvailabilityRelations = relations(instructorAvailability, ({one}) => ({
	organization: one(organization, {
		fields: [instructorAvailability.organizationId],
		references: [organization.id]
	}),
	instructor: one(instructor, {
		fields: [instructorAvailability.instructorId],
		references: [instructor.id]
	}),
}));

export const timeOffRequestRelations = relations(timeOffRequest, ({one}) => ({
	organization: one(organization, {
		fields: [timeOffRequest.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [timeOffRequest.locationId],
		references: [location.id]
	}),
	instructor: one(instructor, {
		fields: [timeOffRequest.instructorId],
		references: [instructor.id]
	}),
}));

export const overtimeTrackingRelations = relations(overtimeTracking, ({one}) => ({
	organization: one(organization, {
		fields: [overtimeTracking.organizationId],
		references: [organization.id]
	}),
	instructor: one(instructor, {
		fields: [overtimeTracking.instructorId],
		references: [instructor.id]
	}),
}));

export const invoiceTemplateRelations = relations(invoiceTemplate, ({many}) => ({
	invoices: many(invoice),
}));

export const payrollRunRelations = relations(payrollRun, ({one, many}) => ({
	organization: one(organization, {
		fields: [payrollRun.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [payrollRun.locationId],
		references: [location.id]
	}),
	instructorPayments: many(instructorPayment),
	payrollRunInstructors: many(payrollRunInstructor),
}));

export const instructorPaymentRelations = relations(instructorPayment, ({one}) => ({
	organization: one(organization, {
		fields: [instructorPayment.organizationId],
		references: [organization.id]
	}),
	payrollRun: one(payrollRun, {
		fields: [instructorPayment.payrollRunId],
		references: [payrollRun.id]
	}),
	location: one(location, {
		fields: [instructorPayment.locationId],
		references: [location.id]
	}),
	instructor: one(instructor, {
		fields: [instructorPayment.instructorId],
		references: [instructor.id]
	}),
}));

export const payrollRunInstructorRelations = relations(payrollRunInstructor, ({one}) => ({
	payrollRun: one(payrollRun, {
		fields: [payrollRunInstructor.payrollRunId],
		references: [payrollRun.id]
	}),
	instructor: one(instructor, {
		fields: [payrollRunInstructor.instructorId],
		references: [instructor.id]
	}),
}));

export const funnelWebVitalRelations = relations(funnelWebVital, ({one}) => ({
	funnelSession: one(funnelSession, {
		fields: [funnelWebVital.sessionId],
		references: [funnelSession.sessionId]
	}),
}));

export const funnelSessionRelations = relations(funnelSession, ({one, many}) => ({
	funnelWebVitals: many(funnelWebVital),
	funnel: one(funnel, {
		fields: [funnelSession.funnelId],
		references: [funnel.id]
	}),
	funnelSession: one(funnelSession, {
		fields: [funnelSession.linkedSessionId],
		references: [funnelSession.id],
		relationName: "funnelSession_linkedSessionId_funnelSession_id"
	}),
	funnelSessions: many(funnelSession, {
		relationName: "funnelSession_linkedSessionId_funnelSession_id"
	}),
	anonymousUserProfile: one(anonymousUserProfiles, {
		fields: [funnelSession.profileId],
		references: [anonymousUserProfiles.id]
	}),
	location: one(location, {
		fields: [funnelSession.locationId],
		references: [location.id]
	}),
}));

export const funnelEventRelations = relations(funnelEvent, ({one, many}) => ({
	funnel: one(funnel, {
		fields: [funnelEvent.funnelId],
		references: [funnel.id]
	}),
	location: one(location, {
		fields: [funnelEvent.locationId],
		references: [location.id]
	}),
	adConversionDeliveries: many(adConversionDelivery),
}));

export const adConversionDeliveryRelations = relations(adConversionDelivery, ({one}) => ({
	funnelEvent: one(funnelEvent, {
		fields: [adConversionDelivery.eventId],
		references: [funnelEvent.eventId],
	}),
	organization: one(organization, {
		fields: [adConversionDelivery.organizationId],
		references: [organization.id],
	}),
	location: one(location, {
		fields: [adConversionDelivery.locationId],
		references: [location.id],
	}),
	providerAccount: one(providerAccount, {
		fields: [adConversionDelivery.providerAccountId],
		references: [providerAccount.id],
	}),
}));

export const anonymousUserProfilesRelations = relations(anonymousUserProfiles, ({many}) => ({
	funnelSessions: many(funnelSession),
}));

export const adSpendRelations = relations(adSpend, ({one}) => ({
	funnel: one(funnel, {
		fields: [adSpend.funnelId],
		references: [funnel.id]
	}),
	organization: one(organization, {
		fields: [adSpend.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [adSpend.locationId],
		references: [location.id]
	}),
}));

export const adPlatformCredentialRelations = relations(adPlatformCredential, ({one}) => ({
	organization: one(organization, {
		fields: [adPlatformCredential.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [adPlatformCredential.locationId],
		references: [location.id]
	}),
}));

export const providerAccountRelations = relations(providerAccount, ({one, many}) => ({
	organization: one(organization, {
		fields: [providerAccount.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [providerAccount.locationId],
		references: [location.id]
	}),
	createdBy: one(user, {
		fields: [providerAccount.createdByUserId],
		references: [user.id]
	}),
	googleCalendarSubscriptions: many(googleCalendarSubscription),
	gmailSubscriptions: many(gmailSubscription),
	outlookSubscriptions: many(outlookSubscription),
	oneDriveSubscriptions: many(oneDriveSubscription),
	adConversionDeliveries: many(adConversionDelivery),
	emailDomains: many(emailDomain),
	smsConfigs: many(smsConfig),
	nodes: many(node),
	oauthGrant: one(providerOAuthGrant),
}));

export const providerOAuthGrantRelations = relations(providerOAuthGrant, ({one}) => ({
	providerAccount: one(providerAccount, {
		fields: [providerOAuthGrant.providerAccountId],
		references: [providerAccount.id]
	}),
	oauthAccount: one(account, {
		fields: [providerOAuthGrant.oauthAccountId],
		references: [account.id]
	}),
	authorizedBy: one(user, {
		fields: [providerOAuthGrant.authorizedByUserId],
		references: [user.id]
	}),
}));

export const emailDomainRelations = relations(emailDomain, ({one, many}) => ({
	organization: one(organization, {
		fields: [emailDomain.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [emailDomain.locationId],
		references: [location.id]
	}),
	providerAccount: one(providerAccount, {
		fields: [emailDomain.providerAccountId],
		references: [providerAccount.id]
	}),
	campaigns: many(campaign),
}));

export const emailTemplateRelations = relations(emailTemplate, ({one, many}) => ({
	organization: one(organization, {
		fields: [emailTemplate.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [emailTemplate.locationId],
		references: [location.id]
	}),
	campaigns: many(campaign),
}));

export const campaignRecipientRelations = relations(campaignRecipient, ({one}) => ({
	campaign: one(campaign, {
		fields: [campaignRecipient.campaignId],
		references: [campaign.id]
	}),
	client: one(client, {
		fields: [campaignRecipient.clientId],
		references: [client.id]
	}),
}));

export const campaignRelations = relations(campaign, ({ one, many }) => ({
  campaignRecipients: many(campaignRecipient),
  emailDomain: one(emailDomain, {
    fields: [campaign.emailDomainId],
    references: [emailDomain.id],
  }),
  organization: one(organization, {
    fields: [campaign.organizationId],
    references: [organization.id],
  }),
  location: one(location, {
    fields: [campaign.locationId],
    references: [location.id],
  }),
  emailTemplate: one(emailTemplate, {
    fields: [campaign.templateId],
    references: [emailTemplate.id],
  }),
  savedAudience: one(savedAudience, {
    fields: [campaign.savedAudienceId],
    references: [savedAudience.id],
  }),
}));

export const unsubscribeTokenRelations = relations(unsubscribeToken, ({one}) => ({
	client: one(client, {
		fields: [unsubscribeToken.clientId],
		references: [client.id]
	}),
}));

export const bookingRelations = relations(booking, ({one}) => ({
	calComCredential: one(calComCredential, {
		fields: [booking.calComCredentialId],
		references: [calComCredential.id]
	}),
	client: one(client, {
		fields: [booking.clientId],
		references: [client.id]
	}),
	deal: one(deal, {
		fields: [booking.dealId],
		references: [deal.id]
	}),
	bookingEventType: one(bookingEventType, {
		fields: [booking.eventTypeId],
		references: [bookingEventType.id]
	}),
	organization: one(organization, {
		fields: [booking.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [booking.locationId],
		references: [location.id]
	}),
}));

export const bookingEventTypeRelations = relations(bookingEventType, ({one, many}) => ({
	bookings: many(booking),
	calComCredential: one(calComCredential, {
		fields: [bookingEventType.calComCredentialId],
		references: [calComCredential.id]
	}),
	organization: one(organization, {
		fields: [bookingEventType.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [bookingEventType.locationId],
		references: [location.id]
	}),
}));

export const calComCredentialRelations = relations(calComCredential, ({one, many}) => ({
	bookings: many(booking),
	bookingEventTypes: many(bookingEventType),
	webhookReceipts: many(calComWebhookReceipt),
	organization: one(organization, {
		fields: [calComCredential.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [calComCredential.locationId],
		references: [location.id]
	}),
}));

export const calComWebhookReceiptRelations = relations(calComWebhookReceipt, ({one}) => ({
	booking: one(booking, {
		fields: [calComWebhookReceipt.bookingId],
		references: [booking.id]
	}),
	credential: one(calComCredential, {
		fields: [calComWebhookReceipt.credentialId],
		references: [calComCredential.id]
	}),
	organization: one(organization, {
		fields: [calComWebhookReceipt.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [calComWebhookReceipt.locationId],
		references: [location.id]
	}),
}));

export const bookingAvailabilityRelations = relations(bookingAvailability, ({one}) => ({
	organization: one(organization, {
		fields: [bookingAvailability.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [bookingAvailability.locationId],
		references: [location.id]
	}),
}));

export const bookingHolidayRelations = relations(bookingHoliday, ({one}) => ({
	organization: one(organization, {
		fields: [bookingHoliday.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [bookingHoliday.locationId],
		references: [location.id]
	}),
}));

export const noteRelations = relations(note, ({one, many}) => ({
	user: one(user, {
		fields: [note.authorId],
		references: [user.id]
	}),
	client: one(client, {
		fields: [note.clientId],
		references: [client.id]
	}),
	deal: one(deal, {
		fields: [note.dealId],
		references: [deal.id]
	}),
	noteMentions: many(noteMention),
}));

export const noteMentionRelations = relations(noteMention, ({one}) => ({
	note: one(note, {
		fields: [noteMention.noteId],
		references: [note.id]
	}),
	user: one(user, {
		fields: [noteMention.userId],
		references: [user.id]
	}),
}));

export const taskRelations = relations(task, ({one}) => ({
	user_assigneeId: one(user, {
		fields: [task.assigneeId],
		references: [user.id],
		relationName: "task_assigneeId_user_id"
	}),
	client: one(client, {
		fields: [task.clientId],
		references: [client.id]
	}),
	user_createdById: one(user, {
		fields: [task.createdById],
		references: [user.id],
		relationName: "task_createdById_user_id"
	}),
	deal: one(deal, {
		fields: [task.dealId],
		references: [deal.id]
	}),
	organization: one(organization, {
		fields: [task.organizationId],
		references: [organization.id]
	}),
	location: one(location, {
		fields: [task.locationId],
		references: [location.id]
	}),
}));
