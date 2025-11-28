import type { NodeExecutor } from "@/features/executions/types";
import { contactFieldChangedTriggerChannel } from "@/inngest/channels/contact-field-changed-trigger";

export interface ContactFieldChangedTriggerConfig {
  variableName?: string;
  fieldName?: string; // Specific field to watch
}

export const contactFieldChangedTriggerExecutor: NodeExecutor<
  ContactFieldChangedTriggerConfig
> = async ({ data, nodeId, context, publish }) => {
  await publish(
    contactFieldChangedTriggerChannel().status({ nodeId, status: "loading" })
  );

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The field change data will be passed in through the context from the trigger
    // The context.triggerData should include field name, old value, and new value

    await publish(
      contactFieldChangedTriggerChannel().status({ nodeId, status: "success" })
    );

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(
      contactFieldChangedTriggerChannel().status({ nodeId, status: "error" })
    );
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "contactChange";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
