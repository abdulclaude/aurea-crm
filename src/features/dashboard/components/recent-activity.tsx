"use client";

import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  CalendarDays,
  UserCheck,
  CreditCard,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SectionShell } from "./section-shell";

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  booking: CalendarDays,
  checkin: UserCheck,
  membership: CreditCard,
};

interface ActivityItem {
  type: string;
  label: string;
  time: string;
}

export function RecentActivity({
  data,
  isEditing,
}: {
  data: ActivityItem[] | undefined;
  isEditing?: boolean;
}) {
  return (
    <SectionShell
      title="Recent activity"
      subtitle="Bookings, check-ins, memberships"
      isEditing={isEditing}
    >
      {data && data.length > 0 ? (
        <div className="flex flex-col">
          {data.map((item, i) => {
            const Icon = ACTIVITY_ICONS[item.type] ?? Activity;
            return (
              <div key={i}>
                <div className="flex items-start gap-3 px-3.5 py-3">
                  <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-black/[0.04]">
                    <Icon className="size-3 text-black/40" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-snug text-black/70">
                      {item.label}
                    </p>
                    <p className="mt-1 text-[11px] text-black/35">
                      {formatDistanceToNow(new Date(item.time), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
                {i < data.length - 1 && <Separator />}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <Activity className="mb-2 size-5 text-black/50" />
          <p className="text-[12px] text-black/40">No recent activity</p>
        </div>
      )}
    </SectionShell>
  );
}
