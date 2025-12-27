import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { stripeCreateInvoiceChannel } from "@/inngest/channels/stripe-create-invoice";
import { decode } from "html-entities";

type StripeCreateInvoiceData = {
  variableName?: string;
  customerId: string;
  amount: string;
};

export const stripeCreateInvoiceExecutor: NodeExecutor<StripeCreateInvoiceData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(stripeCreateInvoiceChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.customerId) {
      await publish(stripeCreateInvoiceChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Stripe: Create Invoice error: customerId is required.");
    }

    if (!data.amount) {
      await publish(stripeCreateInvoiceChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Stripe: Create Invoice error: amount is required.");
    }

    // Compile fields with Handlebars
    const customerId = data.customerId ? decode(Handlebars.compile(data.customerId)(context)) : undefined;
    const amount = data.amount ? decode(Handlebars.compile(data.amount)(context)) : undefined;

    // TODO: Implement Stripe: Create Invoice logic here
    const result = await step.run("stripe-create-invoice", async () => {
      // Add implementation here
      throw new NonRetriableError("Stripe: Create Invoice: Not yet implemented");
    });

    await publish(stripeCreateInvoiceChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(stripeCreateInvoiceChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
