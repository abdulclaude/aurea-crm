"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/client";

import type { CancellationChargeRow } from "./types";

export function WaiveChargeDialog({
  row,
  open,
  onOpenChange,
}: {
  row: CancellationChargeRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (open) setReason("");
  }, [open]);
  const waiver = useMutation(
    trpc.cancellationPolicy.waiveCharge.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.cancellationPolicy.getCharges.queryKey(),
        });
        toast.success("Cancellation fee waived");
        onOpenChange(false);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Waive cancellation fee</DialogTitle>
          <DialogDescription>
            Any credits deducted for {row?.clientName ?? "this member"} will be
            restored from their recorded allocations.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="waiver-reason">Reason</Label>
          <Textarea
            id="waiver-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Goodwill, studio error, or other reason"
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={waiver.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() =>
              row &&
              waiver.mutate({
                chargeId: row.charge.id,
                reason: reason.trim() || undefined,
              })
            }
            disabled={!row || waiver.isPending}
          >
            {waiver.isPending ? <Loader2 className="animate-spin" /> : null}
            Waive fee
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
