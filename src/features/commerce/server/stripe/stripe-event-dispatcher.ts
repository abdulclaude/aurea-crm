import "server-only";

import { eq } from "drizzle-orm";

import { stripeEvent } from "@/db/schema";

import { processStripeInstructorConnectEvent } from "./stripe-connect-event-processor";
import { processStripePlatformEvent } from "./stripe-event-processor";
import {
  PermanentStripeEventError,
} from "./stripe-event-contract";
import type { StripeEventProcessor } from "./stripe-event-receipt";

export const processStripeEventByReceiptSource: StripeEventProcessor = async (
  input,
) => {
  const [receipt] = await input.tx
    .select({ source: stripeEvent.source })
    .from(stripeEvent)
    .where(eq(stripeEvent.id, input.receiptId))
    .limit(1);
  if (!receipt) {
    throw new PermanentStripeEventError(
      "RECEIPT_NOT_FOUND",
      "Stripe event receipt was not found for dispatch",
    );
  }
  return receipt.source === "STRIPE_CONNECT_INSTRUCTOR"
    ? processStripeInstructorConnectEvent(input)
    : processStripePlatformEvent(input);
};
