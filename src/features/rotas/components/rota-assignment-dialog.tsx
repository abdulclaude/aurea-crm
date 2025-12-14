"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  useMutation,
  useSuspenseQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Check, ChevronsUpDown, Plus, AlertTriangle } from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { RecurrenceBuilder } from "./recurrence-builder";

// Wrapper to prevent infinite re-renders
function RecurrenceBuilderWrapper({ form }: { form: any }) {
  const startDate = form.watch("startDate");
  const startTime = form.watch("startTime");
  const endDate = form.watch("endDate");
  const endTime = form.watch("endTime");
  const recurrenceRule = form.watch("recurrenceRule");

  const startDateTime = useMemo(() => {
    const [hours, minutes] = startTime.split(":").map(Number);
    const date = new Date(startDate);
    date.setHours(hours || 0, minutes || 0, 0, 0);
    return date;
  }, [startDate, startTime]);

  const endDateTime = useMemo(() => {
    const [hours, minutes] = endTime.split(":").map(Number);
    const date = new Date(endDate);
    date.setHours(hours || 0, minutes || 0, 0, 0);
    return date;
  }, [endDate, endTime]);

  const handleChange = useCallback(
    (rrule: string | null) => {
      form.setValue("recurrenceRule", rrule || undefined);
      form.setValue("isRecurring", !!rrule);
    },
    [form]
  );

  return (
    <div className="rounded-md border p-4">
      <RecurrenceBuilder
        key={`${startDateTime.getTime()}-${endDateTime.getTime()}`}
        startTime={startDateTime}
        endTime={endDateTime}
        value={recurrenceRule || null}
        onChange={handleChange}
      />
    </div>
  );
}

const formSchema = z.object({
  workerId: z.string().min(1, "Staff member is required"),
  contactId: z.string().optional(),
  companyName: z.string().optional(),
  pipelineId: z.string().optional(),
  pipelineStageId: z.string().optional(),
  dealId: z.string().optional(),
  dealName: z.string().optional(),
  startDate: z.date(),
  startTime: z.string(),
  endDate: z.date(),
  endTime: z.string(),
  color: z.enum(["blue", "orange", "violet", "rose", "emerald"]),
  sendMagicLink: z.boolean(),
  // Recurrence fields
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface RotaAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSlot: {
    start: Date;
    end: Date;
  } | null;
  selectedRotaId?: string | null;
  onSuccess?: () => void;
  defaultWorkerId?: string; // Pre-select a worker
}

export function RotaAssignmentDialog({
  open,
  onOpenChange,
  selectedSlot,
  selectedRotaId,
  onSuccess,
  defaultWorkerId,
}: RotaAssignmentDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isEditMode = !!selectedRotaId;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      workerId: defaultWorkerId || "",
      contactId: "",
      companyName: "",
      pipelineId: "",
      pipelineStageId: "",
      dealId: "",
      dealName: "",
      startDate: new Date(),
      startTime: "09:00",
      endDate: new Date(),
      endTime: "17:00",
      color: "blue" as const,
      sendMagicLink: false,
      isRecurring: false,
      recurrenceRule: undefined,
    },
  } as any);

  // Fetch workers
  const { data: workersData } = useSuspenseQuery(
    trpc.workers.list.queryOptions({ pageSize: 100 })
  );

  const workers = workersData?.items ?? [];

  // Check worker availability
  const selectedWorkerId = form.watch("workerId");
  const selectedStartDate = form.watch("startDate");
  const selectedStartTime = form.watch("startTime");
  const selectedEndTime = form.watch("endTime");

  const { data: availabilityCheck } = useQuery(
    trpc.availability.checkAvailability.queryOptions({
      workerId: selectedWorkerId || "",
      date: selectedStartDate,
      startTime: selectedStartTime,
      endTime: selectedEndTime,
    }, {
      enabled: !!(
        selectedWorkerId &&
        selectedStartDate &&
        selectedStartTime &&
        selectedEndTime
      ),
    })
  );

  // Fetch contacts
  const { data: contactsData } = useSuspenseQuery(
    trpc.contacts.list.queryOptions({ limit: 100 })
  );

  const contacts = contactsData?.items ?? [];

  // Fetch pipelines
  const { data: pipelinesData } = useSuspenseQuery(
    trpc.pipelines.list.queryOptions({})
  );

  const pipelines = pipelinesData?.items ?? [];

  // Watch pipeline selection and fetch stages
  const selectedPipelineId = form.watch("pipelineId");
  const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId);
  const pipelineStages = selectedPipeline?.stages ?? [];

  // Deal search state
  const [dealSearchQuery, setDealSearchQuery] = useState("");
  const [dealPopoverOpen, setDealPopoverOpen] = useState(false);
  const selectedContactId = form.watch("contactId");
  const dealName = form.watch("dealName");

  // Search deals for selected contact and pipeline
  const { data: searchedDeals = [] } = useQuery({
    ...trpc.deals.search.queryOptions({
      query: dealSearchQuery,
      contactId: selectedContactId,
      pipelineId: selectedPipelineId,
      limit: 10,
    }),
    enabled: !!dealSearchQuery && dealSearchQuery.length > 0 && !!selectedContactId && !!selectedPipelineId,
  });

  // Fetch existing rota for edit mode
  const { data: existingRota } = useQuery({
    ...trpc.rotas.get.queryOptions({
      id: selectedRotaId!,
    }),
    enabled: isEditMode && !!selectedRotaId,
  });

  // Create rota mutation
  const { mutate: createRota, isPending: isCreating } = useMutation(
    trpc.rotas.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.rotas.list.queryOptions({}).queryKey,
        });
        toast.success("Rota created successfully");
        onOpenChange(false);
        form.reset();
        onSuccess?.();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create rota");
      },
    })
  );

  // Update rota mutation
  const { mutate: updateRota, isPending: isUpdating } = useMutation(
    trpc.rotas.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.rotas.list.queryOptions({}).queryKey,
        });
        toast.success("Rota updated successfully");
        onOpenChange(false);
        form.reset();
        onSuccess?.();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update rota");
      },
    })
  );

  // Delete rota mutation
  const { mutate: deleteRota, isPending: isDeleting } = useMutation(
    trpc.rotas.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.rotas.list.queryOptions({}).queryKey,
        });
        toast.success("Rota deleted successfully");
        onOpenChange(false);
        form.reset();
        onSuccess?.();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete rota");
      },
    })
  );

  const isPending = isCreating || isUpdating || isDeleting;

  // Watch contact selection to auto-fill company name
  useEffect(() => {
    if (selectedContactId) {
      const contact = contacts.find((c) => c.id === selectedContactId);
      if (contact?.companyName && !form.getValues("companyName")) {
        form.setValue("companyName", contact.companyName);
      }
    }
  }, [selectedContactId, contacts, form]);

  // Populate form when editing existing rota
  useEffect(() => {
    if (isEditMode && existingRota && open) {
      const startDate = new Date(existingRota.startTime);
      const endDate = new Date(existingRota.endTime);

      form.reset({
        workerId: existingRota.workerId,
        contactId: existingRota.contactId || "",
        companyName: existingRota.companyName || "",
        pipelineId: existingRota.deal?.pipelineId || "",
        pipelineStageId: existingRota.deal?.pipelineStageId || "",
        dealId: existingRota.dealId || "",
        dealName: "",
        startDate,
        startTime: format(startDate, "HH:mm"),
        endDate,
        endTime: format(endDate, "HH:mm"),
        color: (existingRota.color as "blue" | "orange" | "violet" | "rose" | "emerald") || "blue",
        sendMagicLink: false,
        isRecurring: false,
        recurrenceRule: undefined,
      });
    } else if (!isEditMode && selectedSlot && open) {
      // Populate with selected slot times for new rota
      form.reset({
        workerId: "",
        contactId: "",
        companyName: "",
        pipelineId: "",
        pipelineStageId: "",
        dealId: "",
        dealName: "",
        startDate: selectedSlot.start,
        startTime: format(selectedSlot.start, "HH:mm"),
        endDate: selectedSlot.end,
        endTime: format(selectedSlot.end, "HH:mm"),
        color: "blue" as const,
        sendMagicLink: false,
        isRecurring: false,
        recurrenceRule: undefined,
      });
    }
  }, [isEditMode, existingRota, selectedSlot, open, form]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const onSubmit = (values: FormValues) => {
    // Combine date and time
    const [startHours, startMinutes] = values.startTime.split(":").map(Number);
    const [endHours, endMinutes] = values.endTime.split(":").map(Number);

    const startDateTime = new Date(values.startDate);
    startDateTime.setHours(startHours || 0, startMinutes || 0, 0, 0);

    const endDateTime = new Date(values.endDate);
    endDateTime.setHours(endHours || 0, endMinutes || 0, 0, 0);

    if (endDateTime <= startDateTime) {
      toast.error("End time must be after start time");
      return;
    }

    // Validate deal creation requirements
    if (values.dealName && !values.dealId) {
      if (!values.contactId) {
        toast.error("Please select a contact to create a new job/deal");
        return;
      }
      if (!values.pipelineId) {
        toast.error("Please select a pipeline to create a new job/deal");
        return;
      }
      if (!values.pipelineStageId) {
        toast.error("Please select a pipeline stage to create a new job/deal");
        return;
      }
    }

    const rotaData = {
      workerId: values.workerId,
      contactId: values.contactId || undefined,
      companyName: values.companyName || undefined,
      pipelineId: values.pipelineId || undefined,
      pipelineStageId: values.pipelineStageId || undefined,
      dealId: values.dealId || undefined,
      dealName: values.dealName || undefined,
      startTime: startDateTime,
      endTime: endDateTime,
      color: values.color,
      sendMagicLink: values.sendMagicLink,
      isRecurring: values.isRecurring || false,
      recurrenceRule: values.recurrenceRule || undefined,
      generateOccurrences: true,
    };

    console.log("Submitting rota data:", rotaData);

    if (isEditMode && selectedRotaId) {
      updateRota({
        id: selectedRotaId,
        ...rotaData,
      });
    } else {
      createRota(rotaData);
    }
  };

  const handleDelete = () => {
    if (selectedRotaId) {
      if (confirm("Are you sure you want to delete this rota?")) {
        deleteRota({ id: selectedRotaId });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Rota" : "Create Rota"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update the shift details"
              : "Assign a worker to a shift"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Start Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* End Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Worker Selection */}
            <FormField
              control={form.control}
              name="workerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Staff Member *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {workers.map((worker) => (
                        <SelectItem key={worker.id} value={worker.id}>
                          {worker.name}
                          {worker.role && ` (${worker.role})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Availability Warning */}
            {availabilityCheck !== undefined &&
              availabilityCheck !== null &&
              !availabilityCheck.isAvailable && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {availabilityCheck.hasTimeOff ? (
                      <span>
                        This worker has approved time off on this date.
                      </span>
                    ) : !availabilityCheck.hasAvailability ? (
                      <span>
                        This worker has not set their availability for this time slot.
                        They may not be available to work.
                      </span>
                    ) : (
                      <span>Worker is not available at this time.</span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

            {/* Contact Selection */}
            <FormField
              control={form.control}
              name="contactId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value === "__none__" ? "" : value);
                    }}
                    value={field.value || "__none__"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select contact (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.name}
                          {contact.companyName && ` - ${contact.companyName}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Auto-fills company name when selected
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Pipeline Selection */}
            <FormField
              control={form.control}
              name="pipelineId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pipeline</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value === "__none__" ? "" : value);
                      // Reset stage when pipeline changes
                      form.setValue("pipelineStageId", "");
                      // Reset deal fields when pipeline changes
                      form.setValue("dealId", "");
                      form.setValue("dealName", "");
                    }}
                    value={field.value || "__none__"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select pipeline (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {pipelines.map((pipeline) => (
                        <SelectItem key={pipeline.id} value={pipeline.id}>
                          {pipeline.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select a pipeline to enable deal/job assignment
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Pipeline Stage Selection */}
            {selectedPipelineId && (
              <FormField
                control={form.control}
                name="pipelineStageId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pipeline Stage</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                      disabled={!selectedPipelineId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select stage" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {pipelineStages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Required to create new deals
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Deal/Job Selector */}
            <FormField
              control={form.control}
              name="dealId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Job/Deal (Optional)</FormLabel>
                  <Popover open={dealPopoverOpen} onOpenChange={setDealPopoverOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          disabled={!selectedContactId || !selectedPipelineId || !form.watch("pipelineStageId")}
                          className={cn(
                            "justify-between",
                            !field.value && !dealName && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? searchedDeals.find((deal) => deal.id === field.value)?.name || "Deal selected"
                            : dealName
                            ? `Create: ${dealName}`
                            : !selectedContactId
                            ? "Select contact first"
                            : !selectedPipelineId
                            ? "Select pipeline first"
                            : !form.watch("pipelineStageId")
                            ? "Select pipeline stage first"
                            : "Search or create job..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Search jobs/deals..."
                          value={dealSearchQuery}
                          onValueChange={setDealSearchQuery}
                        />
                        <CommandList>
                          {(field.value || dealName) && (
                            <CommandGroup>
                              <CommandItem
                                onSelect={() => {
                                  form.setValue("dealId", "");
                                  form.setValue("dealName", "");
                                  setDealPopoverOpen(false);
                                  setDealSearchQuery("");
                                }}
                                className="cursor-pointer text-muted-foreground"
                              >
                                Clear selection
                              </CommandItem>
                            </CommandGroup>
                          )}
                          <CommandEmpty>
                            {dealSearchQuery && (
                              <CommandItem
                                onSelect={() => {
                                  // Create new deal
                                  form.setValue("dealId", "");
                                  form.setValue("dealName", dealSearchQuery);
                                  setDealPopoverOpen(false);
                                  setDealSearchQuery("");
                                }}
                                className="cursor-pointer"
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Create new: "{dealSearchQuery}"
                              </CommandItem>
                            )}
                          </CommandEmpty>
                          {dealSearchQuery && dealSearchQuery.trim() && (
                            <CommandGroup heading="Create New">
                              <CommandItem
                                onSelect={() => {
                                  // Create new deal
                                  form.setValue("dealId", "");
                                  form.setValue("dealName", dealSearchQuery);
                                  setDealPopoverOpen(false);
                                  setDealSearchQuery("");
                                }}
                                className="cursor-pointer"
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Create new: "{dealSearchQuery}"
                              </CommandItem>
                            </CommandGroup>
                          )}
                          {searchedDeals.length > 0 && (
                            <CommandGroup heading="Existing Deals">
                              {searchedDeals.map((deal) => (
                                <CommandItem
                                  key={deal.id}
                                  value={deal.id}
                                  onSelect={() => {
                                    form.setValue("dealId", deal.id);
                                    form.setValue("dealName", "");
                                    setDealPopoverOpen(false);
                                    setDealSearchQuery("");
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === deal.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span>{deal.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {deal.pipeline} • {deal.stage}
                                      {deal.value && ` • ${deal.currency} ${deal.value}`}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    {!selectedContactId
                      ? "Select a contact first to search or create jobs"
                      : !selectedPipelineId
                      ? "Select a pipeline and stage first to enable deal/job assignment"
                      : !form.watch("pipelineStageId")
                      ? "Select a pipeline stage above to create new jobs"
                      : "Search existing jobs or type to create a new one"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Company Name */}
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter company name (optional)"
                    />
                  </FormControl>
                  <FormDescription>
                    Manually enter company name or leave blank
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Color Selection */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Color</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a color" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="blue">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-blue-500" />
                          <span>Blue</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="emerald">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-emerald-500" />
                          <span>Emerald</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="violet">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-violet-500" />
                          <span>Violet</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="rose">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-rose-500" />
                          <span>Rose</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="orange">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-orange-500" />
                          <span>Orange</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose a color for this shift on the calendar
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Send Magic Link */}
            <FormField
              control={form.control}
              name="sendMagicLink"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Send worker magic link now</FormLabel>
                    <FormDescription>
                      Worker will receive an email immediately. Magic links are
                      also sent automatically 5 minutes before the shift starts.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Recurrence */}
            {!isEditMode && (
              <RecurrenceBuilderWrapper form={form} />
            )}

            <DialogFooter className="flex-row sm:justify-between">
              {isEditMode && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="w-max"
                >
                  Delete
                </Button>
              )}
              <div className="flex flex-1 justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  variant="gradient"
                  className="w-max"
                >
                  {isPending
                    ? isEditMode
                      ? "Updating..."
                      : "Creating..."
                    : isEditMode
                    ? "Update Rota"
                    : "Create Rota"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
