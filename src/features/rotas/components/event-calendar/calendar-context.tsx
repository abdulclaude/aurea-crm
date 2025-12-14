"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import type { EventColor } from "./types";

interface CalendarContextType {
  // Date management
  currentDate: Date;
  setCurrentDate: (date: Date) => void;

  // Color visibility management
  colorVisibility: Record<EventColor, boolean>;
  setColorVisibility: React.Dispatch<
    React.SetStateAction<Record<EventColor, boolean>>
  >;
  isColorVisible: (color: EventColor | undefined) => boolean;
  toggleColorVisibility: (color: EventColor) => void;
}

export const CalendarContext = createContext<CalendarContextType | undefined>(
  undefined,
);

export function useCalendarContext() {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error(
      "useCalendarContext must be used within a CalendarProvider",
    );
  }
  return context;
}

interface CalendarProviderProps {
  children: ReactNode;
  value: CalendarContextType;
}

export function CalendarProvider({ children, value }: CalendarProviderProps) {
  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}
