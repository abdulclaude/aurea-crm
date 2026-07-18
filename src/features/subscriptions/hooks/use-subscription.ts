import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { areClientPlanRestrictionsDisabled } from "@/features/subscriptions/lib/plan-restrictions";

const subscriptionSchema = z
  .object({
    id: z.string().optional(),
    productId: z.string().optional(),
    status: z.string().optional(),
  })
  .passthrough();

const customerStateSchema = z
  .object({
    activeSubscriptions: z.array(subscriptionSchema).default([]),
  })
  .passthrough();

export const useSubscription = () => {
  const testingAccess = areClientPlanRestrictionsDisabled();
  return useQuery({
    queryKey: ["subscription", { testingAccess }],
    enabled: !testingAccess,
    queryFn: async () => {
      const response = await fetch("/api/auth/customer/state", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Subscription state could not be loaded.");
      }
      const data: unknown = await response.json();
      return customerStateSchema.parse(data);
    },
  });
};

export const useHasActiveSubscription = () => {
  const { data: customerState, isLoading, ...rest } = useSubscription();
  const testingAccess = areClientPlanRestrictionsDisabled();

  const hasActiveSubscription =
    testingAccess ||
    Boolean(
      customerState?.activeSubscriptions &&
        customerState.activeSubscriptions.length > 0,
    );

  return {
    hasActiveSubscription,
    subscription: customerState?.activeSubscriptions?.[0] ?? null,
    isLoading: testingAccess ? false : isLoading,
    ...rest,
  };
};
