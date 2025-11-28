"use client";

import { formatDistanceToNow } from "date-fns";
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/ui/timeline";
import { CheckCircle2Icon, Loader2Icon, XCircleIcon } from "lucide-react";
import type { Execution } from "@/generated/prisma/client";
import { ExecutionStatus } from "@/generated/prisma/enums";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ExecutionWithWorkflow = Execution & {
  workflow: { id: string; name: string };
};

function getStatusIcon(status: ExecutionStatus) {
  switch (status) {
    case ExecutionStatus.SUCCESS:
      return <CheckCircle2Icon className="size-4 text-emerald-100" />;
    case ExecutionStatus.FAILED:
      return <XCircleIcon className="size-4 text-rose-100" />;
    default:
      return <Loader2Icon className="size-4 text-blue-100 animate-spin" />;
  }
}

function getIndicatorClass(status: ExecutionStatus) {
  switch (status) {
    case ExecutionStatus.SUCCESS:
      return "bg-teal-500 border-emerald-200";
    case ExecutionStatus.FAILED:
      return "bg-rose-500 border-rose-200";
    default:
      return "bg-sky-500 border-blue-200";
  }
}

function formatTitle(item: ExecutionWithWorkflow) {
  return item.status === ExecutionStatus.SUCCESS
    ? `No issues occured when running`
    : item.status === ExecutionStatus.RUNNING
    ? `Now running`
    : `Uh oh! Something went wrong. There's a problem in`;
}

export function ExecutionsTimeline({
  items,
  className,
}: {
  items: ExecutionWithWorkflow[];
  className?: string;
}) {
  // Mark all steps as complete for drawing the connector lines.
  const stepCount = items.length || 1;

  return (
    <Timeline defaultValue={stepCount} className={className}>
      {items.map((item, idx) => {
        const title = formatTitle(item);

        const startedAgo = formatDistanceToNow(item.startedAt, {
          addSuffix: true,
        });

        const duration =
          item.completedAt &&
          Math.round(
            (new Date(item.completedAt).getTime() -
              new Date(item.startedAt).getTime()) /
              1000
          );

        return (
          <TimelineItem
            key={item.id}
            step={idx + 1}
            className="group-data-[orientation=vertical]/timeline:ms-10 -mt-2"
          >
            <TimelineHeader>
              <TimelineSeparator className=" group-data-[orientation=vertical]/timeline:-left-7 -mt-1 group-data-[orientation=vertical]/timeline:h-[calc(100%-1.5rem-0.25rem)] group-data-[orientation=vertical]/timeline:translate-y-6.5" />
              <TimelineDate>{startedAgo}</TimelineDate>

              <TimelineTitle className="text-primary/50 font-normal">
                {title}{" "}
                <Link
                  href={`/executions/${item.id}`}
                  className={cn(
                    item.status === ExecutionStatus.SUCCESS
                      ? "text-teal-400 hover:text-teal-300"
                      : item.status === ExecutionStatus.RUNNING
                      ? "text-blue-400 hover:text-blue-300"
                      : "text-rose-400 hover:text-rose-300",
                    "tracking-tight  transition duration-150 font-medium"
                  )}
                >
                  {item.workflow.name}
                </Link>
              </TimelineTitle>

              <TimelineIndicator
                className={`flex size-6 items-center justify-center ${getIndicatorClass(
                  item.status
                )} group-data-[orientation=vertical]/timeline:-left-7`}
              >
                {getStatusIcon(item.status)}
              </TimelineIndicator>
            </TimelineHeader>

            <TimelineContent className="mt-0.5">
              <p className="text-[11px] text-primary/50 hover:text-white select-none cursor-default transition duration-150 flex gap-1.5 items-center">
                {typeof duration === "number" && (
                  <span className="italic"> Took {duration}s </span>
                )}
              </p>
            </TimelineContent>
          </TimelineItem>
        );
      })}
    </Timeline>
  );
}
