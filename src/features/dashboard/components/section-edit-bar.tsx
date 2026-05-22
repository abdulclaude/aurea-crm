"use client";

import { Check, RotateCcw, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardSection } from "@/stores/dashboard-layout";

export function SectionEditBar({
  section,
  label,
  isEditing,
  onToggle,
  onReset,
}: {
  section: DashboardSection;
  label: string;
  isEditing: boolean;
  onToggle: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-[11px] font-medium text-black/40">{label}</p>
      <div className="flex items-center gap-1.5">
        {isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="flex h-7 items-center gap-1.5 text-[11px] text-muted-foreground shadow-none ring-0"
          >
            <RotateCcw className="size-3" />
            Reset
          </Button>
        )}
        <Button
          variant={isEditing ? "ghost" : "outline"}
          size="sm"
          onClick={onToggle}
          className={
            isEditing
              ? "flex h-7 items-center gap-1.5 border-indigo-200 bg-indigo-50 text-[11px] font-medium text-indigo-600 shadow-none ring-0 hover:bg-indigo-100"
              : "flex h-7 items-center gap-1.5 text-[11px] font-medium text-black/50"
          }
        >
          {isEditing ? (
            <>
              <Check className="size-3" /> Done
            </>
          ) : (
            <>
              <Settings2 className="size-3" /> Customize
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
