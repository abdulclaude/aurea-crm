import { NodeProps } from "@xyflow/react";
import { memo } from "react";
import { BaseTriggerNode } from "../../base-trigger-node";
import { MousePointerIcon } from "lucide-react";

export const ManualTriggerNode: React.FC<NodeProps> = memo((props) => {
  return (
    <>
      <BaseTriggerNode
        {...props}
        icon={MousePointerIcon}
        name="When clicking 'Execute workflow'"
        // status={nodeStatus}
        // onSettings={handleOpenSettings}
        // onDoubleClick={handleOpenSettings}
      />
    </>
  );
});
