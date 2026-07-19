import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@/trpc/routers/_app";

export type WidgetListItem =
  inferRouterOutputs<AppRouter>["widgets"]["list"]["widgets"][number];
