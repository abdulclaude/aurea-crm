"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";

type RouterOutput = inferRouterOutputs<AppRouter>;
type TimeLogRow = RouterOutput["timeTracking"]["list"]["items"][number];

// Section schema for structured mode
const sectionSchema = z.object({
  title: z.string().min(1, "Section title is required"),
  description: z.string().min(1, "Section description is required"),
});

// Form schema
const formSchema = z.object({
  title: z.string().optional(),
  descriptionMode: z.enum(["single", "structured"]).default("single"),
  description: z.string().optional(),
  sections: z.array(sectionSchema).optional(),
  startTime: z.date(),
  endTime: z.date().optional(),
  breakDuration: z.number().min(0).optional(),
  billable: z.boolean().default(true),
  hourlyRate: z.number().min(0).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface TimeLogEditSheetProps {
  timeLog: TimeLogRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TimeLogEditSheet({
  timeLog,
  open,
  onOpenChange,
  onSuccess,
}: TimeLogEditSheetProps) {
  const trpc = useTRPC();

  // Parse existing sections from JSON if they exist
  const existingSections = React.useMemo(() => {
    if (!timeLog?.sections) return [];

    // Prisma returns JSON fields as objects, not strings
    // Check if it's already an array (from Prisma)
    if (Array.isArray(timeLog.sections)) {
      return timeLog.sections;
    }

    // If it's a string, try to parse it (shouldn't happen with Prisma)
    if (typeof timeLog.sections === 'string') {
      try {
        const parsed = JSON.parse(timeLog.sections);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    return [];
  }, [timeLog]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      title: timeLog?.title || "",
      descriptionMode: (timeLog?.descriptionMode as "single" | "structured") || "single",
      description: timeLog?.description || "",
      sections: existingSections.length > 0 ? existingSections : [],
      startTime: timeLog?.startTime ? new Date(timeLog.startTime) : new Date(),
      endTime: timeLog?.endTime ? new Date(timeLog.endTime) : undefined,
      breakDuration: timeLog?.breakDuration || undefined,
      billable: timeLog?.billable ?? true,
      hourlyRate: timeLog?.hourlyRate ? Number(timeLog.hourlyRate) : undefined,
    },
  });

  // Reset form when timeLog changes
  React.useEffect(() => {
    if (timeLog) {
      const parsedSections = existingSections.length > 0 ? existingSections : [];

      form.reset({
        title: timeLog.title || "",
        descriptionMode: (timeLog.descriptionMode as "single" | "structured") || "single",
        description: timeLog.description || "",
        sections: parsedSections,
        startTime: timeLog.startTime ? new Date(timeLog.startTime) : new Date(),
        endTime: timeLog.endTime ? new Date(timeLog.endTime) : undefined,
        breakDuration: timeLog.breakDuration || undefined,
        billable: timeLog.billable ?? true,
        hourlyRate: timeLog.hourlyRate ? Number(timeLog.hourlyRate) : undefined,
      });
    }
  }, [timeLog, form, existingSections]);

  const updateMutation = useMutation({
    ...trpc.timeTracking.update.mutationOptions({}),
    onSuccess: () => {
      toast.success("Time log updated successfully");
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update time log");
    },
  });

  const onSubmit = (data: FormValues) => {
    if (!timeLog) return;

    // Prepare the update payload
    const payload: any = {
      id: timeLog.id,
      title: data.title,
      descriptionMode: data.descriptionMode,
      startTime: data.startTime,
      endTime: data.endTime,
      breakDuration: data.breakDuration,
      billable: data.billable,
      hourlyRate: data.hourlyRate,
    };

    // Handle description modes
    if (data.descriptionMode === "single") {
      payload.description = data.description || "";
      payload.sections = null; // Clear sections when in single mode
    } else {
      payload.description = null; // Clear description when in structured mode
      payload.sections = data.sections && data.sections.length > 0 ? data.sections : [];
    }

    updateMutation.mutate(payload);
  };

  // Watch description mode
  const descriptionMode = form.watch("descriptionMode");
  const sections = form.watch("sections") || [];

  // Add section
  const handleAddSection = () => {
    const currentSections = form.getValues("sections") || [];
    form.setValue("sections", [...currentSections, { title: "", description: "" }]);
  };

  // Remove section
  const handleRemoveSection = (index: number) => {
    const currentSections = form.getValues("sections") || [];
    form.setValue(
      "sections",
      currentSections.filter((_, i) => i !== index)
    );
  };

  if (!timeLog) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle>Edit Time Log</SheetTitle>
          <SheetDescription>
            Update time log details and description
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6 pt-6">
            {/* Worker & Client Info (Read-only display) */}
            <div className="space-y-2">
              <Label className="text-xs text-primary/60">Worker</Label>
              <div className="text-sm text-primary font-medium">
                {timeLog.worker?.name || timeLog.contact?.name || "—"}
              </div>
              {timeLog.contact && (
                <>
                  <Label className="text-xs text-primary/60 mt-4">Client</Label>
                  <div className="text-sm text-primary font-medium">
                    {timeLog.contact.name}
                  </div>
                </>
              )}
            </div>

            <Separator />

            {/* Title */}
            <FormField
              control={form.control as any}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Morning Shift" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time Period */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control as any}
                name="startTime"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Time</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 size-4" />
                            {field.value ? (
                              format(field.value, "PPP p")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => date && field.onChange(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="endTime"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Time</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 size-4" />
                            {field.value ? (
                              format(field.value, "PPP p")
                            ) : (
                              <span>Still working</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => field.onChange(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Break Duration */}
            <FormField
              control={form.control as any}
              name="breakDuration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Break Duration (minutes)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Description Mode Toggle */}
            <FormField
              control={form.control as any}
              name="descriptionMode"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Description Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="single" id="single" />
                        <Label htmlFor="single" className="font-normal cursor-pointer">
                          Single Description
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="structured" id="structured" />
                        <Label htmlFor="structured" className="font-normal cursor-pointer">
                          Structured Sections
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>
                    Choose how to describe the work done during this shift
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Single Description Mode */}
            {descriptionMode === "single" && (
              <FormField
                control={form.control as any}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the work done during this shift..."
                        className="min-h-32 resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Structured Sections Mode */}
            {descriptionMode === "structured" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Shift Sections</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddSection}
                    className="gap-2"
                  >
                    <Plus className="size-4" />
                    Add Section
                  </Button>
                </div>

                {sections.length === 0 && (
                  <div className="text-sm text-primary/40 text-center py-8 border border-dashed rounded-md">
                    No sections yet. Click "Add Section" to get started.
                  </div>
                )}

                {sections.map((_, index) => (
                  <div key={index} className="space-y-3 p-4 border rounded-md relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSection(index)}
                      className="absolute top-2 right-2 size-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                    >
                      <Trash2 className="size-4" />
                    </Button>

                    <FormField
                      control={form.control as any}
                      name={`sections.${index}.title`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Section Title</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Morning Shift, Medication Check" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control as any}
                      name={`sections.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe what happened in this section..."
                              className="min-h-24 resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
              </div>
            )}

            <Separator />

            {/* Billing */}
            <div className="space-y-4">
              <FormField
                control={form.control as any}
                name="billable"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Billable</FormLabel>
                      <FormDescription>
                        This time log should be included in invoices
                      </FormDescription>
                    </div>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="size-4 cursor-pointer"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="hourlyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hourly Rate (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Override the default hourly rate for this time log
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="flex-1"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
