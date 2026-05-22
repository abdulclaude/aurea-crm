"use client";

import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { format, isPast, isToday } from "date-fns";
import { MoreHorizontal, Pencil, Trash, Check, Circle } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { TaskStatus, TaskPriority } from "@/db/enums";

import { DataTable } from "@/components/data-table/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";
import { cn } from "@/lib/utils";
import { TaskEditSheet } from "./task-edit-sheet";

type RouterOutput = inferRouterOutputs<AppRouter>;
type TaskRow = RouterOutput["tasks"]["list"]["items"][number];

interface TasksTableProps {
  scope?: "agency" | "all-clients";
}

const PRIORITY_CONFIG = {
  [TaskPriority.LOW]: { label: "Low", color: "bg-slate-500" },
  [TaskPriority.MEDIUM]: { label: "Medium", color: "bg-blue-500" },
  [TaskPriority.HIGH]: { label: "High", color: "bg-amber-500" },
  [TaskPriority.URGENT]: { label: "Urgent", color: "bg-red-500" },
};

const STATUS_CONFIG = {
  [TaskStatus.TODO]: { label: "To do", color: "bg-slate-500" },
  [TaskStatus.IN_PROGRESS]: { label: "In progress", color: "bg-blue-500" },
  [TaskStatus.DONE]: { label: "Done", color: "bg-emerald-500" },
  [TaskStatus.CANCELLED]: { label: "Cancelled", color: "bg-red-500" },
};

export function TasksTable({ scope = "agency" }: TasksTableProps) {
  const trpc = useTRPC();
  const [editingTask, setEditingTask] = React.useState<TaskRow | null>(null);

  const { data, refetch } = useSuspenseQuery(trpc.tasks.list.queryOptions({}));

  const updateTask = useMutation(
    trpc.tasks.update.mutationOptions({
      onSuccess: async () => {
        await refetch();
      },
    }),
  );

  const deleteTask = useMutation(
    trpc.tasks.delete.mutationOptions({
      onSuccess: async () => {
        await refetch();
        toast.success("Task deleted");
      },
    }),
  );

  const handleToggleComplete = async (task: TaskRow) => {
    const newStatus =
      task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;
    await updateTask.mutateAsync({ id: task.id, status: newStatus });
    toast.success(
      newStatus === TaskStatus.DONE ? "Task completed" : "Task reopened",
    );
  };

  const taskColumns: ColumnDef<TaskRow>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <div className="max-w-[25px] w-full">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="max-w-[25px] w-full">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "status",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleComplete(row.original);
          }}
        >
          {row.original.status === TaskStatus.DONE ? (
            <Check className="size-4 text-emerald-500" />
          ) : (
            <Circle className="size-4 text-white/30" />
          )}
        </Button>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "title",
      accessorKey: "title",
      header: "Task",
      meta: { label: "Task" },
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span
            className={cn(
              "text-xs font-medium",
              row.original.status === TaskStatus.DONE
                ? "text-primary/50 line-through"
                : "text-primary",
            )}
          >
            {row.original.title}
          </span>
          {row.original.description && (
            <span className="text-[11px] text-primary/50 line-clamp-1">
              {row.original.description}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "priority",
      header: "Priority",
      meta: { label: "Priority" },
      cell: ({ row }) => {
        const priority = row.original.priority;
        return (
          <Badge
            className={cn(
              "text-[10px] text-white",
              PRIORITY_CONFIG[priority].color,
            )}
          >
            {PRIORITY_CONFIG[priority].label}
          </Badge>
        );
      },
    },
    {
      id: "taskStatus",
      header: "Status",
      meta: { label: "Status" },
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <Badge variant="outline" className="text-[10px] border-white/10">
            <div
              className={cn(
                "size-1.5 rounded-full mr-1.5",
                STATUS_CONFIG[status].color,
              )}
            />
            {STATUS_CONFIG[status].label}
          </Badge>
        );
      },
    },
    {
      id: "dueDate",
      header: "Due Date",
      meta: { label: "Due Date" },
      cell: ({ row }) => {
        const dueDate = row.original.dueDate;
        if (!dueDate) {
          return <span className="text-xs text-primary/40">No due date</span>;
        }
        const date = new Date(dueDate);
        const isOverdue =
          isPast(date) && row.original.status !== TaskStatus.DONE;
        const isDueToday = isToday(date);

        return (
          <span
            className={cn(
              "text-xs",
              isOverdue
                ? "text-red-400"
                : isDueToday
                  ? "text-amber-400"
                  : "text-primary/75",
            )}
          >
            {isOverdue ? "Overdue - " : isDueToday ? "Today - " : ""}
            {format(date, "MMM d, yyyy")}
          </span>
        );
      },
    },
    {
      id: "client",
      header: "Member",
      meta: { label: "Member" },
      cell: ({ row }) => {
        const client = row.original.client;
        if (!client) {
          return <span className="text-xs text-primary/40">-</span>;
        }
        return (
          <div className="flex items-center gap-2">
            <Avatar className="size-5">
              {client.logo ? (
                <AvatarImage src={client.logo} alt={client.name ?? ""} />
              ) : (
                <AvatarFallback className="bg-[#202e32] text-white text-[10px]">
                  {(client.name?.[0] ?? "C").toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <span className="text-xs text-primary/75 truncate max-w-[100px]">
              {client.name}
            </span>
          </div>
        );
      },
    },
    {
      id: "deal",
      header: "Deal",
      meta: { label: "Deal" },
      cell: ({ row }) => {
        const deal = row.original.deal;
        if (!deal) {
          return <span className="text-xs text-primary/40">-</span>;
        }
        return (
          <span className="text-xs text-emerald-400 truncate max-w-[100px]">
            {deal.name}
          </span>
        );
      },
    },
    {
      id: "assignee",
      header: "Assignee",
      meta: { label: "Assignee" },
      cell: ({ row }) => {
        const assignee = row.original.assignee;
        if (!assignee) {
          return <span className="text-xs text-primary/40">Unassigned</span>;
        }
        return (
          <div className="flex items-center gap-2">
            <Avatar className="size-5">
              {assignee.image ? (
                <AvatarImage src={assignee.image} alt={assignee.name ?? ""} />
              ) : (
                <AvatarFallback className="bg-[#202e32] text-white text-[10px]">
                  {(assignee.name?.[0] ?? "U").toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <span className="text-xs text-primary/75 truncate max-w-[80px]">
              {assignee.name}
            </span>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="size-8 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setEditingTask(row.original);
              }}
            >
              <Pencil className="size-3.5 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleToggleComplete(row.original);
              }}
            >
              <Check className="size-3.5 mr-2" />
              {row.original.status === TaskStatus.DONE ? "Reopen" : "Complete"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-400"
              onClick={(e) => {
                e.stopPropagation();
                deleteTask.mutate({ id: row.original.id });
              }}
            >
              <Trash className="size-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];

  return (
    <>
      <DataTable
        columns={taskColumns}
        data={data.items}
        onRowClick={(row) => setEditingTask(row)}
      />

      <TaskEditSheet
        open={!!editingTask}
        onOpenChange={(open) => {
          if (!open) setEditingTask(null);
        }}
        task={editingTask}
      />
    </>
  );
}
