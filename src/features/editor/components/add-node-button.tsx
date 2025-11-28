"use client";

import { NodeSelector } from "@/components/node-selector";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
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
          size="icon"
          variant="outline"
          className="bg-background gap-2 text-xs hover:bg-primary/5 hover:text-primary rounded-sm border border-black/15"
        >
          <AddIcon className="size-5" />
        </Button>
      </NodeSelector>
    );
  }
);

AddNodeButton.displayName = "AddNodeButton";
