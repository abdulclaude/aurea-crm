"use client";

import Link from "next/link";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { SectionShell } from "./section-shell";

interface OccupancyClass {
  id: string;
  name: string;
  startTime: string;
  booked: number;
  capacity: number | null;
  occupancyPct: number | null;
}

export function ClassOccupancy({
  data,
  isEditing,
}: {
  data: OccupancyClass[] | undefined;
  isEditing?: boolean;
}) {
  return (
    <SectionShell title="Class occupancy" subtitle="Next 10 upcoming" isEditing={isEditing}>
      {data && data.length > 0 ? (
        <div className="flex flex-col">
          {data.map((cls, i) => (
            <div key={cls.id}>
              <Link
                href={`/studio/classes/${cls.id}`}
                className="block"
              >
                <div className="flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-black/[0.015]">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-black/70">
                      {cls.name}
                    </p>
                    <p className="text-[11px] text-black/35">
                      {format(new Date(cls.startTime), "EEE, MMM d · h:mm a")}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[13px] font-medium text-black/50">
                      {cls.booked.toLocaleString()} / {cls.capacity != null ? cls.capacity.toLocaleString() : "∞"}
                    </p>
                    {cls.occupancyPct !== null && (
                      <p
                        className={cn(
                          "text-[11px]",
                          cls.occupancyPct >= 90
                            ? "text-red-500"
                            : cls.occupancyPct >= 60
                              ? "text-amber-500"
                              : "text-emerald-600",
                        )}
                      >
                        {cls.occupancyPct}%
                      </p>
                    )}
                  </div>
                </div>
              </Link>
              {i < data.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <CalendarDays className="mb-2 size-5 text-black/50" />
          <p className="text-[12px] text-black/40">No upcoming classes</p>
        </div>
      )}
    </SectionShell>
  );
}
