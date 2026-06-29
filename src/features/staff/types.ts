import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";

export type StaffRow = inferRouterOutputs<AppRouter>["staff"]["list"]["items"][number];
