import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { stripeSendInvoiceChannel } from "@/inngest/channels/stripe-send-invoice";
import { decode } from "html-entities";

type StripeSendInvoiceData = {
  variableName?: string;
  invoiceId: string;
};

export const stripeSendInvoiceExecutor: NodeExecutor<StripeSendInvoiceData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(stripeSendInvoiceChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.invoiceId) {
      await publish(stripeSendInvoiceChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Stripe: Send Invoice error: invoiceId is required.");
    }

    // Compile fields with Handlebars
    const invoiceId = data.invoiceId ? decode(Handlebars.compile(data.invoiceId)(context)) : undefined;

    // TODO: Implement Stripe: Send Invoice logic here
    const result = await step.run("stripe-send-invoice", async () => {
      // Add implementation here
      throw new NonRetriableError("Stripe: Send Invoice: Not yet implemented");
    });

    await publish(stripeSendInvoiceChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(stripeSendInvoiceChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
