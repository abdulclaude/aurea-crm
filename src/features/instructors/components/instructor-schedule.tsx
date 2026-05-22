"use client";

import { Suspense, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { RotaCalendarWrapper } from "@/features/rotas/components/rota-calendar-wrapper";
import { RotaAssignmentDialog } from "@/features/rotas/components/rota-assignment-dialog";
import { Loader2 } from "lucide-react";
import { startOfWeek, endOfWeek } from "date-fns";

export interface InstructorScheduleProps {
  instructorId: string;
}

function InstructorScheduleContent({ instructorId }: InstructorScheduleProps) {
  const trpc = useTRPC();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [selectedRotaId, setSelectedRotaId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const { data: rotas = [], refetch } = useSuspenseQuery(
    trpc.rotas.list.queryOptions({
      startDate: weekStart,
      endDate: weekEnd,
      view: "week",
      instructorId,
    })
  );

  const handleCreateRota = (start: Date, end: Date) => {
    setSelectedSlot({ start, end });
    setSelectedRotaId(null);
    setIsDialogOpen(true);
  };

  const handleSelectRota = (rotaId: string) => {
    const rota = rotas.find((r) => r.id === rotaId);
    if (rota) {
      setSelectedSlot({ start: rota.startTime, end: rota.endTime });
      setSelectedRotaId(rotaId);
      setIsDialogOpen(true);
    }
  };

  const handleDialogSuccess = () => {
    refetch();
    setSelectedRotaId(null);
  };

  return (
    <div className="flex h-[calc(100vh-230px)] min-h-[620px] flex-col">
      <div className="flex-1 overflow-hidden">
        <RotaCalendarWrapper
          rotas={rotas}
          onCreateRota={handleCreateRota}
          onSelectRota={handleSelectRota}
          initialView="week"
          currentDate={currentDate}
          onDateChange={setCurrentDate}
        />
      </div>

      <RotaAssignmentDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        selectedSlot={selectedSlot}
        selectedRotaId={selectedRotaId}
        onSuccess={handleDialogSuccess}
        defaultInstructorId={instructorId}
      />
    </div>
  );
}

export function InstructorSchedule({ instructorId }: InstructorScheduleProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[600px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
        </div>
      }
    >
      <InstructorScheduleContent instructorId={instructorId} />
    </Suspense>
  );
}
