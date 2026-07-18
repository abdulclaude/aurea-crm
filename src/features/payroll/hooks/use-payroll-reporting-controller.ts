"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { endOfMonth, startOfMonth } from "date-fns";
import * as React from "react";
import { toast } from "sonner";

import { useTRPC } from "@/trpc/client";

export type PayrollReportingTab = "overview" | "runs";

export type PayrollPeriod = {
  start: Date;
  end: Date;
};

export type PayrollReportingController = {
  activeTab: PayrollReportingTab;
  createPayrollRun: () => void;
  isCreating: boolean;
  selectedPeriod: PayrollPeriod;
  setActiveTab: (tab: PayrollReportingTab) => void;
  setSelectedPeriod: (period: PayrollPeriod) => void;
};

export function usePayrollReportingController(): PayrollReportingController {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] =
    React.useState<PayrollReportingTab>("overview");
  const [selectedPeriod, setSelectedPeriod] = React.useState<PayrollPeriod>(
    () => {
      const now = new Date();
      return { start: startOfMonth(now), end: endOfMonth(now) };
    },
  );

  const createMutation = useMutation(
    trpc.payroll.create.mutationOptions({
      onSuccess: async () => {
        toast.success("Payroll run created successfully");
        await queryClient.invalidateQueries({
          queryKey: trpc.payroll.list.queryKey(),
        });
        setActiveTab("runs");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create payroll run");
      },
    }),
  );

  return {
    activeTab,
    createPayrollRun: () =>
      createMutation.mutate({
        periodStart: selectedPeriod.start,
        periodEnd: selectedPeriod.end,
        paymentDate: new Date(),
      }),
    isCreating: createMutation.isPending,
    selectedPeriod,
    setActiveTab,
    setSelectedPeriod,
  };
}
