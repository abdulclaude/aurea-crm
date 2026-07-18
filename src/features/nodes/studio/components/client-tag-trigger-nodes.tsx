"use client";

import { memo } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { Tag } from "lucide-react";

import { BaseTriggerNode } from "@/features/nodes/triggers/base-trigger-node";
import type { ClientTagTriggerConfig } from "@/features/nodes/studio/lib/studio-node-config";
import { ClientTagTriggerDialog } from "./client-tag-trigger-dialog";
import { useStudioNodeSettings } from "./use-studio-node-settings";

type ClientTagTriggerNodeType = Node<Partial<ClientTagTriggerConfig>>;

type ClientTagTriggerNodeProps = NodeProps<ClientTagTriggerNodeType> & {
  change: "added" | "removed";
};

function ClientTagTriggerNode({
  change,
  ...props
}: ClientTagTriggerNodeProps): React.ReactElement {
  const settings = useStudioNodeSettings<ClientTagTriggerConfig>(props.id);

  return (
    <>
      <ClientTagTriggerDialog
        open={settings.open}
        onOpenChange={settings.setOpen}
        onSubmit={settings.save}
        defaultValues={props.data}
        change={change}
      />
      <BaseTriggerNode
        {...props}
        icon={Tag}
        name={`Member tag ${change}`}
        description={
          props.data.tag
            ? `Tag: ${props.data.tag}`
            : `Runs when any member tag is ${change}`
        }
        onSettings={settings.openSettings}
        onDoubleClick={settings.openSettings}
      />
    </>
  );
}

export const ClientTagAddedTriggerNode: React.FC<
  NodeProps<ClientTagTriggerNodeType>
> = memo((props) => <ClientTagTriggerNode {...props} change="added" />);

ClientTagAddedTriggerNode.displayName = "ClientTagAddedTriggerNode";

export const ClientTagRemovedTriggerNode: React.FC<
  NodeProps<ClientTagTriggerNodeType>
> = memo((props) => <ClientTagTriggerNode {...props} change="removed" />);

ClientTagRemovedTriggerNode.displayName = "ClientTagRemovedTriggerNode";
