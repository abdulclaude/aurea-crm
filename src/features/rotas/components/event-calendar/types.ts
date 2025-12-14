export type CalendarView = "month" | "week" | "day" | "agenda";

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  color?: EventColor;
  label?: string;
  location?: string;
  parentRotaId?: string; // For recurring events - points to the master rota
  isRecurring?: boolean; // Whether this is a recurring event
}

export type EventColor = "blue" | "orange" | "violet" | "rose" | "emerald";
