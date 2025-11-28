"use client";

import {
  Sheet,
  ResizableSheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import type { VariableItem } from "@/components/tiptap/variable-suggestion";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variables: VariableItem[];
}

export const ManualTriggerDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  variables,
}) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto sm:max-w-xl bg-[#202e32] border-white/5">
        <SheetHeader className="px-6 pt-8 pb-1 gap-1">
          <SheetTitle> Manual Trigger </SheetTitle>
          <SheetDescription>
            {" "}
            Configure settings for the manual trigger node.{" "}
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-5 bg-white/5" />

        <div className="px-6">
          <p className="text-muted-foreground text-sm">
            {" "}
            Used to manually execute a workflow. No configuration needed.{" "}
          </p>
        </div>
      </ResizableSheetContent>
    </Sheet>
  );
};
