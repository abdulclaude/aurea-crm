"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTRPC } from "@/trpc/client";

const UNASSIGNED_ROOM_VALUE = "__unassigned__";

interface ClassRoomFieldProps {
  classId: string;
  roomId: string | null;
}

export function ClassRoomField({ classId, roomId }: ClassRoomFieldProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: rooms } = useQuery(trpc.rooms.list.queryOptions());

  const updateMutation = useMutation(
    trpc.studioClassesEnhanced.update.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.studioClassesEnhanced.getById.queryKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: trpc.studioClassesEnhanced.getSchedule.queryKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: trpc.studioClassesEnhanced.list.queryKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: trpc.studioClasses.list.queryKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: trpc.rooms.list.queryKey(),
        });
        toast.success("Class room updated");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <div className="space-y-1">
      <p className="text-[11px] text-primary/50">Room</p>
      <Select
        value={roomId ?? UNASSIGNED_ROOM_VALUE}
        onValueChange={(value) =>
          updateMutation.mutate({
            id: classId,
            roomId: value === UNASSIGNED_ROOM_VALUE ? null : value,
          })
        }
        disabled={updateMutation.isPending}
      >
        <SelectTrigger className="h-8 w-full text-xs">
          <SelectValue placeholder="Assign room" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNASSIGNED_ROOM_VALUE}>Unassigned</SelectItem>
          {(rooms ?? []).map((room) => (
            <SelectItem key={room.id} value={room.id}>
              {room.name}
              {room.capacity ? ` (${room.capacity})` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
