import type { NodeExecutor } from "@/features/executions/types";
import { whatsappTriggerChannel } from "@/inngest/channels/whatsapp-trigger";

type WhatsAppTriggerData = Record<string, unknown>;

export const whatsappTriggerExecutor: NodeExecutor<
  WhatsAppTriggerData
> = async ({ nodeId, context, publish }) => {
  await publish(
    whatsappTriggerChannel().status({ nodeId, status: "success" })
  );
  return context;
};

