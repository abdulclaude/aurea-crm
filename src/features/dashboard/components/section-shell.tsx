"use client";

import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

export function SectionShell({
  title,
  subtitle,
  right,
  children,
  className,
  isEditing,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  isEditing?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-[420px] flex-col rounded-xl border border-black/[0.07] bg-white p-1 shadow-xs",
        isEditing && "ring ring-indigo-500/50",
        className,
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col rounded-[calc(var(--radius-xl)-4px)] border border-black/4">
        <div className="flex shrink-0 items-end justify-between px-3.5 pt-3.5 pb-3">
          <div>
            <h3 className="text-[13px] font-semibold text-black/70">{title}</h3>
            {subtitle && (
              <p className="mt-0.5 text-[11px] text-black/40">{subtitle}</p>
            )}
          </div>

          {right}
        </div>
        <Separator className="w-full" />
        <div className="min-h-0 flex-1 overflow-y-auto pt-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
