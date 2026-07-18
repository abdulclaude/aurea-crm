"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTRPC } from "@/trpc/client";

const windowDaysSchema = z.enum(["7", "14", "30"]);
type WindowDays = z.infer<typeof windowDaysSchema>;

export function RequestReconciliationControl({
  canReconcile,
}: {
  canReconcile: boolean;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [windowDays, setWindowDays] = React.useState<WindowDays>("7");
  const mutation = useMutation(
    trpc.commerceReconciliation.requestRun.mutationOptions({
      onSuccess: (run) => {
        toast.success(
          run.created
            ? "Reconciliation queued"
            : "A reconciliation is already in progress",
        );
        queryClient.invalidateQueries({
          queryKey: trpc.commerceReconciliation.listRuns.queryKey(),
        });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  function requestRun() {
    const windowEnd = new Date();
    const windowStart = new Date(
      windowEnd.getTime() - Number(windowDays) * 24 * 60 * 60 * 1_000,
    );
    mutation.mutate({ windowStart, windowEnd });
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={windowDays}
        onValueChange={(value) => {
          const parsed = windowDaysSchema.safeParse(value);
          if (parsed.success) setWindowDays(parsed.data);
        }}
        disabled={!canReconcile || mutation.isPending}
      >
        <SelectTrigger size="sm" aria-label="Reconciliation window"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="7">Last 7 days</SelectItem>
          <SelectItem value="14">Last 14 days</SelectItem>
          <SelectItem value="30">Last 30 days</SelectItem>
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant="outline"
        disabled={!canReconcile || mutation.isPending}
        onClick={requestRun}
      >
        <RefreshCw className={mutation.isPending ? "animate-spin" : ""} />
        Run check
      </Button>
    </div>
  );
}
