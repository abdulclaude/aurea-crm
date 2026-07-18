import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@/trpc/routers/_app";

type RouterOutput = inferRouterOutputs<AppRouter>;

export type WorkflowTableRow =
  RouterOutput["workflows"]["getMany"]["items"][number];

export type WorkflowTableMode = "active" | "archived";
