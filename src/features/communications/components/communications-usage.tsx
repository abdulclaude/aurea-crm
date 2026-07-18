"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTRPC } from "@/trpc/client";

const RETRYABLE = new Set(["FAILED", "AMBIGUOUS", "RETRYABLE_FAILURE"]);

export function CommunicationsUsage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const overview = useQuery(trpc.communications.overview.queryOptions());
  const retry = useMutation(
    trpc.communications.retryOperation.mutationOptions({
      onSuccess: async () => {
        toast.success("Operation queued again");
        await queryClient.invalidateQueries({
          queryKey: trpc.communications.overview.queryKey(),
        });
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const replayWebhook = useMutation(
    trpc.communications.replayWebhookReceipt.mutationOptions({
      onSuccess: async () => {
        toast.success("Webhook queued for replay");
        await queryClient.invalidateQueries({
          queryKey: trpc.communications.overview.queryKey(),
        });
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  if (overview.isLoading) {
    return (
      <div role="status" aria-live="polite" className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        Loading usage
      </div>
    );
  }
  if (overview.isError || !overview.data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Usage could not be loaded</AlertTitle>
        <AlertDescription>
          Refresh the page or contact support if the problem continues.
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {overview.data.currentMonthUsage.length === 0 ? (
          <Metric label="Current month" value="No usage" />
        ) : null}
        {overview.data.currentMonthUsage.map((usage) => (
          <Metric
            key={`${usage.currency}:provider`}
            label={`Provider cost (${usage.currency})`}
            value={usage.providerCost}
          />
        ))}
        {overview.data.currentMonthUsage.map((usage) => (
          <Metric
            key={`${usage.currency}:customer`}
            label={`Customer charge (${usage.currency})`}
            value={usage.customerCharge}
          />
        ))}
      </div>
      <Separator />
      <div>
        <h2 className="text-sm font-medium">Provisioning operations</h2>
        <div className="mt-3">
          {overview.data.operations.length === 0 ? (
            <p className="text-xs text-muted-foreground">No operations</p>
          ) : null}
          {overview.data.operations.map((operation) => (
            <div
              key={operation.id}
              className="flex items-start justify-between gap-4 border-b py-3"
            >
              <div className="min-w-0">
                <p className="text-sm">
                  {operation.service.replaceAll("_", " ")}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {operation.lastErrorMessage ??
                    operation.operationType.toLowerCase()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {operation.status.replaceAll("_", " ").toLowerCase()}
                </Badge>
                {RETRYABLE.has(operation.status) ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Retry ${operation.service.toLowerCase().replaceAll("_", " ")} operation`}
                    onClick={() => retry.mutate({ id: operation.id })}
                    disabled={retry.isPending}
                  >
                    <RotateCcw />
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
      <Separator />
      <div>
        <h2 className="text-sm font-medium">Webhook recovery</h2>
        <div className="mt-3">
          {overview.data.webhookFailures.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No failed webhook receipts
            </p>
          ) : null}
          {overview.data.webhookFailures.map((receipt) => (
            <div
              key={receipt.id}
              className="flex items-start justify-between gap-4 border-b py-3"
            >
              <div className="min-w-0">
                <p className="text-sm">
                  {receipt.provider} {receipt.eventType.replaceAll("_", " ")}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {receipt.lastErrorMessage ??
                    receipt.lastErrorCode ??
                    "Processing failed"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {receipt.status.replaceAll("_", " ").toLowerCase()}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Replay ${receipt.provider} ${receipt.eventType} webhook`}
                  onClick={() => replayWebhook.mutate({ id: receipt.id })}
                  disabled={replayWebhook.isPending}
                >
                  <RotateCcw />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b pb-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
