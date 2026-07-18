"use client";

import Link from "next/link";
import {
  UserPlus,
  CalendarPlus,
  UserCheck,
  CreditCard,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/app-routes";

const ACTIONS = [
  { label: "New member", href: APP_ROUTES.membersNew, icon: UserPlus },
  { label: "New booking", href: APP_ROUTES.schedule, icon: CalendarPlus },
  { label: "Check in", href: APP_ROUTES.checkIn, icon: UserCheck },
  { label: "Record payment", href: APP_ROUTES.invoices, icon: CreditCard },
  { label: "Send campaign", href: APP_ROUTES.campaignsNew, icon: Send },
] as const;

export function QuickActions() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {ACTIONS.map((action) => (
        <Button
          key={action.href}
          variant="outline"
          size="sm"
          asChild
          className="h-8 gap-1.5 rounded-lg border-black/[0.07] bg-white text-[12px] font-medium text-black/60 shadow-xs hover:bg-black/[0.02] hover:text-black/80"
        >
          <Link href={action.href}>
            <action.icon className="size-3.5" />
            {action.label}
          </Link>
        </Button>
      ))}
    </div>
  );
}
