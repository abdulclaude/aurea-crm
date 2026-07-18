"use client";

import { TimerOff } from "lucide-react";
import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";

import { BaseTriggerNode } from "@/features/nodes/triggers/base-trigger-node";
import {
  ClientInactivityTriggerDialog,
  type ClientInactivityTriggerFormValues,
} from "./dialog";

type ClientInactivityNode = Node<Partial<ClientInactivityTriggerFormValues>>;

export const ClientInactivityTriggerNode: React.FC<
  NodeProps<ClientInactivityNode>
> = memo((props) => {
  const [open, setOpen] = useState(false);
  const { setNodes } = useReactFlow();
  return (
    <>
      <ClientInactivityTriggerDialog
        open={open}
        onOpenChange={setOpen}
        onSubmit={(values) =>
          setNodes((nodes) =>
            nodes.map((node) =>
              node.id === props.id
                ? { ...node, data: { ...node.data, ...values } }
                : node,
            ),
          )
        }
        defaultValues={{
          days: props.data?.days ?? 30,
          activityDimensions: props.data?.activityDimensions ?? [
            "CRM_INTERACTION",
            "CLASS_ATTENDANCE",
          ],
          variableName: props.data?.variableName ?? "inactivity",
        }}
      />
      <BaseTriggerNode
        {...props}
        icon={TimerOff}
        name="Client inactive"
        description={`${props.data?.days ?? 30} days without activity`}
        onSettings={() => setOpen(true)}
        onDoubleClick={() => setOpen(true)}
      />
    </>
  );
});
