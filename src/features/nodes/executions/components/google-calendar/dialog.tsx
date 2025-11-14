"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required." })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers and underscores.",
    }),
  calendarId: z.string().min(1, { message: "Calendar ID is required." }),
  summary: z.string().min(1, { message: "Event summary is required." }),
  description: z.string().optional(),
  startDateTime: z
    .string()
    .min(1, { message: "Start date/time is required." })
    .describe("ISO string or {{variables}}"),
  endDateTime: z
    .string()
    .min(1, { message: "End date/time is required." })
    .describe("ISO string or {{variables}}"),
  timezone: z.string().min(1, { message: "Timezone is required." }),
});

export type GoogleCalendarActionFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GoogleCalendarActionFormValues) => void;
  defaultValues?: Partial<GoogleCalendarActionFormValues>;
}

export const GoogleCalendarActionDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}) => {
  const form = useForm<GoogleCalendarActionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "calendarEvent",
      calendarId: defaultValues.calendarId || "primary",
      summary: defaultValues.summary || "New event",
      description: defaultValues.description || "",
      startDateTime: defaultValues.startDateTime || "{{context.start}}",
      endDateTime: defaultValues.endDateTime || "{{context.end}}",
      timezone: defaultValues.timezone || "UTC",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "calendarEvent",
        calendarId: defaultValues.calendarId || "primary",
        summary: defaultValues.summary || "New event",
        description: defaultValues.description || "",
        startDateTime: defaultValues.startDateTime || "{{context.start}}",
        endDateTime: defaultValues.endDateTime || "{{context.end}}",
        timezone: defaultValues.timezone || "UTC",
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: GoogleCalendarActionFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="px-0">
        <DialogHeader className="px-8">
          <DialogTitle>Google Calendar Event</DialogTitle>
          <DialogDescription>
            Create or update an event on your connected Google Calendar. Use{" "}
            {"{{variables}}"} to reference previous nodes.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-5 px-8 py-6"
          >
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable name</FormLabel>
                  <FormControl>
                    <Input placeholder="calendarEvent" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Reference the created event later using
                    {` {{${field.value || "calendarEvent"}.id}}`}.
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
                  <FormLabel>Calendar ID</FormLabel>
                  <FormControl>
                    <Input placeholder="primary" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Use <span className="font-semibold">primary</span> or any
                    shared calendar ID/email.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event summary</FormLabel>
                  <FormControl>
                    <Input placeholder={"Demo with {{lead.name}}"} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={"Notes, zoom link, {{deal.context}}"}
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDateTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start date/time</FormLabel>
                    <FormControl>
                      <Input placeholder="2025-01-01T15:00:00Z" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      ISO string or a variable (e.g.
                      {" {{context.meetingStart}}"}).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDateTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End date/time</FormLabel>
                    <FormControl>
                      <Input placeholder="2025-01-01T16:00:00Z" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Should be later than the start time.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <FormControl>
                    <Input placeholder="UTC" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Used when parsing the start and end time inputs.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" className="w-full">
                Save configuration
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
