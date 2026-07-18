import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@/trpc/routers/_app";

type RouterOutput = inferRouterOutputs<AppRouter>;

export type CancellationPolicy =
  RouterOutput["cancellationPolicy"]["list"][number];
export type CancellationChargeRow =
  RouterOutput["cancellationPolicy"]["getCharges"]["items"][number];
export type CancellationChargeStatus =
  CancellationChargeRow["charge"]["status"];
