"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { RoomVisualizerControls } from "./room-visualizer-controls";
import {
  getDefaultRoomVisualizerConfig,
  getRoomLayoutStats,
  parseRoomVisualizerConfig,
  type RoomVisualizerConfig,
} from "@/features/studio/lib/room-visualizer";
import { mountRoomVisualizerScene } from "@/features/studio/lib/room-visualizer-scene";

type RoomVisualizerProps = {
  roomId: string;
  name: string;
  capacity?: number | null;
  className?: string;
};

export function RoomVisualizer({
  roomId,
  name,
  capacity,
  className,
}: RoomVisualizerProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const [config, setConfig] = React.useState<RoomVisualizerConfig>(() =>
    getDefaultRoomVisualizerConfig(capacity),
  );
  const [loadedLayoutId, setLoadedLayoutId] = React.useState<string | null>(null);

  const layoutQuery = useQuery(
    trpc.spotBooking.getLayout.queryOptions({ roomId }),
  );
  const saveMutation = useMutation(
    trpc.spotBooking.upsertVisualizerLayout.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.spotBooking.getLayout.queryKey({ roomId }),
        });
        toast.success("Room layout saved");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  React.useEffect(() => {
    if (!layoutQuery.data || loadedLayoutId === layoutQuery.data.id) return;
    setConfig(parseRoomVisualizerConfig(layoutQuery.data.layoutData, capacity));
    setLoadedLayoutId(layoutQuery.data.id);
  }, [capacity, layoutQuery.data, loadedLayoutId]);

  React.useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;
    const api = mountRoomVisualizerScene({ container, config });
    return api.cleanup;
  }, [config]);

  const stats = getRoomLayoutStats(config);

  const handleSave = () => {
    saveMutation.mutate({
      roomId,
      name: "Default studio layout",
      rows: config.rows,
      columns: stats.columns,
      isDefault: true,
      config,
    });
  };

  return (
    <div className={cn("grid min-h-0 grid-cols-[minmax(0,1fr)_360px]", className)}>
      <div className="relative min-h-0 overflow-hidden bg-[#151515]">
        <div ref={canvasRef} className="h-full w-full cursor-grab active:cursor-grabbing" />
        <div className="pointer-events-none absolute left-5 top-5 flex flex-wrap items-center gap-2">
          <Badge className="bg-background/85 text-primary backdrop-blur">{name}</Badge>
          <Badge variant="secondary" className="bg-background/80 backdrop-blur">
            {config.spaceCount} spaces
          </Badge>
          {capacity ? (
            <Badge variant="secondary" className="bg-background/80 backdrop-blur">
              {capacity} capacity
            </Badge>
          ) : null}
        </div>
        <div className="pointer-events-none absolute bottom-5 left-5 rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-[11px] text-white/75 backdrop-blur">
          Drag to look around · {stats.roomWidth.toFixed(1)}m × {stats.roomDepth.toFixed(1)}m
        </div>
        {layoutQuery.isLoading ? (
          <div className="pointer-events-none absolute right-5 top-5 rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-[11px] text-white/65 backdrop-blur">
            Loading saved layout...
          </div>
        ) : null}
      </div>
      <RoomVisualizerControls
        config={config}
        capacity={capacity}
        isSaving={saveMutation.isPending}
        onChange={setConfig}
        onSave={handleSave}
      />
    </div>
  );
}
