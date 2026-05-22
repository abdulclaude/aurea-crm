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

const ACTIONS = [
  { label: "New member", href: "/clients/new", icon: UserPlus },
  { label: "New booking", href: "/studio/bookings/new", icon: CalendarPlus },
  { label: "Check in", href: "/studio/check-in", icon: UserCheck },
  { label: "Record payment", href: "/studio/payments/new", icon: CreditCard },
  { label: "Send campaign", href: "/marketing/campaigns/new", icon: Send },
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
