import { forwardRef } from "react";
import { Handle, type HandleProps } from "@xyflow/react";

import { cn } from "@/lib/utils";

export type BaseHandleProps = HandleProps;

export const BaseHandle = forwardRef<HTMLDivElement, BaseHandleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <Handle
        ref={ref}
        className={cn("rounded-full bg-sky-500! transition", className)}
        {...props}
      >
        {children}
      </Handle>
    );
  }
);

BaseHandle.displayName = "BaseHandle";
