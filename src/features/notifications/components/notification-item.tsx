"use client";

import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { IconCheckmark2 as CheckIcon } from "central-icons/IconCheckmark2";

import { IconTrashCan as TrashIcon } from "central-icons/IconTrashCan";

import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface NotificationItemProps {
  notification: {
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: Date | string;
    actor?: {
      id: string;
      name: string;
      email: string;
      image: string | null;
    } | null;
  };
  onRead?: () => void;
}

export function NotificationItem({
  notification,
  onRead,
}: NotificationItemProps) {
  const trpc = useTRPC();

  const markAsRead = useMutation(
    trpc.notifications.markAsRead.mutationOptions()
  );

  const deleteNotification = useMutation(
    trpc.notifications.deleteNotification.mutationOptions()
  );

  const handleMarkAsRead = async () => {
    if (notification.read) return;
    await markAsRead.mutateAsync({ id: notification.id });
    onRead?.();
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNotification.mutateAsync({ id: notification.id });
    onRead?.();
  };

  const createdAt =
    typeof notification.createdAt === "string"
      ? new Date(notification.createdAt)
      : notification.createdAt;

  return (
    <div
      className={cn(
        "group flex items-start gap-3 p-4 hover:bg-primary-foreground/50 transition-colors cursor-pointer",
        !notification.read &&
          "bg-sky-100 dark:bg-blue-950/20 hover:bg-sky-200/50 dark:hover:bg-blue-950/20"
      )}
      onClick={handleMarkAsRead}
    >
      {/* Actor Avatar */}
      {notification.actor && (
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage
            src={notification.actor.image || undefined}
            alt={notification.actor.name}
          />
          <AvatarFallback className="bg-linear-to-br from-purple-500 to-blue-500 text-white text-sm font-medium uppercase">
            {notification.actor.name[0]}
            {notification.actor.name[1]}
          </AvatarFallback>

          {/* Unread indicator */}
          {!notification.read && (
            <div
              className={cn(
                "size-3 rounded-full absolute -left-1 -top-1 border-2 border-sky-100 bg-blue-500"
              )}
            />
          )}
        </Avatar>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm font-medium")}>{notification.title}</p>

            <p className="text-xs text-primary mt-0.5">
              {notification.message}
            </p>

            <p className="text-[11px] text-primary/60 mt-1.5">
              {formatDistanceToNow(createdAt, { addSuffix: true })}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* {!notification.read && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 hover:bg-sky-500 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              handleMarkAsRead();
            }}
            title="Mark as read"
          >
            <CheckIcon className="size-3" />
          </Button>
        )} */}

        <Button
          variant="ghost"
          size="icon"
          className="size-6 bg-rose-500 text-rose-100 hover:bg-rose-500/95 hover:text-white"
          onClick={handleDelete}
          title="Delete"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
