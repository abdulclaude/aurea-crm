"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { formatDistanceToNow } from "date-fns";
import {
  FileText,
  Users,
  Briefcase,
  Workflow,
  Clock,
  Mail,
  Phone,
  MessageCircle,
  StickyNote,
  User,
  Trash2,
  Edit,
  Plus,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Archive,
  RotateCcw,
} from "lucide-react";

import { IconContacts as ContactIcon } from "central-icons/IconContacts";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActivityType, ActivityAction } from "@prisma/client";
import { Separator } from "@/components/ui/separator";

interface ActivityTimelineProps {
  entityType?: string;
  entityId?: string;
  limit?: number;
  showFilters?: boolean;
  filterByEntityType?: string;
}

const activityTypeIcons: Record<string, any> = {
  CONTACT: ContactIcon,
  DEAL: Briefcase,
  WORKFLOW: Workflow,
  EXECUTION: Clock,
  EMAIL: Mail,
  CALL: Phone,
  MEETING: MessageCircle,
  NOTE: StickyNote,
  TASK: FileText,
  WORKER: User,
  TIME_LOG: Clock,
  INVOICE: FileText,
  PIPELINE: Workflow,
};

const activityActionIcons: Record<string, any> = {
  CREATED: Plus,
  UPDATED: Edit,
  DELETED: Trash2,
  ASSIGNED: User,
  UNASSIGNED: User,
  STAGE_CHANGED: ArrowRight,
  STATUS_CHANGED: ArrowRight,
  COMPLETED: CheckCircle2,
  ARCHIVED: Archive,
  RESTORED: RotateCcw,
};

const activityActionColors: Record<string, string> = {
  CREATED: "text-green-600 dark:text-green-400",
  UPDATED: "text-blue-600 dark:text-blue-400",
  DELETED: "text-red-600 dark:text-red-400",
  ASSIGNED: "text-purple-600 dark:text-purple-400",
  UNASSIGNED: "text-gray-600 dark:text-gray-400",
  STAGE_CHANGED: "text-indigo-600 dark:text-indigo-400",
  STATUS_CHANGED: "text-indigo-600 dark:text-indigo-400",
  COMPLETED: "text-green-600 dark:text-green-400",
  ARCHIVED: "text-orange-600 dark:text-orange-400",
  RESTORED: "text-blue-600 dark:text-blue-400",
};

function getActivityDescription(
  type: ActivityType,
  action: ActivityAction,
  entityType: string,
  entityName: string,
  changes?: Record<string, { old: any; new: any }>,
  metadata?: Record<string, any>
): string {
  const actionText = action.toLowerCase().replace("_", " ");

  if (
    action === "STAGE_CHANGED" &&
    metadata?.oldStageId &&
    metadata?.newStageId
  ) {
    return `moved ${entityType} "${entityName}" to a new stage`;
  }

  if (action === "UPDATED" && changes) {
    const fields = Object.keys(changes);
    if (fields.length === 1) {
      return `updated ${fields[0]} for ${entityType} "${entityName}"`;
    }
    return `updated ${fields.length} fields for ${entityType} "${entityName}"`;
  }

  return `${actionText} ${entityType} "${entityName}"`;
}

function formatChanges(
  changes?: Record<string, { old: any; new: any }>
): string {
  if (!changes || Object.keys(changes).length === 0) {
    return "";
  }

  return Object.entries(changes)
    .map(([field, { old, new: newValue }]) => {
      const oldDisplay =
        old === null || old === undefined ? "(empty)" : String(old);
      const newDisplay =
        newValue === null || newValue === undefined
          ? "(empty)"
          : String(newValue);
      return `${field}: ${oldDisplay} → ${newDisplay}`;
    })
    .join(", ");
}

export function ActivityTimeline({
  entityType,
  entityId,
  limit = 20,
  showFilters = false,
  filterByEntityType,
}: ActivityTimelineProps) {
  const trpc = useTRPC();

  // Use separate queries to avoid conditional type issues
  const entityActivitiesQuery = useQuery({
    ...trpc.activity.getByEntity.queryOptions({
      entityType: entityType || "",
      entityId: entityId || "",
      limit,
    }),
    enabled: Boolean(entityType && entityId),
  });

  const allActivitiesQuery = useQuery({
    ...trpc.activity.list.queryOptions({ limit }),
    enabled: !entityType || !entityId,
  });

  const activitiesQuery =
    entityType && entityId ? entityActivitiesQuery : allActivitiesQuery;

  if (activitiesQuery.isLoading) {
    return (
      <div className="space-y-8">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activitiesQuery.isError) {
    return (
      <div className="p-6">
        <div className="text-center text-sm text-primary/60 font-medium">
          Failed to load activity timeline
        </div>
      </div>
    );
  }

  const activities =
    activitiesQuery.data && "items" in activitiesQuery.data
      ? activitiesQuery.data.items
      : activitiesQuery.data;

  if (!activities || activities.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center text-sm text-primary/60 font-medium">
          No activities found yet
        </div>
      </div>
    );
  }

  return (
    <div>
      {activities.map((activity: any) => {
        const TypeIcon = activityTypeIcons[activity.type] || FileText;
        const ActionIcon = activityActionIcons[activity.action] || Edit;
        const actionColor =
          activityActionColors[activity.action] || "text-gray-600";

        const description = getActivityDescription(
          activity.type,
          activity.action,
          activity.entityType,
          activity.entityName,
          activity.changes as
            | Record<string, { old: any; new: any }>
            | undefined,
          activity.metadata as Record<string, any> | undefined
        );

        const changesText = formatChanges(
          activity.changes as Record<string, { old: any; new: any }> | undefined
        );

        return (
          <div>
            <div key={activity.id} className="flex gap-3 group w-max p-6">
              {/* User Avatar */}
              <Avatar className="size-10">
                <AvatarImage src={activity.user.image || undefined} />
                <AvatarFallback className="text-white">
                  {activity.user.name
                    ?.split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>

              {/* Activity Content */}
              <div className="flex-1 space-y-1">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="font-medium text-xs">
                        {activity.user.name}
                      </span>

                      <span className="text-xs text-primary/75">
                        {description}
                      </span>
                    </div>

                    {/* Changes details */}
                    {changesText && (
                      <div className="mt-1 text-xs text-primary/75 bg-primary-foreground rounded px-2 py-1 inline-block">
                        {changesText}
                      </div>
                    )}

                    {/* Metadata badges */}
                    {activity.metadata && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className="text-[11px] capitalize rounded-full px-2 py-0.5"
                          >
                            {activity.type.toLowerCase()}
                            <span className="lowercase">
                              {" "}
                              {activity.action.toLowerCase().replace("_", " ")}
                            </span>
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(activity.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
            </div>
            <Separator className="bg-black/5 dark:bg-white/5" />
          </div>
        );
      })}
    </div>
  );
}
