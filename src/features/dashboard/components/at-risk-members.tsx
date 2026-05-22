"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, Clock, CalendarX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SectionShell } from "./section-shell";

interface LapsedMember {
  id: string;
  name: string;
  email: string | null;
  lastCheckIn: string | null;
  streak: number;
  totalVisits: number;
}

interface ExpiringMembership {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  planName: string;
  endDate: string | null;
}

interface AtRiskData {
  lapsed: LapsedMember[];
  expiring: ExpiringMembership[];
}

export function AtRiskMembers({
  data,
  isEditing,
}: {
  data: AtRiskData | undefined;
  isEditing?: boolean;
}) {
  const hasData = data && (data.lapsed.length > 0 || data.expiring.length > 0);

  return (
    <SectionShell
      title="At-risk members"
      subtitle="Lapsed & expiring"
      isEditing={isEditing}
      right={
        <Link
          href="/clients"
          className="text-[11px] font-medium text-black/40 hover:text-black/70"
        >
          View all →
        </Link>
      }
    >
      {hasData ? (
        <div className="flex flex-col">
          {data.expiring.length > 0 && (
            <>
              <div className="px-3.5 py-2">
                <p className="text-[11px] font-medium text-amber-600/70">
                  Expiring in 7 days
                </p>
              </div>

              <Separator />

              {data.expiring.map((m, i) => (
                <div key={m.id}>
                  <Link href={`/clients?id=${m.clientId}`}>
                    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 transition-colors hover:bg-black/1.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-black/70">
                          {m.clientName}
                        </p>
                        <p className="text-[11px] text-black/40">
                          {m.planName}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="shrink-0 ring-amber-200 bg-amber-100 text-[11px] text-amber-500"
                      >
                        {m.endDate
                          ? formatDistanceToNow(new Date(m.endDate), {
                              addSuffix: false,
                            })
                          : "soon"}
                      </Badge>
                    </div>
                  </Link>
                  {i < data.expiring.length - 1 && <Separator />}
                </div>
              ))}
            </>
          )}

          {data.lapsed.length > 0 && (
            <>
              {data.expiring.length > 0 && <Separator className="my-1" />}
              <div className="px-3.5 pt-2 pb-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-red-500/70">
                  No visits in 14+ days
                </p>
              </div>
              {data.lapsed.map((m, i) => (
                <div key={m.id}>
                  <Link href={`/clients?id=${m.id}`}>
                    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 transition-colors hover:bg-black/[0.015]">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-black/70">
                          {m.name}
                        </p>
                        <p className="text-[11px] text-black/40">
                          {m.totalVisits.toLocaleString()} visits total
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-black/35">
                        <Clock className="size-3" />
                        {m.lastCheckIn
                          ? formatDistanceToNow(new Date(m.lastCheckIn), {
                              addSuffix: true,
                            })
                          : "Never"}
                      </div>
                    </div>
                  </Link>
                  {i < data.lapsed.length - 1 && <Separator />}
                </div>
              ))}
            </>
          )}
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <AlertTriangle className="mb-2 size-5 text-black/50" />
          <p className="text-[12px] text-black/40">No at-risk members</p>
        </div>
      )}
    </SectionShell>
  );
}
