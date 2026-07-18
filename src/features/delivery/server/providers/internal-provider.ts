import "server-only";

import type { DeliveryProviderAdapter } from "@/features/delivery/server/providers/provider";

export const internalProviderAdapter: DeliveryProviderAdapter = {
  provider: "INTERNAL",
  channels: ["APP"],
  async send(request) {
    if (
      request.payload.channel !== "APP" ||
      request.sender.kind !== "INTERNAL"
    ) {
      return {
        kind: "terminal",
        code: "INVALID_INTERNAL_DELIVERY",
        message:
          "Internal delivery requires an app payload and internal sender",
      };
    }

    return {
      kind: "accepted",
      providerMessageId: `internal:${request.deliveryId}`,
      acceptedAt: new Date(),
    };
  },
};
