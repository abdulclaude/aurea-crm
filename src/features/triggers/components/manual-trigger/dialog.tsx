"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ManualTriggerDialog: React.FC<Props> = ({
  open,
  onOpenChange,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="px-0">
        <DialogHeader className="px-8">
          <DialogTitle> Manual Trigger </DialogTitle>
          <DialogDescription>
            {" "}
            Configure settings for the manual trigger node.{" "}
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <div className="px-8">
          <p className="text-muted-foreground text-sm">
            {" "}
            Used to manually execute a workflow. No configuration needed.{" "}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
