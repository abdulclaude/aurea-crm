"use client";

import { format, formatDistanceToNow } from "date-fns";
import { Calendar, Clock, MapPin, Play, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

export function InstNextClass({
  data,
  isEditing,
}: {
  data: ClassItem[] | undefined;
  isEditing?: boolean;
}) {
  const now = new Date();
  const nextClass = (data ?? []).find(
    (cls) => new Date(cls.startTime) > now,
  );

  return (
    <SectionShell title="Next class" isEditing={isEditing}>
      {!nextClass ? (
        <div className="flex flex-col items-center justify-center py-10">
          <Calendar className="size-8 text-black/15 mb-2" />
          <p className="text-[11px] text-black/40">
            No upcoming classes scheduled
          </p>
        </div>
      ) : (
        <div className="px-3 py-3">
          <div className="rounded-xl border border-black/[0.05] bg-black/[0.01] p-4">
            <div className="flex items-start gap-4">
              <div
                className="flex size-12 shrink-0 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: nextClass.classType?.color
                    ? `${nextClass.classType.color}20`
                    : "#6366f120",
                }}
              >
                <Play
                  className="size-5"
                  style={{
                    color: nextClass.classType?.color ?? "#6366f1",
                  }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-semibold text-black/75">
                    {nextClass.classType?.name ?? nextClass.name ?? "Class"}
                  </p>
                  <Badge
                    variant="outline"
                    className="border-blue-500/20 bg-blue-500/10 text-[10px] text-blue-600"
                  >
                    {formatDistanceToNow(new Date(nextClass.startTime), {
                      addSuffix: true,
                    })}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-black/45">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3" />
                    {format(new Date(nextClass.startTime), "EEE, MMM d")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {format(new Date(nextClass.startTime), "h:mm a")} ·{" "}
                    {nextClass.durationMinutes ??
                      Math.round(
                        (new Date(nextClass.endTime).getTime() -
                          new Date(nextClass.startTime).getTime()) /
                          60000,
                      )}
                    min
                  </span>
                  {nextClass.room && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3" />
                      {nextClass.room.name}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="size-3" />
                    {nextClass._count?.studioBooking ??
                      nextClass.bookingCount ??
                      0}{" "}
                    booked
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Second upcoming class preview */}
          {(() => {
            const remaining = (data ?? []).filter(
              (cls) =>
                cls.id !== nextClass.id && new Date(cls.startTime) > now,
            );
            const second = remaining[0];
            if (!second) return null;

            return (
              <div className="mt-3 flex items-center gap-3 rounded-lg px-2 py-2 text-[11px] text-black/40">
                <div
                  className="flex size-6 shrink-0 items-center justify-center rounded-md"
                  style={{
                    backgroundColor: second.classType?.color
                      ? `${second.classType.color}15`
                      : "#6366f115",
                  }}
                >
                  <Play
                    className="size-2.5"
                    style={{
                      color: second.classType?.color ?? "#6366f1",
                    }}
                  />
                </div>
                <span className="truncate font-medium text-black/50">
                  {second.classType?.name ?? second.name ?? "Class"}
                </span>
                <span className="ml-auto shrink-0">
                  {format(new Date(second.startTime), "EEE h:mm a")}
                </span>
              </div>
            );
          })()}
        </div>
      )}
    </SectionShell>
  );
}
