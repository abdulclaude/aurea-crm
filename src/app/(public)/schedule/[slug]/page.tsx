"use client";

import { use } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Clock, Users, ChevronRight } from "lucide-react";
import { format, isSameDay, addDays } from "date-fns";

function groupByDay(
  classes: Array<{ startTime: Date | string; [key: string]: unknown }>,
) {
  const groups: Record<string, typeof classes> = {};
  for (const cls of classes) {
    const day = format(new Date(cls.startTime as string), "yyyy-MM-dd");
    if (!groups[day]) groups[day] = [];
    groups[day].push(cls);
  }
  return groups;
}

export default function PublicSchedulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const trpc = useTRPC();

  const { data, isLoading, error } = useQuery(
    trpc.memberPortal.getPublicSchedule.queryOptions({ slug, days: 7 }),
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <Dumbbell className="h-8 w-8 animate-pulse text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Loading schedule…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 max-w-sm text-center">
          <p className="text-lg font-semibold">Studio not found</p>
          <p className="text-sm text-muted-foreground mt-2">
            Check the URL and try again.
          </p>
        </Card>
      </div>
    );
  }

  const { studio, classes } = data;
  const grouped = groupByDay(classes);
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  return (
    <div className="min-h-screen bg-background text-black">
      {/* Studio Header */}
      <div className="border-b border-white/5 bg-background/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            {studio.logo ? (
              <img
                src={studio.logo}
                alt={studio.name}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Dumbbell className="h-5 w-5 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold">{studio.name}</h1>
              <p className="text-xs text-muted-foreground">
                Class Schedule — Next 7 Days
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayClasses = grouped[key] ?? [];
          const isToday = isSameDay(day, today);

          return (
            <div key={key}>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-semibold">
                  {isToday ? "Today" : format(day, "EEEE")}
                  <span className="text-muted-foreground font-normal ml-1.5">
                    {format(day, "d MMM")}
                  </span>
                </h2>
                {dayClasses.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {dayClasses.length}{" "}
                    {dayClasses.length === 1 ? "class" : "classes"}
                  </Badge>
                )}
              </div>

              {dayClasses.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 pl-1">
                  No classes scheduled
                </p>
              ) : (
                <div className="space-y-2">
                  {dayClasses.map((cls) => {
                    const c = cls as {
                      id: string;
                      name: string;
                      description?: string | null;
                      startTime: string;
                      endTime?: string | null;
                      maxCapacity?: number | null;
                      _count: { studioBooking: number };
                      instructor?: { name: string } | null;
                      classType?: {
                        name: string;
                        color?: string | null;
                      } | null;
                    };
                    const spotsLeft = c.maxCapacity
                      ? c.maxCapacity - c._count.studioBooking
                      : null;
                    const isFull = spotsLeft !== null && spotsLeft <= 0;

                    return (
                      <Card
                        key={c.id}
                        className="p-4 hover:border-white/20 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {c.classType && (
                                <span
                                  className="text-xs font-medium px-1.5 py-0.5 rounded"
                                  style={{
                                    background: c.classType.color
                                      ? `${c.classType.color}20`
                                      : undefined,
                                    color: c.classType.color ?? undefined,
                                  }}
                                >
                                  {c.classType.name}
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-semibold">{c.name}</p>
                            {c.instructor && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                with {c.instructor.name}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1.5 ml-4 shrink-0">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>
                                {format(new Date(c.startTime), "HH:mm")}
                              </span>
                              {c.endTime && (
                                <span>
                                  – {format(new Date(c.endTime), "HH:mm")}
                                </span>
                              )}
                            </div>
                            {spotsLeft !== null && (
                              <div
                                className={`flex items-center gap-1 text-xs ${isFull ? "text-red-500" : "text-muted-foreground"}`}
                              >
                                <Users className="h-3 w-3" />
                                <span>
                                  {isFull ? "Full" : `${spotsLeft} spots`}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-center py-8 text-xs text-muted-foreground/50">
        Powered by Aurea CRM
      </div>
    </div>
  );
}
