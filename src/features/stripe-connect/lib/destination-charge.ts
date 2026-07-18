import type Stripe from "stripe";

export function assertExpressDestinationAccount(accountType: string): void {
  if (accountType !== "express") {
    throw new Error(
      "Stripe payments require an Express account. Migrate the legacy connection before taking payments.",
    );
  }
}

export function buildDestinationChargePaymentData(input: {
  destinationAccountId: string;
  metadata: Stripe.MetadataParam;
  applicationFeeAmount?: number;
}): Stripe.Checkout.SessionCreateParams.PaymentIntentData {
  if (
    input.applicationFeeAmount !== undefined &&
    (!Number.isInteger(input.applicationFeeAmount) ||
      input.applicationFeeAmount < 0)
  ) {
    throw new Error("Stripe application fee must be a non-negative integer");
  }

  return {
    metadata: input.metadata,
    transfer_data: { destination: input.destinationAccountId },
    ...(input.applicationFeeAmount
      ? { application_fee_amount: input.applicationFeeAmount }
      : {}),
  };
}
