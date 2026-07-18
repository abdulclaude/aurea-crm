import Stripe from "stripe";

export type PermanentCancellationStripeFailure = {
  code: string;
  message: string;
};

export function classifyPermanentCancellationStripeError(
  error: unknown,
): PermanentCancellationStripeFailure | null {
  if (error instanceof Stripe.errors.StripeInvalidRequestError) {
    return {
      code: "STRIPE_REQUEST_INVALID",
      message:
        "Stripe rejected the payment request. Review the workspace payment configuration before retrying.",
    };
  }
  if (error instanceof Stripe.errors.StripeAuthenticationError) {
    return {
      code: "STRIPE_AUTHENTICATION_FAILED",
      message:
        "Stripe authentication is unavailable. Restore the platform connection before retrying.",
    };
  }
  if (error instanceof Stripe.errors.StripePermissionError) {
    return {
      code: "STRIPE_PERMISSION_DENIED",
      message:
        "Stripe denied this payment operation. Review the connected account before retrying.",
    };
  }
  if (error instanceof Stripe.errors.StripeIdempotencyError) {
    return {
      code: "STRIPE_IDEMPOTENCY_CONFLICT",
      message:
        "Stripe rejected the payment retry because its operation details changed.",
    };
  }
  return null;
}
