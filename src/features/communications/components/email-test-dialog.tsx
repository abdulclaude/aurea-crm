"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTRPC } from "@/trpc/client";

import type { SenderAddressRow } from "./sender-address-dialog";

const scenarios = [
  {
    value: "DELIVERED",
    label: "Delivered",
    detail: "Uses delivered@resend.dev to exercise the delivered webhook.",
  },
  {
    value: "BOUNCED",
    label: "Bounced",
    detail: "Uses bounced@resend.dev to exercise bounce handling.",
  },
  {
    value: "COMPLAINED",
    label: "Marked as spam",
    detail: "Uses complained@resend.dev to exercise complaint handling.",
  },
  {
    value: "SUPPRESSED",
    label: "Suppressed",
    detail: "Uses suppressed@resend.dev to exercise provider suppression.",
  },
  {
    value: "CUSTOM",
    label: "Custom recipient",
    detail: "Sends a real test message to the address you enter.",
  },
] as const;

type Scenario = (typeof scenarios)[number]["value"];

export function EmailTestDialog({
  sender,
  open,
  onOpenChange,
}: {
  sender: SenderAddressRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const trpc = useTRPC();
  const [scenario, setScenario] = React.useState<Scenario>("DELIVERED");
  const [recipient, setRecipient] = React.useState("");
  const send = useMutation(
    trpc.emailSettings.sendTest.mutationOptions({
      onSuccess: (result) => {
        toast.success(`Test queued for ${result.destination}`);
        onOpenChange(false);
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const selected = scenarios.find((item) => item.value === scenario);

  React.useEffect(() => {
    if (!open) return;
    setScenario("DELIVERED");
    setRecipient("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send a Resend test</DialogTitle>
          <DialogDescription>
            Send from {sender?.displayName} &lt;{sender?.email}&gt; using your
            saved email design.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="test-scenario">Test scenario</Label>
            <Select
              value={scenario}
              onValueChange={(value) => setScenario(value as Scenario)}
            >
              <SelectTrigger id="test-scenario" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {scenarios.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {scenario === "CUSTOM" ? (
            <div className="space-y-1.5">
              <Label htmlFor="test-recipient">Recipient</Label>
              <Input
                id="test-recipient"
                type="email"
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
                placeholder="you@example.com"
              />
            </div>
          ) : null}
          <Alert>
            <Send />
            <AlertTitle>{selected?.label}</AlertTitle>
            <AlertDescription>{selected?.detail}</AlertDescription>
          </Alert>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={
              send.isPending ||
              !sender ||
              (scenario === "CUSTOM" && !recipient.trim())
            }
            onClick={() =>
              sender &&
              send.mutate({
                senderAddressId: sender.id,
                scenario,
                recipient: scenario === "CUSTOM" ? recipient : null,
              })
            }
          >
            {send.isPending ? <Loader2 className="animate-spin" /> : <Send />}
            Queue test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
