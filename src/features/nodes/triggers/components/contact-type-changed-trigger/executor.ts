import type { NodeExecutor } from "@/features/executions/types";
import { contactTypeChangedTriggerChannel } from "@/inngest/channels/contact-type-changed-trigger";

export interface ContactTypeChangedTriggerConfig {
  variableName?: string;
  fromType?: string; // Optional: trigger only when changing from this type
  toType?: string; // Optional: trigger only when changing to this type
}

export const contactTypeChangedTriggerExecutor: NodeExecutor<
  ContactTypeChangedTriggerConfig
> = async ({ data, nodeId, context, publish }) => {
  await publish(
    contactTypeChangedTriggerChannel().status({ nodeId, status: "loading" })
  );

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The type change data will be passed in through the context from the trigger
    // The context.triggerData should include oldType and newType

    await publish(
      contactTypeChangedTriggerChannel().status({ nodeId, status: "success" })
    );

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(
      contactTypeChangedTriggerChannel().status({ nodeId, status: "error" })
    );
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "contactTypeChange";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
