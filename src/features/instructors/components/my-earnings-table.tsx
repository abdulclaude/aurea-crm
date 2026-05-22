"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
} from "date-fns";
import {
  Banknote,
  Clock,
  Calendar,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
} from "lucide-react";
import * as React from "react";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTRPC } from "@/trpc/client";

interface EarningRow {
  id: string;
  className: string;
  date: Date;
  durationMinutes: number;
  earned: number;
}

const earningsColumns: ColumnDef<EarningRow>[] = [
  {
    id: "className",
    accessorKey: "className",
    header: "Class",
    meta: { label: "Class" },
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-xs font-medium text-primary">
        {row.original.className}
      </span>
    ),
  },
  {
    id: "date",
    accessorKey: "date",
    header: "Date",
    meta: { label: "Date" },
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-xs text-primary">
        {format(new Date(row.original.date), "EEE, MMM d · h:mm a")}
      </span>
    ),
  },
  {
    id: "duration",
    accessorKey: "durationMinutes",
    header: "Duration",
    meta: { label: "Duration" },
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-xs text-primary">
        {row.original.durationMinutes}min
      </span>
    ),
  },
  {
    id: "hours",
    header: "Hours",
    meta: { label: "Hours" },
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-xs text-primary">
        {(row.original.durationMinutes / 60).toFixed(1)}h
      </span>
    ),
  },
  {
    id: "earned",
    accessorKey: "earned",
    header: "Earned",
    meta: { label: "Earned" },
    enableSorting: false,
    cell: ({ row }) => {
      const formatted = new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
      }).format(row.original.earned);
      return (
        <span className="text-xs font-semibold text-emerald-600">
          {formatted}
        </span>
      );
    },
  },
];

export function MyEarningsTable() {
  const trpc = useTRPC();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = React.useState(now);

  const startDate = startOfMonth(selectedMonth);
  const endDate = endOfMonth(selectedMonth);

  const { data: earnings, isLoading } = useQuery(
    trpc.instructors.getMyEarnings.queryOptions({ startDate, endDate }),
  );

  const formatCurrency = React.useCallback(
    (amount: number) =>
      new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: earnings?.currency ?? "GBP",
      }).format(amount),
    [earnings?.currency],
  );

  const canGoNext =
    selectedMonth.getMonth() !== now.getMonth() ||
    selectedMonth.getFullYear() !== now.getFullYear();

  return (
    <div>
      {/* Month selector toolbar */}
      <div className="flex items-center justify-between px-6 py-4 pb-0">
        <div className="flex items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedMonth((m) => subMonths(m, 1))}
          >
            <ChevronLeft className="size-3" />
          </Button>
          <h2 className="text-sm font-medium text-primary min-w-[120px] text-center">
            {format(selectedMonth, "MMMM yyyy")}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedMonth((m) => addMonths(m, 1))}
            disabled={!canGoNext}
          >
            <ChevronRight className="size-3" />
          </Button>
          {(selectedMonth.getMonth() !== now.getMonth() ||
            selectedMonth.getFullYear() !== now.getFullYear()) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-primary/50"
              onClick={() => setSelectedMonth(now)}
            >
              Current month
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-3 py-16 text-sm text-primary/60">
          <LoaderCircle className="size-4 animate-spin" />
          Loading earnings...
        </div>
      ) : earnings ? (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-6">
            <Card>
              <CardContent>
                <p className="text-xl font-bold text-primary">
                  {formatCurrency(earnings.totalEarned)}
                </p>
                <p className="text-[11px] text-primary/60">Total earned</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <p className="text-xl font-bold text-primary">
                  {earnings.totalHours.toFixed(1)}h
                </p>
                <p className="text-[11px] text-primary/60">Hours taught</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <p className="text-xl font-bold text-primary">
                  {earnings.classCount}
                </p>
                <p className="text-[11px] text-primary/60">Classes completed</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <p className="text-xl font-bold text-primary">
                  {formatCurrency(earnings.hourlyRate)}
                </p>
                <p className="text-[11px] text-primary/60">Hourly rate</p>
              </CardContent>
            </Card>
          </div>

          {/* DataTable */}
          <div>
            <DataTable
              data={earnings.classes}
              columns={earningsColumns}
              isLoading={false}
              getRowId={(row) => row.id}
              emptyState={
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-xs text-primary/80 dark:text-white/50">
                  No completed classes this month.
                </div>
              }
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
