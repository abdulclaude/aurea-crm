import type { NodeExecutor } from "@/features/executions/types";
import { contactCreatedTriggerChannel } from "@/inngest/channels/contact-created-trigger";

export interface ContactCreatedTriggerConfig {
  variableName?: string;
}

export const contactCreatedTriggerExecutor: NodeExecutor<
  ContactCreatedTriggerConfig
> = async ({ data, nodeId, context, publish }) => {
  await publish(
    contactCreatedTriggerChannel().status({ nodeId, status: "loading" })
  );

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The contact data will be passed in through the context from the trigger
    // No need to fetch anything here - this is a passive trigger

    await publish(
      contactCreatedTriggerChannel().status({ nodeId, status: "success" })
    );

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(
      contactCreatedTriggerChannel().status({ nodeId, status: "error" })
    );
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "newContact";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
