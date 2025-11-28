"use client";

import { useEffect, useState, useCallback } from "react";
import { useTRPC } from "@/trpc/client";
import { useQueryClient, useQuery, useInfiniteQuery } from "@tanstack/react-query";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  actor?: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  } | null;
};

/**
 * Hook for real-time notifications using SSE
 */
export function useNotifications() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  // Get unread count
  const { data: unreadData } = useQuery(
    trpc.notifications.getUnreadCount.queryOptions({})
  );

  const unreadCount = unreadData?.count ?? 0;

  // Set up SSE connection
  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connect = () => {
      try {
        eventSource = new EventSource("/api/notifications/stream");

        eventSource.addEventListener("connected", () => {
          setIsConnected(true);
          console.log("Connected to notification stream");
        });

        eventSource.addEventListener("notification", (event) => {
          const data = JSON.parse(event.data);
          console.log("Received notifications:", data.notifications);

          // Invalidate queries to refetch notifications
          queryClient.invalidateQueries({
            queryKey: [["notifications", "getNotifications"]],
          });
          queryClient.invalidateQueries({
            queryKey: [["notifications", "getUnreadCount"]],
          });

          // You could also show a toast notification here
        });

        eventSource.onerror = (error) => {
          console.error("SSE error:", error);
          setIsConnected(false);
          eventSource?.close();

          // Attempt to reconnect after 5 seconds
          setTimeout(connect, 5000);
        };
      } catch (error) {
        console.error("Failed to connect to notification stream:", error);
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      eventSource?.close();
      setIsConnected(false);
    };
  }, [queryClient]);

  return {
    unreadCount,
    isConnected,
  };
}

/**
 * Hook for fetching paginated notifications
 */
export function useNotificationsList(filter: "all" | "unread" | "read" = "all") {
  const trpc = useTRPC();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    ...trpc.notifications.getNotifications.infiniteQueryOptions(
      { filter, limit: 20 },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    ),
  });

  const notifications = data?.pages?.flatMap((page) => page.notifications) ?? [];

  return {
    notifications,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  };
}
