"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IconCircleCheck as CheckAllIcon } from "central-icons/IconCircleCheck";
import { IconLoader as LoaderIcon } from "central-icons/IconLoader";
import { useNotificationsList } from "@/features/notifications/hooks/use-notifications";
import { NotificationItem } from "@/features/notifications/components/notification-item";

export default function NotificationsPage() {
  const trpc = useTRPC();
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "read">("all");

  const {
    notifications,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useNotificationsList(activeTab);

  const markAllAsRead = useMutation(
    trpc.notifications.markAllAsRead.mutationOptions()
  );

  const handleMarkAllAsRead = async () => {
    await markAllAsRead.mutateAsync({});
    refetch();
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Stay updated with your team's activity
          </p>
        </div>
        <Button
          onClick={handleMarkAllAsRead}
          disabled={markAllAsRead.isPending}
          variant="outline"
        >
          {markAllAsRead.isPending ? (
            <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckAllIcon className="mr-2 h-4 w-4" />
          )}
          Mark all as read
        </Button>
      </div>

      <Card>
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          className="w-full"
        >
          <div className="border-b px-4">
            <TabsList className="w-full max-w-md">
              <TabsTrigger value="all" className="flex-1">
                All
              </TabsTrigger>
              <TabsTrigger value="unread" className="flex-1">
                Unread
              </TabsTrigger>
              <TabsTrigger value="read" className="flex-1">
                Read
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="m-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoaderIcon className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <p className="text-muted-foreground">No notifications yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You'll see notifications here when there's activity
                </p>
              </div>
            ) : (
              <>
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onRead={refetch}
                    />
                  ))}
                </div>

                {hasNextPage && (
                  <div className="p-4 flex justify-center border-t">
                    <Button
                      variant="outline"
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                    >
                      {isFetchingNextPage ? (
                        <>
                          <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "Load more"
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
