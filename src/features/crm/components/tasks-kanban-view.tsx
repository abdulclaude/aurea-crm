"use client";

import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { format, isPast, isToday } from "date-fns";
import * as React from "react";
import { toast } from "sonner";
import { TaskStatus, TaskPriority } from "@/db/enums";
import { Plus } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type DragEndEvent,
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from "@/components/ui/shadcn-io/kanban";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";
import { cn } from "@/lib/utils";
import { TaskEditSheet } from "./task-edit-sheet";

type RouterOutput = inferRouterOutputs<AppRouter>;
type Task = RouterOutput["tasks"]["list"]["items"][number];

const COLUMNS = [
  {
    id: TaskStatus.TODO,
    name: "To do",
    color: "#64748b",
  },
  {
    id: TaskStatus.IN_PROGRESS,
    name: "In progress",
    color: "#3b82f6",
  },
  {
    id: TaskStatus.DONE,
    name: "Done",
    color: "#10b981",
  },
];

const PRIORITY_CONFIG = {
  [TaskPriority.LOW]: {
    label: "Low",
    color: "bg-slate-500",
    textColor: "text-slate-400",
  },
  [TaskPriority.MEDIUM]: {
    label: "Medium",
    color: "bg-blue-500",
    textColor: "text-blue-400",
  },
  [TaskPriority.HIGH]: {
    label: "High",
    color: "bg-amber-500",
    textColor: "text-amber-400",
  },
  [TaskPriority.URGENT]: {
    label: "Urgent",
    color: "bg-red-500",
    textColor: "text-red-400",
  },
};

export function TasksKanbanView() {
  const trpc = useTRPC();
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [createForStatus, setCreateForStatus] = React.useState<TaskStatus>(
    TaskStatus.TODO,
  );

  const { data: tasks, refetch } = useSuspenseQuery(
    trpc.tasks.list.queryOptions({
      status: [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE],
    }),
  );

  const { data: stats } = useSuspenseQuery(trpc.tasks.stats.queryOptions());

  const updateTask = useMutation(
    trpc.tasks.update.mutationOptions({
      onSuccess: async () => {
        await refetch();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to move task");
      },
    }),
  );

  // Transform tasks into kanban items
  type KanbanItem = {
    id: string;
    name: string;
    column: string;
    description: Task["description"];
    priority: Task["priority"];
    dueDate: Task["dueDate"];
    client: Task["client"];
    deal: Task["deal"];
    assignee: Task["assignee"];
    createdBy: Task["createdBy"];
  };

  const kanbanData = React.useMemo<KanbanItem[]>(
    () =>
      tasks.items.map((task) => ({
        id: task.id,
        name: task.title,
        column: task.status,
        description: task.description,
        priority: task.priority,
        dueDate: task.dueDate,
        client: task.client,
        deal: task.deal,
        assignee: task.assignee,
        createdBy: task.createdBy,
      })),
    [tasks.items],
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.items.find((t) => t.id === taskId);
    if (!task) return;

    // Determine target column
    const overTask = tasks.items.find((t) => t.id === over.id);
    const targetStatus = (overTask?.status ||
      (over.id as TaskStatus)) as TaskStatus;

    // Only update if the status actually changed
    if (task.status !== targetStatus) {
      const targetColumn = COLUMNS.find((c) => c.id === targetStatus);

      updateTask.mutate(
        {
          id: taskId,
          status: targetStatus,
        },
        {
          onSuccess: () => {
            toast.success(
              `Task moved to ${targetColumn?.name || "new status"}`,
            );
          },
        },
      );
    }
  };

  const handleCardClick = (taskId: string) => {
    const task = tasks.items.find((t) => t.id === taskId);
    if (task) {
      setEditingTask(task);
    }
  };

  const handleAddTask = (status: TaskStatus) => {
    setCreateForStatus(status);
    setIsCreateOpen(true);
  };

  const getColumnCount = (columnId: TaskStatus) => {
    switch (columnId) {
      case TaskStatus.TODO:
        return stats?.todo ?? 0;
      case TaskStatus.IN_PROGRESS:
        return stats?.inProgress ?? 0;
      case TaskStatus.DONE:
        return stats?.done ?? 0;
      default:
        return 0;
    }
  };

  return (
    <TooltipProvider>
      <KanbanProvider
        columns={COLUMNS}
        data={kanbanData}
        onDragEnd={handleDragEnd}
      >
        {(column) => (
          <KanbanBoard
            key={column.id}
            id={column.id}
            className="border-0 border-r border-black/5 dark:border-white/5 divide-black/5 dark:divide-white/5 bg-primary-foreground/30 dark:bg-[#202e32] text-primary shadow-none rounded-none"
          >
            <KanbanHeader className="text-primary px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="size-2 rounded-full"
                    style={{ backgroundColor: column.color }}
                  />
                  <span className="font-medium text-xs">{column.name}</span>
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-black/5 dark:bg-white/5 rounded-full px-1.5 py-0 text-primary/70"
                  >
                    {getColumnCount(column.id as TaskStatus)}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 text-primary/50 hover:text-primary hover:bg-black/5 dark:hover:bg-white/5"
                  onClick={() => handleAddTask(column.id as TaskStatus)}
                >
                  <Plus className="size-3.5" />
                </Button>
              </div>
            </KanbanHeader>

            <KanbanCards id={column.id} className="p-3 gap-2">
              {(item: KanbanItem) => (
                <KanbanCard
                  key={item.id}
                  {...item}
                  className="rounded-lg border border-black/5 dark:border-white/[0.08] bg-background dark:bg-[#1e2b30] p-3.5 shadow-sm cursor-grab"
                >
                    <div
                      className="space-y-2"
                      onClick={() => handleCardClick(item.id)}
                    >
                      {/* Title and Priority */}
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-medium text-primary line-clamp-2 flex-1">
                            {item.name}
                          </h4>
                          <div
                            className={cn(
                              "size-2 rounded-full shrink-0 mt-1.5",
                              PRIORITY_CONFIG[item.priority].color,
                            )}
                            title={PRIORITY_CONFIG[item.priority].label}
                          />
                        </div>
                        {item.description && (
                          <p className="text-xs text-primary/60 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Client or Deal */}
                      {(item.client || item.deal) && (
                        <div className="flex items-center gap-2 text-[10px] text-primary/60">
                          {item.client && (
                            <span className="truncate">
                              {item.client.name}
                            </span>
                          )}
                          {item.client && item.deal && <span>·</span>}
                          {item.deal && (
                            <span className="truncate text-emerald-600">
                              {item.deal.name}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Footer: Due Date and Assignee */}
                      <div className="flex items-center justify-between pt-2">
                        {item.dueDate ? (
                          <span
                            className={cn(
                              "text-[10px]",
                              isPast(new Date(item.dueDate)) &&
                                item.column !== TaskStatus.DONE
                                ? "text-red-600"
                                : isToday(new Date(item.dueDate))
                                  ? "text-amber-600"
                                  : "text-primary/60",
                            )}
                          >
                            {isPast(new Date(item.dueDate)) &&
                            item.column !== TaskStatus.DONE
                              ? "Overdue"
                              : isToday(new Date(item.dueDate))
                                ? "Due today"
                                : `Due ${format(new Date(item.dueDate), "MMM d")}`}
                          </span>
                        ) : (
                          <span className="text-[10px] text-primary/40">
                            No due date
                          </span>
                        )}

                        {item.assignee && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Avatar className="size-5 cursor-pointer">
                                {item.assignee.image ? (
                                  <AvatarImage
                                    src={item.assignee.image}
                                    alt={item.assignee.name ?? ""}
                                  />
                                ) : (
                                  <AvatarFallback className="bg-black/5 dark:bg-white/5 text-primary text-[10px]">
                                    {(
                                      item.assignee.name?.[0] ?? "U"
                                    ).toUpperCase()}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="bg-background border-black/5 dark:border-white/5 text-primary"
                            >
                              <p className="text-xs text-primary">
                                {item.assignee.name}
                              </p>
                              {item.assignee.email && (
                                <p className="text-[10px] text-primary/60">
                                  {item.assignee.email}
                                </p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </KanbanCard>
                )}
              </KanbanCards>
            </KanbanBoard>
          )}
        </KanbanProvider>

      {/* Edit Sheet */}
      <TaskEditSheet
        open={!!editingTask}
        onOpenChange={(open) => {
          if (!open) setEditingTask(null);
        }}
        task={editingTask}
      />

      {/* Create Sheet */}
      <TaskEditSheet
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        task={null}
      />
    </TooltipProvider>
  );
}
