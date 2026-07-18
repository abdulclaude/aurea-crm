"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Sheet,
  ResizableSheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ShieldAlert } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const StripeTriggerDialog: React.FC<Props> = ({
  open,
  onOpenChange,
}) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto border-border bg-background sm:max-w-xl">
        <SheetHeader className="px-6 pt-8 pb-1 gap-1">
          <SheetTitle>Legacy Stripe trigger</SheetTitle>
          <SheetDescription>
            This node is kept visible so existing workflows can still be
            inspected.
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-5" />

        <div className="space-y-5 px-6">
          <Alert className="border-amber-500/30 bg-amber-500/5 text-amber-100">
            <ShieldAlert />
            <AlertTitle>Trigger disabled</AlertTitle>
            <AlertDescription className="text-amber-100/80">
              The legacy endpoint did not verify Stripe signatures and no longer
              accepts events. Do not configure or reuse its old webhook URL.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Replace this node</h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Add one of Aurea&apos;s verified typed triggers: Payment
              Succeeded, Payment Failed, Subscription Created, Subscription
              Updated, or Subscription Cancelled. Then reconnect the following
              workflow steps to the new trigger.
            </p>
          </div>
        </div>
      </ResizableSheetContent>
    </Sheet>
  );
};
