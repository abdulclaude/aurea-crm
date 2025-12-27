import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { executeWorkflowChannel } from "@/inngest/channels/execute-workflow";
import { decode } from "html-entities";

type ExecuteWorkflowData = {
  variableName?: string;
  workflowId: string;
};

export const executeWorkflowExecutor: NodeExecutor<ExecuteWorkflowData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(executeWorkflowChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.workflowId) {
      await publish(executeWorkflowChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Execute Workflow error: workflowId is required.");
    }

    // Compile fields with Handlebars
    const workflowId = data.workflowId ? decode(Handlebars.compile(data.workflowId)(context)) : undefined;

    // TODO: Implement Execute Workflow logic here
    const result = await step.run("execute-workflow", async () => {
      // Add implementation here
      throw new NonRetriableError("Execute Workflow: Not yet implemented");
    });

    await publish(executeWorkflowChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(executeWorkflowChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
