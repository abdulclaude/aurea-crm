"use client";

import { cn } from "@/lib/utils";

export function ChartShell({
  title,
  right,
  children,
  isEditing,
  className,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  isEditing?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group h-72 w-full rounded-xl border border-black/[0.07] bg-white p-1 shadow-xs",
        isEditing && "ring ring-indigo-500/50",
        className,
      )}
    >
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[calc(theme(borderRadius.xl)-4px)] border border-black/[0.04]">
        <div className="flex shrink-0 items-center justify-between gap-2 px-4 pt-3 pb-2">
          <h3 className="shrink-0 text-[11px] font-medium text-black/50">{title}</h3>
          {right && !isEditing && (
            <div
              className="flex flex-wrap items-center justify-end gap-1.5"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {right}
            </div>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
