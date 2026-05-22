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

  // Set up SSE connection with exponential backoff
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let retryDelay = 2_000;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let unmounted = false;

    const connect = () => {
      if (unmounted) return;
      try {
        eventSource = new EventSource("/api/notifications/stream");

        eventSource.addEventListener("connected", () => {
          retryDelay = 2_000;
          setIsConnected(true);
        });

        eventSource.addEventListener("notification", (event) => {
          const data = JSON.parse(event.data);

          queryClient.invalidateQueries({
            queryKey: [["notifications", "getNotifications"]],
          });
          queryClient.invalidateQueries({
            queryKey: [["notifications", "getUnreadCount"]],
          });
        });

        eventSource.onerror = () => {
          setIsConnected(false);
          eventSource?.close();
          eventSource = null;

          retryDelay = Math.min(retryDelay * 2, 60_000);
          retryTimer = setTimeout(connect, retryDelay);
        };
      } catch {
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      unmounted = true;
      if (retryTimer) clearTimeout(retryTimer);
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
