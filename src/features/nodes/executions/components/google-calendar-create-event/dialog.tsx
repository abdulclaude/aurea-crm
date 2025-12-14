"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  ResizableSheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
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
import { Button } from "@/components/ui/button";
import { VariableInput } from "@/components/tiptap/variable-input";
import type { VariableItem } from "@/components/tiptap/variable-suggestion";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required." })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message: "Variable name must start with a letter or underscore.",
    }),
  summary: z.string().min(1, { message: "Event title is required." }),
  startDateTime: z.string().min(1, { message: "Start date/time is required." }),
  endDateTime: z.string().min(1, { message: "End date/time is required." }),
  description: z.string().optional(),
  location: z.string().optional(),
  attendees: z.string().optional(),
});

export type GoogleCalendarCreateEventFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GoogleCalendarCreateEventFormValues) => void;
  defaultValues?: Partial<GoogleCalendarCreateEventFormValues>;
  variables: VariableItem[];
}

export const GoogleCalendarCreateEventDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  variables,
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "calendarEvent",
      summary: defaultValues.summary || "",
      startDateTime: defaultValues.startDateTime || "",
      endDateTime: defaultValues.endDateTime || "",
      description: defaultValues.description || "",
      location: defaultValues.location || "",
      attendees: defaultValues.attendees || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "calendarEvent",
        summary: defaultValues.summary || "",
        startDateTime: defaultValues.startDateTime || "",
        endDateTime: defaultValues.endDateTime || "",
        description: defaultValues.description || "",
        location: defaultValues.location || "",
        attendees: defaultValues.attendees || "",
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto sm:max-w-xl bg-background border-white/5">
        <SheetHeader className="px-6 pt-8 pb-1 gap-1">
          <SheetTitle>Google Calendar create event</SheetTitle>
          <SheetDescription>
            Create a new event in your Google Calendar
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-5" />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 px-6"
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
                  <FormDescription className="text-[11px] mt-1">
                    Access the result:{" "}
                    <span className="text-primary font-medium">
                      @{field.value || "calendarEvent"}
                    </span>
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
                  <FormLabel>Event title</FormLabel>
                  <FormControl>
                    <VariableInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Team Meeting"
                      variables={variables}
                    />
                  </FormControl>
                  <FormDescription className="text-[11px] mt-1">
                    The title of the calendar event
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startDateTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start date/time</FormLabel>
                  <FormControl>
                    <VariableInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="2024-12-20T10:00:00"
                      variables={variables}
                    />
                  </FormControl>
                  <FormDescription className="text-[11px] mt-1">
                    ISO 8601 format (e.g., "2024-12-20T10:00:00" or
                    "2024-12-20T10:00:00-05:00")
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
                    <VariableInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="2024-12-20T11:00:00"
                      variables={variables}
                    />
                  </FormControl>
                  <FormDescription className="text-[11px] mt-1">
                    ISO 8601 format (e.g., "2024-12-20T11:00:00" or
                    "2024-12-20T11:00:00-05:00")
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <VariableInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Discuss Q4 objectives..."
                      variables={variables}
                    />
                  </FormControl>
                  <FormDescription className="text-[11px] mt-1">
                    Event description or agenda
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location (optional)</FormLabel>
                  <FormControl>
                    <VariableInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Conference Room A"
                      variables={variables}
                    />
                  </FormControl>
                  <FormDescription className="text-[11px] mt-1">
                    Event location or meeting link
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="attendees"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Attendees (optional)</FormLabel>
                  <FormControl>
                    <VariableInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="john@example.com, jane@example.com"
                      variables={variables}
                    />
                  </FormControl>
                  <FormDescription className="text-[11px] mt-1">
                    Comma-separated email addresses
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SheetFooter className="px-0 pb-4">
              <Button
                type="submit"
                className="w-max ml-auto"
                variant="gradient"
              >
                Save changes
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </ResizableSheetContent>
    </Sheet>
  );
};
