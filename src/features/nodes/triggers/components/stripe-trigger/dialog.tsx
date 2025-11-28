"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  ResizableSheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, CopyIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import type { VariableItem } from "@/components/tiptap/variable-suggestion";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variables: VariableItem[];
}

export const StripeTriggerDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  variables,
}) => {
  const params = useParams();
  const workflowId = params.workflowId as string;

  // construct the webhook url

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const webhookUrl = `${baseUrl}/api/webhooks/stripe?workflowId=${workflowId}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      toast.success("Webhook URL copied to clipboard.");
    } catch {
      toast.error("Failed to copy URL, please try again later.");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto sm:max-w-xl bg-[#202e32] border-white/5">
        <SheetHeader className="px-6 pt-8 pb-1 gap-1">
          <SheetTitle> Stripe Trigger </SheetTitle>
          <SheetDescription>
            Configure this Webhook URL in your Stripe Dashboard to trigger this
            workflow on payment events.
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-5 bg-white/5" />

        <div className="space-y-4 px-6">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Webhook URL</Label>

            <div className="flex gap-2">
              <Input
                id="webhook-url"
                value={webhookUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={copyToClipboard}
              >
                <CopyIcon className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-muted space-y-2 p-6 mx-6 mt-4">
          <h4 className="font-medium text-sm"> Setup instructions </h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li> Open your Stripe Dashboard </li>
            <li className="flex gap-1 items-center">
              {" "}
              Go to Developers <ChevronRight className="size-3" /> Webhooks{" "}
            </li>
            <li>
              {" "}
              Click{" "}
              <span className="text-white font-medium">
                'Add destination'
              </span>{" "}
            </li>
            <li>
              {" "}
              Select events to listen for (e.g. payment_intent.succeeded)
            </li>
            <li> Save and copy the signing secret </li>
          </ol>
        </div>

        <div className="rounded-lg bg-muted p-6 mx-6 mt-4 space-y-2">
          <h4 className="font-medium text-sm"> Available variables </h4>
          <ul className="text-sm text-muted-foreground space-y-6">
            <li className="flex flex-col gap-1">
              {" "}
              <code className="text-white rounded-sm  font-medium w-max">
                {"{{stripe.amount}}"}
              </code>{" "}
              <p>Payment amount</p>
            </li>

            <li className="flex flex-col gap-1">
              {" "}
              <code className="text-white rounded-sm  font-medium w-max">
                {"{{stripe.currency}}"}
              </code>{" "}
              <p>Payment currency</p>
            </li>

            <li className="flex flex-col gap-1">
              {" "}
              <code className="text-white rounded-sm  font-medium w-max">
                {"{{stripe.eventType}}"}
              </code>{" "}
              <p>Event type (e.g. payment_intent.succeeded)</p>
            </li>

            <li className="flex flex-col gap-1">
              {" "}
              <code className="text-white rounded-sm  font-medium w-max">
                {"{{stripe.customerId}}"}
              </code>{" "}
              <p>Customer ID</p>
            </li>

            <li className="flex flex-col gap-1">
              {" "}
              <code className="text-white rounded-sm  font-medium w-max">
                {"{{json stripe}}"}
              </code>{" "}
              <p> Full event data in JSON format </p>
            </li>
          </ul>
        </div>
      </ResizableSheetContent>
    </Sheet>
  );
};
