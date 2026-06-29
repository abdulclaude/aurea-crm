"use client";

import { CalendarDays, List } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type ClassView = "schedule" | "classes";

type ClassViewSwitcherProps = {
  activeView: ClassView;
};

export function ClassViewSwitcher({ activeView }: ClassViewSwitcherProps) {
  return (
    <div className="flex items-center gap-1 rounded-sm border border-black/5 p-1 dark:border-white/5">
      <Button
        asChild
        size="sm"
        variant={activeView === "schedule" ? "secondary" : "ghost"}
        className="h-8 gap-2"
      >
        <Link href="/studio/schedule">
          <CalendarDays className="size-3.5" />
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
          <List className="size-3.5" />
          Classes
        </Link>
      </Button>
    </div>
  );
}

