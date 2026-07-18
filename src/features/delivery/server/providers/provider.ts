import type {
  DeliveryChannel,
  DeliveryProvider,
} from "@/features/delivery/contracts";
import type {
  DeliveryPayload,
  DeliverySenderRef,
} from "@/features/delivery/lib/payload-schemas";

export type DeliveryDispatchRequest = {
  deliveryId: string;
  organizationId: string;
  locationId: string | null;
  idempotencyKey: string;
  purpose: import("@/features/delivery/contracts").DeliveryPurpose;
  providerAccountId: string | null;
  providerAccountRef: string;
  destination: string;
  sender: DeliverySenderRef;
  payload: DeliveryPayload;
};

export type DeliveryDispatchResult =
  | {
      kind: "accepted";
      providerMessageId: string;
      providerRequestId?: string;
      acceptedAt: Date;
    }
  | {
      kind: "retryable";
      code: string;
      message: string;
      retryAfter?: Date;
    }
  | {
      kind: "terminal";
      code: string;
      message: string;
    }
  | {
      kind: "ambiguous";
      code: string;
      message: string;
    };

export type DeliveryProviderAdapter = {
  provider: DeliveryProvider;
  channels: readonly DeliveryChannel[];
  send: (
    request: DeliveryDispatchRequest,
    signal: AbortSignal,
  ) => Promise<DeliveryDispatchResult>;
};
