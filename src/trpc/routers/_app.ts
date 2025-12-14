import { aiRouter } from "@/features/ai/server/routers";
import { logsRouter } from "@/features/ai/server/logs-router";
import { credentialsRouter } from "@/features/credentials/server/routers";
import { contactsRouter } from "@/features/crm/server/contacts-router";
import { dealsRouter } from "@/features/crm/server/deals-router";
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
import { workersRouter } from "@/features/workers/server/router";
import { activityRouter } from "@/features/activity/server/router";
import { analyticsRouter } from "@/features/analytics/server/analytics-router";
import { funnelsRouter } from "@/features/funnel-builder/server/funnels-router";
import { integrationsRouter } from "@/features/funnel-builder/server/integrations-router";
import { globalStylesRouter } from "@/features/global-styles/server/global-styles-router";
import { smartSectionsRouter } from "@/features/smart-sections/server/smart-sections-router";
import { formsRouter } from "@/features/forms-builder/server/forms-router";
import { mindbodyRouter } from "@/features/modules/pilates-studio/server/mindbody-router";
import { studioClassesRouter } from "@/features/modules/pilates-studio/server/classes-router";
import { invoicesRouter } from "@/features/invoicing/server/invoices-router";
import { recurringInvoicesRouter } from "@/features/invoicing/server/recurring-invoices-router";
import { invoiceAnalyticsRouter } from "@/features/invoicing/server/analytics-router";
import { bankTransferSettingsRouter } from "@/features/invoicing/server/bank-transfer-settings-router";
import { stripeConnectRouter } from "@/features/stripe-connect/server/router";
import { shiftSwapsRouter } from "@/features/shift-swaps/server/router";
import { availabilityRouter } from "@/features/availability/server/router";
import { payrollRouter } from "@/features/payroll/server/router";
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
  contacts: contactsRouter,
  deals: dealsRouter,
  pipelines: pipelinesRouter,
  users: usersRouter,
  notifications: notificationsRouter,
  timeTracking: timeTrackingRouter,
  rotas: rotasRouter,
  modules: modulesRouter,
  workers: workersRouter,
  activity: activityRouter,
  analytics: analyticsRouter,
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
});

// export type definition of API
export type AppRouter = typeof appRouter;
