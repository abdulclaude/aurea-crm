"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { GanttChart, LayoutGrid, List } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PipelineGanttView } from "@/features/crm/components/pipeline-gantt-view";
import { PipelineKanbanView } from "@/features/crm/components/pipeline-kanban-view";
import { PipelineListView } from "@/features/crm/components/pipeline-list-view";
import { useTRPC } from "@/trpc/client";

type ViewMode = "kanban" | "list" | "gantt";

export default function PipelineDetailPage() {
  const params = useParams<{ pipelineId: string }>();
  const router = useRouter();
  const trpc = useTRPC();
  const [viewMode, setViewMode] = React.useState<ViewMode>("kanban");

  const { data: pipeline } = useSuspenseQuery(
    trpc.pipelines.getById.queryOptions({ id: params.pipelineId })
  );

  const { data: pipelines } = useSuspenseQuery(
    trpc.pipelines.list.queryOptions()
  );

  const handlePipelineChange = (pipelineId: string) => {
    router.push(`/pipelines/${pipelineId}`);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 p-6 pb-4">
        <div className="flex items-center gap-4 flex-1">
          {/* Pipeline Switcher */}
          <Select
            value={params.pipelineId}
            onValueChange={handlePipelineChange}
          >
            <SelectTrigger className="w-[280px] bg-[#202e32] border-white/5 text-white text-sm">
              <SelectValue>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{pipeline.name}</span>
                  {pipeline.isDefault && (
                    <span className="text-[10px] uppercase bg-blue-500/20 text-blue-200 px-2 py-0.5 rounded-sm">
                      Default
                    </span>
                  )}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-[#202e32] border-white/5">
              {pipelines.items.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white">{p.name}</span>
                    {p.isDefault && (
                      <span className="text-[10px] uppercase bg-blue-500/20 text-blue-200 px-1.5 py-0.5 rounded-sm">
                        Default
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {pipeline.description && (
            <p className="text-xs text-white/50 max-w-md truncate">
              {pipeline.description}
            </p>
          )}
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-[#202e32] rounded-sm p-1 border border-white/5">
          <Button
            variant={viewMode === "kanban" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-3 text-xs rounded-md! hover:bg-[#202e32] hover:brightness-130 hover:text-white"
            onClick={() => setViewMode("kanban")}
          >
            <LayoutGrid className="size-3.5 mr-1.5" />
            Kanban
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-3 text-xs rounded-md! hover:bg-[#202e32] hover:brightness-130 hover:text-white"
            onClick={() => setViewMode("list")}
          >
            <List className="size-3.5 mr-1.5" />
            List
          </Button>
          <Button
            variant={viewMode === "gantt" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-3 text-xs rounded-md! hover:bg-[#202e32] hover:brightness-130 hover:text-white"
            onClick={() => setViewMode("gantt")}
          >
            <GanttChart className="size-3.5 mr-1.5" />
            Gantt
          </Button>
        </div>
      </div>

      {/* View Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "kanban" && (
          <PipelineKanbanView pipelineId={params.pipelineId} />
        )}
        {viewMode === "list" && (
          <PipelineListView pipelineId={params.pipelineId} />
        )}
        {viewMode === "gantt" && (
          <PipelineGanttView pipelineId={params.pipelineId} />
        )}
      </div>
    </div>
  );
}
