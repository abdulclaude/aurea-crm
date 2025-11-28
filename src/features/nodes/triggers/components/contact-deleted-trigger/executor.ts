import type { NodeExecutor } from "@/features/executions/types";
import { contactDeletedTriggerChannel } from "@/inngest/channels/contact-deleted-trigger";

export interface ContactDeletedTriggerConfig {
  variableName?: string;
}

export const contactDeletedTriggerExecutor: NodeExecutor<
  ContactDeletedTriggerConfig
> = async ({ data, nodeId, context, publish }) => {
  await publish(
    contactDeletedTriggerChannel().status({ nodeId, status: "loading" })
  );

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The deleted contact data will be passed in through the context from the trigger
    // This is useful for cleanup workflows or archival purposes

    await publish(
      contactDeletedTriggerChannel().status({ nodeId, status: "success" })
    );

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(
      contactDeletedTriggerChannel().status({ nodeId, status: "error" })
    );
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "deletedContact";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
