import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@/trpc/routers/_app";

type RouterOutput = inferRouterOutputs<AppRouter>;

export type PromoCodeRow = RouterOutput["promoCodes"]["list"][number];
export type PromoRedemptionRow =
  RouterOutput["promoCodes"]["listRedemptions"][number];
export type PricingOptionNameMap = Map<string, string>;
