"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ProgressRow } from "./progress-row";
import { SectionShell } from "./section-shell";

type InstructorUtilizationRow = {
  id: string;
  name: string;
  profilePhoto: string | null;
  classes: number;
  booked: number;
  capacity: number;
  utilization: number;
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function InstructorUtilization({
  data,
  isEditing,
}: {
  data: InstructorUtilizationRow[] | undefined;
  isEditing?: boolean;
}) {
  return (
    <SectionShell
      title="Instructor utilization"
      subtitle="Last 30 days"
      isEditing={isEditing}
      right={
        <Link
          href="/team"
          className="text-[11px] font-medium text-black/40 hover:text-black/70"
        >
          Instructors →
        </Link>
      }
    >
      {data && data.length > 0 ? (
        <div className="flex flex-col">
          {data.map((row, index) => (
            <div key={row.id}>
              <Link
                href={`/instructors/${row.id}`}
                className="block transition-colors hover:bg-black/[0.015]"
              >
                <ProgressRow
                  label={row.name}
                  value={`${row.utilization}%`}
                  detail={`${row.booked.toLocaleString()} / ${row.capacity ? row.capacity.toLocaleString() : "∞"} booked · ${row.classes.toLocaleString()} classes`}
                  percent={row.utilization}
                  leading={
                    row.profilePhoto ? (
                      <img
                        src={row.profilePhoto}
                        alt=""
                        className="size-6 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-[9px] font-semibold text-black/45">
                        {initials(row.name)}
                      </span>
                    )
                  }
                />
              </Link>
              {index < data.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <UserRound className="mb-2 size-5 text-black/50" />
          <p className="text-[12px] text-black/40">No instructor data yet</p>
          <Link
            href="/team"
            className="mt-2 text-[11px] font-medium text-black/50 underline underline-offset-4 hover:text-black/70"
          >
            Add instructors
          </Link>
        </div>
      )}
    </SectionShell>
  );
}
