import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { stripeRefundPaymentChannel } from "@/inngest/channels/stripe-refund-payment";
import { decode } from "html-entities";

type StripeRefundPaymentData = {
  variableName?: string;
  paymentIntentId: string;
};

export const stripeRefundPaymentExecutor: NodeExecutor<StripeRefundPaymentData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(stripeRefundPaymentChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.paymentIntentId) {
      await publish(stripeRefundPaymentChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Stripe: Refund Payment error: paymentIntentId is required.");
    }

    // Compile fields with Handlebars
    const paymentIntentId = data.paymentIntentId ? decode(Handlebars.compile(data.paymentIntentId)(context)) : undefined;

    // TODO: Implement Stripe: Refund Payment logic here
    const result = await step.run("stripe-refund-payment", async () => {
      // Add implementation here
      throw new NonRetriableError("Stripe: Refund Payment: Not yet implemented");
    });

    await publish(stripeRefundPaymentChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(stripeRefundPaymentChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
