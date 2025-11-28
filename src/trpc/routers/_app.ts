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
import { modulesRouter } from "@/features/modules/server/router";
import { workersRouter } from "@/features/workers/server/router";
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
  modules: modulesRouter,
  workers: workersRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
