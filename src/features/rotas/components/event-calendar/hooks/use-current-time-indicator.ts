"use client";

import { useEffect, useState } from "react";
import { endOfWeek, isSameDay, isWithinInterval, startOfWeek } from "date-fns";
import { StartHour, EndHour } from "@/features/rotas/components/event-calendar/constants";

export function useCurrentTimeIndicator(
  currentDate: Date,
  view: "day" | "week",
  options: {
    timeBounds?: { startHour: number; endHour: number };
    weekStartsOn?: 0 | 1 | 6;
  } = {},
) {
  const [currentTimePosition, setCurrentTimePosition] = useState<number>(0);
  const [currentTimeVisible, setCurrentTimeVisible] = useState<boolean>(false);

  useEffect(() => {
    const calculateTimePosition = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const timeBounds = options.timeBounds ?? {
        startHour: StartHour,
        endHour: EndHour,
      };
      const totalMinutes = hours * 60 + minutes;
      const dayStartMinutes = timeBounds.startHour * 60;
      const dayEndMinutes = timeBounds.endHour * 60;

      // Calculate position as percentage of day
      const position =
        ((totalMinutes - dayStartMinutes) / (dayEndMinutes - dayStartMinutes)) *
        100;
      const isInsideTimeBounds =
        totalMinutes >= dayStartMinutes && totalMinutes <= dayEndMinutes;

      // Check if current day is in view based on the calendar view
      let isCurrentTimeVisible = false;

      if (view === "day") {
        isCurrentTimeVisible = isSameDay(now, currentDate) && isInsideTimeBounds;
      } else if (view === "week") {
        const weekStartsOn = options.weekStartsOn ?? 0;
        const startOfWeekDate = startOfWeek(currentDate, { weekStartsOn });
        const endOfWeekDate = endOfWeek(currentDate, { weekStartsOn });
        isCurrentTimeVisible =
          isInsideTimeBounds &&
          isWithinInterval(now, {
            start: startOfWeekDate,
            end: endOfWeekDate,
          });
      }

      setCurrentTimePosition(position);
      setCurrentTimeVisible(isCurrentTimeVisible);
    };

    // Calculate immediately
    calculateTimePosition();

    // Update every minute
    const interval = setInterval(calculateTimePosition, 60000);

    return () => clearInterval(interval);
  }, [currentDate, options.timeBounds, options.weekStartsOn, view]);

  return { currentTimePosition, currentTimeVisible };
}
