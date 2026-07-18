import { PermanentStripeEventError } from "./stripe-event-contract";
import {
  expandableId,
  type StripePaymentIntentObject,
} from "./stripe-object-contracts";

export function assertPaymentIntentDestination(input: {
  paymentIntent: StripePaymentIntentObject;
  providerAccountId: string | null;
}): void {
  const destination = expandableId(
    input.paymentIntent.transfer_data?.destination,
  );
  if (!input.providerAccountId || destination !== input.providerAccountId) {
    throw new PermanentStripeEventError(
      "PAYMENT_DESTINATION_MISMATCH",
      "Stripe payment destination does not match its commerce account binding",
    );
  }
}
