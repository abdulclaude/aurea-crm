"use client";

import Link from "next/link";
import { format } from "date-fns";
import { CalendarDays, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { SectionShell } from "./section-shell";

interface ScheduleClass {
  id: string;
  name: string;
  status: string;
  startTime: string;
  endTime: string;
  booked: number;
  capacity: number | null;
  checkedIn: number;
  instructor: { name: string; profilePhoto: string | null } | null;
  classType: { name: string; color: string | null } | null;
}

function formatStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

export function TodaySchedule({
  data,
  isEditing,
}: {
  data: ScheduleClass[] | undefined;
  isEditing?: boolean;
}) {
  return (
    <SectionShell
      title="Today's schedule"
      subtitle={`${data?.length ?? 0} class${(data?.length ?? 0) !== 1 ? "es" : ""} today`}
      isEditing={isEditing}
      right={
        <Link
          href="/studio/schedule"
          className="text-[11px] font-medium text-black/40 hover:text-black/70"
        >
          View full →
        </Link>
      }
    >
      {data && data.length > 0 ? (
        <div className="flex flex-col">
          {data.map((cls, i) => (
            <div key={cls.id}>
              <Link href={`/studio/classes/${cls.id}`}>
                <div className="flex items-center justify-between px-3.5 py-3 transition-colors hover:bg-black/1.5">
                  <div className="min-w-0 space-y-1">
                    {cls.instructor && (
                      <div className="flex items-center gap-2">
                        {cls.instructor.profilePhoto ? (
                          <img
                            src={cls.instructor.profilePhoto}
                            alt=""
                            className="size-5 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-black/6 text-[8px] font-semibold text-black/50">
                            {cls.instructor.name
                              .split(" ")
                              .map((p) => p[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                        )}
                        <span className="truncate text-[12px] text-black/50">
                          {cls.instructor.name}
                        </span>
                      </div>
                    )}

                    <p className="truncate text-[13px] font-semibold text-black/75">
                      {cls.name}
                    </p>

                    <div className="flex items-center text-[11px] text-black/40">
                      {format(new Date(cls.startTime), "h:mm a")} –{" "}
                      {format(new Date(cls.endTime), "h:mm a")}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <p className="text-[11px] font-medium text-black/50">
                      {cls.booked.toLocaleString()} /{" "}
                      {cls.capacity != null
                        ? cls.capacity.toLocaleString()
                        : "∞"}
                    </p>

                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-medium normal-case",
                        cls.status === "CANCELLED"
                          ? "ring-rose-300 bg-rose-50 text-rose-600"
                          : "ring-indigo-300 bg-indigo-50 text-indigo-600",
                      )}
                    >
                      {formatStatus(cls.status)}
                    </Badge>
                  </div>
                </div>
              </Link>
              {i < data.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <CalendarDays className="mb-2 size-6 text-black/50" />
          <p className="text-[12px] text-black/40">
            No classes scheduled today
          </p>
        </div>
      )}
    </SectionShell>
  );
}
