"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import * as React from "react";
import type {
  GanttFeature,
  GanttStatus,
} from "@/components/ui/shadcn-io/gantt";
import {
  GanttFeatureList,
  GanttFeatureRow,
  GanttHeader,
  GanttProvider,
  GanttSidebar,
  GanttSidebarGroup,
  GanttSidebarItem,
  GanttTimeline,
  GanttToday,
} from "@/components/ui/shadcn-io/gantt";
import { useTRPC } from "@/trpc/client";

type PipelineGanttViewProps = {
  pipelineId: string;
};

export function PipelineGanttView({ pipelineId }: PipelineGanttViewProps) {
  const trpc = useTRPC();

  const { data: pipeline } = useSuspenseQuery(
    trpc.pipelines.getById.queryOptions({ id: pipelineId })
  );

  const { data: deals } = useSuspenseQuery(
    trpc.deals.list.queryOptions({ pipelineId })
  );

  // Create status map from pipeline stages
  const statusMap = React.useMemo(() => {
    const map = new Map<string, GanttStatus>();
    for (const stage of pipeline.stages) {
      map.set(stage.id, {
        id: stage.id,
        name: stage.name,
        color: stage.color || "#ffffff",
      });
    }
    return map;
  }, [pipeline.stages]);

  // Transform deals into Gantt features
  const features = React.useMemo<GanttFeature[]>(() => {
    return deals.items
      .filter((deal) => deal.deadline !== null) // Only show deals with deadlines
      .map((deal) => {
        const status: GanttStatus =
          statusMap.get(deal.pipelineStageId || "") ||
          statusMap.values().next().value ||
          ({ id: "default", name: "Not Started", label: "Not Started", color: "#6b7280" } as GanttStatus);
        const startAt = deal.createdAt;
        const endAt = deal.deadline || new Date();

        return {
          id: deal.id,
          name: deal.name,
          startAt: new Date(startAt),
          endAt: new Date(endAt),
          status,
        };
      });
  }, [deals.items, statusMap]);

  // Group features by stage
  const featuresByStage = React.useMemo(() => {
    const grouped = new Map<string, GanttFeature[]>();

    for (const stage of pipeline.stages) {
      const stageFeatures = features.filter((f) => f.status.id === stage.id);
      if (stageFeatures.length > 0) {
        grouped.set(stage.id, stageFeatures);
      }
    }

    return grouped;
  }, [features, pipeline.stages]);

  // Scroll to earliest deal on mount
  React.useEffect(() => {
    if (features.length === 0) return;

    // Find the earliest deal
    const earliestFeature = features.reduce((earliest, current) =>
      current.startAt < earliest.startAt ? current : earliest
    );

    // Wait for DOM to be ready, then click the first sidebar item to scroll to it
    const timer = setTimeout(() => {
      const sidebarItems = document.querySelectorAll(
        '[data-roadmap-ui="gantt-sidebar"] [role="button"]'
      );

      // Find the sidebar item that matches the earliest feature
      for (const item of Array.from(sidebarItems)) {
        const element = item as HTMLElement;
        if (element.textContent?.includes(earliestFeature.name)) {
          element.click();
          break;
        }
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [features]);

  return (
    <div className="h-full w-full overflow-hidden">
      <GanttProvider range="daily" zoom={500}>
        <GanttSidebar>
          {Array.from(featuresByStage.entries()).map(
            ([stageId, stageFeatures]) => {
              const stage = pipeline.stages.find((s) => s.id === stageId);
              if (!stage) return null;

              return (
                <GanttSidebarGroup key={stageId} name={stage.name}>
                  {stageFeatures.map((feature) => (
                    <GanttSidebarItem key={feature.id} feature={feature} />
                  ))}
                </GanttSidebarGroup>
              );
            }
          )}
        </GanttSidebar>

        <GanttTimeline>
          <GanttHeader />
          <GanttFeatureList>
            {Array.from(featuresByStage.entries()).map(
              ([stageId, stageFeatures]) => {
                const stage = pipeline.stages.find((s) => s.id === stageId);
                if (!stage) return null;

                return (
                  <React.Fragment key={stageId}>
                    <GanttFeatureRow features={stageFeatures}>
                      {(feature) => (
                        <div className="flex items-center gap-2">
                          <div
                            className="size-2 rounded-full shrink-0"
                            style={{ backgroundColor: feature.status.color }}
                          />
                          <p className="flex-1 truncate text-xs">
                            {feature.name}
                          </p>
                        </div>
                      )}
                    </GanttFeatureRow>
                  </React.Fragment>
                );
              }
            )}
          </GanttFeatureList>
          <GanttToday />
        </GanttTimeline>
      </GanttProvider>
    </div>
  );
}
