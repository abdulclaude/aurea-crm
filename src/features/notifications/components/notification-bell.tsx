"use client";

import { IconBell2 as BellIcon } from "central-icons/IconBell2";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotifications } from "../hooks/use-notifications";
import { NotificationDropdown } from "./notification-dropdown";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const { unreadCount, isConnected } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative border-none"
          aria-label="Notifications"
        >
          <BellIcon className="size-4" />

          {unreadCount > 0 && (
            <span className="absolute -top-0.5 right-0 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0" align="end">
        <NotificationDropdown />
      </PopoverContent>
    </Popover>
  );
}
