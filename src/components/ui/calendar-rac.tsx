import { type ComponentProps } from "react";
import { getLocalTimeZone, today } from "@internationalized/date";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import {
  Button,
  CalendarCell as CalendarCellRac,
  CalendarGridBody as CalendarGridBodyRac,
  CalendarGridHeader as CalendarGridHeaderRac,
  CalendarGrid as CalendarGridRac,
  CalendarHeaderCell as CalendarHeaderCellRac,
  Calendar as CalendarRac,
  composeRenderProps,
  Heading as HeadingRac,
  RangeCalendar as RangeCalendarRac,
} from "react-aria-components";

import { cn } from "@/lib/utils";

interface BaseCalendarProps {
  className?: string;
}

type CalendarProps = ComponentProps<typeof CalendarRac> & BaseCalendarProps;
type RangeCalendarProps = ComponentProps<typeof RangeCalendarRac> &
  BaseCalendarProps;

function CalendarHeader() {
  return (
    <header className="flex w-full items-center gap-1 pb-1">
      <Button
        slot="previous"
        className="flex size-9 items-center justify-center rounded-xs transition-[color,box-shadow] outline-none text-primary/80 dark:text-white/60 hover:bg-primary-foreground/50 hover:text-black"
      >
        <ChevronLeftIcon size={16} />
      </Button>
      <HeadingRac className="grow text-center text-xs font-medium text-primary dark:text-white/60" />
      <Button
        slot="next"
        className="flex size-9 items-center justify-center rounded-xs transition-[color,box-shadow] outline-none text-primary/80 dark:text-white/60 hover:bg-primary-foreground/50 hover:text-black"
      >
        <ChevronRightIcon size={16} />
      </Button>
    </header>
  );
}

function CalendarGridComponent({ isRange = false }: { isRange?: boolean }) {
  const now = today(getLocalTimeZone());

  return (
    <CalendarGridRac>
      <CalendarGridHeaderRac>
        {(day) => (
          <CalendarHeaderCellRac className="size-9 rounded-xs p-0 text-xs font-medium text-primary/80 dark:text-white/50">
            {day}
          </CalendarHeaderCellRac>
        )}
      </CalendarGridHeaderRac>
      <CalendarGridBodyRac className="[&_td]:px-0 [&_td]:py-px">
        {(date) => (
          <CalendarCellRac
            date={date}
            className={cn(
              "relative flex size-9 items-center justify-center rounded-xs p-0 text-sm font-normal whitespace-nowrap [transition-property:color,background-color,border-radius,box-shadow] duration-150 outline-none cursor-pointer",
              "text-primary",
              "data-hovered:bg-primary data-hovered:brightness-110 data-hovered:text-black",
              "data-selected:bg-primary data-selected:text-black",
              "data-disabled:pointer-events-none data-disabled:opacity-30",
              "data-unavailable:pointer-events-none data-unavailable:line-through data-unavailable:opacity-30",
              // Range-specific styles
              isRange &&
                "data-selected:bg-primary/10 data-selected:text-black data-selected:rounded-none data-selection-end:bg-primary/10 data-selection-start:bg-primary/10 data-selection-end:text-black data-selection-start:text-black data-selection-end:rounded-e-xs data-selection-start:rounded-s-xs",
              // Today indicator styles
              date.compare(now) === 0 &&
                cn(
                  "after:bg-primary after:pointer-events-none after:absolute after:start-1/2 after:bottom-1 after:z-10 after:size-[3px] after:-translate-x-1/2 after:rounded-full",
                  isRange
                    ? "data-selection-end:after:bg-primary data-selection-start:after:bg-primary"
                    : "data-selected:after:bg-primary"
                )
            )}
          />
        )}
      </CalendarGridBodyRac>
    </CalendarGridRac>
  );
}

function Calendar({ className, ...props }: CalendarProps) {
  return (
    <CalendarRac
      {...props}
      className={composeRenderProps(className, (className) =>
        cn("w-fit", className)
      )}
    >
      <CalendarHeader />
      <CalendarGridComponent />
    </CalendarRac>
  );
}

function RangeCalendar({ className, ...props }: RangeCalendarProps) {
  return (
    <RangeCalendarRac
      {...props}
      className={composeRenderProps(className, (className) =>
        cn("w-fit", className)
      )}
    >
      <CalendarHeader />
      <CalendarGridComponent isRange />
    </RangeCalendarRac>
  );
}

export { Calendar, RangeCalendar };
