"use client";

import { format } from "date-fns";
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
  bookingCount?: number;
  durationMinutes?: number;
}

export function InstTodayClasses({
  data,
  isEditing,
}: {
  data: ClassItem[] | undefined;
  isEditing?: boolean;
}) {
  const todayClasses = (data ?? []).filter((cls) => {
    const d = new Date(cls.startTime);
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  });

  return (
    <SectionShell title="Today's classes" isEditing={isEditing}>
      {todayClasses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10">
          <Calendar className="size-8 text-black/15 mb-2" />
          <p className="text-[11px] text-black/40">
            No classes scheduled for today
          </p>
        </div>
      ) : (
        <div className="space-y-0.5 px-1">
          {todayClasses.map((cls) => {
            const bookings =
              cls._count?.studioBooking ?? cls.bookingCount ?? 0;
            const duration =
              cls.durationMinutes ??
              Math.round(
                (new Date(cls.endTime).getTime() -
                  new Date(cls.startTime).getTime()) /
                  60000,
              );

            return (
              <div
                key={cls.id}
                className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-black/[0.02]"
              >
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: cls.classType?.color
                      ? `${cls.classType.color}20`
                      : "#6366f120",
                  }}
                >
                  <Play
                    className="size-3.5"
                    style={{ color: cls.classType?.color ?? "#6366f1" }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-black/70">
                    {cls.classType?.name ?? cls.name ?? "Class"}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-black/40">
                    <span className="flex items-center gap-0.5">
                      <Clock className="size-2.5" />
                      {format(new Date(cls.startTime), "h:mm a")} · {duration}
                      min
                    </span>
                    {cls.room && (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="size-2.5" />
                        {cls.room.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 text-[10px] text-black/40">
                  <Users className="size-3" />
                  {bookings}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionShell>
  );
}
