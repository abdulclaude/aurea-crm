import type { NodeExecutor } from "@/features/executions/types";
import { birthdayTriggerChannel } from "@/inngest/channels/birthday-trigger";

export type BirthdayTriggerConfig = {
  variableName?: string;
};

export const birthdayTriggerExecutor: NodeExecutor<
  BirthdayTriggerConfig
> = async ({ data, nodeId, context, publish }) => {
  await publish(
    birthdayTriggerChannel().status({ nodeId, status: "loading" }),
  );

  try {
    const variableName = normalizeVariableName(data.variableName);

    await publish(
      birthdayTriggerChannel().status({ nodeId, status: "success" }),
    );

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(
      birthdayTriggerChannel().status({ nodeId, status: "error" }),
    );
    throw error;
  }
};

function normalizeVariableName(value?: string | null): string {
  const fallback = "birthday";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
