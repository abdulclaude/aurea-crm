"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Dumbbell } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ProgressRow } from "./progress-row";
import { SectionShell } from "./section-shell";

type ClassTypeUtilizationRow = {
  id: string;
  name: string;
  color: string | null;
  classes: number;
  booked: number;
  capacity: number;
  utilization: number;
};

export function ClassTypeUtilization({
  data,
  isEditing,
}: {
  data: ClassTypeUtilizationRow[] | undefined;
  isEditing?: boolean;
}) {
  return (
    <SectionShell
      title="Class type utilization"
      subtitle="Last 30 days"
      isEditing={isEditing}
      right={
        <Link
          href="/studio/class-types"
          className="text-[11px] font-medium text-black/40 hover:text-black/70"
        >
          Class types →
        </Link>
      }
    >
      {data && data.length > 0 ? (
        <div className="flex flex-col">
          {data.map((row, index) => (
            <div key={row.id}>
              <Link
                href="/studio/class-types"
                className="block transition-colors hover:bg-black/[0.015]"
              >
                <ProgressRow
                  label={row.name}
                  value={`${row.utilization}%`}
                  detail={`${row.booked.toLocaleString()} / ${row.capacity ? row.capacity.toLocaleString() : "∞"} booked · ${row.classes.toLocaleString()} classes`}
                  percent={row.utilization}
                />
              </Link>
              {index < data.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Dumbbell className="mb-2 size-5 text-black/50" />}
          title="No class utilization yet"
          href="/studio/classes"
          action="Schedule classes"
        />
      )}
    </SectionShell>
  );
}

function EmptyState({
  icon,
  title,
  href,
  action,
}: {
  icon: ReactNode;
  title: string;
  href: string;
  action: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      {icon}
      <p className="text-[12px] text-black/40">{title}</p>
      <Link
        href={href}
        className="mt-2 text-[11px] font-medium text-black/50 underline underline-offset-4 hover:text-black/70"
      >
        {action}
      </Link>
    </div>
  );
}
