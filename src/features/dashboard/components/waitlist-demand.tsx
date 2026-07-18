"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Users, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SectionShell } from "./section-shell";

interface WaitlistClass {
  id: string;
  name: string;
  startTime: string;
  waitlistCount: number;
  bookedCount: number;
  capacity: number | null;
  classType: { name: string; color: string | null } | null;
  instructor: { name: string } | null;
}

interface WaitlistData {
  totalWaiting: number;
  classes: WaitlistClass[];
}

export function WaitlistDemand({
  data,
  isEditing,
}: {
  data: WaitlistData | undefined;
  isEditing?: boolean;
}) {
  return (
    <SectionShell
      title="Waitlist demand"
      subtitle={data ? `${data.totalWaiting.toLocaleString()} people waiting` : undefined}
      isEditing={isEditing}
      right={
        <Link
          href="/studio/schedule"
          className="text-[11px] font-medium text-black/40 hover:text-black/70"
        >
          Schedule →
        </Link>
      }
    >
      {data && data.classes.length > 0 ? (
        <div className="flex flex-col">
          {data.classes.map((cls, i) => (
            <div key={cls.id}>
              <Link href={`/studio/classes/${cls.id}`}>
                <div className="flex items-start justify-between gap-3 px-3.5 py-3 transition-colors hover:bg-black/[0.015]">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-[13px] font-medium text-black/70">
                      {cls.name}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-black/40">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {format(new Date(cls.startTime), "EEE, MMM d · h:mm a")}
                      </span>
                    </div>
                    {cls.instructor && (
                      <p className="text-[11px] text-black/35">
                        {cls.instructor.name}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Badge
                      variant="outline"
                      className="bg-orange-50 text-[10px] font-medium normal-case text-orange-600 ring-orange-300"
                    >
                      {cls.waitlistCount.toLocaleString()} waiting
                    </Badge>
                    <p className="text-[11px] text-black/40">
                      {cls.bookedCount.toLocaleString()} / {cls.capacity != null ? cls.capacity.toLocaleString() : "∞"} booked
                    </p>
                  </div>
                </div>
              </Link>
              {i < data.classes.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <Users className="mb-2 size-5 text-black/50" />
          <p className="text-[12px] text-black/40">No active waitlists</p>
        </div>
      )}
    </SectionShell>
  );
}
