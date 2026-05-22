"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isPast, isToday } from "date-fns";
import { Check, Circle, Clock, Plus, Trash2 } from "lucide-react";
import { TaskStatus, TaskPriority } from "@/db/enums";
import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useTRPC } from "@/trpc/client";
import { cn } from "@/lib/utils";
import { TaskEditSheet } from "./task-edit-sheet";

interface TasksPanelProps {
  clientId?: string;
  dealId?: string;
  className?: string;
}

const PRIORITY_CONFIG = {
  [TaskPriority.LOW]: { label: "Low", color: "bg-slate-500", borderColor: "border-slate-500/30" },
  [TaskPriority.MEDIUM]: { label: "Medium", color: "bg-blue-500", borderColor: "border-blue-500/30" },
  [TaskPriority.HIGH]: { label: "High", color: "bg-amber-500", borderColor: "border-amber-500/30" },
  [TaskPriority.URGENT]: { label: "Urgent", color: "bg-red-500", borderColor: "border-red-500/30" },
};

export const TasksPanel = ({
  clientId,
  dealId,
  className,
}: TasksPanelProps) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<any>(null);

  const listInput = clientId ? { clientId } : { dealId: dealId as string };

  const { data, isLoading } = useQuery(
    trpc.tasks.list.queryOptions(listInput)
  );

  const tasks = data?.items ?? [];

  const updateTask = useMutation(
    trpc.tasks.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.tasks.list.queryKey(listInput),
        });
      },
    })
  );

  const deleteTask = useMutation(
    trpc.tasks.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.tasks.list.queryKey(listInput),
        });
      },
    })
  );

  const handleToggleComplete = async (taskId: string, currentStatus: TaskStatus) => {
    const newStatus = currentStatus === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;
    await updateTask.mutateAsync({ id: taskId, status: newStatus });
  };

  const handleDelete = async (taskId: string) => {
    await deleteTask.mutateAsync({ id: taskId });
  };

  // Separate active and completed tasks
  const activeTasks = tasks.filter((t) => t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELLED);
  const completedTasks = tasks.filter((t) => t.status === TaskStatus.DONE);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Add Task Button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start text-white/60 hover:text-white border-dashed border-white/10"
        onClick={() => setIsCreateOpen(true)}
      >
        <Plus className="size-3.5 mr-2" />
        Add task
      </Button>

      {/* Loading State */}
      {isLoading && (
        <p className="text-xs text-primary/50 dark:text-white/40">
          Loading tasks...
        </p>
      )}

      {/* Empty State */}
      {!isLoading && tasks.length === 0 && (
        <p className="text-xs text-primary/50 dark:text-white/40">
          No tasks yet. Add one above.
        </p>
      )}

      {/* Active Tasks */}
      {activeTasks.length > 0 && (
        <div className="space-y-2">
          {activeTasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "rounded-xs border border-black/10 dark:border-white/5 bg-background/70 p-3 space-y-2 group",
                PRIORITY_CONFIG[task.priority].borderColor
              )}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={task.status === TaskStatus.DONE}
                  onCheckedChange={() => handleToggleComplete(task.id, task.status)}
                  className="mt-0.5 border-white/30 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                />
                <div className="flex-1 min-w-0">
                  <div
                    className="cursor-pointer"
                    onClick={() => setEditingTask(task)}
                  >
                    <p className="text-xs text-primary dark:text-white font-medium">
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-[10px] text-primary/50 dark:text-white/40 line-clamp-2 mt-0.5">
                        {task.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {/* Priority Badge */}
                    <span
                      className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded-full",
                        PRIORITY_CONFIG[task.priority].color,
                        "text-white"
                      )}
                    >
                      {PRIORITY_CONFIG[task.priority].label}
                    </span>

                    {/* Status Badge */}
                    {task.status === TaskStatus.IN_PROGRESS && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500 text-white flex items-center gap-1">
                        <Clock className="size-2.5" />
                        In Progress
                      </span>
                    )}

                    {/* Due Date */}
                    {task.dueDate && (
                      <span
                        className={cn(
                          "text-[10px] flex items-center gap-1",
                          isPast(new Date(task.dueDate)) && task.status !== TaskStatus.DONE
                            ? "text-red-400"
                            : isToday(new Date(task.dueDate))
                            ? "text-amber-400"
                            : "text-white/40"
                        )}
                      >
                        <Clock className="size-2.5" />
                        {isPast(new Date(task.dueDate)) && task.status !== TaskStatus.DONE
                          ? "Overdue"
                          : isToday(new Date(task.dueDate))
                          ? "Due today"
                          : format(new Date(task.dueDate), "MMM d")}
                      </span>
                    )}

                    {/* Assignee */}
                    {task.assignee && (
                      <div className="flex items-center gap-1">
                        <Avatar className="size-4">
                          {task.assignee.image ? (
                            <AvatarImage
                              src={task.assignee.image}
                              alt={task.assignee.name ?? ""}
                            />
                          ) : (
                            <AvatarFallback className="bg-[#202e32] text-white text-[8px]">
                              {(task.assignee.name?.[0] ?? "U").toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <span className="text-[10px] text-white/40 truncate max-w-[60px]">
                          {task.assignee.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Delete Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(task.id)}
                  className="size-6 text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={deleteTask.isPending}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-white/40 uppercase tracking-wider">
            Completed ({completedTasks.length})
          </p>
          {completedTasks.map((task) => (
            <div
              key={task.id}
              className="rounded-xs border border-black/10 dark:border-white/5 bg-background/50 p-3 opacity-60 group"
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked
                  onCheckedChange={() => handleToggleComplete(task.id, task.status)}
                  className="mt-0.5 border-emerald-500 bg-emerald-500 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-primary/60 dark:text-white/60 line-through">
                    {task.title}
                  </p>
                  {task.completedAt && (
                    <p className="text-[10px] text-white/30 mt-0.5">
                      Completed {format(new Date(task.completedAt), "MMM d, yyyy")}
                    </p>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(task.id)}
                  className="size-6 text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={deleteTask.isPending}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Sheet */}
      <TaskEditSheet
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        task={null}
        defaultClientId={clientId}
        defaultDealId={dealId}
      />

      {/* Edit Sheet */}
      <TaskEditSheet
        open={!!editingTask}
        onOpenChange={(open) => {
          if (!open) setEditingTask(null);
        }}
        task={editingTask}
        defaultClientId={clientId}
        defaultDealId={dealId}
      />
    </div>
  );
};
