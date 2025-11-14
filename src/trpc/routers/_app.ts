import { createTRPCRouter } from "@/trpc/init";

import { workflowsRouter } from "@/features/workflows/server/routers";
import { credentialsRouter } from "@/features/credentials/server/routers";
import { executionsRouter } from "@/features/executions/server/routers";
import { organizationsRouter } from "@/features/organizations/server/routers";
import { integrationsRouter } from "@/features/integrations/server/routers";
import { webhooksRouter } from "@/features/webhooks/server/routers";

export const appRouter = createTRPCRouter({
  workflows: workflowsRouter,
  credentials: credentialsRouter,
  executions: executionsRouter,
  organizations: organizationsRouter,
  integrations: integrationsRouter,
  webhooks: webhooksRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
