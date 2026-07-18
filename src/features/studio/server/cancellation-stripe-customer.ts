import "server-only";

import type Stripe from "stripe";

export async function resolveCancellationPaymentMethod(
  stripe: Stripe,
  customerId: string,
): Promise<string | null> {
  const customer = await stripe.customers.retrieve(customerId, {
    expand: ["invoice_settings.default_payment_method"],
  });
  if (customer.deleted) return null;

  const configured = customer.invoice_settings.default_payment_method;
  if (typeof configured === "string") return configured;
  if (configured?.id) return configured.id;

  const methods = await stripe.paymentMethods.list({
    customer: customerId,
    type: "card",
    limit: 1,
  });
  return methods.data[0]?.id ?? null;
}
