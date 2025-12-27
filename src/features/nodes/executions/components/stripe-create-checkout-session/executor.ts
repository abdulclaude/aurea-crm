import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { stripeCreateCheckoutSessionChannel } from "@/inngest/channels/stripe-create-checkout-session";
import { decode } from "html-entities";

type StripeCreateCheckoutSessionData = {
  variableName?: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
};

export const stripeCreateCheckoutSessionExecutor: NodeExecutor<StripeCreateCheckoutSessionData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(stripeCreateCheckoutSessionChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.priceId) {
      await publish(stripeCreateCheckoutSessionChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Stripe: Create Checkout Session error: priceId is required.");
    }

    if (!data.successUrl) {
      await publish(stripeCreateCheckoutSessionChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Stripe: Create Checkout Session error: successUrl is required.");
    }

    if (!data.cancelUrl) {
      await publish(stripeCreateCheckoutSessionChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Stripe: Create Checkout Session error: cancelUrl is required.");
    }

    // Compile fields with Handlebars
    const priceId = data.priceId ? decode(Handlebars.compile(data.priceId)(context)) : undefined;
    const successUrl = data.successUrl ? decode(Handlebars.compile(data.successUrl)(context)) : undefined;
    const cancelUrl = data.cancelUrl ? decode(Handlebars.compile(data.cancelUrl)(context)) : undefined;

    // TODO: Implement Stripe: Create Checkout Session logic here
    const result = await step.run("stripe-create-checkout-session", async () => {
      // Add implementation here
      throw new NonRetriableError("Stripe: Create Checkout Session: Not yet implemented");
    });

    await publish(stripeCreateCheckoutSessionChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(stripeCreateCheckoutSessionChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
