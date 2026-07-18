import { prefetch, trpc } from "@/trpc/server";

export function prefetchApps() {
  return prefetch(trpc.apps.getMany.queryOptions());
}
