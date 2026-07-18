"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { RouteQaItem } from "@/features/route-qa/components/route-qa-item";
import type { RouteQaSection as RouteQaSectionType } from "@/features/route-qa/types";

type RouteQaSectionProps = {
  section: RouteQaSectionType;
  completedIds: ReadonlySet<string>;
  notesById: Readonly<Record<string, string>>;
  onToggle: (id: string) => void;
  onToggleSection: (ids: string[], completed: boolean) => void;
  onNoteChange: (id: string, value: string) => void;
};

export function RouteQaSection({
  section,
  completedIds,
  notesById,
  onToggle,
  onToggleSection,
  onNoteChange,
}: RouteQaSectionProps): React.ReactElement {
  const completedCount = section.items.filter((item) =>
    completedIds.has(item.id),
  ).length;
  const isComplete = completedCount === section.items.length;
  const isIndeterminate = completedCount > 0 && !isComplete;

  return (
    <section>
      <div className="flex items-center justify-between gap-4 border-t border-black/5 bg-primary-foreground/20 px-6 py-3 dark:border-white/5">
        <div className="flex min-w-0 items-center gap-3">
          <Checkbox
            checked={isIndeterminate ? "indeterminate" : isComplete}
            onCheckedChange={() =>
              onToggleSection(
                section.items.map((item) => item.id),
                !isComplete,
              )
            }
            aria-label={`${isComplete ? "Clear" : "Complete"} ${section.title}`}
          />
          <h3 className="truncate text-xs font-semibold text-primary">
            {section.title}
          </h3>
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-primary/50">
          {completedCount}/{section.items.length}
        </span>
      </div>

      {section.items.map((item) => (
        <RouteQaItem
          key={item.id}
          item={item}
          completed={completedIds.has(item.id)}
          note={notesById[item.id] ?? ""}
          onToggle={onToggle}
          onNoteChange={onNoteChange}
        />
      ))}
    </section>
  );
}
