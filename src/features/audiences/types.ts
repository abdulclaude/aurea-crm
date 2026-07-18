import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@/trpc/routers/_app";

type RouterOutput = inferRouterOutputs<AppRouter>;

export type SavedAudienceRow = RouterOutput["savedAudiences"]["list"][number];
