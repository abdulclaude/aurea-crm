"use client";

import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  MoreHorizontal,
  Eye,
  Edit,
  Trash,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BOOKING_LOCATION_LABELS } from "@/features/bookings/constants";
import { useTRPC } from "@/trpc/client";
import { EventTypeFormDialog } from "./event-type-form-dialog";

export function EventTypesTable() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [editingEventType, setEditingEventType] = React.useState<any | null>(
    null,
  );
  const [formOpen, setFormOpen] = React.useState(false);

  const { data: eventTypes } = useSuspenseQuery(
    trpc.eventTypes.getMany.queryOptions({}),
  );

  const toggleActiveMutation = useMutation(
    trpc.eventTypes.toggleActive.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.eventTypes.getMany.queryOptions({}));
      },
    }),
  );

  const deleteMutation = useMutation(
    trpc.eventTypes.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.eventTypes.getMany.queryOptions({}));
      },
    }),
  );

  const handleToggleActive = async (eventType: any) => {
    await toggleActiveMutation.mutateAsync({ id: eventType.id });
  };

  const handleDelete = async (eventType: any) => {
    if (
      confirm(
        "Are you sure you want to delete this event type? This cannot be undone.",
      )
    ) {
      try {
        await deleteMutation.mutateAsync({
          id: eventType.id,
          syncToCalCom: !!eventType.calEventTypeId,
        });
      } catch (error: any) {
        alert(error.message || "Failed to delete event type");
      }
    }
  };

  const handleEdit = (eventType: any) => {
    setEditingEventType(eventType);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditingEventType(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-6 pt-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {eventTypes.length} event type{eventTypes.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={handleCreate} size="sm">
          Create event type
        </Button>
      </div>

      <div className="border-y border-black/5 dark:border-white/5">
        {eventTypes.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              No event types yet. Create your first event type to get started.
            </p>
            <Button onClick={handleCreate} variant="outline">
              Create event type
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {eventTypes.map((eventType) => (
              <div
                key={eventType.id}
                className="p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-primary dark:text-white truncate">
                        {eventType.title}
                      </h3>
                      {!eventType.isActive && (
                        <Badge variant="outline" className="text-[11px]">
                          Inactive
                        </Badge>
                      )}
                      {eventType.calEventTypeId && (
                        <Badge
                          variant="outline"
                          className="text-[11px] bg-blue-500/10 text-blue-500"
                        >
                          Cal.com
                        </Badge>
                      )}
                    </div>
                    {eventType.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {eventType.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{eventType.length} min</span>
                      <span>•</span>
                      <span>
                        {BOOKING_LOCATION_LABELS[eventType.locationType]}
                      </span>
                      {eventType._count?.bookings > 0 && (
                        <>
                          <span>•</span>
                          <span>
                            {eventType._count.bookings} booking
                            {eventType._count.bookings !== 1 ? "s" : ""}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="size-7 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="size-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleEdit(eventType)}>
                        <Edit className="mr-2 size-3.5" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleToggleActive(eventType)}
                      >
                        {eventType.isActive ? (
                          <>
                            <ToggleLeft className="mr-2 size-3.5" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <ToggleRight className="mr-2 size-3.5" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(eventType)}
                        className="text-red-600"
                      >
                        <Trash className="mr-2 size-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <EventTypeFormDialog
        eventType={editingEventType}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingEventType(null);
        }}
      />
    </div>
  );
}
