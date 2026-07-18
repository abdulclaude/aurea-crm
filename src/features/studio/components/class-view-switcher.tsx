"use client";

import { CalendarDays, List, Repeat } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type ClassView = "schedule" | "classes" | "series";

type ClassViewSwitcherProps = {
  activeView: ClassView;
  serviceTypeId?: string;
};

export function ClassViewSwitcher({
  activeView,
  serviceTypeId,
}: ClassViewSwitcherProps) {
  const serviceQuery = serviceTypeId
    ? `?serviceTypeId=${encodeURIComponent(serviceTypeId)}`
    : "";

  return (
    <div className="flex items-center gap-1 rounded-sm border border-black/10 p-1 dark:border-white/5">
      <Button
        asChild
        size="sm"
        variant={activeView === "schedule" ? "secondary" : "ghost"}
        className="h-8 gap-2"
      >
        <Link href={`/studio/schedule${serviceQuery}`}>
          <CalendarDays className="size-3" />
          Schedule
        </Link>
      </Button>
      <Button
        asChild
        size="sm"
        variant={activeView === "classes" ? "secondary" : "ghost"}
        className="h-8 gap-2"
      >
        <Link href="/studio/classes">
          <List className="size-3" />
          Classes
        </Link>
      </Button>
      <Button
        asChild
        size="sm"
        variant={activeView === "series" ? "secondary" : "ghost"}
        className="h-8 gap-2"
      >
        <Link href={`/studio/class-series${serviceQuery}`}>
          <Repeat className="size-3" />
          Series
        </Link>
      </Button>
    </div>
  );
}
