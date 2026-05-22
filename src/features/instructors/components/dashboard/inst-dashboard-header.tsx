"use client";

import { Check, RotateCcw, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  if (hour < 5) return `Having a late night, ${name}?`;
  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 17) return `Good afternoon, ${name}`;
  if (hour < 21) return `Good evening, ${name}`;
  return `Having a late night, ${name}?`;
}

interface InstructorDashboardHeaderProps {
  instructorName: string | null | undefined;
  studioName: string | null | undefined;
  isEditing: boolean;
  onToggleEdit: () => void;
  onReset: () => void;
}

export function InstDashboardHeader({
  instructorName,
  studioName,
  isEditing,
  onToggleEdit,
  onReset,
}: InstructorDashboardHeaderProps) {
  const firstName = instructorName?.split(" ")[0] ?? "there";

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[15px] font-semibold text-black/80">
          {getGreeting(firstName)}
        </p>
        {studioName && (
          <p className="mt-0.5 text-[11px] text-black/40">{studioName}</p>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground shadow-none ring-0"
          >
            <RotateCcw className="size-3" />
            Reset
          </Button>
        )}

        <Button
          variant={isEditing ? "ghost" : "outline"}
          size="sm"
          onClick={onToggleEdit}
          className={
            isEditing
              ? "flex items-center gap-1.5 border-indigo-200 bg-indigo-50 text-[11px] font-medium text-indigo-600 shadow-none ring-0 hover:bg-indigo-100"
              : "flex items-center gap-1.5 text-[11px] font-medium text-black/50"
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
