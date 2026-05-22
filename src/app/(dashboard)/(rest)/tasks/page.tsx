"use client";

import { LoaderCircle, LayoutGrid, Table2, Plus } from "lucide-react";
import { Suspense, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageTabs } from "@/components/ui/page-tabs";
import { cn } from "@/lib/utils";

import { TasksKanbanView } from "@/features/crm/components/tasks-kanban-view";
import { TasksTable } from "@/features/crm/components/tasks-table";
import { TaskEditSheet } from "@/features/crm/components/task-edit-sheet";
import { ActivityTimeline } from "@/features/activity/components/activity-timeline";
import { useTRPC } from "@/trpc/client";

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState("board");
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const trpc = useTRPC();

  // Check if user is at studio level (no active location)
  const { data: active } = useSuspenseQuery(
    trpc.organizations.getActive.queryOptions()
  );

  const isStudioLevel = !active?.activeLocationId;

  // Define tabs based on context
  const tabs = isStudioLevel
    ? [
        { id: "board", label: "Task board" },
        { id: "studio-tasks", label: "Studio tasks" },
        { id: "locations-tasks", label: "All locations tasks" },
        { id: "activity", label: "Activity" },
      ]
    : [
        { id: "board", label: "Task board" },
        { id: "activity", label: "Activity" },
      ];

  const renderContent = () => {
    if (activeTab === "activity") {
      return (
        <div className="p-6">
          <ActivityTimeline limit={50} filterByEntityType="task" />
        </div>
      );
    }

    if (activeTab === "board" || activeTab === "studio-tasks") {
      return viewMode === "kanban" ? (
        <div className="flex-1 overflow-x-auto border-l border-b border-black/5 dark:border-white/5">
          <TasksKanbanView />
        </div>
      ) : (
        <TasksTable scope="agency" />
      );
    }

    if (activeTab === "locations-tasks") {
      return viewMode === "kanban" ? (
        <div className="flex-1 overflow-x-auto border-l border-b border-black/5 dark:border-white/5">
          <TasksKanbanView />
        </div>
      ) : (
        <TasksTable scope="all-clients" />
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex items-end justify-between gap-4 px-6 py-6">
        <div>
          <h1 className="text-lg font-semibold text-primary">
            Tasks
          </h1>
          <p className="text-xs text-primary/70">
            Manage your tasks and to-dos
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab !== "activity" && (
            <div className="flex rounded-md border border-black/5 dark:border-white/5 overflow-hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("kanban")}
                className={cn(
                  "px-2 rounded-none border-r border-black/5 dark:border-white/5 h-8",
                  viewMode === "kanban"
                    ? "bg-primary-foreground/50 dark:bg-white/10"
                    : "bg-background"
                )}
                aria-label="Kanban view"
              >
                <LayoutGrid className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("table")}
                className={cn(
                  "px-2 rounded-none h-8",
                  viewMode === "table"
                    ? "bg-primary-foreground/50 dark:bg-white/10"
                    : "bg-background"
                )}
                aria-label="Table view"
              >
                <Table2 className="size-3.5" />
              </Button>
            </div>
          )}

          <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="size-3.5 mr-1" />
            Add task
          </Button>
        </div>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <PageTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="px-6"
      />

      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center gap-3 text-sm text-primary/75">
            <LoaderCircle className="size-3.5 animate-spin" />
            Loading tasks...
          </div>
        }
      >
        {renderContent()}
      </Suspense>

      <TaskEditSheet
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        task={null}
      />
    </div>
  );
}
