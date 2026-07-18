"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  classBookedTriggerConfigSchema,
  type ClassBookedTriggerConfig,
} from "@/features/nodes/studio/lib/studio-node-config";
import { useTRPC } from "@/trpc/client";
import {
  StudioNodeDialogFooter,
  StudioNodeDialogLayout,
} from "./studio-node-dialog-layout";
import { StudioResourceCheckboxList } from "./studio-resource-checkbox-list";

type ScopeMode = "ANY" | "SERVICES" | "SERIES" | "CLASS";

export function ClassBookedTriggerDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ClassBookedTriggerConfig) => void;
  defaultValues?: Partial<ClassBookedTriggerConfig>;
}): React.ReactElement {
  const trpc = useTRPC();
  const servicesQuery = useQuery(
    trpc.serviceCatalog.list.queryOptions({ includeInactive: true }),
  );
  const seriesQuery = useQuery(
    trpc.classSeries.list.queryOptions({ statuses: ["ACTIVE", "PAUSED"] }),
  );
  const [scopeMode, setScopeMode] = useState<ScopeMode>("ANY");
  const form = useForm<ClassBookedTriggerConfig>({
    resolver: zodResolver(classBookedTriggerConfigSchema),
    defaultValues: {
      variableName: "bookedClass",
      serviceTypeIds: [],
      serviceTypeNames: [],
      classSeriesIds: [],
      classSeriesNames: [],
      firstBookingOnly: false,
      triggerTiming: "BOOKED",
    },
  });

  useEffect(() => {
    if (!props.open) return;
    const serviceTypeIds = props.defaultValues?.serviceTypeIds ?? [];
    const classSeriesIds = props.defaultValues?.classSeriesIds ?? [];
    form.reset({
      variableName: props.defaultValues?.variableName ?? "bookedClass",
      serviceTypeIds,
      serviceTypeNames: props.defaultValues?.serviceTypeNames ?? [],
      classSeriesIds,
      classSeriesNames: props.defaultValues?.classSeriesNames ?? [],
      classId: props.defaultValues?.classId,
      className: props.defaultValues?.className,
      firstBookingOnly: props.defaultValues?.firstBookingOnly ?? false,
      triggerTiming: props.defaultValues?.triggerTiming ?? "BOOKED",
    });
    setScopeMode(
      props.defaultValues?.classId
        ? "CLASS"
        : classSeriesIds.length > 0
          ? "SERIES"
          : serviceTypeIds.length > 0
            ? "SERVICES"
            : "ANY",
    );
  }, [form, props.defaultValues, props.open]);

  const selectedIds = form.watch("serviceTypeIds") ?? [];
  const selectedSeriesIds = form.watch("classSeriesIds") ?? [];
  const options = (servicesQuery.data ?? []).map((service) => ({
    id: service.id,
    label: service.name,
    description: [service.categoryName, service.experienceType.toLowerCase()]
      .filter(Boolean)
      .join(" / "),
  }));
  const seriesOptions = (seriesQuery.data ?? []).map((series) => ({
    id: series.id,
    label: series.name,
    description: series.serviceTypeName ?? "No service",
  }));

  function toggleService(id: string, selected: boolean): void {
    form.setValue(
      "serviceTypeIds",
      selected
        ? Array.from(new Set([...selectedIds, id]))
        : selectedIds.filter((selectedId) => selectedId !== id),
      { shouldDirty: true, shouldValidate: true },
    );
  }

  function toggleSeries(id: string, selected: boolean): void {
    form.setValue(
      "classSeriesIds",
      selected
        ? Array.from(new Set([...selectedSeriesIds, id]))
        : selectedSeriesIds.filter((selectedId) => selectedId !== id),
      { shouldDirty: true, shouldValidate: true },
    );
  }

  return (
    <StudioNodeDialogLayout
      open={props.open}
      onOpenChange={props.onOpenChange}
      title="Class booked trigger"
      description="Start this workflow for any class, selected services, a recurring series, or one class date."
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) => {
            if (scopeMode === "SERVICES" && selectedIds.length === 0) {
              form.setError("serviceTypeIds", {
                message: "Choose at least one service.",
              });
              return;
            }
            if (scopeMode === "SERIES" && selectedSeriesIds.length === 0) {
              form.setError("classSeriesIds", {
                message: "Choose at least one class series.",
              });
              return;
            }
            props.onSubmit({
              ...values,
              classId: scopeMode === "CLASS" ? values.classId : undefined,
              className: scopeMode === "CLASS" ? values.className : undefined,
              serviceTypeIds:
                scopeMode === "SERVICES" ? values.serviceTypeIds : [],
              serviceTypeNames: options
                .filter(
                  (option) =>
                    scopeMode === "SERVICES" && selectedIds.includes(option.id),
                )
                .map((option) => option.label),
              classSeriesIds:
                scopeMode === "SERIES" ? values.classSeriesIds : [],
              classSeriesNames: seriesOptions
                .filter(
                  (option) =>
                    scopeMode === "SERIES" &&
                    selectedSeriesIds.includes(option.id),
                )
                .map((option) => option.label),
              firstBookingOnly: values.firstBookingOnly,
            });
            props.onOpenChange(false);
          })}
          className="space-y-6 px-6"
        >
          <FormField
            control={form.control}
            name="triggerTiming"
            render={({ field }) => (
              <FormItem>
                <FormLabel>When should it start?</FormLabel>
                <Select
                  value={field.value ?? "BOOKED"}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="BOOKED">When the class is booked</SelectItem>
                    <SelectItem value="ONE_HOUR_BEFORE">
                      One hour before class
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Choose the booking event or the scheduled pre-class moment.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="firstBookingOnly"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between gap-4 rounded border border-border p-4">
                <div>
                  <FormLabel>First class booking only</FormLabel>
                  <FormDescription className="mt-1">
                    Use only the member&apos;s first class reservation.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="serviceTypeIds"
            render={() => (
              <FormItem>
                <FormLabel>Classes</FormLabel>
                <Select
                  value={scopeMode}
                  onValueChange={(value) => {
                    const nextMode: ScopeMode =
                      value === "SERVICES"
                        ? "SERVICES"
                        : value === "SERIES"
                          ? "SERIES"
                          : value === "CLASS"
                            ? "CLASS"
                            : "ANY";
                    setScopeMode(nextMode);
                    if (nextMode !== "SERVICES") {
                      form.setValue("serviceTypeIds", [], {
                        shouldDirty: true,
                      });
                    }
                    if (nextMode !== "SERIES") {
                      form.setValue("classSeriesIds", [], {
                        shouldDirty: true,
                      });
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANY">Any class</SelectItem>
                    <SelectItem value="SERVICES">Selected services</SelectItem>
                    <SelectItem value="SERIES">
                      Selected class series
                    </SelectItem>
                    {form.getValues("classId") ? (
                      <SelectItem value="CLASS">This class date</SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
                {scopeMode === "SERVICES" ? (
                  <StudioResourceCheckboxList
                    options={options}
                    selectedIds={selectedIds}
                    loading={servicesQuery.isLoading}
                    emptyMessage="Create a service before restricting this trigger."
                    onToggle={toggleService}
                  />
                ) : null}
                {scopeMode === "SERIES" ? (
                  <>
                    <StudioResourceCheckboxList
                      options={seriesOptions}
                      selectedIds={selectedSeriesIds}
                      loading={seriesQuery.isLoading}
                      emptyMessage="Create a recurring series before restricting this trigger."
                      onToggle={toggleSeries}
                    />
                    {form.formState.errors.classSeriesIds?.message ? (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.classSeriesIds.message}
                      </p>
                    ) : null}
                  </>
                ) : null}
                {scopeMode === "CLASS" ? (
                  <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
                    {form.getValues("className") ?? "Selected class"}
                  </p>
                ) : null}
                <FormDescription>
                  {scopeMode === "CLASS"
                    ? "Only bookings for this exact class date will enroll."
                    : scopeMode === "SERIES"
                      ? "Every generated class date in the selected series will enroll."
                      : "Services remain stable across recurring series and individual class dates."}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="variableName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Variable name</FormLabel>
                <FormControl>
                  <Input placeholder="bookedClass" {...field} />
                </FormControl>
                <FormDescription>
                  Booking, member, and class data are available to later nodes.
                  Change this only for advanced workflows.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <StudioNodeDialogFooter />
        </form>
      </Form>
    </StudioNodeDialogLayout>
  );
}
