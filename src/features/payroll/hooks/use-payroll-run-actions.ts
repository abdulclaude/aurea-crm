"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";

import type { PayrollRunHandlers } from "@/features/payroll/components/payroll-run-actions";
import { useTRPC } from "@/trpc/client";

export function usePayrollRunActions(onView: (id: string) => void): {
  handlers: PayrollRunHandlers;
  isMutating: boolean;
} {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const invalidate = React.useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: trpc.payroll.list.queryKey(),
      }),
    [queryClient, trpc.payroll.list],
  );
  const approve = useMutation(
    trpc.payroll.approve.mutationOptions({ onSuccess: invalidate }),
  );
  const process = useMutation(
    trpc.payroll.processPayments.mutationOptions({ onSuccess: invalidate }),
  );
  const markPaid = useMutation(
    trpc.payroll.bulkMarkCompleted.mutationOptions({ onSuccess: invalidate }),
  );
  const remove = useMutation(
    trpc.payroll.delete.mutationOptions({ onSuccess: invalidate }),
  );
  const handlers = React.useMemo<PayrollRunHandlers>(
    () => ({
      onApprove: (id) =>
        approve.mutate(
          { id },
          {
            onSuccess: () => toast.success("Payroll run approved"),
            onError: (error) => toast.error(error.message),
          },
        ),
      onDelete: (id) =>
        remove.mutate(
          { id },
          {
            onSuccess: () => toast.success("Payroll run deleted"),
            onError: (error) => toast.error(error.message),
          },
        ),
      onMarkPaid: (id) =>
        markPaid.mutate(
          { payrollRunId: id },
          {
            onSuccess: () => toast.success("Payments marked as completed"),
            onError: (error) => toast.error(error.message),
          },
        ),
      onProcess: (id) =>
        process.mutate(
          { id },
          {
            onSuccess: () => toast.success("Payments are being processed"),
            onError: (error) => toast.error(error.message),
          },
        ),
      onView,
    }),
    [approve, markPaid, onView, process, remove],
  );

  return {
    handlers,
    isMutating:
      approve.isPending ||
      process.isPending ||
      markPaid.isPending ||
      remove.isPending,
  };
}
