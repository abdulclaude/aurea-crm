"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/client";

import { DeliveryStatusBadge } from "./delivery-status-badge";

function formatDate(value: Date | null): string {
  return value
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(value)
    : "-";
}

export function DeliveryDetailDialog({
  deliveryId,
  onOpenChange,
}: {
  deliveryId: string | null;
  onOpenChange: (open: boolean) => void;
}): React.JSX.Element {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [providerMessageId, setProviderMessageId] = useState("");
  const detail = useQuery({
    ...trpc.deliveryOperations.getDetail.queryOptions({
      id: deliveryId ?? "pending",
    }),
    enabled: Boolean(deliveryId),
  });
  const resolveUnknown = useMutation(
    trpc.deliveryOperations.resolveUnknownTwilio.mutationOptions({
      onSuccess: async () => {
        setProviderMessageId("");
        toast.success("Ambiguous delivery resolved");
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.deliveryOperations.getDetail.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.deliveryOperations.list.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.deliveryOperations.summary.queryKey(),
          }),
        ]);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <Dialog open={Boolean(deliveryId)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Delivery detail</DialogTitle>
          <DialogDescription>
            Provider acceptance and delivery are tracked as separate states.
          </DialogDescription>
        </DialogHeader>
        {detail.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : detail.error ? (
          <p className="text-sm text-destructive">
            Delivery detail could not be loaded. Refresh and try again.
          </p>
        ) : detail.data ? (
          <div className="space-y-5">
            <div className="grid gap-3 text-xs sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground">Status</p>
                <div className="mt-1">
                  <DeliveryStatusBadge status={detail.data.delivery.status} />
                </div>
              </div>
              <div>
                <p className="text-muted-foreground">Destination</p>
                <p className="mt-1 break-all font-medium">
                  {detail.data.delivery.destination}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Provider message</p>
                <p className="mt-1 break-all font-mono">
                  {detail.data.delivery.providerMessageId ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="mt-1">
                  {formatDate(detail.data.delivery.createdAt)}
                </p>
              </div>
            </div>
            {(detail.data.delivery.lastErrorCode ||
              detail.data.delivery.lastErrorMessage) && (
              <div className="border-y border-red-500/15 bg-red-500/5 px-4 py-3 text-xs">
                <p className="font-medium text-red-700 dark:text-red-300">
                  {detail.data.delivery.lastErrorCode ?? "Delivery error"}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {detail.data.delivery.lastErrorMessage ??
                    "No provider message was recorded."}
                </p>
              </div>
            )}
            {detail.data.delivery.status === "UNKNOWN" &&
            detail.data.delivery.provider === "TWILIO" &&
            detail.data.delivery.channel === "SMS" ? (
              <div className="space-y-3 border-y py-4">
                <div>
                  <h3 className="text-sm font-medium">Resolve ambiguous send</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Match the exact Twilio message, or retry only after confirming
                    that no provider message was created.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    aria-label="Twilio message SID"
                    placeholder="SM..."
                    value={providerMessageId}
                    onChange={(event) => setProviderMessageId(event.target.value)}
                  />
                  <Button
                    variant="outline"
                    disabled={
                      resolveUnknown.isPending ||
                      !/^SM[a-fA-F0-9]{32}$/.test(providerMessageId)
                    }
                    onClick={() =>
                      resolveUnknown.mutate({
                        id: detail.data.delivery.id,
                        resolution: "CORRELATE",
                        providerMessageId,
                      })
                    }
                  >
                    Match message
                  </Button>
                  <Button
                    variant="outline"
                    disabled={resolveUnknown.isPending}
                    onClick={() =>
                      resolveUnknown.mutate({
                        id: detail.data.delivery.id,
                        resolution: "NOT_CREATED",
                      })
                    }
                  >
                    Confirm not created and retry
                  </Button>
                </div>
              </div>
            ) : null}
            <Separator />
            <div>
              <h3 className="text-sm font-medium">Attempts</h3>
              <div className="mt-3 divide-y divide-black/5 border-y border-black/5 dark:divide-white/5 dark:border-white/5">
                {detail.data.attempts.length === 0 ? (
                  <p className="px-3 py-5 text-xs text-muted-foreground">
                    No provider attempt has started.
                  </p>
                ) : (
                  detail.data.attempts.map((attempt) => (
                    <div
                      key={attempt.id}
                      className="grid gap-2 px-3 py-3 text-xs sm:grid-cols-[5rem_8rem_1fr]"
                    >
                      <p className="font-medium">
                        Attempt {attempt.attemptNumber}
                      </p>
                      <p className="text-muted-foreground">
                        {attempt.outcome?.toLowerCase().replaceAll("_", " ") ??
                          "in progress"}
                      </p>
                      <div>
                        <p>
                          {attempt.errorCode ??
                            attempt.providerMessageId ??
                            "No provider detail"}
                        </p>
                        {attempt.errorMessage ? (
                          <p className="mt-1 text-muted-foreground">
                            {attempt.errorMessage}
                          </p>
                        ) : null}
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {formatDate(attempt.completedAt ?? attempt.startedAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
