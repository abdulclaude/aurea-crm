"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useTRPC } from "@/trpc/client";

import { RecoveryCaseActions } from "./recovery-case-actions";
import { RecoveryCaseHistory } from "./recovery-case-history";
import { formatRecoveryDate, formatRecoveryMoney } from "./recovery-formatters";
import { RecoveryStatusBadge } from "./recovery-status-badge";

export function RecoveryCaseSheet(props: {
  caseId: string | null;
  canManage: boolean;
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const detail = useQuery({
    ...trpc.paymentRecovery.getCase.queryOptions({
      caseId: props.caseId ?? "",
    }),
    enabled: Boolean(props.caseId),
    retry: false,
  });
  const owners = useQuery({
    ...trpc.paymentRecovery.listOwners.queryOptions(),
    enabled: Boolean(props.caseId),
    retry: false,
  });
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: trpc.paymentRecovery.getCase.queryKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: trpc.paymentRecovery.listCases.queryKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: trpc.paymentRecovery.getStats.queryKey(),
      }),
    ]);
  };
  const mutationOptions = (message: string) => ({
    onSuccess: async () => {
      await refresh();
      toast.success(message);
    },
    onError: (error: { message: string }) =>
      toast.error("Recovery action failed", { description: error.message }),
  });
  const retry = useMutation(
    trpc.paymentRecovery.retryAction.mutationOptions(
      mutationOptions("Recovery action queued"),
    ),
  );
  const resend = useMutation(
    trpc.paymentRecovery.resend.mutationOptions(
      mutationOptions("Recovery message queued"),
    ),
  );
  const reassign = useMutation(
    trpc.paymentRecovery.reassign.mutationOptions(
      mutationOptions("Recovery owner updated"),
    ),
  );
  const cancel = useMutation(
    trpc.paymentRecovery.cancel.mutationOptions(
      mutationOptions("Recovery cancelled"),
    ),
  );
  const isPending =
    retry.isPending ||
    resend.isPending ||
    reassign.isPending ||
    cancel.isPending;

  return (
    <Sheet
      open={Boolean(props.caseId)}
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
    >
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader className="border-b p-5 pr-14">
          <SheetTitle>Recovery case</SheetTitle>
          <SheetDescription>
            Verified provider failures, scheduled actions, and operator history.
          </SheetDescription>
          <SheetClose asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-4 top-4"
              title="Close"
            >
              <X />
              <span className="sr-only">Close</span>
            </Button>
          </SheetClose>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {detail.isPending && (
            <p className="p-5 text-xs text-muted-foreground">
              Loading recovery case...
            </p>
          )}
          {detail.isError && (
            <p className="p-5 text-xs text-rose-600">{detail.error.message}</p>
          )}
          {detail.data && (
            <>
              <section className="space-y-4 border-b p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {detail.data.recoveryCase.clientName ??
                        "Unlinked customer"}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {detail.data.recoveryCase.clientEmail ??
                        detail.data.recoveryCase.caseKey}
                    </p>
                  </div>
                  <RecoveryStatusBadge
                    status={detail.data.recoveryCase.status}
                  />
                </div>
                <dl className="grid grid-cols-2 gap-4 text-xs">
                  <Fact
                    label="Amount"
                    value={formatRecoveryMoney(
                      detail.data.recoveryCase.amountMinor,
                      detail.data.recoveryCase.currency,
                      detail.data.recoveryCase.currencyExponent,
                    )}
                  />
                  <Fact
                    label="Target"
                    value={detail.data.recoveryCase.target.toLowerCase()}
                  />
                  <Fact
                    label="Opened"
                    value={formatRecoveryDate(
                      detail.data.recoveryCase.openedAt,
                    )}
                  />
                  <Fact
                    label="Next action"
                    value={formatRecoveryDate(
                      detail.data.recoveryCase.nextActionAt,
                    )}
                  />
                  <Fact
                    label="Provider"
                    value={detail.data.recoveryCase.provider ?? "-"}
                  />
                  <Fact
                    label="Account"
                    value={detail.data.recoveryCase.providerAccount ?? "-"}
                  />
                </dl>
                <div className="space-y-2">
                  <Label htmlFor="recovery-owner">Owner</Label>
                  <Select
                    value={detail.data.recoveryCase.ownerUserId ?? "unassigned"}
                    disabled={!props.canManage || isPending}
                    onValueChange={(ownerUserId) =>
                      reassign.mutate({
                        caseId: detail.data.recoveryCase.id,
                        ownerUserId:
                          ownerUserId === "unassigned" ? null : ownerUserId,
                      })
                    }
                  >
                    <SelectTrigger
                      id="recovery-owner"
                      className="w-full shadow-none"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {owners.data?.map((owner) => (
                        <SelectItem key={owner.id} value={owner.id}>
                          {owner.name} · {owner.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {detail.data.recoveryCase.lastErrorMessage && (
                  <div className="border-l-2 border-rose-500 pl-3 text-xs">
                    <p className="font-medium">
                      {detail.data.recoveryCase.lastErrorCode ??
                        "Payment failed"}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {detail.data.recoveryCase.lastErrorMessage}
                    </p>
                  </div>
                )}
                <RecoveryCaseActions
                  detail={detail.data}
                  canManage={props.canManage}
                  isPending={isPending}
                  onRetry={(actionId) =>
                    retry.mutate({
                      caseId: detail.data.recoveryCase.id,
                      actionId,
                    })
                  }
                  onResend={(channel) =>
                    resend.mutate({
                      caseId: detail.data.recoveryCase.id,
                      channel,
                    })
                  }
                  onCancel={() =>
                    cancel.mutate({ caseId: detail.data.recoveryCase.id })
                  }
                />
              </section>
              <RecoveryCaseHistory detail={detail.data} />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 capitalize">{value}</dd>
    </div>
  );
}
