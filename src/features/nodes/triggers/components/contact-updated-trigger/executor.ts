import type { NodeExecutor } from "@/features/executions/types";
import { contactUpdatedTriggerChannel } from "@/inngest/channels/contact-updated-trigger";

export interface ContactUpdatedTriggerConfig {
  variableName?: string;
  watchFields?: string[]; // Optional: specific fields to watch
}

export const contactUpdatedTriggerExecutor: NodeExecutor<
  ContactUpdatedTriggerConfig
> = async ({ data, nodeId, context, publish }) => {
  await publish(
    contactUpdatedTriggerChannel().status({ nodeId, status: "loading" })
  );

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The updated contact data will be passed in through the context from the trigger
    // The context.triggerData should include both old and new contact data

    await publish(
      contactUpdatedTriggerChannel().status({ nodeId, status: "success" })
    );

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(
      contactUpdatedTriggerChannel().status({ nodeId, status: "error" })
    );
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "updatedContact";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
