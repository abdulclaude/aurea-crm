import "server-only";

import type { DeliveryProvider } from "@/features/delivery/contracts";
import { internalProviderAdapter } from "@/features/delivery/server/providers/internal-provider";
import type { DeliveryProviderAdapter } from "@/features/delivery/server/providers/provider";
import { resendProviderAdapter } from "@/features/delivery/server/providers/resend-provider";
import {
  messageBirdProviderAdapter,
  twilioProviderAdapter,
  vonageProviderAdapter,
} from "@/features/delivery/server/providers/sms-provider";

const PROVIDER_ADAPTERS = new Map<DeliveryProvider, DeliveryProviderAdapter>([
  ["RESEND", resendProviderAdapter],
  ["TWILIO", twilioProviderAdapter],
  ["VONAGE", vonageProviderAdapter],
  ["MESSAGEBIRD", messageBirdProviderAdapter],
  ["INTERNAL", internalProviderAdapter],
]);

export function getDeliveryProviderAdapter(
  provider: DeliveryProvider,
): DeliveryProviderAdapter | null {
  return PROVIDER_ADAPTERS.get(provider) ?? null;
}
