import { aiRouter } from "@/features/ai/server/routers";
import { logsRouter } from "@/features/ai/server/logs-router";
import { credentialsRouter } from "@/features/credentials/server/routers";
import { clientsRouter } from "@/features/crm/server/clients-router";
import { dealsRouter } from "@/features/crm/server/deals-router";
import { notesRouter } from "@/features/crm/server/notes-router";
import { tasksRouter } from "@/features/crm/server/tasks-router";
import { pipelinesRouter } from "@/features/crm/server/pipelines-router";
import { executionsRouter } from "@/features/executions/server/routers";
import { appsRouter } from "@/features/apps/server/routers";
import { organizationsRouter } from "@/features/organizations/server/routers";
import { webhooksRouter } from "@/features/webhooks/server/routers";
import { workflowsRouter } from "@/features/workflows/server/routers";
import { usersRouter } from "@/features/users/server/routers";
import { notificationsRouter } from "@/features/notifications/server/routers";
import { timeTrackingRouter } from "@/features/time-tracking/server/router";
import { rotasRouter } from "@/features/rotas/server/router";
import { modulesRouter } from "@/features/modules/server/router";
import { instructorsRouter } from "@/features/instructors/server/router";
import { activityRouter } from "@/features/activity/server/router";
import { analyticsRouter } from "@/features/analytics/server/analytics-router";
import { adsRouter } from "@/features/analytics/server/ads-router";
import { funnelsRouter } from "@/features/funnel-builder/server/funnels-router";
import { integrationsRouter } from "@/features/funnel-builder/server/integrations-router";
import { globalStylesRouter } from "@/features/global-styles/server/global-styles-router";
import { smartSectionsRouter } from "@/features/smart-sections/server/smart-sections-router";
import { formsRouter } from "@/features/forms-builder/server/forms-router";
import { mindbodyRouter } from "@/features/modules/pilates-studio/server/mindbody-router";
import { studioClassesRouter } from "@/features/modules/pilates-studio/server/classes-router";
import { classTypesRouter } from "@/features/studio/server/class-types-router";
import { roomsRouter } from "@/features/studio/server/rooms-router";
import { serviceCatalogRouter } from "@/features/studio/server/service-catalog-router";
import { studioClassesEnhancedRouter } from "@/features/studio/server/classes-router";
import { studioBookingsRouter } from "@/features/studio/server/bookings-router";
import { waitlistRouter } from "@/features/studio/server/waitlist-router";
import { membershipPlansRouter } from "@/features/studio/server/membership-plans-router";
import { pricingOptionsRouter } from "@/features/studio/server/pricing-options-router";
import { subscriptionsRouter } from "@/features/studio/server/subscriptions-router";
import { checkinRouter } from "@/features/studio/server/checkin-router";
import { studioDashboardRouter } from "@/features/studio/server/studio-dashboard-router";
import { studioBillingRouter } from "@/features/studio/server/billing-router";
import { instructorConnectRouter } from "@/features/studio/server/instructor-connect-router";
import { promoCodesRouter } from "@/features/studio/server/promo-codes-router";
import { giftCardsRouter } from "@/features/studio/server/gift-cards-router";
import { productCatalogRouter } from "@/features/studio/server/product-catalog-router";
import { memberPortalRouter } from "@/features/studio/server/member-portal-router";
import { apiKeysRouter } from "@/features/studio/server/api-keys-router";
import { widgetsRouter } from "@/features/studio/server/widgets-router";
import { importRouter } from "@/features/studio/server/import-router";
import { invoicesRouter } from "@/features/invoicing/server/invoices-router";
import { recurringInvoicesRouter } from "@/features/invoicing/server/recurring-invoices-router";
import { invoiceAnalyticsRouter } from "@/features/invoicing/server/analytics-router";
import { bankTransferSettingsRouter } from "@/features/invoicing/server/bank-transfer-settings-router";
import { stripeConnectRouter } from "@/features/stripe-connect/server/router";
import { shiftSwapsRouter } from "@/features/shift-swaps/server/router";
import { availabilityRouter } from "@/features/availability/server/router";
import { payrollRouter } from "@/features/payroll/server/router";
import { externalFunnelsRouter } from "@/features/external-funnels/server/external-funnels-router";
import { webVitalsRouter } from "@/features/external-funnels/server/web-vitals-router";
import { emailDomainsRouter } from "@/features/email-domains/server/routers";
import { emailTemplatesRouter } from "@/features/email-templates/server/routers";
import { campaignsRouter } from "@/features/campaigns/server/routers";
import { bookingsRouter } from "@/features/bookings/server/bookings-router";
import { eventTypesRouter } from "@/features/bookings/server/event-types-router";
import { calComCredentialsRouter } from "@/features/bookings/server/calcom-credentials-router";
import { inboxRouter } from "@/features/inbox/server/router";
import { seedRouter } from "@/features/studio/server/seed-router";
import { launchpadRouter } from "@/features/studio/server/launchpad-router";
// Phase 6 — SMS, Waivers, Spots, Policies, Retention, Intro Offers, Reports, Revenue
import { smsRouter } from "@/features/sms/server/router";
import { waiversRouter } from "@/features/waivers/server/router";
import { spotBookingRouter } from "@/features/spot-booking/server/router";
import { cancellationPolicyRouter } from "@/features/cancellation-policy/server/router";
import { retentionRouter } from "@/features/retention/server/router";
import { introOffersRouter } from "@/features/intro-offers/server/router";
import { reportsRouter } from "@/features/reports/server/router";
import { revenueRouter } from "@/features/revenue/server/router";
// Phase 7 — Churn prediction, referrals, loyalty
import { churnRouter } from "@/features/churn/server/router";
import { referralsRouter } from "@/features/referrals/server/router";
import { loyaltyRouter } from "@/features/loyalty/server/router";
import { householdsRouter } from "@/features/households/server/router";
import { acquisitionRouter } from "@/features/acquisition/server/router";
import { instructorSubstitutionsRouter } from "@/features/instructor-substitutions/server/router";
import { studioAddOnsRouter } from "@/features/studio-add-ons/server/router";
import { staffRouter } from "@/features/staff/server/router";
import { createTRPCRouter } from "@/trpc/init";

export const appRouter = createTRPCRouter({
  ai: aiRouter,
  logs: logsRouter,
  workflows: workflowsRouter,
  credentials: credentialsRouter,
  executions: executionsRouter,
  organizations: organizationsRouter,
  apps: appsRouter,
  webhooks: webhooksRouter,
  clients: clientsRouter,
  deals: dealsRouter,
  notes: notesRouter,
  tasks: tasksRouter,
  pipelines: pipelinesRouter,
  users: usersRouter,
  notifications: notificationsRouter,
  timeTracking: timeTrackingRouter,
  rotas: rotasRouter,
  modules: modulesRouter,
  instructors: instructorsRouter,
  activity: activityRouter,
  analytics: analyticsRouter,
  ads: adsRouter,
  funnels: funnelsRouter,
  funnelIntegrations: integrationsRouter,
  globalStyles: globalStylesRouter,
  smartSections: smartSectionsRouter,
  forms: formsRouter,
  mindbody: mindbodyRouter,
  studioClasses: studioClassesRouter,
  invoices: invoicesRouter,
  recurringInvoices: recurringInvoicesRouter,
  invoiceAnalytics: invoiceAnalyticsRouter,
  bankTransferSettings: bankTransferSettingsRouter,
  stripeConnect: stripeConnectRouter,
  shiftSwaps: shiftSwapsRouter,
  availability: availabilityRouter,
  payroll: payrollRouter,
  externalFunnels: externalFunnelsRouter,
  webVitals: webVitalsRouter,
  emailDomains: emailDomainsRouter,
  emailTemplates: emailTemplatesRouter,
  campaigns: campaignsRouter,
  bookings: bookingsRouter,
  eventTypes: eventTypesRouter,
  calComCredentials: calComCredentialsRouter,
  // Studio (Phase 1)
  classTypes: classTypesRouter,
  serviceCatalog: serviceCatalogRouter,
  rooms: roomsRouter,
  studioClassesEnhanced: studioClassesEnhancedRouter,
  studioBookings: studioBookingsRouter,
  waitlist: waitlistRouter,
  membershipPlans: membershipPlansRouter,
  pricingOptions: pricingOptionsRouter,
  subscriptions: subscriptionsRouter,
  checkin: checkinRouter,
  studioDashboard: studioDashboardRouter,
  // Phase 2 — Billing, Connect & Promo Codes
  studioBilling: studioBillingRouter,
  instructorConnect: instructorConnectRouter,
  promoCodes: promoCodesRouter,
  // Phase 3 — Gift Cards & Member Portal
  giftCards: giftCardsRouter,
  productCatalog: productCatalogRouter,
  memberPortal: memberPortalRouter,
  // Phase 4 — Public API, Widgets & Import
  apiKeys: apiKeysRouter,
  widgets: widgetsRouter,
  studioImport: importRouter,
  // Inbox
  inbox: inboxRouter,
  // Seed data
  seed: seedRouter,
  launchpad: launchpadRouter,
  // Phase 6 — SMS, Waivers, Spots, Policies, Retention, Intro Offers, Reports, Revenue
  sms: smsRouter,
  waivers: waiversRouter,
  spotBooking: spotBookingRouter,
  cancellationPolicy: cancellationPolicyRouter,
  retention: retentionRouter,
  introOffers: introOffersRouter,
  reports: reportsRouter,
  revenue: revenueRouter,
  // Phase 7 — Churn, Referrals, Loyalty
  churn: churnRouter,
  referrals: referralsRouter,
  loyalty: loyaltyRouter,
  households: householdsRouter,
  acquisition: acquisitionRouter,
  instructorSubstitutions: instructorSubstitutionsRouter,
  studioAddOns: studioAddOnsRouter,
  staff: staffRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
