"use client";

import { NodeSelector } from "@/components/node-selector";
import { Button } from "@/components/ui/button";
import { memo, useState } from "react";

import { IconAddKeyframe as AddIcon } from "central-icons/IconAddKeyframe";

export const AddNodeButton = memo(
  ({ isBundle = false }: { isBundle?: boolean }) => {
    const [selectorOpen, setSelectorOpen] = useState(false);

    return (
      <NodeSelector
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        isBundle={isBundle}
      >
        <Button
          onClick={() => setSelectorOpen(true)}
          size="sm"
          variant="outline"
          className="h-9 gap-2 rounded-lg border border-black/10 bg-background px-3.5 text-xs shadow-sm hover:bg-primary-foreground/30 hover:text-primary dark:border-white/10"
        >
          <AddIcon className="size-4" />
          Add action
        </Button>
      </NodeSelector>
    );
  },
);

AddNodeButton.displayName = "AddNodeButton";
