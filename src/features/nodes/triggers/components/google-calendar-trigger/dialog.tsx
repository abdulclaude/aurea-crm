"use client";

import { Suspense, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSuspenseQuery } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTRPC } from "@/trpc/client";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type CalendarListItem =
  RouterOutputs["integrations"]["listGoogleCalendars"][number];

const EVENT_OPTIONS = [
  {
    value: "created" as const,
    label: "Event created",
    description: "Trigger when a new event is created in this calendar.",
  },
  {
    value: "updated" as const,
    label: "Event updated",
    description: "Trigger whenever an existing event is modified.",
  },
  {
    value: "deleted" as const,
    label: "Event deleted",
    description: "Trigger when an event is cancelled or removed.",
  },
];

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required." })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable names must start with a letter/underscore and contain only letters, numbers, underscores, or $",
    }),
  calendarId: z.string().min(1, { message: "Select a calendar." }),
  calendarName: z.string().optional(),
  listenFor: z
    .array(z.enum(["created", "updated", "deleted"]))
    .min(1, { message: "Select at least one event type." }),
  timezone: z.string().min(1, { message: "Timezone is required." }),
});

export type GoogleCalendarTriggerFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GoogleCalendarTriggerFormValues) => void;
  defaultValues?: Partial<GoogleCalendarTriggerFormValues>;
}

export const GoogleCalendarTriggerDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}) => {
  const form = useForm<GoogleCalendarTriggerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "googleCalendar",
      calendarId: defaultValues.calendarId || "",
      calendarName: defaultValues.calendarName || "",
      timezone: defaultValues.timezone || "UTC",
      listenFor: defaultValues.listenFor?.length
        ? defaultValues.listenFor
        : ["created", "updated"],
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "googleCalendar",
        calendarId: defaultValues.calendarId || "",
        calendarName: defaultValues.calendarName || "",
        timezone: defaultValues.timezone || "UTC",
        listenFor: defaultValues.listenFor?.length
          ? defaultValues.listenFor
          : ["created", "updated"],
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: GoogleCalendarTriggerFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  const handleApplyCalendar = (calendar: CalendarListItem) => {
    if (!calendar.id) return;
    form.setValue("calendarId", calendar.id, { shouldValidate: true });
    const label =
      calendar.summary ||
      calendar.description ||
      calendar.id ||
      defaultValues.calendarName ||
      "";
    form.setValue("calendarName", label);
    if (calendar.timeZone) {
      form.setValue("timezone", calendar.timeZone);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="px-0">
        <DialogHeader className="px-8">
          <DialogTitle>Google Calendar Trigger</DialogTitle>
          <DialogDescription>
            Choose which calendar and events should start this workflow.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 mt-4 px-8"
          >
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/50 text-xs">
                    Variable name
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="bg-[#202E32] rounded-md placeholder:text-white/50"
                      placeholder="googleCalendar"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-white/50">
                    Reference this trigger later like{" "}
                    <code className="text-white">
                      {`{{${field.value || "googleCalendar"}.event.id}}`}
                    </code>
                    .
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="calendarId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/50 text-xs">
                    Calendar
                  </FormLabel>
                  {open ? (
                    <FormControl>
                      <Suspense fallback={<CalendarSelectFallback />}>
                        <CalendarSelectField
                          value={field.value}
                          onSelect={(calendar) => {
                            field.onChange(calendar.id);
                            handleApplyCalendar(calendar);
                          }}
                        />
                      </Suspense>
                    </FormControl>
                  ) : (
                    <div className="mt-3 rounded-md border border-white/5 bg-[#131B1C] p-3 text-xs text-white/50">
                      Open this dialog to load calendars from your connected
                      Google account.
                    </div>
                  )}
                  <FormDescription className="text-xs text-white/50">
                    We’ll list every calendar you can edit. Use refresh if you
                    just added a new calendar in Google.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="calendarName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/50 text-xs">
                    Display name
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="bg-[#202E32] rounded-md placeholder:text-white/50"
                      placeholder="Sales Demo Calendar"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-white/50">
                    Optional label used inside the editor to identify this
                    trigger.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="listenFor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/50 text-xs">
                    Events to listen for
                  </FormLabel>
                  <div className="space-y-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between bg-[#202E32] hover:bg-[#202E32] hover:brightness-110 transition duration-150 border-none hover:text-white text-white text-xs"
                        >
                          {field.value?.length
                            ? `${field.value.length} selected`
                            : "Choose event types"}
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent className="w-84 bg-[#1A2326] border-white/10 text-white space-y-1">
                        {EVENT_OPTIONS.map((option) => {
                          const checked = field.value?.includes(option.value);
                          return (
                            <DropdownMenuCheckboxItem
                              key={option.value}
                              checked={checked}
                              onCheckedChange={(isChecked) => {
                                if (isChecked) {
                                  field.onChange([
                                    ...(field.value || []),
                                    option.value,
                                  ]);
                                } else {
                                  field.onChange(
                                    (field.value || []).filter(
                                      (value) => value !== option.value
                                    )
                                  );
                                }
                              }}
                              className="focus:bg-[#202E32] data-[state=checked]:bg-[#202E32] data-[state=checked]:text-white hover:text-white! transition duration-150"
                            >
                              <div className="flex flex-col text-left">
                                <span className="text-xs font-medium">
                                  {option.label}
                                </span>
                                <span className="text-[11px] text-white/60">
                                  {option.description}
                                </span>
                              </div>
                            </DropdownMenuCheckboxItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {field.value?.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {field.value.map((value) => {
                          const option = EVENT_OPTIONS.find(
                            (item) => item.value === value
                          );
                          return (
                            <span
                              key={value}
                              className="text-[10px]  uppercase bg-[#202E32] px-2.5 py-1 rounded-sm text-white/80"
                            >
                              {option?.label || value}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-white/50">
                        Select at least one event type. You can listen to all
                        three for full coverage.
                      </p>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/50 text-xs">
                    Event timezone
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="bg-[#202E32] rounded-md placeholder:text-white/50"
                      placeholder="UTC, America/New_York, ..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-white/50">
                    Determines how timestamps are displayed in the workflow log.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="px-0">
              <Button
                type="submit"
                className="w-full bg-[#202E32] hover:bg-[#202E32] hover:brightness-110 transition duration-150 border-none hover:text-white text-white text-xs"
              >
                Save configuration
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

const CalendarSelectField = ({
  value,
  onSelect,
}: {
  value?: string;
  onSelect: (calendar: CalendarListItem) => void;
}) => {
  const trpc = useTRPC();
  const query = useSuspenseQuery(
    trpc.integrations.listGoogleCalendars.queryOptions()
  );
  const calendars = (query.data ??
    []) as RouterOutputs["integrations"]["listGoogleCalendars"];
  const selected = calendars.find(
    (calendar: CalendarListItem) => calendar.id === value
  );

  const handleValueChange = (calendarId: string) => {
    const calendar = calendars.find(
      (item: CalendarListItem) => item.id === calendarId
    );
    if (calendar) {
      onSelect(calendar);
    }
  };

  return (
    <div className="mt-3 rounded-md border border-white/5 bg-[#202E32] p-3 space-y-3">
      <div className="flex items-center justify-between text-xs text-white/60">
        <span>Calendars with edit access</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[11px] text-white/70 hover:text-white bg-[#1A2326] hover:bg-[#1A2326] hover:brightness-110 transition duration-150"
          onClick={() => query.refetch()}
        >
          Refresh
        </Button>
      </div>

      {calendars.length === 0 ? (
        <div className="rounded-md border border-dashed border-white/10 p-3 text-xs text-white/60">
          No calendars found. Make sure Google Calendar is connected and that
          you have at least write access to one calendar.
        </div>
      ) : (
        <Select value={value || undefined} onValueChange={handleValueChange}>
          <SelectTrigger className="bg-[#202E32] border-white/10 text-white min-w-full py-8! h-max">
            <SelectValue placeholder="Select a calendar" />
          </SelectTrigger>

          <SelectContent className="bg-[#202E32] border-white/10 text-white max-h-60">
            {calendars.map((calendar: CalendarListItem) => (
              <SelectItem
                value={calendar.id}
                key={calendar.id}
                className="hover:bg-[#1A2326]! focus:bg-[#1A2326]! text-white! hover:text-white hover:brightness-110 transition duration-150"
              >
                <div className="flex flex-col text-left gap-1.5">
                  <span className="text-xs font-medium">
                    {calendar.summary || calendar.id}
                  </span>

                  <span className="text-[11px] text-white/60 flex items-center gap-2">
                    {calendar.timeZone || "Timezone not set"}
                    {calendar.primary ? (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white">
                        Primary
                      </span>
                    ) : null}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {selected ? (
        <div className="rounded-md border border-dashed border-white/10 p-3 text-xs text-white/70 space-y-1">
          <p className="font-medium text-white">
            {selected.summary || selected.id}
          </p>
          {selected.description ? (
            <p className="text-white/60">{selected.description}</p>
          ) : null}
          <p>Timezone: {selected.timeZone || "Not provided"}</p>
        </div>
      ) : null}
    </div>
  );
};

const CalendarSelectFallback = () => (
  <div className="mt-3 rounded-md border border-white/5 bg-[#1A2326] p-3 space-y-2">
    <div className="flex items-center justify-between text-xs text-white/60">
      <span>Calendars with edit access</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-[11px] text-white/70 hover:text-white"
        disabled
      >
        Refresh
      </Button>
    </div>
    <p className="text-xs text-white/50">Loading calendars...</p>
  </div>
);
