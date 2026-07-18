import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@/trpc/routers/_app";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type RecoveryStats = RouterOutputs["paymentRecovery"]["getStats"];
export type RecoveryCasePage = RouterOutputs["paymentRecovery"]["listCases"];
export type RecoveryCaseRow = RecoveryCasePage["items"][number];
export type RecoveryCaseDetail = RouterOutputs["paymentRecovery"]["getCase"];
export type RecoveryOwner =
  RouterOutputs["paymentRecovery"]["listOwners"][number];
