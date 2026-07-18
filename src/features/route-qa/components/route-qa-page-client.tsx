"use client";

import { useMemo, useState } from "react";

import { Separator } from "@/components/ui/separator";
import { RouteQaControls } from "@/features/route-qa/components/route-qa-controls";
import { RouteQaSection } from "@/features/route-qa/components/route-qa-section";
import { useRouteQaState } from "@/features/route-qa/hooks/use-route-qa-state";
import type {
  RouteQaChecklist,
  RouteQaFilter,
  RouteQaItem,
  RouteQaStage,
} from "@/features/route-qa/types";

function stageItems(stage: RouteQaStage): RouteQaItem[] {
  return stage.sections.flatMap((section) => section.items);
}

export function RouteQaPageClient({
  checklist,
}: {
  checklist: RouteQaChecklist;
}): React.ReactElement {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RouteQaFilter>("all");
  const {
    completedIds,
    notesById,
    storageError,
    toggleItem,
    toggleSection,
    updateNote,
    resetProgress,
  } = useRouteQaState();

  const allItems = useMemo(
    () => checklist.stages.flatMap(stageItems),
    [checklist.stages],
  );

  const normalizedQuery = query.trim().toLowerCase();
  const visibleStages = checklist.stages
    .map((stage) => ({
      ...stage,
      sections: stage.sections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => {
            const isCompleted = completedIds.has(item.id);
            const hasNote = Boolean(notesById[item.id]?.trim());
            const matchesFilter =
              filter === "all" ||
              (filter === "completed" && isCompleted) ||
              (filter === "remaining" && !isCompleted) ||
              (filter === "noted" && hasNote);
            const matchesQuery =
              !normalizedQuery ||
              `${item.route} ${item.test} ${item.expected} ${notesById[item.id] ?? ""}`
                .toLowerCase()
                .includes(normalizedQuery);
            return matchesFilter && matchesQuery;
          }),
        }))
        .filter((section) => section.items.length > 0),
    }))
    .filter((stage) => stage.sections.length > 0);

  const completedCount = allItems.filter((item) =>
    completedIds.has(item.id),
  ).length;
  const noteCount = allItems.filter((item) =>
    Boolean(notesById[item.id]?.trim()),
  ).length;
  const progress = allItems.length
    ? Math.round((completedCount / allItems.length) * 100)
    : 0;

  return (
    <div className="min-h-full text-primary">
      <header className="flex flex-wrap items-end justify-between gap-4 px-6 pb-5 pt-6">
        <div>
          <h1 className="text-lg font-semibold">Route testing</h1>
          <p className="mt-1 text-xs text-primary/60">
            Checklist updated {checklist.updatedAt}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums">
            {completedCount} of {allItems.length}
          </p>
          <p className="text-[11px] text-primary/50">
            {progress}% complete · {noteCount} {noteCount === 1 ? "note" : "notes"}
          </p>
        </div>
      </header>

      <div className="h-1 w-full bg-primary-foreground/50">
        <div
          className="h-full bg-emerald-500 transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <Separator />

      <RouteQaControls
        query={query}
        filter={filter}
        completedCount={completedCount}
        noteCount={noteCount}
        onQueryChange={setQuery}
        onFilterChange={setFilter}
        onResetProgress={resetProgress}
      />

      {storageError && (
        <p role="alert" className="px-6 pb-4 text-xs text-destructive">
          Route progress or notes could not be saved in this browser.
        </p>
      )}

      <Separator />

      {visibleStages.length > 0 ? (
        visibleStages.map((stage) => {
          const items = stageItems(stage);
          const completedInStage = items.filter((item) =>
            completedIds.has(item.id),
          ).length;
          return (
            <section key={stage.title}>
              <div className="flex items-center justify-between gap-4 px-6 py-5">
                <h2 className="text-sm font-semibold">{stage.title}</h2>
                <span className="text-[11px] tabular-nums text-primary/50">
                  {completedInStage}/{items.length}
                </span>
              </div>
              {stage.sections.map((section) => (
                <RouteQaSection
                  key={`${stage.title}:${section.title}`}
                  section={section}
                  completedIds={completedIds}
                  notesById={notesById}
                  onToggle={toggleItem}
                  onToggleSection={toggleSection}
                  onNoteChange={updateNote}
                />
              ))}
            </section>
          );
        })
      ) : (
        <div className="px-6 py-16 text-center text-xs text-primary/50">
          No routes match this view.
        </div>
      )}
    </div>
  );
}
