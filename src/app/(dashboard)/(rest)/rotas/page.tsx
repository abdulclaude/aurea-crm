"use client";

import React, { Suspense, useState, useCallback } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { RotaCalendarWrapper } from "@/features/rotas/components/rota-calendar-wrapper";
import { RotaAssignmentDialog } from "@/features/rotas/components/rota-assignment-dialog";
import { Loader2 } from "lucide-react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";

function RotasPageContent() {
  const trpc = useTRPC();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<"day" | "week" | "month">("week");
  const [selectedSlot, setSelectedSlot] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [selectedRotaId, setSelectedRotaId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Calculate date range based on current view and date
  const { startDate, endDate } = React.useMemo(() => {
    switch (currentView) {
      case "day":
        return {
          startDate: startOfDay(currentDate),
          endDate: endOfDay(currentDate),
        };
      case "week":
        return {
          startDate: startOfWeek(currentDate, { weekStartsOn: 1 }), // Monday
          endDate: endOfWeek(currentDate, { weekStartsOn: 1 }),
        };
      case "month":
        // For month view, we need to include the full calendar grid (previous/next month days)
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        return {
          startDate: startOfWeek(monthStart, { weekStartsOn: 0 }), // Sunday
          endDate: endOfWeek(monthEnd, { weekStartsOn: 0 }),
        };
      default:
        return {
          startDate: startOfWeek(currentDate, { weekStartsOn: 1 }),
          endDate: endOfWeek(currentDate, { weekStartsOn: 1 }),
        };
    }
  }, [currentDate, currentView]);

  // Fetch rotas - the query will re-run when currentDate or currentView changes
  const { data: rotas = [], refetch } = useSuspenseQuery(
    trpc.rotas.list.queryOptions({
      startDate,
      endDate,
      view: currentView,
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
    // The rotaId passed here is already the master rota ID (wrapper handles parentRotaId)
    // We just need to find any rota with this ID or parentRotaId to get the time info
    const rota = rotas.find((r) => r.id === rotaId || (r as any).parentRotaId === rotaId);

    if (rota) {
      setSelectedSlot({ start: rota.startTime, end: rota.endTime });
      setSelectedRotaId(rotaId);
      setIsDialogOpen(true);
    } else {
      console.error("Rota not found:", rotaId);
    }
  };

  // Handle dialog success
  const handleDialogSuccess = () => {
    refetch();
    setSelectedRotaId(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-black/5 dark:border-white/5 bg-background px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-primary">Rotas</h1>
            <p className="text-xs text-primary/60 mt-0.5">
              Schedule and manage worker shifts
            </p>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 overflow-hidden">
        <RotaCalendarWrapper
          rotas={rotas}
          onCreateRota={handleCreateRota}
          onSelectRota={handleSelectRota}
          initialView="week"
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onViewChange={useCallback((view: "month" | "week" | "day" | "agenda") => {
            if (view !== "agenda") {
              setCurrentView(view);
            }
          }, [])}
        />
      </div>

      {/* Assignment Dialog */}
      <RotaAssignmentDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        selectedSlot={selectedSlot}
        selectedRotaId={selectedRotaId}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}

export default function RotasPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[calc(100svh-10rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
        </div>
      }
    >
      <RotasPageContent />
    </Suspense>
  );
}
