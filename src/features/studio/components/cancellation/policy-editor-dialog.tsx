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
import { useTRPC } from "@/trpc/client";

import {
  PolicyFormFields,
  type CancellationPolicyFormState,
} from "./policy-form-fields";
import type { CancellationPolicy } from "./types";

const EMPTY_FORM: CancellationPolicyFormState = {
  name: "",
  lateCancelWindow: "12",
  noShowFeeAmount: "0.00",
  lateCancelFee: "0.00",
  currency: "GBP",
  deductCredits: true,
  creditsDeducted: "1",
  chargeCard: false,
  sendNotification: true,
  isDefault: false,
};

export function PolicyEditorDialog({
  policy,
  open,
  onOpenChange,
}: {
  policy: CancellationPolicy | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    setForm(
      policy
        ? {
            name: policy.name,
            lateCancelWindow: String(policy.lateCancelWindow),
            noShowFeeAmount: policy.noShowFeeAmount,
            lateCancelFee: policy.lateCancelFee,
            currency: policy.currency,
            deductCredits: policy.deductCredits,
            creditsDeducted: String(policy.creditsDeducted),
            chargeCard: policy.chargeCard,
            sendNotification: policy.sendNotification,
            isDefault: policy.isDefault,
          }
        : EMPTY_FORM,
    );
  }, [policy, open]);

  const closeAfterSave = async () => {
    await queryClient.invalidateQueries({
      queryKey: trpc.cancellationPolicy.list.queryKey(),
    });
    toast.success(
      policy ? "Cancellation policy updated" : "Cancellation policy created",
    );
    onOpenChange(false);
  };
  const createPolicy = useMutation(
    trpc.cancellationPolicy.create.mutationOptions({
      onSuccess: closeAfterSave,
      onError: (error) => toast.error(error.message),
    }),
  );
  const updatePolicy = useMutation(
    trpc.cancellationPolicy.update.mutationOptions({
      onSuccess: closeAfterSave,
      onError: (error) => toast.error(error.message),
    }),
  );
  const pending = createPolicy.isPending || updatePolicy.isPending;

  const save = () => {
    const values = {
      name: form.name,
      lateCancelWindow: Number(form.lateCancelWindow),
      noShowFeeAmount: form.noShowFeeAmount,
      lateCancelFee: form.lateCancelFee,
      currency: form.currency,
      deductCredits: form.deductCredits,
      creditsDeducted: Number(form.creditsDeducted),
      chargeCard: form.chargeCard,
      sendNotification: form.sendNotification,
      isDefault: form.isDefault,
    };
    if (policy) updatePolicy.mutate({ id: policy.id, ...values });
    else createPolicy.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {policy ? "Edit cancellation policy" : "New cancellation policy"}
          </DialogTitle>
          <DialogDescription>
            Fees and payment collection stay scoped to the active workspace.
          </DialogDescription>
        </DialogHeader>
        <PolicyFormFields value={form} onChange={setForm} />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button onClick={save} disabled={pending || !form.name.trim()}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            Save policy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
