"use client";

import { memo, useMemo } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { MessageSquare } from "lucide-react";

import { useWorkflowContext } from "@/features/editor/store/workflow-context";
import { BaseExecutionNode } from "@/features/nodes/executions/base-execution-node";
import type { SendSmsConfig } from "@/features/nodes/studio/lib/studio-node-config";
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";
import { SendSmsDialog } from "./send-sms-dialog";
import { useStudioNodeSettings } from "./use-studio-node-settings";

type SendSmsNodeType = Node<Partial<SendSmsConfig>>;

export const SendSmsNode: React.FC<NodeProps<SendSmsNodeType>> = memo(
  (props) => {
    const settings = useStudioNodeSettings<SendSmsConfig>(props.id);
    const { getEdges, getNodes } = useReactFlow();
    const workflowContext = useWorkflowContext();

    const variables = useMemo(() => {
      if (!settings.open) return [];
      return buildNodeContext(props.id, getNodes(), getEdges(), {
        isBundle: workflowContext.isBundle,
        bundleInputs: workflowContext.bundleInputs,
        bundleWorkflowName: workflowContext.workflowName,
        parentWorkflowContext: workflowContext.parentWorkflowContext,
      });
    }, [getEdges, getNodes, props.id, settings.open, workflowContext]);

    return (
      <>
        <SendSmsDialog
          open={settings.open}
          onOpenChange={settings.setOpen}
          onSubmit={settings.save}
          defaultValues={props.data}
          variables={variables}
        />
        <BaseExecutionNode
          {...props}
          icon={MessageSquare}
          name="Send SMS"
          description={props.data.message || "Configure an SMS message"}
          onSettings={settings.openSettings}
          onDoubleClick={settings.openSettings}
        />
      </>
    );
  },
);

SendSmsNode.displayName = "SendSmsNode";
