"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import {
  getRoomLayoutStats,
  parseRoomVisualizerConfig,
} from "@/features/studio/lib/room-visualizer";
import {
  mountRoomVisualizerScene,
  type SpotState,
  type RoomSceneAPI,
} from "@/features/studio/lib/room-visualizer-scene";

function getOrCreateSessionId(): string {
  const key = "spot-booking-session";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

type SpotBookingViewerProps = {
  roomId: string;
  className?: string;
};

export function SpotBookingViewer({
  roomId,
  className,
}: SpotBookingViewerProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const sceneRef = React.useRef<RoomSceneAPI | null>(null);
  const [selectedSpot, setSelectedSpot] = React.useState<number | null>(null);
  const [guestName, setGuestName] = React.useState("");
  const [sessionId, setSessionId] = React.useState("");

  React.useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  const layoutQuery = useQuery({
    ...trpc.spotBooking.getPublicLayout.queryOptions({ roomId }),
    refetchInterval: 3000,
  });

  const reserveMutation = useMutation(
    trpc.spotBooking.reserveSpot.mutationOptions({
      onSuccess: () => {
        toast.success("Spot reserved!");
        setSelectedSpot(null);
        setGuestName("");
        queryClient.invalidateQueries({
          queryKey: trpc.spotBooking.getPublicLayout.queryKey({ roomId }),
        });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const unreserveMutation = useMutation(
    trpc.spotBooking.unreserveSpot.mutationOptions({
      onSuccess: () => {
        toast.success("Spot released");
        queryClient.invalidateQueries({
          queryKey: trpc.spotBooking.getPublicLayout.queryKey({ roomId }),
        });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const clearMutation = useMutation(
    trpc.spotBooking.clearReservations.mutationOptions({
      onSuccess: () => {
        toast.success("All reservations cleared");
        queryClient.invalidateQueries({
          queryKey: trpc.spotBooking.getPublicLayout.queryKey({ roomId }),
        });
      },
    }),
  );

  const layout = layoutQuery.data;
  const config = React.useMemo(() => {
    if (!layout?.layoutData) return null;
    return parseRoomVisualizerConfig(layout.layoutData, layout.room.capacity);
  }, [layout?.layoutData, layout?.room.capacity]);

  const spotStates = React.useMemo(() => {
    const states = new Map<number, SpotState>();
    if (!layout?.spots) return states;
    layout.spots.forEach((spot, i) => {
      if (spot.isBooked) {
        states.set(
          i,
          spot.reservationSessionId === sessionId ? "own" : "booked",
        );
      } else if (i === selectedSpot) {
        states.set(i, "selected");
      } else {
        states.set(i, "available");
      }
    });
    return states;
  }, [layout?.spots, selectedSpot, sessionId]);

  React.useEffect(() => {
    sceneRef.current?.setSpotStates(spotStates);
  }, [spotStates]);

  React.useEffect(() => {
    const container = canvasRef.current;
    if (!container || !config) return;

    const api = mountRoomVisualizerScene({
      container,
      config,
      interactive: {
        spotStates,
        onSpotClick: (index) => {
          const spot = layout?.spots[index];
          if (!spot) return;
          if (spot.isBooked && spot.reservationSessionId === sessionId) {
            unreserveMutation.mutate({ spotId: spot.id, sessionId });
            return;
          }
          if (spot.isBooked) {
            toast.error(`Spot ${spot.label} is taken by ${spot.reservedBy}`);
            return;
          }
          setSelectedSpot((prev) => (prev === index ? null : index));
        },
      },
    });
    sceneRef.current = api;
    return api.cleanup;
  }, [config]);

  const handleReserve = () => {
    if (selectedSpot === null || !layout?.spots[selectedSpot]) return;
    const spot = layout.spots[selectedSpot];
    reserveMutation.mutate({
      spotId: spot.id,
      guestName: guestName.trim() || "Guest",
      sessionId,
    });
  };

  const stats = config ? getRoomLayoutStats(config) : null;
  const selectedSpotData =
    selectedSpot !== null ? layout?.spots[selectedSpot] : null;
  const ownSpots = layout?.spots.filter(
    (s) => s.isBooked && s.reservationSessionId === sessionId,
  );

  if (!layout || !config) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-[#151515] text-white/60",
          className,
        )}
      >
        {layoutQuery.isLoading
          ? "Loading room..."
          : "No layout configured for this room."}
      </div>
    );
  }

  return (
    <div className={cn("flex h-full flex-col bg-white", className)}>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          ref={canvasRef}
          className="h-full w-full cursor-grab active:cursor-grabbing"
        />
        <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap items-center gap-2">
          <Badge className="bg-black/70 text-white backdrop-blur">
            {layout.room.name}
          </Badge>
          <Badge
            variant="secondary"
            className="bg-black/60 text-white/80 backdrop-blur"
          >
            {layout.spots.filter((s) => !s.isBooked).length}/
            {layout.spots.length} available
          </Badge>
        </div>
        <div className="pointer-events-none absolute bottom-4 left-4 flex gap-3 text-[11px]">
          <span className="flex items-center gap-1.5 rounded bg-black/50 px-2 py-1 text-white/70 backdrop-blur">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />{" "}
            Available
          </span>
          <span className="flex items-center gap-1.5 rounded bg-black/50 px-2 py-1 text-white/70 backdrop-blur">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />{" "}
            Booked
          </span>
          <span className="flex items-center gap-1.5 rounded bg-black/50 px-2 py-1 text-white/70 backdrop-blur">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />{" "}
            Your spot
          </span>
          <span className="flex items-center gap-1.5 rounded bg-black/50 px-2 py-1 text-white/70 backdrop-blur">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-500" />{" "}
            Selected
          </span>
        </div>
        {stats ? (
          <div className="pointer-events-none absolute bottom-4 right-4 rounded bg-black/50 px-2 py-1 text-[11px] text-white/60 backdrop-blur">
            {stats.roomWidth.toFixed(1)}m × {stats.roomDepth.toFixed(1)}m
          </div>
        ) : null}
      </div>

      <div className="border-t border-black/10 px-5 py-4">
        {selectedSpotData && !selectedSpotData.isBooked ? (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="mb-1.5 text-sm font-medium">
                Spot {selectedSpotData.label}
              </p>
              <Input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Your name"
                className="h-9"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleReserve();
                }}
              />
            </div>
            <Button
              variant="outline"
              onClick={handleReserve}
              disabled={reserveMutation.isPending}
              className="mt-5 shrink-0"
            >
              {reserveMutation.isPending ? "Reserving..." : "Reserve spot"}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm">
              {ownSpots && ownSpots.length > 0
                ? `You have ${ownSpots.length} spot${ownSpots.length > 1 ? "s" : ""}: ${ownSpots.map((s) => s.label).join(", ")}`
                : "Click a green spot to select it"}
            </p>
            {layout.id ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-black/40! hover:text-black/70!"
                onClick={() => clearMutation.mutate({ layoutId: layout.id })}
                disabled={clearMutation.isPending}
              >
                Clear all
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
