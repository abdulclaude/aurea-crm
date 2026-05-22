"use client";

import { format } from "date-fns";
import { Banknote, Clock } from "lucide-react";
import { SectionShell } from "@/features/dashboard/components";

interface EarningsData {
  currency: string;
  hourlyRate: number;
  classes: {
    id: string;
    className: string;
    date: Date | string;
    durationMinutes: number;
    earned: number;
  }[];
}

export function InstRecentEarnings({
  data,
  isEditing,
}: {
  data: EarningsData | undefined;
  isEditing?: boolean;
}) {
  const currency = data?.currency ?? "GBP";
  const fmt = (amount: number) =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
    }).format(amount);

  const classes = data?.classes ?? [];

  return (
    <SectionShell
      title="Recent earnings"
      subtitle={data?.hourlyRate ? `${fmt(data.hourlyRate)}/hr` : undefined}
      isEditing={isEditing}
    >
      {classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10">
          <Banknote className="size-8 text-black/15 mb-2" />
          <p className="text-[11px] text-black/40">
            No completed classes this month
          </p>
        </div>
      ) : (
        <div className="space-y-0.5 px-1">
          {classes.slice(0, 10).map((cls) => (
            <div
              key={cls.id}
              className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-black/[0.02]"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                <Banknote className="size-3.5 text-emerald-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-black/70">
                  {cls.className}
                </p>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-black/40">
                  <span>
                    {format(new Date(cls.date), "MMM d")}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Clock className="size-2.5" />
                    {cls.durationMinutes}min
                  </span>
                </div>
              </div>
              <p className="shrink-0 text-[12px] font-semibold text-emerald-600">
                {fmt(cls.earned)}
              </p>
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
}
