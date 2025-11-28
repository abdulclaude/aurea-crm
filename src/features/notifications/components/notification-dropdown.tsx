"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IconCheckmark2 as CheckAllIcon } from "central-icons/IconCheckmark2";

import { IconSettingsGear3 as SettingsIcon } from "central-icons/IconSettingsGear3";
import { useNotificationsList } from "../hooks/use-notifications";
import { NotificationItem } from "./notification-item";
import Link from "next/link";

export function NotificationDropdown() {
  const trpc = useTRPC();
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");

  const { notifications, isLoading, refetch } = useNotificationsList(activeTab);

  const markAllAsRead = useMutation(
    trpc.notifications.markAllAsRead.mutationOptions()
  );

  const handleMarkAllAsRead = async () => {
    await markAllAsRead.mutateAsync({});
    refetch();
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-6 py-3">
        <h3 className="text-primary font-medium text-sm">Notifications</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 border-none"
            onClick={handleMarkAllAsRead}
            disabled={markAllAsRead.isPending}
            title="Mark all as read"
          >
            <CheckAllIcon className="size-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="size-8 border-none"
            asChild
            title="Settings"
          >
            <Link href="/settings/notifications">
              <SettingsIcon className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) =>
          setActiveTab(v as React.SetStateAction<"all" | "unread">)
        }
        className="w-full gap-0 p-0! border-none!"
      >
        <TabsList className="w-full grid grid-cols-2 rounded-none border-none! border-black/5 p-0! h-7.5!">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="m-0 ">
          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 h-full">
                <p className="text-xs text-muted-foreground">
                  No notifications yet
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRead={refetch}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className=" p-2">
        <Button
          variant="outline"
          className="w-full text-xs hover:bg-primary-foreground/40"
          asChild
        >
          <Link href="/notifications">View all notifications</Link>
        </Button>
      </div>
    </div>
  );
}
