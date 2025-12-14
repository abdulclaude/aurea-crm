"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Calendar, Plus, CheckCircle, Clock, DollarSign, Users, TrendingUp } from "lucide-react";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageTabs } from "@/components/ui/page-tabs";
import { toast } from "sonner";
import { PayrollRunsTable } from "./payroll-runs-table";
import { PayrollWorkersTable } from "./payroll-workers-table";

function formatCurrency(amount: number | { toNumber?: () => number }): string {
  // Handle Prisma Decimal type
  if (typeof amount === 'object' && amount !== null && 'toNumber' in amount && typeof amount.toNumber === 'function') {
    return `£${amount.toNumber().toFixed(2)}`;
  }
  return `£${Number(amount).toFixed(2)}`;
}

export function PayrollDashboard() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return {
      start: startOfMonth(now),
      end: endOfMonth(now),
    };
  });

  const { data: payrollPreview } = useSuspenseQuery(
    trpc.payroll.calculatePayroll.queryOptions({
      periodStart: selectedPeriod.start,
      periodEnd: selectedPeriod.end,
    })
  );

  const createPayrollMutation = useMutation(
    trpc.payroll.create.mutationOptions({
      onSuccess: () => {
        toast.success("Payroll run created successfully");
        queryClient.invalidateQueries({ queryKey: [["payroll", "list"]] });
        setActiveTab("runs"); // Switch to runs tab
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create payroll run");
      },
    })
  );

  const handleCreatePayroll = () => {
    createPayrollMutation.mutate({
      periodStart: selectedPeriod.start,
      periodEnd: selectedPeriod.end,
      paymentDate: new Date(),
    });
  };

  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: JSON.stringify({
        start: startOfMonth(date).toISOString(),
        end: endOfMonth(date).toISOString(),
      }),
      label: format(date, "MMMM yyyy"),
    };
  });

  const tabs = [
    { id: "overview", label: "Period overview" },
    { id: "runs", label: "Payroll runs" },
  ];

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 p-6 pb-6">
        <div>
          <h2 className="text-lg font-semibold text-primary">Shift Tracking & Payroll</h2>
          <p className="text-xs text-primary/75 mt-1">
            Track approved hours and process payments
          </p>
        </div>
        <Button onClick={handleCreatePayroll} disabled={createPayrollMutation.isPending} size="sm">
          <Plus className="size-4 mr-2" />
          Create Payroll Run
        </Button>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <PageTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="px-6"
      />

      {activeTab === "overview" ? (
        <div className="p-6 pt-4 space-y-6">
          {/* Period Selector */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-primary">Preview Period Earnings</h3>
              <p className="text-xs text-primary/60 mt-1">
                Select a pay period to preview worker earnings before creating a payroll run
              </p>
            </div>
            <Select
              value={JSON.stringify({
                start: selectedPeriod.start.toISOString(),
                end: selectedPeriod.end.toISOString(),
              })}
              onValueChange={(value) => {
                const parsed = JSON.parse(value);
                setSelectedPeriod({
                  start: new Date(parsed.start),
                  end: new Date(parsed.end),
                });
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="size-4 text-blue-500" />
                  <span className="text-sm text-primary/60">Workers</span>
                </div>
                <div className="text-2xl font-bold">{payrollPreview?.summary.totalWorkers || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="size-4 text-sky-500" />
                  <span className="text-sm text-primary/60">Total Hours</span>
                </div>
                <div className="text-2xl font-bold">
                  {((payrollPreview?.summary.totalRegularHours || 0) + (payrollPreview?.summary.totalOvertimeHours || 0)).toFixed(1)}h
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="size-4 text-emerald-500" />
                  <span className="text-sm text-primary/60">Gross Pay</span>
                </div>
                <div className="text-2xl font-bold text-emerald-500">
                  {formatCurrency(payrollPreview?.summary.totalGrossPay || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="size-4 text-green-500" />
                  <span className="text-sm text-primary/60">Net Pay</span>
                </div>
                <div className="text-2xl font-bold text-green-500">
                  {formatCurrency(payrollPreview?.summary.totalNetPay || 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Workers Table */}
          {payrollPreview && payrollPreview.workers.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3">Workers in this period</h4>
              <PayrollWorkersTable workers={payrollPreview.workers} />
            </div>
          )}

          {payrollPreview && payrollPreview.workers.length === 0 && (
            <div className="text-center py-12 border border-dashed border-primary/20 rounded-lg">
              <Clock className="size-12 mx-auto text-primary/20 mb-4" />
              <p className="text-sm text-primary/60">No approved time logs in this period</p>
              <p className="text-xs text-primary/40 mt-1">
                Workers need approved time logs to appear in the payroll preview
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 pt-4">
          <PayrollRunsTable />
        </div>
      )}
    </div>
  );
}
