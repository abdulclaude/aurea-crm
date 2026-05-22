"use client";

import { format, isToday, isTomorrow } from "date-fns";
import { Calendar, Clock, MapPin, Play, Users } from "lucide-react";
import { SectionShell } from "@/features/dashboard/components";

interface ClassItem {
  id: string;
  startTime: Date | string;
  endTime: Date | string;
  name?: string | null;
  classType?: { id: string; name: string; color: string | null } | null;
  room?: { id: string; name: string } | null;
  _count?: { studioBooking: number };
}

function dayLabel(d: Date): string {
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEEE, MMM d");
}

export function InstUpcoming({
  data,
  isEditing,
}: {
  data: ClassItem[] | undefined;
  isEditing?: boolean;
}) {
  const classes = data ?? [];

  const grouped = new Map<string, ClassItem[]>();
  for (const cls of classes) {
    const key = new Date(cls.startTime).toDateString();
    const arr = grouped.get(key) ?? [];
    arr.push(cls);
    grouped.set(key, arr);
  }

  return (
    <SectionShell title="Upcoming schedule" subtitle="Next 7 days" isEditing={isEditing}>
      {classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10">
          <Calendar className="size-8 text-black/15 mb-2" />
          <p className="text-[11px] text-black/40">No upcoming classes</p>
        </div>
      ) : (
        <div className="space-y-3 px-1">
          {Array.from(grouped.entries()).map(([dateKey, items]) => (
            <div key={dateKey}>
              <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-black/30">
                {dayLabel(new Date(dateKey))}
              </p>
              <div className="space-y-0.5">
                {items.map((cls) => (
                  <div
                    key={cls.id}
                    className="flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-black/[0.02]"
                  >
                    <div
                      className="flex size-7 shrink-0 items-center justify-center rounded-md"
                      style={{
                        backgroundColor: cls.classType?.color
                          ? `${cls.classType.color}20`
                          : "#6366f120",
                      }}
                    >
                      <Play
                        className="size-3"
                        style={{
                          color: cls.classType?.color ?? "#6366f1",
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-medium text-black/65">
                        {cls.classType?.name ?? cls.name ?? "Class"}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-black/35">
                        <span className="flex items-center gap-0.5">
                          <Clock className="size-2.5" />
                          {format(new Date(cls.startTime), "h:mm a")}
                        </span>
                        {cls.room && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="size-2.5" />
                            {cls.room.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 text-[10px] text-black/35">
                      <Users className="size-2.5" />
                      {cls._count?.studioBooking ?? 0}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
}
