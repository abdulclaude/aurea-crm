"use client";

import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import {
  CheckCircle,
  Eye,
  MoreHorizontal,
  PlayCircle,
  ThumbsUp,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AppRouter } from "@/trpc/routers/_app";

export type PayrollRunRow =
  inferRouterOutputs<AppRouter>["payroll"]["list"]["payrollRuns"][number];

export type PayrollRunHandlers = {
  onApprove: (id: string) => void;
  onDelete: (id: string) => void;
  onMarkPaid: (id: string) => void;
  onProcess: (id: string) => void;
  onView: (id: string) => void;
};

export function PayrollRunActions({
  row,
  handlers,
  isLoading,
}: {
  row: PayrollRunRow;
  handlers: PayrollRunHandlers;
  isLoading: boolean;
}): React.JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={isLoading}
        >
          <MoreHorizontal className="size-4" />
          <span className="sr-only">
            Open actions for payroll run ending{" "}
            {format(new Date(row.periodEnd), "d MMM yyyy")}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handlers.onView(row.id)}>
          <Eye className="size-4" />
          View details
        </DropdownMenuItem>
        {row.status === "DRAFT" ? (
          <DropdownMenuItem onClick={() => handlers.onApprove(row.id)}>
            <ThumbsUp className="size-4" />
            Approve
          </DropdownMenuItem>
        ) : null}
        {row.status === "APPROVED" ? (
          <DropdownMenuItem onClick={() => handlers.onProcess(row.id)}>
            <PlayCircle className="size-4" />
            Process payments
          </DropdownMenuItem>
        ) : null}
        {row.status === "PROCESSING" ? (
          <DropdownMenuItem onClick={() => handlers.onMarkPaid(row.id)}>
            <CheckCircle className="size-4" />
            Mark all as paid
          </DropdownMenuItem>
        ) : null}
        {row.status === "DRAFT" ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-rose-600 focus:text-rose-600"
              onClick={() => handlers.onDelete(row.id)}
            >
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
