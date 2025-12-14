"use client";

import React, { Suspense, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { RotaCalendarWrapper } from "@/features/rotas/components/rota-calendar-wrapper";
import { RotaAssignmentDialog } from "@/features/rotas/components/rota-assignment-dialog";
import { Loader2 } from "lucide-react";
import { startOfWeek, endOfWeek } from "date-fns";

interface WorkerScheduleProps {
  workerId: string;
}

function WorkerScheduleContent({ workerId }: WorkerScheduleProps) {
  const trpc = useTRPC();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [selectedRotaId, setSelectedRotaId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Calculate date range for current week
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  // Fetch rotas for this specific worker
  const { data: rotas = [], refetch } = useSuspenseQuery(
    trpc.rotas.list.queryOptions({
      startDate: weekStart,
      endDate: weekEnd,
      view: "week",
      workerId, // Filter by worker
    })
  );

  // Handle creating new rota
  const handleCreateRota = (start: Date, end: Date) => {
    setSelectedSlot({ start, end });
    setSelectedRotaId(null);
    setIsDialogOpen(true);
  };

  // Handle selecting existing rota for editing
  const handleSelectRota = (rotaId: string) => {
    const rota = rotas.find((r) => r.id === rotaId);
    if (rota) {
      setSelectedSlot({ start: rota.startTime, end: rota.endTime });
      setSelectedRotaId(rotaId);
      setIsDialogOpen(true);
    }
  };

  // Handle dialog success
  const handleDialogSuccess = () => {
    refetch();
    setSelectedRotaId(null);
  };

  return (
    <div className="flex flex-col h-[600px]">
      {/* Calendar */}
      <div className="flex-1 overflow-hidden">
        <RotaCalendarWrapper
          rotas={rotas}
          onCreateRota={handleCreateRota}
          onSelectRota={handleSelectRota}
          initialView="week"
        />
      </div>

      {/* Assignment Dialog - Pre-select worker */}
      <RotaAssignmentDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        selectedSlot={selectedSlot}
        selectedRotaId={selectedRotaId}
        onSuccess={handleDialogSuccess}
        defaultWorkerId={workerId} // Pre-select this worker
      />
    </div>
  );
}

export function WorkerSchedule({ workerId }: WorkerScheduleProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[600px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
        </div>
      }
    >
      <WorkerScheduleContent workerId={workerId} />
    </Suspense>
  );
}
