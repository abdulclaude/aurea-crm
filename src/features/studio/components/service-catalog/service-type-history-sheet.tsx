"use client";

import { useQuery } from "@tanstack/react-query";
import { Archive, Copy, FilePenLine, History, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useTRPC } from "@/trpc/client";

type ServiceHistoryTarget = {
  createdAt: Date | string;
  id: string;
  name: string;
} | null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function displayLabel(value: string): string {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "None";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "None";
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

const actionPresentation = {
  CREATED: { label: "Created", icon: Plus, color: "#059669" },
  UPDATED: { label: "Edited", icon: FilePenLine, color: "#0284c7" },
  ARCHIVED: { label: "Archived", icon: Archive, color: "#d97706" },
  DELETED: { label: "Deleted", icon: Trash2, color: "#e11d48" },
} as const;

export function ServiceTypeHistorySheet({
  onOpenChange,
  service,
}: {
  onOpenChange: (open: boolean) => void;
  service: ServiceHistoryTarget;
}) {
  const trpc = useTRPC();
  const historyQuery = useQuery({
    ...trpc.activity.getByEntity.queryOptions({
      entityType: "service_type",
      entityId: service?.id ?? "",
      limit: 100,
    }),
    enabled: Boolean(service),
  });
  const history = historyQuery.data ?? [];
  const hasCreatedActivity = history.some((entry) => entry.action === "CREATED");

  return (
    <Sheet open={Boolean(service)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-black/5 px-6 py-5 text-left dark:border-white/5">
          <div className="flex items-center gap-2">
            <History className="size-4 text-primary/45" />
            <SheetTitle>{service?.name ?? "Service type"} history</SheetTitle>
          </div>
          <SheetDescription>
            Every recorded creation, edit, archive, duplication, and deletion event for this service type.
          </SheetDescription>
        </SheetHeader>

        <div className="divide-y divide-black/5 px-6 dark:divide-white/5">
          {historyQuery.isLoading ? (
            <p className="py-12 text-center text-xs text-primary/50">Loading history...</p>
          ) : (
            <>
            {history.map((entry) => {
              const metadataRecord = isRecord(entry.metadata) ? entry.metadata : {};
              const presentation = metadataRecord.action === "duplicated"
                ? { label: "Duplicated", icon: Copy, color: "#7c3aed" }
                : actionPresentation[entry.action as keyof typeof actionPresentation] ?? {
                  label: displayLabel(entry.action),
                  icon: Copy,
                  color: "#64748b",
                };
              const ActionIcon = presentation.icon;
              const changes = isRecord(entry.changes) ? Object.entries(entry.changes) : [];
              const metadata = Object.entries(metadataRecord).filter(
                ([field]) => field !== "action",
              );

              return (
                <article key={entry.id} className="space-y-3 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="flex size-7 shrink-0 items-center justify-center rounded-sm"
                        style={{ backgroundColor: `${presentation.color}18`, color: presentation.color }}
                      >
                        <ActionIcon className="size-3.5" />
                      </span>
                      <div className="min-w-0">
                        <Badge
                          variant="outline"
                          className="text-[10px] ring-0"
                          style={{
                            backgroundColor: `${presentation.color}18`,
                            borderColor: `${presentation.color}66`,
                            color: presentation.color,
                          }}
                        >
                          {presentation.label}
                        </Badge>
                        <p className="mt-1 truncate text-[11px] text-primary/55">
                          {entry.user.name || entry.user.email}
                        </p>
                      </div>
                    </div>
                    <time className="shrink-0 text-right text-[10px] leading-4 text-primary/45">
                      {new Date(entry.createdAt).toLocaleString("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </time>
                  </div>

                  {changes.length > 0 && (
                    <div className="space-y-2 rounded-sm border border-black/5 bg-primary/[0.02] p-3 dark:border-white/5">
                      {changes.map(([field, rawChange]) => {
                        const change = isRecord(rawChange) ? rawChange : {};
                        return (
                          <div key={field} className="grid grid-cols-[7rem_1fr] gap-3 text-[11px]">
                            <span className="font-medium text-primary/65">{displayLabel(field)}</span>
                            <span className="min-w-0 break-words text-primary/55">
                              {displayValue(change.old)} <span className="px-1 text-primary/30">to</span>{" "}
                              {displayValue(change.new)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {metadata.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {metadata.map(([field, value]) => (
                        <span key={field} className="rounded-sm bg-primary/5 px-2 py-1 text-[10px] text-primary/55">
                          {displayLabel(field)}: {displayValue(value)}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
            {!hasCreatedActivity && service && (
              <article className="space-y-3 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-emerald-500/10 text-emerald-600">
                      <Plus className="size-3.5" />
                    </span>
                    <div>
                      <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-[10px] text-emerald-600 ring-0">
                        Created
                      </Badge>
                      <p className="mt-1 text-[11px] text-primary/55">Original service record</p>
                    </div>
                  </div>
                  <time className="shrink-0 text-right text-[10px] leading-4 text-primary/45">
                    {new Date(service.createdAt).toLocaleString("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </time>
                </div>
                <p className="text-[11px] text-primary/50">
                  This service predates detailed activity tracking. Its stored creation time is shown here; subsequent actions are recorded above.
                </p>
              </article>
            )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
