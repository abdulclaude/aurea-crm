ALTER TYPE "public"."ContactType" RENAME TO "ClientType";--> statement-breakpoint
ALTER TYPE "public"."WorkerDocumentStatus" RENAME TO "InstructorDocumentStatus";--> statement-breakpoint
ALTER TYPE "public"."WorkerDocumentType" RENAME TO "InstructorDocumentType";--> statement-breakpoint
ALTER TYPE "public"."WorkerPaymentMethod" RENAME TO "InstructorPaymentMethod";--> statement-breakpoint
ALTER TYPE "public"."WorkerPaymentStatus" RENAME TO "InstructorPaymentStatus";--> statement-breakpoint
ALTER TYPE "public"."SubaccountMemberRole" RENAME TO "LocationMemberRole";--> statement-breakpoint
ALTER TABLE "Contact" RENAME TO "Client";--> statement-breakpoint
ALTER TABLE "ContactAssignee" RENAME TO "ClientAssignee";--> statement-breakpoint
ALTER TABLE "ContactHousehold" RENAME TO "ClientHousehold";--> statement-breakpoint
ALTER TABLE "ContactHouseholdMember" RENAME TO "ClientHouseholdMember";--> statement-breakpoint
ALTER TABLE "ContactInstructor" RENAME TO "ClientInstructor";--> statement-breakpoint
ALTER TABLE "DealContact" RENAME TO "DealClient";--> statement-breakpoint
ALTER TABLE "Worker" RENAME TO "Instructor";--> statement-breakpoint
ALTER TABLE "WorkerAvailability" RENAME TO "InstructorAvailability";--> statement-breakpoint
ALTER TABLE "WorkerDocument" RENAME TO "InstructorDocument";--> statement-breakpoint
ALTER TABLE "WorkerPayment" RENAME TO "InstructorPayment";--> statement-breakpoint
ALTER TABLE "Subaccount" RENAME TO "Location";--> statement-breakpoint
ALTER TABLE "SubaccountMember" RENAME TO "LocationMember";--> statement-breakpoint
ALTER TABLE "SubaccountModule" RENAME TO "LocationModule";--> statement-breakpoint
ALTER TABLE "PayrollRunWorker" RENAME TO "PayrollRunInstructor";--> statement-breakpoint
ALTER TABLE "StudioClass" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "StudioMembership" RENAME COLUMN "contactId" TO "clientId";--> statement-breakpoint
ALTER TABLE "StudioMembership" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "Workflows" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "Credential" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "Execution" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "ClassType" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "Room" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "Webhook" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "ClassCredit" RENAME COLUMN "contactId" TO "clientId";--> statement-breakpoint
ALTER TABLE "ClassWaitlist" RENAME COLUMN "contactId" TO "clientId";--> statement-breakpoint
ALTER TABLE "CheckIn" RENAME COLUMN "contactId" TO "clientId";--> statement-breakpoint
ALTER TABLE "CheckIn" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "MembershipPlan" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "StripeEvent" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "AILog" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "StudioPayment" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "StudioPayment" RENAME COLUMN "contactId" TO "clientId";--> statement-breakpoint
ALTER TABLE "PromoCode" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "InstructorPayout" RENAME COLUMN "workerId" TO "instructorId";--> statement-breakpoint
ALTER TABLE "InstructorPayout" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "GiftCard" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "GiftCard" RENAME COLUMN "purchasedByContactId" TO "purchasedByClientId";--> statement-breakpoint
ALTER TABLE "GiftCard" RENAME COLUMN "redeemedByContactId" TO "redeemedByClientId";--> statement-breakpoint
ALTER TABLE "DeviceToken" RENAME COLUMN "contactId" TO "clientId";--> statement-breakpoint
ALTER TABLE "MobileSession" RENAME COLUMN "contactId" TO "clientId";--> statement-breakpoint
ALTER TABLE "InboxConversation" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "InboxConversation" RENAME COLUMN "contactId" TO "clientId";--> statement-breakpoint
ALTER TABLE "ClientInstructor" RENAME COLUMN "contactId" TO "clientId";--> statement-breakpoint
ALTER TABLE "ClientInstructor" RENAME COLUMN "workerId" TO "instructorId";--> statement-breakpoint
ALTER TABLE "ExternalChannelIntegration" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "ClientHousehold" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "ClientHouseholdMember" RENAME COLUMN "contactId" TO "clientId";--> statement-breakpoint
ALTER TABLE "InstructorSubstitutionRequest" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "DynamicPricingRule" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "StudioPaymentPlan" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "VideoOnDemandAsset" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "AccessControlIntegration" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "PerformanceMetric" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "PerformanceMetric" RENAME COLUMN "contactId" TO "clientId";--> statement-breakpoint
ALTER TABLE "WorkoutProgram" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "SoapNote" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "SoapNote" RENAME COLUMN "contactId" TO "clientId";--> statement-breakpoint
ALTER TABLE "MarketplaceListing" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "AutomationEvent" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "AutomationEvent" RENAME COLUMN "contactId" TO "clientId";--> statement-breakpoint
ALTER TABLE "SmsMessage" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "SmsMessage" RENAME COLUMN "contactId" TO "clientId";--> statement-breakpoint
ALTER TABLE "WaiverTemplate" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "WaiverSignature" RENAME COLUMN "contactId" TO "clientId";--> statement-breakpoint
ALTER TABLE "CancellationCharge" RENAME COLUMN "contactId" TO "clientId";--> statement-breakpoint
ALTER TABLE "ClassReminderConfig" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "ClassReminderConfig" RENAME COLUMN "reminder24h" TO "reminder24H";--> statement-breakpoint
ALTER TABLE "ClassReminderConfig" RENAME COLUMN "reminder1h" TO "reminder1H";--> statement-breakpoint
ALTER TABLE "RetentionAutomation" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "BillingRule" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "IntroOffer" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "IntroOfferRedemption" RENAME COLUMN "contactId" TO "clientId";--> statement-breakpoint
ALTER TABLE "ChurnRiskScore" RENAME COLUMN "contactId" TO "clientId";--> statement-breakpoint
ALTER TABLE "Referral" RENAME COLUMN "referrerContactId" TO "referrerClientId";--> statement-breakpoint
ALTER TABLE "Referral" RENAME COLUMN "refereeContactId" TO "refereeClientId";--> statement-breakpoint
ALTER TABLE "LoyaltyBalance" RENAME COLUMN "contactId" TO "clientId";--> statement-breakpoint
ALTER TABLE "LoyaltyTransaction" RENAME COLUMN "contactId" TO "clientId";--> statement-breakpoint
ALTER TABLE "SpotBooking" RENAME COLUMN "contactId" TO "clientId";--> statement-breakpoint
ALTER TABLE "PaymentIntegration" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "CancellationPolicy" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "Activity" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "BankTransferSettings" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "ClientAssignee" RENAME COLUMN "contactId" TO "clientId";--> statement-breakpoint
ALTER TABLE "ClientAssignee" RENAME COLUMN "subaccountMemberId" TO "locationMemberId";--> statement-breakpoint
ALTER TABLE "LocationMember" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "Deal" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "Pipeline" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "DealClient" RENAME COLUMN "contactId" TO "clientId";--> statement-breakpoint
ALTER TABLE "DealMember" RENAME COLUMN "subaccountMemberId" TO "locationMemberId";--> statement-breakpoint
ALTER TABLE "Form" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "GlobalStylePreset" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "FormSubmission" RENAME COLUMN "contactId" TO "clientId";--> statement-breakpoint
ALTER TABLE "SmartSection" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "InvoiceTemplate" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "Notification" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "QRCode" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "RecurringInvoice" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "RecurringInvoice" RENAME COLUMN "contactId" TO "clientId";--> statement-breakpoint
ALTER TABLE "RecurringInvoice" RENAME COLUMN "contactName" TO "clientName";--> statement-breakpoint
ALTER TABLE "RecurringInvoice" RENAME COLUMN "contactEmail" TO "clientEmail";--> statement-breakpoint
ALTER TABLE "RecurringInvoice" RENAME COLUMN "contactAddress" TO "clientAddress";--> statement-breakpoint
ALTER TABLE "Rota" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "Rota" RENAME COLUMN "workerId" TO "instructorId";--> statement-breakpoint
ALTER TABLE "Rota" RENAME COLUMN "contactId" TO "clientId";--> statement-breakpoint
ALTER TABLE "Session" RENAME COLUMN "activeSubaccountId" TO "activeLocationId";--> statement-breakpoint
ALTER TABLE "StripeConnection" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "StudioBooking" RENAME COLUMN "contactId" TO "clientId";--> statement-breakpoint
ALTER TABLE "LocationModule" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "UserPresence" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "InstructorDocument" RENAME COLUMN "workerId" TO "instructorId";--> statement-breakpoint
ALTER TABLE "TimeLog" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "TimeLog" RENAME COLUMN "contactId" TO "clientId";--> statement-breakpoint
ALTER TABLE "TimeLog" RENAME COLUMN "workerId" TO "instructorId";--> statement-breakpoint
ALTER TABLE "ShiftSwapRequest" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "ShiftSwapRequest" RENAME COLUMN "targetWorkerId" TO "targetInstructorId";--> statement-breakpoint
ALTER TABLE "InstructorAvailability" RENAME COLUMN "workerId" TO "instructorId";--> statement-breakpoint
ALTER TABLE "TimeOffRequest" RENAME COLUMN "workerId" TO "instructorId";--> statement-breakpoint
ALTER TABLE "TimeOffRequest" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "OvertimeTracking" RENAME COLUMN "workerId" TO "instructorId";--> statement-breakpoint
ALTER TABLE "Invoice" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "Invoice" RENAME COLUMN "contactId" TO "clientId";--> statement-breakpoint
ALTER TABLE "Invoice" RENAME COLUMN "contactName" TO "clientName";--> statement-breakpoint
ALTER TABLE "Invoice" RENAME COLUMN "contactEmail" TO "clientEmail";--> statement-breakpoint
ALTER TABLE "Invoice" RENAME COLUMN "contactAddress" TO "clientAddress";--> statement-breakpoint
ALTER TABLE "PayrollRun" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "InstructorPayment" RENAME COLUMN "workerId" TO "instructorId";--> statement-breakpoint
ALTER TABLE "InstructorPayment" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "PayrollRunInstructor" RENAME COLUMN "workerId" TO "instructorId";--> statement-breakpoint
ALTER TABLE "PayrollRunInstructor" RENAME COLUMN "ytdNI" TO "ytdNi";--> statement-breakpoint
ALTER TABLE "Instructor" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "Funnel" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "FunnelWebVital" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "FunnelEvent" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "FunnelSession" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "AdSpend" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "AdPlatformCredential" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "Client" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "EmailDomain" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "EmailTemplate" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "CampaignRecipient" RENAME COLUMN "contactId" TO "clientId";--> statement-breakpoint
ALTER TABLE "UnsubscribeToken" RENAME COLUMN "contactId" TO "clientId";--> statement-breakpoint
ALTER TABLE "Campaign" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "Booking" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "Booking" RENAME COLUMN "contactId" TO "clientId";--> statement-breakpoint
ALTER TABLE "CalComCredential" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "BookingEventType" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "BookingAvailability" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "BookingHoliday" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "note" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "note" RENAME COLUMN "contactId" TO "clientId";--> statement-breakpoint
ALTER TABLE "task" RENAME COLUMN "subaccountId" TO "locationId";--> statement-breakpoint
ALTER TABLE "task" RENAME COLUMN "contactId" TO "clientId";--> statement-breakpoint
ALTER TABLE "StudioClass" DROP CONSTRAINT "StudioClass_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "StudioClass" DROP CONSTRAINT "StudioClass_instructorId_fkey";
--> statement-breakpoint
ALTER TABLE "StudioMembership" DROP CONSTRAINT "StudioMembership_contactId_fkey";
--> statement-breakpoint
ALTER TABLE "StudioMembership" DROP CONSTRAINT "StudioMembership_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "Workflows" DROP CONSTRAINT "Workflows_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "Credential" DROP CONSTRAINT "Credential_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "Execution" DROP CONSTRAINT "Execution_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "ClassType" DROP CONSTRAINT "ClassType_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "Room" DROP CONSTRAINT "Room_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "Webhook" DROP CONSTRAINT "Webhook_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "ClassCredit" DROP CONSTRAINT "ClassCredit_contactId_fkey";
--> statement-breakpoint
ALTER TABLE "ClassWaitlist" DROP CONSTRAINT "ClassWaitlist_contactId_fkey";
--> statement-breakpoint
ALTER TABLE "CheckIn" DROP CONSTRAINT "CheckIn_contactId_fkey";
--> statement-breakpoint
ALTER TABLE "CheckIn" DROP CONSTRAINT "CheckIn_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "MembershipPlan" DROP CONSTRAINT "MembershipPlan_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "AILog" DROP CONSTRAINT "AILog_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "StudioPayment" DROP CONSTRAINT "StudioPayment_contactId_fkey";
--> statement-breakpoint
ALTER TABLE "StudioPayment" DROP CONSTRAINT "StudioPayment_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "PromoCode" DROP CONSTRAINT "PromoCode_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "InstructorPayout" DROP CONSTRAINT "InstructorPayout_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "InstructorPayout" DROP CONSTRAINT "InstructorPayout_workerId_fkey";
--> statement-breakpoint
ALTER TABLE "GiftCard" DROP CONSTRAINT "GiftCard_purchasedByContactId_fkey";
--> statement-breakpoint
ALTER TABLE "GiftCard" DROP CONSTRAINT "GiftCard_redeemedByContactId_fkey";
--> statement-breakpoint
ALTER TABLE "GiftCard" DROP CONSTRAINT "GiftCard_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "DeviceToken" DROP CONSTRAINT "DeviceToken_contactId_fkey";
--> statement-breakpoint
ALTER TABLE "MobileSession" DROP CONSTRAINT "MobileSession_contactId_fkey";
--> statement-breakpoint
ALTER TABLE "InboxConversation" DROP CONSTRAINT "InboxConversation_contactId_fkey";
--> statement-breakpoint
ALTER TABLE "InboxConversation" DROP CONSTRAINT "InboxConversation_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "ClientInstructor" DROP CONSTRAINT "ContactInstructor_contactId_fkey";
--> statement-breakpoint
ALTER TABLE "ClientInstructor" DROP CONSTRAINT "ContactInstructor_workerId_fkey";
--> statement-breakpoint
ALTER TABLE "ExternalChannelIntegration" DROP CONSTRAINT "ExternalChannelIntegration_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "ClientHousehold" DROP CONSTRAINT "ContactHousehold_organizationId_fkey";
--> statement-breakpoint
ALTER TABLE "ClientHousehold" DROP CONSTRAINT "ContactHousehold_primaryContactId_fkey";
--> statement-breakpoint
ALTER TABLE "ClientHousehold" DROP CONSTRAINT "ContactHousehold_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "ClientHouseholdMember" DROP CONSTRAINT "ContactHouseholdMember_contactId_fkey";
--> statement-breakpoint
ALTER TABLE "ClientHouseholdMember" DROP CONSTRAINT "ContactHouseholdMember_householdId_fkey";
--> statement-breakpoint
ALTER TABLE "InstructorSubstitutionRequest" DROP CONSTRAINT "InstructorSubstitutionRequest_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "InstructorSubstitutionRequest" DROP CONSTRAINT "InstructorSubstitutionRequest_originalInstructorId_fkey";
--> statement-breakpoint
ALTER TABLE "InstructorSubstitutionRequest" DROP CONSTRAINT "InstructorSubstitutionRequest_substituteId_fkey";
--> statement-breakpoint
ALTER TABLE "DynamicPricingRule" DROP CONSTRAINT "DynamicPricingRule_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "StudioPaymentPlan" DROP CONSTRAINT "StudioPaymentPlan_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "VideoOnDemandAsset" DROP CONSTRAINT "VideoOnDemandAsset_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "VideoOnDemandAsset" DROP CONSTRAINT "VideoOnDemandAsset_instructorId_fkey";
--> statement-breakpoint
ALTER TABLE "AccessControlIntegration" DROP CONSTRAINT "AccessControlIntegration_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "PerformanceMetric" DROP CONSTRAINT "PerformanceMetric_contactId_fkey";
--> statement-breakpoint
ALTER TABLE "PerformanceMetric" DROP CONSTRAINT "PerformanceMetric_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "WorkoutProgram" DROP CONSTRAINT "WorkoutProgram_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "WorkoutProgram" DROP CONSTRAINT "WorkoutProgram_coachId_fkey";
--> statement-breakpoint
ALTER TABLE "SoapNote" DROP CONSTRAINT "SoapNote_contactId_fkey";
--> statement-breakpoint
ALTER TABLE "SoapNote" DROP CONSTRAINT "SoapNote_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "SoapNote" DROP CONSTRAINT "SoapNote_authorId_fkey";
--> statement-breakpoint
ALTER TABLE "MarketplaceListing" DROP CONSTRAINT "MarketplaceListing_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "AutomationEvent" DROP CONSTRAINT "AutomationEvent_contactId_fkey";
--> statement-breakpoint
ALTER TABLE "AutomationEvent" DROP CONSTRAINT "AutomationEvent_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "SmsMessage" DROP CONSTRAINT "SmsMessage_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "WaiverTemplate" DROP CONSTRAINT "WaiverTemplate_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "ClassReminderConfig" DROP CONSTRAINT "ClassReminderConfig_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "RetentionAutomation" DROP CONSTRAINT "RetentionAutomation_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "IntroOffer" DROP CONSTRAINT "IntroOffer_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "Referral" DROP CONSTRAINT "Referral_refereeContactId_fkey";
--> statement-breakpoint
ALTER TABLE "Referral" DROP CONSTRAINT "Referral_referrerContactId_fkey";
--> statement-breakpoint
ALTER TABLE "LoyaltyBalance" DROP CONSTRAINT "LoyaltyBalance_contactId_fkey";
--> statement-breakpoint
ALTER TABLE "CancellationPolicy" DROP CONSTRAINT "CancellationPolicy_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "Location" DROP CONSTRAINT "Subaccount_createdByUserId_fkey";
--> statement-breakpoint
ALTER TABLE "Location" DROP CONSTRAINT "Subaccount_organizationId_fkey";
--> statement-breakpoint
ALTER TABLE "BankTransferSettings" DROP CONSTRAINT "BankTransferSettings_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "ClientAssignee" DROP CONSTRAINT "ContactAssignee_contactId_fkey";
--> statement-breakpoint
ALTER TABLE "ClientAssignee" DROP CONSTRAINT "ContactAssignee_subaccountMemberId_fkey";
--> statement-breakpoint
ALTER TABLE "LocationMember" DROP CONSTRAINT "SubaccountMember_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "LocationMember" DROP CONSTRAINT "SubaccountMember_userId_fkey";
--> statement-breakpoint
ALTER TABLE "Deal" DROP CONSTRAINT "Deal_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "Pipeline" DROP CONSTRAINT "Pipeline_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "DealClient" DROP CONSTRAINT "DealContact_contactId_fkey";
--> statement-breakpoint
ALTER TABLE "DealClient" DROP CONSTRAINT "DealContact_dealId_fkey";
--> statement-breakpoint
ALTER TABLE "DealMember" DROP CONSTRAINT "DealMember_subaccountMemberId_fkey";
--> statement-breakpoint
ALTER TABLE "Form" DROP CONSTRAINT "Form_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "GlobalStylePreset" DROP CONSTRAINT "GlobalStylePreset_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "FormSubmission" DROP CONSTRAINT "FormSubmission_contactId_fkey";
--> statement-breakpoint
ALTER TABLE "SmartSection" DROP CONSTRAINT "SmartSection_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "QRCode" DROP CONSTRAINT "QRCode_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "Rota" DROP CONSTRAINT "Rota_contactId_fkey";
--> statement-breakpoint
ALTER TABLE "Rota" DROP CONSTRAINT "Rota_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "Rota" DROP CONSTRAINT "Rota_workerId_fkey";
--> statement-breakpoint
ALTER TABLE "StripeConnection" DROP CONSTRAINT "StripeConnection_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "StudioBooking" DROP CONSTRAINT "StudioBooking_contactId_fkey";
--> statement-breakpoint
ALTER TABLE "LocationModule" DROP CONSTRAINT "SubaccountModule_organizationId_fkey";
--> statement-breakpoint
ALTER TABLE "LocationModule" DROP CONSTRAINT "SubaccountModule_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "InstructorDocument" DROP CONSTRAINT "WorkerDocument_workerId_fkey";
--> statement-breakpoint
ALTER TABLE "TimeLog" DROP CONSTRAINT "TimeLog_contactId_fkey";
--> statement-breakpoint
ALTER TABLE "TimeLog" DROP CONSTRAINT "TimeLog_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "TimeLog" DROP CONSTRAINT "TimeLog_workerId_fkey";
--> statement-breakpoint
ALTER TABLE "ShiftSwapRequest" DROP CONSTRAINT "ShiftSwapRequest_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "ShiftSwapRequest" DROP CONSTRAINT "ShiftSwapRequest_targetWorkerId_fkey";
--> statement-breakpoint
ALTER TABLE "ShiftSwapRequest" DROP CONSTRAINT "ShiftSwapRequest_requesterId_fkey";
--> statement-breakpoint
ALTER TABLE "InstructorAvailability" DROP CONSTRAINT "WorkerAvailability_organizationId_fkey";
--> statement-breakpoint
ALTER TABLE "InstructorAvailability" DROP CONSTRAINT "WorkerAvailability_workerId_fkey";
--> statement-breakpoint
ALTER TABLE "TimeOffRequest" DROP CONSTRAINT "TimeOffRequest_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "TimeOffRequest" DROP CONSTRAINT "TimeOffRequest_workerId_fkey";
--> statement-breakpoint
ALTER TABLE "OvertimeTracking" DROP CONSTRAINT "OvertimeTracking_workerId_fkey";
--> statement-breakpoint
ALTER TABLE "PayrollRun" DROP CONSTRAINT "PayrollRun_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "InstructorPayment" DROP CONSTRAINT "WorkerPayment_organizationId_fkey";
--> statement-breakpoint
ALTER TABLE "InstructorPayment" DROP CONSTRAINT "WorkerPayment_payrollRunId_fkey";
--> statement-breakpoint
ALTER TABLE "InstructorPayment" DROP CONSTRAINT "WorkerPayment_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "InstructorPayment" DROP CONSTRAINT "WorkerPayment_workerId_fkey";
--> statement-breakpoint
ALTER TABLE "PayrollRunInstructor" DROP CONSTRAINT "PayrollRunWorker_payrollRunId_fkey";
--> statement-breakpoint
ALTER TABLE "PayrollRunInstructor" DROP CONSTRAINT "PayrollRunWorker_workerId_fkey";
--> statement-breakpoint
ALTER TABLE "Instructor" DROP CONSTRAINT "Worker_organizationId_fkey";
--> statement-breakpoint
ALTER TABLE "Instructor" DROP CONSTRAINT "Worker_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "Funnel" DROP CONSTRAINT "Funnel_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "FunnelEvent" DROP CONSTRAINT "FunnelEvent_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "FunnelSession" DROP CONSTRAINT "FunnelSession_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "AdSpend" DROP CONSTRAINT "AdSpend_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "AdPlatformCredential" DROP CONSTRAINT "AdPlatformCredential_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "Client" DROP CONSTRAINT "Contact_organizationId_fkey";
--> statement-breakpoint
ALTER TABLE "Client" DROP CONSTRAINT "Contact_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "EmailDomain" DROP CONSTRAINT "EmailDomain_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "EmailTemplate" DROP CONSTRAINT "EmailTemplate_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "CampaignRecipient" DROP CONSTRAINT "CampaignRecipient_contactId_fkey";
--> statement-breakpoint
ALTER TABLE "UnsubscribeToken" DROP CONSTRAINT "UnsubscribeToken_contactId_fkey";
--> statement-breakpoint
ALTER TABLE "Campaign" DROP CONSTRAINT "Campaign_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_contactId_fkey";
--> statement-breakpoint
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "CalComCredential" DROP CONSTRAINT "CalComCredential_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "BookingEventType" DROP CONSTRAINT "BookingEventType_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "BookingAvailability" DROP CONSTRAINT "BookingAvailability_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "BookingHoliday" DROP CONSTRAINT "BookingHoliday_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "note" DROP CONSTRAINT "note_contactId_fkey";
--> statement-breakpoint
ALTER TABLE "task" DROP CONSTRAINT "task_contactId_fkey";
--> statement-breakpoint
ALTER TABLE "task" DROP CONSTRAINT "task_subaccountId_fkey";
--> statement-breakpoint
ALTER TABLE "Activity" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."ActivityType";--> statement-breakpoint
CREATE TYPE "public"."ActivityType" AS ENUM('CLIENT', 'DEAL', 'WORKFLOW', 'EXECUTION', 'PIPELINE', 'TASK', 'EMAIL', 'CALL', 'MEETING', 'NOTE', 'INSTRUCTOR', 'TIME_LOG', 'INVOICE', 'CREDENTIAL', 'WEBHOOK', 'INTEGRATION', 'LOCATION', 'ORGANIZATION', 'BOOKING', 'FUNNEL', 'CAMPAIGN');--> statement-breakpoint
UPDATE "Activity" SET "type" = 'CLIENT' WHERE "type" = 'CONTACT';--> statement-breakpoint
UPDATE "Activity" SET "type" = 'INSTRUCTOR' WHERE "type" = 'WORKER';--> statement-breakpoint
ALTER TABLE "Activity" ALTER COLUMN "type" SET DATA TYPE "public"."ActivityType" USING "type"::"public"."ActivityType";--> statement-breakpoint
ALTER TABLE "AutomationEvent" ALTER COLUMN "sourceNodeType" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "Node" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."NodeType";--> statement-breakpoint
CREATE TYPE "public"."NodeType" AS ENUM('INITIAL', 'MANUAL_TRIGGER', 'GOOGLE_FORM_TRIGGER', 'GOOGLE_CALENDAR_TRIGGER', 'GOOGLE_CALENDAR_EXECUTION', 'GMAIL_TRIGGER', 'GMAIL_EXECUTION', 'TELEGRAM_TRIGGER', 'TELEGRAM_EXECUTION', 'STRIPE_TRIGGER', 'HTTP_REQUEST', 'GEMINI', 'ANTHROPIC', 'OPENAI', 'DISCORD', 'SLACK', 'WAIT', 'CREATE_CLIENT', 'UPDATE_CLIENT', 'DELETE_CLIENT', 'CREATE_DEAL', 'UPDATE_DEAL', 'DELETE_DEAL', 'UPDATE_PIPELINE', 'CLIENT_CREATED_TRIGGER', 'CLIENT_UPDATED_TRIGGER', 'CLIENT_FIELD_CHANGED_TRIGGER', 'CLIENT_DELETED_TRIGGER', 'CLIENT_TYPE_CHANGED_TRIGGER', 'CLIENT_LIFECYCLE_STAGE_CHANGED_TRIGGER', 'IF_ELSE', 'SWITCH', 'LOOP', 'SET_VARIABLE', 'STOP_WORKFLOW', 'BUNDLE_WORKFLOW', 'OUTLOOK_TRIGGER', 'OUTLOOK_EXECUTION', 'ONEDRIVE_TRIGGER', 'ONEDRIVE_EXECUTION', 'GOOGLE_CALENDAR_EVENT_CREATED', 'GOOGLE_CALENDAR_EVENT_UPDATED', 'GOOGLE_CALENDAR_EVENT_DELETED', 'GOOGLE_DRIVE_FILE_CREATED', 'GOOGLE_DRIVE_FILE_UPDATED', 'GOOGLE_DRIVE_FILE_DELETED', 'GOOGLE_DRIVE_FOLDER_CREATED', 'GOOGLE_CALENDAR_CREATE_EVENT', 'GOOGLE_CALENDAR_UPDATE_EVENT', 'GOOGLE_CALENDAR_DELETE_EVENT', 'GOOGLE_CALENDAR_FIND_AVAILABLE_TIMES', 'GMAIL_SEND_EMAIL', 'GMAIL_REPLY_TO_EMAIL', 'GMAIL_SEARCH_EMAILS', 'GMAIL_ADD_LABEL', 'GOOGLE_DRIVE_UPLOAD_FILE', 'GOOGLE_DRIVE_DOWNLOAD_FILE', 'GOOGLE_DRIVE_MOVE_FILE', 'GOOGLE_DRIVE_DELETE_FILE', 'GOOGLE_DRIVE_CREATE_FOLDER', 'GOOGLE_FORM_READ_RESPONSES', 'GOOGLE_FORM_CREATE_RESPONSE', 'OUTLOOK_NEW_EMAIL', 'OUTLOOK_EMAIL_MOVED', 'OUTLOOK_EMAIL_DELETED', 'ONEDRIVE_FILE_CREATED', 'ONEDRIVE_FILE_UPDATED', 'ONEDRIVE_FILE_DELETED', 'OUTLOOK_CALENDAR_EVENT_CREATED', 'OUTLOOK_CALENDAR_EVENT_UPDATED', 'OUTLOOK_CALENDAR_EVENT_DELETED', 'OUTLOOK_SEND_EMAIL', 'OUTLOOK_REPLY_TO_EMAIL', 'OUTLOOK_MOVE_EMAIL', 'OUTLOOK_SEARCH_EMAILS', 'ONEDRIVE_UPLOAD_FILE', 'ONEDRIVE_DOWNLOAD_FILE', 'ONEDRIVE_MOVE_FILE', 'ONEDRIVE_DELETE_FILE', 'OUTLOOK_CALENDAR_CREATE_EVENT', 'OUTLOOK_CALENDAR_UPDATE_EVENT', 'OUTLOOK_CALENDAR_DELETE_EVENT', 'SLACK_NEW_MESSAGE', 'SLACK_MESSAGE_REACTION', 'SLACK_CHANNEL_JOINED', 'DISCORD_NEW_MESSAGE', 'DISCORD_NEW_REACTION', 'DISCORD_USER_JOINED', 'TELEGRAM_NEW_MESSAGE', 'TELEGRAM_COMMAND_RECEIVED', 'SLACK_SEND_MESSAGE', 'SLACK_UPDATE_MESSAGE', 'SLACK_SEND_DM', 'SLACK_UPLOAD_FILE', 'DISCORD_SEND_MESSAGE', 'DISCORD_EDIT_MESSAGE', 'DISCORD_SEND_EMBED', 'DISCORD_SEND_DM', 'TELEGRAM_SEND_MESSAGE', 'TELEGRAM_SEND_PHOTO', 'TELEGRAM_SEND_DOCUMENT', 'FIND_CLIENTS', 'ADD_TAG_TO_CLIENT', 'REMOVE_TAG_FROM_CLIENT', 'DEAL_CREATED_TRIGGER', 'DEAL_UPDATED_TRIGGER', 'DEAL_DELETED_TRIGGER', 'DEAL_STAGE_CHANGED_TRIGGER', 'MOVE_DEAL_STAGE', 'ADD_DEAL_NOTE', 'APPOINTMENT_CREATED_TRIGGER', 'APPOINTMENT_CANCELLED_TRIGGER', 'SCHEDULE_APPOINTMENT', 'UPDATE_APPOINTMENT', 'CANCEL_APPOINTMENT', 'STRIPE_PAYMENT_SUCCEEDED', 'STRIPE_PAYMENT_FAILED', 'STRIPE_SUBSCRIPTION_CREATED', 'STRIPE_SUBSCRIPTION_UPDATED', 'STRIPE_SUBSCRIPTION_CANCELLED', 'STRIPE_CREATE_CHECKOUT_SESSION', 'STRIPE_CREATE_INVOICE', 'STRIPE_SEND_INVOICE', 'STRIPE_REFUND_PAYMENT', 'GEMINI_GENERATE_TEXT', 'GEMINI_SUMMARISE', 'GEMINI_TRANSFORM', 'GEMINI_CLASSIFY', 'EXECUTE_WORKFLOW', 'BIRTHDAY_TRIGGER', 'CLASS_BOOKED_TRIGGER', 'CLASS_CANCELLED_TRIGGER', 'MEMBER_CHECKED_IN_TRIGGER', 'MEMBER_NO_SHOW_TRIGGER', 'MEMBERSHIP_CREATED_TRIGGER', 'MEMBERSHIP_EXPIRING_TRIGGER', 'MEMBERSHIP_CANCELLED_TRIGGER', 'WAITLIST_SPOT_OPENED_TRIGGER', 'INTRO_OFFER_REDEEMED_TRIGGER', 'SEND_CLASS_REMINDER', 'AWARD_LOYALTY_POINTS', 'CALCULATE_CHURN_SCORE', 'SEND_SMS', 'INTRO_OFFER_COMPLETED_TRIGGER', 'MEMBER_CLASS_COUNT_TRIGGER', 'CLIENT_TAG_ADDED_TRIGGER', 'CLIENT_TAG_REMOVED_TRIGGER', 'STUDIO_PAYMENT_SUCCEEDED_TRIGGER', 'STUDIO_PAYMENT_FAILED_TRIGGER');--> statement-breakpoint
UPDATE "Node" SET "type" = 'UPDATE_CLIENT' WHERE "type" = 'UPDATE_CONTACT';--> statement-breakpoint
UPDATE "Node" SET "type" = 'ADD_TAG_TO_CLIENT' WHERE "type" = 'ADD_TAG_TO_CONTACT';--> statement-breakpoint
UPDATE "Node" SET "type" = 'CLIENT_TAG_ADDED_TRIGGER' WHERE "type" = 'CONTACT_TAG_ADDED_TRIGGER';--> statement-breakpoint
UPDATE "AutomationEvent" SET "sourceNodeType" = 'UPDATE_CLIENT' WHERE "sourceNodeType" = 'UPDATE_CONTACT';--> statement-breakpoint
UPDATE "AutomationEvent" SET "sourceNodeType" = 'ADD_TAG_TO_CLIENT' WHERE "sourceNodeType" = 'ADD_TAG_TO_CONTACT';--> statement-breakpoint
UPDATE "AutomationEvent" SET "sourceNodeType" = 'CLIENT_TAG_ADDED_TRIGGER' WHERE "sourceNodeType" = 'CONTACT_TAG_ADDED_TRIGGER';--> statement-breakpoint
ALTER TABLE "AutomationEvent" ALTER COLUMN "sourceNodeType" SET DATA TYPE "public"."NodeType" USING "sourceNodeType"::"public"."NodeType";--> statement-breakpoint
ALTER TABLE "Node" ALTER COLUMN "type" SET DATA TYPE "public"."NodeType" USING "type"::"public"."NodeType";--> statement-breakpoint
ALTER TABLE "ShiftSwapRequest" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "ShiftSwapRequest" ALTER COLUMN "status" SET DEFAULT 'PENDING'::text;--> statement-breakpoint
DROP TYPE "public"."ShiftSwapStatus";--> statement-breakpoint
CREATE TYPE "public"."ShiftSwapStatus" AS ENUM('PENDING', 'INSTRUCTOR_ACCEPTED', 'INSTRUCTOR_REJECTED', 'ADMIN_APPROVED', 'ADMIN_REJECTED', 'CANCELLED', 'EXPIRED');--> statement-breakpoint
ALTER TABLE "ShiftSwapRequest" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"public"."ShiftSwapStatus";--> statement-breakpoint
ALTER TABLE "ShiftSwapRequest" ALTER COLUMN "status" SET DATA TYPE "public"."ShiftSwapStatus" USING "status"::"public"."ShiftSwapStatus";--> statement-breakpoint
DROP INDEX "StudioClass_subaccountId_idx";--> statement-breakpoint
DROP INDEX "StudioMembership_contactId_idx";--> statement-breakpoint
DROP INDEX "StudioMembership_subaccountId_idx";--> statement-breakpoint
DROP INDEX "Workflows_subaccountId_idx";--> statement-breakpoint
DROP INDEX "Credential_subaccountId_idx";--> statement-breakpoint
DROP INDEX "Execution_subaccountId_idx";--> statement-breakpoint
DROP INDEX "ClassType_subaccountId_idx";--> statement-breakpoint
DROP INDEX "Room_subaccountId_idx";--> statement-breakpoint
DROP INDEX "Webhook_subaccountId_idx";--> statement-breakpoint
DROP INDEX "ClassCredit_contactId_idx";--> statement-breakpoint
DROP INDEX "ClassWaitlist_classId_contactId_key";--> statement-breakpoint
DROP INDEX "ClassWaitlist_contactId_idx";--> statement-breakpoint
DROP INDEX "CheckIn_contactId_idx";--> statement-breakpoint
DROP INDEX "CheckIn_subaccountId_idx";--> statement-breakpoint
DROP INDEX "MembershipPlan_subaccountId_idx";--> statement-breakpoint
DROP INDEX "StripeEvent_subaccountId_idx";--> statement-breakpoint
DROP INDEX "AILog_subaccountId_idx";--> statement-breakpoint
DROP INDEX "StudioPayment_contactId_idx";--> statement-breakpoint
DROP INDEX "StudioPayment_subaccountId_idx";--> statement-breakpoint
DROP INDEX "PromoCode_subaccountId_idx";--> statement-breakpoint
DROP INDEX "InstructorPayout_subaccountId_idx";--> statement-breakpoint
DROP INDEX "InstructorPayout_workerId_idx";--> statement-breakpoint
DROP INDEX "GiftCard_purchasedByContactId_idx";--> statement-breakpoint
DROP INDEX "GiftCard_redeemedByContactId_idx";--> statement-breakpoint
DROP INDEX "GiftCard_subaccountId_idx";--> statement-breakpoint
DROP INDEX "DeviceToken_contactId_idx";--> statement-breakpoint
DROP INDEX "DeviceToken_contactId_token_key";--> statement-breakpoint
DROP INDEX "MobileSession_contactId_idx";--> statement-breakpoint
DROP INDEX "InboxConversation_contactId_idx";--> statement-breakpoint
DROP INDEX "InboxConversation_organizationId_subaccountId_isRead_idx";--> statement-breakpoint
DROP INDEX "InboxConversation_organizationId_subaccountId_status_idx";--> statement-breakpoint
DROP INDEX "ContactInstructor_contactId_workerId_key";--> statement-breakpoint
DROP INDEX "ExternalChannelIntegration_organizationId_subaccountId_prov_key";--> statement-breakpoint
DROP INDEX "ExternalChannelIntegration_subaccountId_idx";--> statement-breakpoint
DROP INDEX "ContactHousehold_organizationId_idx";--> statement-breakpoint
DROP INDEX "ContactHousehold_organizationId_subaccountId_idx";--> statement-breakpoint
DROP INDEX "ContactHousehold_primaryContactId_idx";--> statement-breakpoint
DROP INDEX "ContactHousehold_subaccountId_idx";--> statement-breakpoint
DROP INDEX "ContactHouseholdMember_contactId_idx";--> statement-breakpoint
DROP INDEX "ContactHouseholdMember_householdId_contactId_key";--> statement-breakpoint
DROP INDEX "ContactHouseholdMember_householdId_idx";--> statement-breakpoint
DROP INDEX "InstructorSubstitutionRequest_subaccountId_idx";--> statement-breakpoint
DROP INDEX "DynamicPricingRule_subaccountId_idx";--> statement-breakpoint
DROP INDEX "StudioPaymentPlan_subaccountId_idx";--> statement-breakpoint
DROP INDEX "VideoOnDemandAsset_subaccountId_idx";--> statement-breakpoint
DROP INDEX "AccessControlIntegration_subaccountId_idx";--> statement-breakpoint
DROP INDEX "PerformanceMetric_contactId_recordedAt_idx";--> statement-breakpoint
DROP INDEX "PerformanceMetric_subaccountId_idx";--> statement-breakpoint
DROP INDEX "WorkoutProgram_subaccountId_idx";--> statement-breakpoint
DROP INDEX "SoapNote_contactId_createdAt_idx";--> statement-breakpoint
DROP INDEX "SoapNote_subaccountId_idx";--> statement-breakpoint
DROP INDEX "MarketplaceListing_subaccountId_idx";--> statement-breakpoint
DROP INDEX "AutomationEvent_contactId_idx";--> statement-breakpoint
DROP INDEX "AutomationEvent_organizationId_subaccountId_occurredAt_idx";--> statement-breakpoint
DROP INDEX "AutomationEvent_subaccountId_idx";--> statement-breakpoint
DROP INDEX "SmsMessage_contactId_idx";--> statement-breakpoint
DROP INDEX "SmsMessage_organizationId_subaccountId_idx";--> statement-breakpoint
DROP INDEX "WaiverTemplate_subaccountId_idx";--> statement-breakpoint
DROP INDEX "WaiverSignature_contactId_idx";--> statement-breakpoint
DROP INDEX "CancellationCharge_contactId_idx";--> statement-breakpoint
DROP INDEX "RetentionAutomation_subaccountId_idx";--> statement-breakpoint
DROP INDEX "BillingRule_organizationId_subaccountId_idx";--> statement-breakpoint
DROP INDEX "BillingRule_subaccountId_idx";--> statement-breakpoint
DROP INDEX "IntroOffer_subaccountId_idx";--> statement-breakpoint
DROP INDEX "IntroOfferRedemption_contactId_idx";--> statement-breakpoint
DROP INDEX "IntroOfferRedemption_offerId_contactId_key";--> statement-breakpoint
DROP INDEX "ChurnRiskScore_contactId_idx";--> statement-breakpoint
DROP INDEX "ChurnRiskScore_organizationId_contactId_key";--> statement-breakpoint
DROP INDEX "Referral_refereeContactId_idx";--> statement-breakpoint
DROP INDEX "Referral_referrerContactId_idx";--> statement-breakpoint
DROP INDEX "LoyaltyBalance_contactId_idx";--> statement-breakpoint
DROP INDEX "LoyaltyBalance_organizationId_contactId_key";--> statement-breakpoint
DROP INDEX "LoyaltyTransaction_organizationId_contactId_idx";--> statement-breakpoint
DROP INDEX "SpotBooking_contactId_idx";--> statement-breakpoint
DROP INDEX "PaymentIntegration_subaccountId_idx";--> statement-breakpoint
DROP INDEX "PaymentIntegration_subaccountId_provider_key";--> statement-breakpoint
DROP INDEX "CancellationPolicy_subaccountId_idx";--> statement-breakpoint
DROP INDEX "Subaccount_organizationId_idx";--> statement-breakpoint
DROP INDEX "Activity_organizationId_subaccountId_idx";--> statement-breakpoint
DROP INDEX "Activity_subaccountId_idx";--> statement-breakpoint
DROP INDEX "BankTransferSettings_organizationId_subaccountId_key";--> statement-breakpoint
DROP INDEX "BankTransferSettings_subaccountId_idx";--> statement-breakpoint
DROP INDEX "BankTransferSettings_subaccountId_key";--> statement-breakpoint
DROP INDEX "ContactAssignee_contactId_subaccountMemberId_key";--> statement-breakpoint
DROP INDEX "SubaccountMember_subaccountId_userId_key";--> statement-breakpoint
DROP INDEX "Deal_organizationId_subaccountId_idx";--> statement-breakpoint
DROP INDEX "Deal_subaccountId_pipelineStageId_idx";--> statement-breakpoint
DROP INDEX "Pipeline_organizationId_subaccountId_idx";--> statement-breakpoint
DROP INDEX "Pipeline_subaccountId_isActive_idx";--> statement-breakpoint
DROP INDEX "DealContact_dealId_contactId_key";--> statement-breakpoint
DROP INDEX "DealMember_dealId_subaccountMemberId_key";--> statement-breakpoint
DROP INDEX "Form_subaccountId_idx";--> statement-breakpoint
DROP INDEX "GlobalStylePreset_subaccountId_idx";--> statement-breakpoint
DROP INDEX "FormSubmission_contactId_idx";--> statement-breakpoint
DROP INDEX "SmartSection_subaccountId_idx";--> statement-breakpoint
DROP INDEX "InvoiceTemplate_organizationId_subaccountId_idx";--> statement-breakpoint
DROP INDEX "InvoiceTemplate_subaccountId_idx";--> statement-breakpoint
DROP INDEX "Notification_subaccountId_idx";--> statement-breakpoint
DROP INDEX "QRCode_organizationId_subaccountId_idx";--> statement-breakpoint
DROP INDEX "QRCode_subaccountId_idx";--> statement-breakpoint
DROP INDEX "RecurringInvoice_subaccountId_idx";--> statement-breakpoint
DROP INDEX "Rota_contactId_idx";--> statement-breakpoint
DROP INDEX "Rota_organizationId_workerId_startTime_idx";--> statement-breakpoint
DROP INDEX "Rota_organizationId_workerId_status_idx";--> statement-breakpoint
DROP INDEX "Rota_subaccountId_idx";--> statement-breakpoint
DROP INDEX "Rota_workerId_idx";--> statement-breakpoint
DROP INDEX "Rota_workerId_startTime_endTime_idx";--> statement-breakpoint
DROP INDEX "StripeConnection_organizationId_subaccountId_key";--> statement-breakpoint
DROP INDEX "StripeConnection_subaccountId_idx";--> statement-breakpoint
DROP INDEX "StripeConnection_subaccountId_key";--> statement-breakpoint
DROP INDEX "StudioBooking_contactId_idx";--> statement-breakpoint
DROP INDEX "SubaccountModule_organizationId_enabled_idx";--> statement-breakpoint
DROP INDEX "SubaccountModule_organizationId_moduleType_key";--> statement-breakpoint
DROP INDEX "SubaccountModule_subaccountId_enabled_idx";--> statement-breakpoint
DROP INDEX "SubaccountModule_subaccountId_moduleType_key";--> statement-breakpoint
DROP INDEX "UserPresence_subaccountId_idx";--> statement-breakpoint
DROP INDEX "WorkerDocument_expiryDate_idx";--> statement-breakpoint
DROP INDEX "WorkerDocument_status_idx";--> statement-breakpoint
DROP INDEX "WorkerDocument_type_idx";--> statement-breakpoint
DROP INDEX "WorkerDocument_workerId_idx";--> statement-breakpoint
DROP INDEX "WorkerDocument_workerId_status_idx";--> statement-breakpoint
DROP INDEX "WorkerDocument_workerId_type_idx";--> statement-breakpoint
DROP INDEX "TimeLog_organizationId_contactId_idx";--> statement-breakpoint
DROP INDEX "TimeLog_organizationId_subaccountId_idx";--> statement-breakpoint
DROP INDEX "TimeLog_organizationId_workerId_idx";--> statement-breakpoint
DROP INDEX "TimeLog_organizationId_workerId_startTime_idx";--> statement-breakpoint
DROP INDEX "TimeLog_subaccountId_idx";--> statement-breakpoint
DROP INDEX "TimeLog_workerId_status_idx";--> statement-breakpoint
DROP INDEX "ShiftSwapRequest_subaccountId_idx";--> statement-breakpoint
DROP INDEX "ShiftSwapRequest_targetWorkerId_idx";--> statement-breakpoint
DROP INDEX "WorkerAvailability_dayOfWeek_idx";--> statement-breakpoint
DROP INDEX "WorkerAvailability_organizationId_idx";--> statement-breakpoint
DROP INDEX "WorkerAvailability_workerId_dayOfWeek_isActive_idx";--> statement-breakpoint
DROP INDEX "WorkerAvailability_workerId_idx";--> statement-breakpoint
DROP INDEX "TimeOffRequest_subaccountId_idx";--> statement-breakpoint
DROP INDEX "TimeOffRequest_workerId_idx";--> statement-breakpoint
DROP INDEX "TimeOffRequest_workerId_status_idx";--> statement-breakpoint
DROP INDEX "OvertimeTracking_workerId_idx";--> statement-breakpoint
DROP INDEX "OvertimeTracking_workerId_weekStartDate_idx";--> statement-breakpoint
DROP INDEX "OvertimeTracking_workerId_weekStartDate_key";--> statement-breakpoint
DROP INDEX "Invoice_contactId_idx";--> statement-breakpoint
DROP INDEX "Invoice_organizationId_subaccountId_idx";--> statement-breakpoint
DROP INDEX "Invoice_subaccountId_idx";--> statement-breakpoint
DROP INDEX "PayrollRun_subaccountId_idx";--> statement-breakpoint
DROP INDEX "WorkerPayment_organizationId_idx";--> statement-breakpoint
DROP INDEX "WorkerPayment_paymentDate_idx";--> statement-breakpoint
DROP INDEX "WorkerPayment_paymentStatus_idx";--> statement-breakpoint
DROP INDEX "WorkerPayment_payrollRunId_idx";--> statement-breakpoint
DROP INDEX "WorkerPayment_periodStart_periodEnd_idx";--> statement-breakpoint
DROP INDEX "WorkerPayment_subaccountId_idx";--> statement-breakpoint
DROP INDEX "WorkerPayment_workerId_idx";--> statement-breakpoint
DROP INDEX "PayrollRunWorker_payrollRunId_idx";--> statement-breakpoint
DROP INDEX "PayrollRunWorker_payrollRunId_workerId_key";--> statement-breakpoint
DROP INDEX "PayrollRunWorker_workerId_idx";--> statement-breakpoint
DROP INDEX "Worker_email_idx";--> statement-breakpoint
DROP INDEX "Worker_organizationId_idx";--> statement-breakpoint
DROP INDEX "Worker_organizationId_subaccountId_idx";--> statement-breakpoint
DROP INDEX "Worker_phone_idx";--> statement-breakpoint
DROP INDEX "Worker_portalToken_idx";--> statement-breakpoint
DROP INDEX "Worker_portalToken_key";--> statement-breakpoint
DROP INDEX "Worker_sessionToken_idx";--> statement-breakpoint
DROP INDEX "Worker_sessionToken_key";--> statement-breakpoint
DROP INDEX "Worker_subaccountId_idx";--> statement-breakpoint
DROP INDEX "Worker_userId_idx";--> statement-breakpoint
DROP INDEX "Worker_userId_key";--> statement-breakpoint
DROP INDEX "Funnel_organizationId_subaccountId_idx";--> statement-breakpoint
DROP INDEX "Funnel_subaccountId_idx";--> statement-breakpoint
DROP INDEX "FunnelWebVital_subaccountId_timestamp_idx";--> statement-breakpoint
DROP INDEX "FunnelEvent_subaccountId_timestamp_idx";--> statement-breakpoint
DROP INDEX "FunnelSession_subaccountId_startedAt_idx";--> statement-breakpoint
DROP INDEX "Contact_organizationId_subaccountId_acquisitionStage_idx";--> statement-breakpoint
DROP INDEX "Contact_organizationId_subaccountId_idx";--> statement-breakpoint
DROP INDEX "Contact_portalToken_key";--> statement-breakpoint
DROP INDEX "Contact_subaccountId_email_idx";--> statement-breakpoint
DROP INDEX "EmailDomain_organizationId_subaccountId_idx";--> statement-breakpoint
DROP INDEX "EmailTemplate_organizationId_subaccountId_idx";--> statement-breakpoint
DROP INDEX "CampaignRecipient_campaignId_contactId_key";--> statement-breakpoint
DROP INDEX "CampaignRecipient_contactId_idx";--> statement-breakpoint
DROP INDEX "UnsubscribeToken_contactId_idx";--> statement-breakpoint
DROP INDEX "Campaign_organizationId_subaccountId_idx";--> statement-breakpoint
DROP INDEX "Booking_contactId_idx";--> statement-breakpoint
DROP INDEX "Booking_organizationId_subaccountId_idx";--> statement-breakpoint
DROP INDEX "CalComCredential_subaccountId_idx";--> statement-breakpoint
DROP INDEX "CalComCredential_subaccountId_key";--> statement-breakpoint
DROP INDEX "BookingEventType_organizationId_subaccountId_idx";--> statement-breakpoint
DROP INDEX "BookingAvailability_organizationId_subaccountId_idx";--> statement-breakpoint
DROP INDEX "BookingAvailability_subaccountId_idx";--> statement-breakpoint
DROP INDEX "BookingHoliday_organizationId_subaccountId_idx";--> statement-breakpoint
DROP INDEX "BookingHoliday_subaccountId_idx";--> statement-breakpoint
DROP INDEX "note_contactId_idx";--> statement-breakpoint
DROP INDEX "note_subaccountId_idx";--> statement-breakpoint
DROP INDEX "task_contactId_idx";--> statement-breakpoint
DROP INDEX "task_organizationId_subaccountId_idx";--> statement-breakpoint
ALTER TABLE "Invoice" ALTER COLUMN "paymentMethods" SET DEFAULT '{}'::"public"."PaymentMethod"[];--> statement-breakpoint
ALTER TABLE "Invoice" ALTER COLUMN "paymentMethods" SET DATA TYPE "public"."PaymentMethod"[] USING "paymentMethods"::"public"."PaymentMethod"[];--> statement-breakpoint
ALTER TABLE "StudioClass" ADD CONSTRAINT "StudioClass_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioClass" ADD CONSTRAINT "StudioClass_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "public"."Instructor"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioMembership" ADD CONSTRAINT "StudioMembership_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioMembership" ADD CONSTRAINT "StudioMembership_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Workflows" ADD CONSTRAINT "Workflows_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClassType" ADD CONSTRAINT "ClassType_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Room" ADD CONSTRAINT "Room_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClassCredit" ADD CONSTRAINT "ClassCredit_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClassWaitlist" ADD CONSTRAINT "ClassWaitlist_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "MembershipPlan" ADD CONSTRAINT "MembershipPlan_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AILog" ADD CONSTRAINT "AILog_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioPayment" ADD CONSTRAINT "StudioPayment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioPayment" ADD CONSTRAINT "StudioPayment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "InstructorPayout" ADD CONSTRAINT "InstructorPayout_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "InstructorPayout" ADD CONSTRAINT "InstructorPayout_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "public"."Instructor"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_purchasedByClientId_fkey" FOREIGN KEY ("purchasedByClientId") REFERENCES "public"."Client"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_redeemedByClientId_fkey" FOREIGN KEY ("redeemedByClientId") REFERENCES "public"."Client"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "MobileSession" ADD CONSTRAINT "MobileSession_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "InboxConversation" ADD CONSTRAINT "InboxConversation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "InboxConversation" ADD CONSTRAINT "InboxConversation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClientInstructor" ADD CONSTRAINT "ClientInstructor_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClientInstructor" ADD CONSTRAINT "ClientInstructor_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "public"."Instructor"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ExternalChannelIntegration" ADD CONSTRAINT "ExternalChannelIntegration_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClientHousehold" ADD CONSTRAINT "ClientHousehold_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClientHousehold" ADD CONSTRAINT "ClientHousehold_primaryContactId_fkey" FOREIGN KEY ("primaryContactId") REFERENCES "public"."Client"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClientHousehold" ADD CONSTRAINT "ClientHousehold_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClientHouseholdMember" ADD CONSTRAINT "ClientHouseholdMember_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClientHouseholdMember" ADD CONSTRAINT "ClientHouseholdMember_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "public"."ClientHousehold"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "InstructorSubstitutionRequest" ADD CONSTRAINT "InstructorSubstitutionRequest_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "InstructorSubstitutionRequest" ADD CONSTRAINT "InstructorSubstitutionRequest_originalInstructorId_fkey" FOREIGN KEY ("originalInstructorId") REFERENCES "public"."Instructor"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "InstructorSubstitutionRequest" ADD CONSTRAINT "InstructorSubstitutionRequest_substituteId_fkey" FOREIGN KEY ("substituteId") REFERENCES "public"."Instructor"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "DynamicPricingRule" ADD CONSTRAINT "DynamicPricingRule_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioPaymentPlan" ADD CONSTRAINT "StudioPaymentPlan_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "VideoOnDemandAsset" ADD CONSTRAINT "VideoOnDemandAsset_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "VideoOnDemandAsset" ADD CONSTRAINT "VideoOnDemandAsset_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "public"."Instructor"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AccessControlIntegration" ADD CONSTRAINT "AccessControlIntegration_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "PerformanceMetric" ADD CONSTRAINT "PerformanceMetric_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "PerformanceMetric" ADD CONSTRAINT "PerformanceMetric_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WorkoutProgram" ADD CONSTRAINT "WorkoutProgram_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WorkoutProgram" ADD CONSTRAINT "WorkoutProgram_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "public"."Instructor"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SoapNote" ADD CONSTRAINT "SoapNote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SoapNote" ADD CONSTRAINT "SoapNote_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SoapNote" ADD CONSTRAINT "SoapNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."Instructor"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AutomationEvent" ADD CONSTRAINT "AutomationEvent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AutomationEvent" ADD CONSTRAINT "AutomationEvent_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SmsMessage" ADD CONSTRAINT "SmsMessage_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WaiverTemplate" ADD CONSTRAINT "WaiverTemplate_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClassReminderConfig" ADD CONSTRAINT "ClassReminderConfig_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "RetentionAutomation" ADD CONSTRAINT "RetentionAutomation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "IntroOffer" ADD CONSTRAINT "IntroOffer_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_refereeClientId_fkey" FOREIGN KEY ("refereeClientId") REFERENCES "public"."Client"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerClientId_fkey" FOREIGN KEY ("referrerClientId") REFERENCES "public"."Client"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "LoyaltyBalance" ADD CONSTRAINT "LoyaltyBalance_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CancellationPolicy" ADD CONSTRAINT "CancellationPolicy_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Location" ADD CONSTRAINT "Location_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Location" ADD CONSTRAINT "Location_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BankTransferSettings" ADD CONSTRAINT "BankTransferSettings_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClientAssignee" ADD CONSTRAINT "ClientAssignee_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClientAssignee" ADD CONSTRAINT "ClientAssignee_locationMemberId_fkey" FOREIGN KEY ("locationMemberId") REFERENCES "public"."LocationMember"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "LocationMember" ADD CONSTRAINT "LocationMember_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "LocationMember" ADD CONSTRAINT "LocationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Pipeline" ADD CONSTRAINT "Pipeline_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "DealClient" ADD CONSTRAINT "DealClient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "DealClient" ADD CONSTRAINT "DealClient_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."Deal"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "DealMember" ADD CONSTRAINT "DealMember_locationMemberId_fkey" FOREIGN KEY ("locationMemberId") REFERENCES "public"."LocationMember"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Form" ADD CONSTRAINT "Form_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "GlobalStylePreset" ADD CONSTRAINT "GlobalStylePreset_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SmartSection" ADD CONSTRAINT "SmartSection_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "QRCode" ADD CONSTRAINT "QRCode_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Rota" ADD CONSTRAINT "Rota_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Rota" ADD CONSTRAINT "Rota_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Rota" ADD CONSTRAINT "Rota_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "public"."Instructor"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StripeConnection" ADD CONSTRAINT "StripeConnection_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioBooking" ADD CONSTRAINT "StudioBooking_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "LocationModule" ADD CONSTRAINT "LocationModule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "LocationModule" ADD CONSTRAINT "LocationModule_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "InstructorDocument" ADD CONSTRAINT "InstructorDocument_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "public"."Instructor"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "public"."Instructor"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ShiftSwapRequest" ADD CONSTRAINT "ShiftSwapRequest_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ShiftSwapRequest" ADD CONSTRAINT "ShiftSwapRequest_targetInstructorId_fkey" FOREIGN KEY ("targetInstructorId") REFERENCES "public"."Instructor"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ShiftSwapRequest" ADD CONSTRAINT "ShiftSwapRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "public"."Instructor"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "InstructorAvailability" ADD CONSTRAINT "InstructorAvailability_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "InstructorAvailability" ADD CONSTRAINT "InstructorAvailability_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "public"."Instructor"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "TimeOffRequest" ADD CONSTRAINT "TimeOffRequest_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "TimeOffRequest" ADD CONSTRAINT "TimeOffRequest_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "public"."Instructor"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "OvertimeTracking" ADD CONSTRAINT "OvertimeTracking_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "public"."Instructor"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "InstructorPayment" ADD CONSTRAINT "InstructorPayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "InstructorPayment" ADD CONSTRAINT "InstructorPayment_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "public"."PayrollRun"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "InstructorPayment" ADD CONSTRAINT "InstructorPayment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "InstructorPayment" ADD CONSTRAINT "InstructorPayment_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "public"."Instructor"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "PayrollRunInstructor" ADD CONSTRAINT "PayrollRunInstructor_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "public"."PayrollRun"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "PayrollRunInstructor" ADD CONSTRAINT "PayrollRunInstructor_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "public"."Instructor"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Instructor" ADD CONSTRAINT "Instructor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Instructor" ADD CONSTRAINT "Instructor_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Funnel" ADD CONSTRAINT "Funnel_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "FunnelEvent" ADD CONSTRAINT "FunnelEvent_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "FunnelSession" ADD CONSTRAINT "FunnelSession_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AdSpend" ADD CONSTRAINT "AdSpend_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AdPlatformCredential" ADD CONSTRAINT "AdPlatformCredential_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Client" ADD CONSTRAINT "Client_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Client" ADD CONSTRAINT "Client_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "EmailDomain" ADD CONSTRAINT "EmailDomain_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "UnsubscribeToken" ADD CONSTRAINT "UnsubscribeToken_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CalComCredential" ADD CONSTRAINT "CalComCredential_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BookingEventType" ADD CONSTRAINT "BookingEventType_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BookingAvailability" ADD CONSTRAINT "BookingAvailability_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BookingHoliday" ADD CONSTRAINT "BookingHoliday_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "note" ADD CONSTRAINT "note_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "StudioClass_locationId_idx" ON "StudioClass" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "StudioMembership_clientId_idx" ON "StudioMembership" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX "StudioMembership_locationId_idx" ON "StudioMembership" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "Workflows_locationId_idx" ON "Workflows" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "Credential_locationId_idx" ON "Credential" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "Execution_locationId_idx" ON "Execution" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "ClassType_locationId_idx" ON "ClassType" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "Room_locationId_idx" ON "Room" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "Webhook_locationId_idx" ON "Webhook" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "ClassCredit_clientId_idx" ON "ClassCredit" USING btree ("clientId");--> statement-breakpoint
CREATE UNIQUE INDEX "ClassWaitlist_classId_clientId_key" ON "ClassWaitlist" USING btree ("classId","clientId");--> statement-breakpoint
CREATE INDEX "ClassWaitlist_clientId_idx" ON "ClassWaitlist" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX "CheckIn_clientId_idx" ON "CheckIn" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX "CheckIn_locationId_idx" ON "CheckIn" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "MembershipPlan_locationId_idx" ON "MembershipPlan" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "StripeEvent_locationId_idx" ON "StripeEvent" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "AILog_locationId_idx" ON "AILog" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "StudioPayment_clientId_idx" ON "StudioPayment" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX "StudioPayment_locationId_idx" ON "StudioPayment" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "PromoCode_locationId_idx" ON "PromoCode" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "InstructorPayout_locationId_idx" ON "InstructorPayout" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "InstructorPayout_instructorId_idx" ON "InstructorPayout" USING btree ("instructorId");--> statement-breakpoint
CREATE INDEX "GiftCard_purchasedByClientId_idx" ON "GiftCard" USING btree ("purchasedByClientId");--> statement-breakpoint
CREATE INDEX "GiftCard_redeemedByClientId_idx" ON "GiftCard" USING btree ("redeemedByClientId");--> statement-breakpoint
CREATE INDEX "GiftCard_locationId_idx" ON "GiftCard" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "DeviceToken_clientId_idx" ON "DeviceToken" USING btree ("clientId");--> statement-breakpoint
CREATE UNIQUE INDEX "DeviceToken_clientId_token_key" ON "DeviceToken" USING btree ("clientId","token");--> statement-breakpoint
CREATE INDEX "MobileSession_clientId_idx" ON "MobileSession" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX "InboxConversation_clientId_idx" ON "InboxConversation" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX "InboxConversation_organizationId_locationId_isRead_idx" ON "InboxConversation" USING btree ("organizationId","locationId","isRead");--> statement-breakpoint
CREATE INDEX "InboxConversation_organizationId_locationId_status_idx" ON "InboxConversation" USING btree ("organizationId","locationId","status");--> statement-breakpoint
CREATE UNIQUE INDEX "ClientInstructor_clientId_instructorId_key" ON "ClientInstructor" USING btree ("clientId","instructorId");--> statement-breakpoint
CREATE UNIQUE INDEX "ExternalChannelIntegration_organizationId_locationId_prov_key" ON "ExternalChannelIntegration" USING btree ("organizationId","locationId","provider");--> statement-breakpoint
CREATE INDEX "ExternalChannelIntegration_locationId_idx" ON "ExternalChannelIntegration" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "ClientHousehold_organizationId_idx" ON "ClientHousehold" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "ClientHousehold_organizationId_locationId_idx" ON "ClientHousehold" USING btree ("organizationId","locationId");--> statement-breakpoint
CREATE INDEX "ClientHousehold_primaryContactId_idx" ON "ClientHousehold" USING btree ("primaryContactId");--> statement-breakpoint
CREATE INDEX "ClientHousehold_locationId_idx" ON "ClientHousehold" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "ClientHouseholdMember_clientId_idx" ON "ClientHouseholdMember" USING btree ("clientId");--> statement-breakpoint
CREATE UNIQUE INDEX "ClientHouseholdMember_householdId_clientId_key" ON "ClientHouseholdMember" USING btree ("householdId","clientId");--> statement-breakpoint
CREATE INDEX "ClientHouseholdMember_householdId_idx" ON "ClientHouseholdMember" USING btree ("householdId");--> statement-breakpoint
CREATE INDEX "InstructorSubstitutionRequest_locationId_idx" ON "InstructorSubstitutionRequest" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "DynamicPricingRule_locationId_idx" ON "DynamicPricingRule" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "StudioPaymentPlan_locationId_idx" ON "StudioPaymentPlan" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "VideoOnDemandAsset_locationId_idx" ON "VideoOnDemandAsset" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "AccessControlIntegration_locationId_idx" ON "AccessControlIntegration" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "PerformanceMetric_clientId_recordedAt_idx" ON "PerformanceMetric" USING btree ("clientId","recordedAt");--> statement-breakpoint
CREATE INDEX "PerformanceMetric_locationId_idx" ON "PerformanceMetric" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "WorkoutProgram_locationId_idx" ON "WorkoutProgram" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "SoapNote_clientId_createdAt_idx" ON "SoapNote" USING btree ("clientId","createdAt");--> statement-breakpoint
CREATE INDEX "SoapNote_locationId_idx" ON "SoapNote" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "MarketplaceListing_locationId_idx" ON "MarketplaceListing" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "AutomationEvent_clientId_idx" ON "AutomationEvent" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX "AutomationEvent_organizationId_locationId_occurredAt_idx" ON "AutomationEvent" USING btree ("organizationId","locationId","occurredAt");--> statement-breakpoint
CREATE INDEX "AutomationEvent_locationId_idx" ON "AutomationEvent" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "SmsMessage_clientId_idx" ON "SmsMessage" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX "SmsMessage_organizationId_locationId_idx" ON "SmsMessage" USING btree ("organizationId","locationId");--> statement-breakpoint
CREATE INDEX "WaiverTemplate_locationId_idx" ON "WaiverTemplate" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "WaiverSignature_clientId_idx" ON "WaiverSignature" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX "CancellationCharge_clientId_idx" ON "CancellationCharge" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX "RetentionAutomation_locationId_idx" ON "RetentionAutomation" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "BillingRule_organizationId_locationId_idx" ON "BillingRule" USING btree ("organizationId","locationId");--> statement-breakpoint
CREATE INDEX "BillingRule_locationId_idx" ON "BillingRule" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "IntroOffer_locationId_idx" ON "IntroOffer" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "IntroOfferRedemption_clientId_idx" ON "IntroOfferRedemption" USING btree ("clientId");--> statement-breakpoint
CREATE UNIQUE INDEX "IntroOfferRedemption_offerId_clientId_key" ON "IntroOfferRedemption" USING btree ("offerId","clientId");--> statement-breakpoint
CREATE INDEX "ChurnRiskScore_clientId_idx" ON "ChurnRiskScore" USING btree ("clientId");--> statement-breakpoint
CREATE UNIQUE INDEX "ChurnRiskScore_organizationId_clientId_key" ON "ChurnRiskScore" USING btree ("organizationId","clientId");--> statement-breakpoint
CREATE INDEX "Referral_refereeClientId_idx" ON "Referral" USING btree ("refereeClientId");--> statement-breakpoint
CREATE INDEX "Referral_referrerClientId_idx" ON "Referral" USING btree ("referrerClientId");--> statement-breakpoint
CREATE INDEX "LoyaltyBalance_clientId_idx" ON "LoyaltyBalance" USING btree ("clientId");--> statement-breakpoint
CREATE UNIQUE INDEX "LoyaltyBalance_organizationId_clientId_key" ON "LoyaltyBalance" USING btree ("organizationId","clientId");--> statement-breakpoint
CREATE INDEX "LoyaltyTransaction_organizationId_clientId_idx" ON "LoyaltyTransaction" USING btree ("organizationId","clientId");--> statement-breakpoint
CREATE INDEX "SpotBooking_clientId_idx" ON "SpotBooking" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX "PaymentIntegration_locationId_idx" ON "PaymentIntegration" USING btree ("locationId");--> statement-breakpoint
CREATE UNIQUE INDEX "PaymentIntegration_locationId_provider_key" ON "PaymentIntegration" USING btree ("locationId","provider");--> statement-breakpoint
CREATE INDEX "CancellationPolicy_locationId_idx" ON "CancellationPolicy" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "Location_organizationId_idx" ON "Location" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "Activity_organizationId_locationId_idx" ON "Activity" USING btree ("organizationId","locationId");--> statement-breakpoint
CREATE INDEX "Activity_locationId_idx" ON "Activity" USING btree ("locationId");--> statement-breakpoint
CREATE UNIQUE INDEX "BankTransferSettings_organizationId_locationId_key" ON "BankTransferSettings" USING btree ("organizationId","locationId");--> statement-breakpoint
CREATE INDEX "BankTransferSettings_locationId_idx" ON "BankTransferSettings" USING btree ("locationId");--> statement-breakpoint
CREATE UNIQUE INDEX "BankTransferSettings_locationId_key" ON "BankTransferSettings" USING btree ("locationId");--> statement-breakpoint
CREATE UNIQUE INDEX "ClientAssignee_clientId_locationMemberId_key" ON "ClientAssignee" USING btree ("clientId","locationMemberId");--> statement-breakpoint
CREATE UNIQUE INDEX "LocationMember_locationId_userId_key" ON "LocationMember" USING btree ("locationId","userId");--> statement-breakpoint
CREATE INDEX "Deal_organizationId_locationId_idx" ON "Deal" USING btree ("organizationId","locationId");--> statement-breakpoint
CREATE INDEX "Deal_locationId_pipelineStageId_idx" ON "Deal" USING btree ("locationId","pipelineStageId");--> statement-breakpoint
CREATE INDEX "Pipeline_organizationId_locationId_idx" ON "Pipeline" USING btree ("organizationId","locationId");--> statement-breakpoint
CREATE INDEX "Pipeline_locationId_isActive_idx" ON "Pipeline" USING btree ("locationId","isActive");--> statement-breakpoint
CREATE UNIQUE INDEX "DealClient_dealId_clientId_key" ON "DealClient" USING btree ("dealId","clientId");--> statement-breakpoint
CREATE UNIQUE INDEX "DealMember_dealId_locationMemberId_key" ON "DealMember" USING btree ("dealId","locationMemberId");--> statement-breakpoint
CREATE INDEX "Form_locationId_idx" ON "Form" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "GlobalStylePreset_locationId_idx" ON "GlobalStylePreset" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "FormSubmission_clientId_idx" ON "FormSubmission" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX "SmartSection_locationId_idx" ON "SmartSection" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "InvoiceTemplate_organizationId_locationId_idx" ON "InvoiceTemplate" USING btree ("organizationId","locationId");--> statement-breakpoint
CREATE INDEX "InvoiceTemplate_locationId_idx" ON "InvoiceTemplate" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "Notification_locationId_idx" ON "Notification" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "QRCode_organizationId_locationId_idx" ON "QRCode" USING btree ("organizationId","locationId");--> statement-breakpoint
CREATE INDEX "QRCode_locationId_idx" ON "QRCode" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "RecurringInvoice_locationId_idx" ON "RecurringInvoice" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "Rota_clientId_idx" ON "Rota" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX "Rota_organizationId_instructorId_startTime_idx" ON "Rota" USING btree ("organizationId","instructorId","startTime");--> statement-breakpoint
CREATE INDEX "Rota_organizationId_instructorId_status_idx" ON "Rota" USING btree ("organizationId","instructorId","status");--> statement-breakpoint
CREATE INDEX "Rota_locationId_idx" ON "Rota" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "Rota_instructorId_idx" ON "Rota" USING btree ("instructorId");--> statement-breakpoint
CREATE INDEX "Rota_instructorId_startTime_endTime_idx" ON "Rota" USING btree ("instructorId","startTime","endTime");--> statement-breakpoint
CREATE UNIQUE INDEX "StripeConnection_organizationId_locationId_key" ON "StripeConnection" USING btree ("organizationId","locationId");--> statement-breakpoint
CREATE INDEX "StripeConnection_locationId_idx" ON "StripeConnection" USING btree ("locationId");--> statement-breakpoint
CREATE UNIQUE INDEX "StripeConnection_locationId_key" ON "StripeConnection" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "StudioBooking_clientId_idx" ON "StudioBooking" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX "LocationModule_organizationId_enabled_idx" ON "LocationModule" USING btree ("organizationId","enabled");--> statement-breakpoint
CREATE UNIQUE INDEX "LocationModule_organizationId_moduleType_key" ON "LocationModule" USING btree ("organizationId","moduleType");--> statement-breakpoint
CREATE INDEX "LocationModule_locationId_enabled_idx" ON "LocationModule" USING btree ("locationId","enabled");--> statement-breakpoint
CREATE UNIQUE INDEX "LocationModule_locationId_moduleType_key" ON "LocationModule" USING btree ("locationId","moduleType");--> statement-breakpoint
CREATE INDEX "UserPresence_locationId_idx" ON "UserPresence" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "InstructorDocument_expiryDate_idx" ON "InstructorDocument" USING btree ("expiryDate");--> statement-breakpoint
CREATE INDEX "InstructorDocument_status_idx" ON "InstructorDocument" USING btree ("status");--> statement-breakpoint
CREATE INDEX "InstructorDocument_type_idx" ON "InstructorDocument" USING btree ("type");--> statement-breakpoint
CREATE INDEX "InstructorDocument_instructorId_idx" ON "InstructorDocument" USING btree ("instructorId");--> statement-breakpoint
CREATE INDEX "InstructorDocument_instructorId_status_idx" ON "InstructorDocument" USING btree ("instructorId","status");--> statement-breakpoint
CREATE INDEX "InstructorDocument_instructorId_type_idx" ON "InstructorDocument" USING btree ("instructorId","type");--> statement-breakpoint
CREATE INDEX "TimeLog_organizationId_clientId_idx" ON "TimeLog" USING btree ("organizationId","clientId");--> statement-breakpoint
CREATE INDEX "TimeLog_organizationId_locationId_idx" ON "TimeLog" USING btree ("organizationId","locationId");--> statement-breakpoint
CREATE INDEX "TimeLog_organizationId_instructorId_idx" ON "TimeLog" USING btree ("organizationId","instructorId");--> statement-breakpoint
CREATE INDEX "TimeLog_organizationId_instructorId_startTime_idx" ON "TimeLog" USING btree ("organizationId","instructorId","startTime");--> statement-breakpoint
CREATE INDEX "TimeLog_locationId_idx" ON "TimeLog" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "TimeLog_instructorId_status_idx" ON "TimeLog" USING btree ("instructorId","status");--> statement-breakpoint
CREATE INDEX "ShiftSwapRequest_locationId_idx" ON "ShiftSwapRequest" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "ShiftSwapRequest_targetInstructorId_idx" ON "ShiftSwapRequest" USING btree ("targetInstructorId");--> statement-breakpoint
CREATE INDEX "InstructorAvailability_dayOfWeek_idx" ON "InstructorAvailability" USING btree ("dayOfWeek");--> statement-breakpoint
CREATE INDEX "InstructorAvailability_organizationId_idx" ON "InstructorAvailability" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "InstructorAvailability_instructorId_dayOfWeek_isActive_idx" ON "InstructorAvailability" USING btree ("instructorId","dayOfWeek","isActive");--> statement-breakpoint
CREATE INDEX "InstructorAvailability_instructorId_idx" ON "InstructorAvailability" USING btree ("instructorId");--> statement-breakpoint
CREATE INDEX "TimeOffRequest_locationId_idx" ON "TimeOffRequest" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "TimeOffRequest_instructorId_idx" ON "TimeOffRequest" USING btree ("instructorId");--> statement-breakpoint
CREATE INDEX "TimeOffRequest_instructorId_status_idx" ON "TimeOffRequest" USING btree ("instructorId","status");--> statement-breakpoint
CREATE INDEX "OvertimeTracking_instructorId_idx" ON "OvertimeTracking" USING btree ("instructorId");--> statement-breakpoint
CREATE INDEX "OvertimeTracking_instructorId_weekStartDate_idx" ON "OvertimeTracking" USING btree ("instructorId","weekStartDate");--> statement-breakpoint
CREATE UNIQUE INDEX "OvertimeTracking_instructorId_weekStartDate_key" ON "OvertimeTracking" USING btree ("instructorId","weekStartDate");--> statement-breakpoint
CREATE INDEX "Invoice_clientId_idx" ON "Invoice" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX "Invoice_organizationId_locationId_idx" ON "Invoice" USING btree ("organizationId","locationId");--> statement-breakpoint
CREATE INDEX "Invoice_locationId_idx" ON "Invoice" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "PayrollRun_locationId_idx" ON "PayrollRun" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "InstructorPayment_organizationId_idx" ON "InstructorPayment" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "InstructorPayment_paymentDate_idx" ON "InstructorPayment" USING btree ("paymentDate");--> statement-breakpoint
CREATE INDEX "InstructorPayment_paymentStatus_idx" ON "InstructorPayment" USING btree ("paymentStatus");--> statement-breakpoint
CREATE INDEX "InstructorPayment_payrollRunId_idx" ON "InstructorPayment" USING btree ("payrollRunId");--> statement-breakpoint
CREATE INDEX "InstructorPayment_periodStart_periodEnd_idx" ON "InstructorPayment" USING btree ("periodStart","periodEnd");--> statement-breakpoint
CREATE INDEX "InstructorPayment_locationId_idx" ON "InstructorPayment" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "InstructorPayment_instructorId_idx" ON "InstructorPayment" USING btree ("instructorId");--> statement-breakpoint
CREATE INDEX "PayrollRunInstructor_payrollRunId_idx" ON "PayrollRunInstructor" USING btree ("payrollRunId");--> statement-breakpoint
CREATE UNIQUE INDEX "PayrollRunInstructor_payrollRunId_instructorId_key" ON "PayrollRunInstructor" USING btree ("payrollRunId","instructorId");--> statement-breakpoint
CREATE INDEX "PayrollRunInstructor_instructorId_idx" ON "PayrollRunInstructor" USING btree ("instructorId");--> statement-breakpoint
CREATE INDEX "Instructor_email_idx" ON "Instructor" USING btree ("email");--> statement-breakpoint
CREATE INDEX "Instructor_organizationId_idx" ON "Instructor" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "Instructor_organizationId_locationId_idx" ON "Instructor" USING btree ("organizationId","locationId");--> statement-breakpoint
CREATE INDEX "Instructor_phone_idx" ON "Instructor" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "Instructor_portalToken_idx" ON "Instructor" USING btree ("portalToken");--> statement-breakpoint
CREATE UNIQUE INDEX "Instructor_portalToken_key" ON "Instructor" USING btree ("portalToken");--> statement-breakpoint
CREATE INDEX "Instructor_sessionToken_idx" ON "Instructor" USING btree ("sessionToken");--> statement-breakpoint
CREATE UNIQUE INDEX "Instructor_sessionToken_key" ON "Instructor" USING btree ("sessionToken");--> statement-breakpoint
CREATE INDEX "Instructor_locationId_idx" ON "Instructor" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "Instructor_userId_idx" ON "Instructor" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "Instructor_userId_key" ON "Instructor" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "Funnel_organizationId_locationId_idx" ON "Funnel" USING btree ("organizationId","locationId");--> statement-breakpoint
CREATE INDEX "Funnel_locationId_idx" ON "Funnel" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "FunnelWebVital_locationId_timestamp_idx" ON "FunnelWebVital" USING btree ("locationId","timestamp");--> statement-breakpoint
CREATE INDEX "FunnelEvent_locationId_timestamp_idx" ON "FunnelEvent" USING btree ("locationId","timestamp");--> statement-breakpoint
CREATE INDEX "FunnelSession_locationId_startedAt_idx" ON "FunnelSession" USING btree ("locationId","startedAt");--> statement-breakpoint
CREATE INDEX "Client_organizationId_locationId_acquisitionStage_idx" ON "Client" USING btree ("organizationId","locationId","acquisitionStage");--> statement-breakpoint
CREATE INDEX "Client_organizationId_locationId_idx" ON "Client" USING btree ("organizationId","locationId");--> statement-breakpoint
CREATE UNIQUE INDEX "Client_portalToken_key" ON "Client" USING btree ("portalToken");--> statement-breakpoint
CREATE INDEX "Client_locationId_email_idx" ON "Client" USING btree ("locationId","email");--> statement-breakpoint
CREATE INDEX "EmailDomain_organizationId_locationId_idx" ON "EmailDomain" USING btree ("organizationId","locationId");--> statement-breakpoint
CREATE INDEX "EmailTemplate_organizationId_locationId_idx" ON "EmailTemplate" USING btree ("organizationId","locationId");--> statement-breakpoint
CREATE UNIQUE INDEX "CampaignRecipient_campaignId_clientId_key" ON "CampaignRecipient" USING btree ("campaignId","clientId");--> statement-breakpoint
CREATE INDEX "CampaignRecipient_clientId_idx" ON "CampaignRecipient" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX "UnsubscribeToken_clientId_idx" ON "UnsubscribeToken" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX "Campaign_organizationId_locationId_idx" ON "Campaign" USING btree ("organizationId","locationId");--> statement-breakpoint
CREATE INDEX "Booking_clientId_idx" ON "Booking" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX "Booking_organizationId_locationId_idx" ON "Booking" USING btree ("organizationId","locationId");--> statement-breakpoint
CREATE INDEX "CalComCredential_locationId_idx" ON "CalComCredential" USING btree ("locationId");--> statement-breakpoint
CREATE UNIQUE INDEX "CalComCredential_locationId_key" ON "CalComCredential" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "BookingEventType_organizationId_locationId_idx" ON "BookingEventType" USING btree ("organizationId","locationId");--> statement-breakpoint
CREATE INDEX "BookingAvailability_organizationId_locationId_idx" ON "BookingAvailability" USING btree ("organizationId","locationId");--> statement-breakpoint
CREATE INDEX "BookingAvailability_locationId_idx" ON "BookingAvailability" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "BookingHoliday_organizationId_locationId_idx" ON "BookingHoliday" USING btree ("organizationId","locationId");--> statement-breakpoint
CREATE INDEX "BookingHoliday_locationId_idx" ON "BookingHoliday" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "note_clientId_idx" ON "note" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX "note_locationId_idx" ON "note" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "task_clientId_idx" ON "task" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX "task_organizationId_locationId_idx" ON "task" USING btree ("organizationId","locationId");
