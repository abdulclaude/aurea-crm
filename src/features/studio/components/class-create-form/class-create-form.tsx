"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useTRPC } from "@/trpc/client";
import { BasicFields } from "./basic-fields";
import { BookingPolicyFields } from "./booking-policy-fields";
import { CapacityFields } from "./capacity-fields";
import { FormSection } from "./form-section";
import { PricingFields } from "./pricing-fields";
import { ScheduleFields } from "./schedule-fields";
import {
  classFormSchema,
  optionalInteger,
  optionalString,
  type ClassFormValues,
} from "./schema";

const DEFAULT_START_TIME = "09:00";
const DEFAULT_END_TIME = "10:00";

export function ClassCreateForm() {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      name: "",
      description: "",
      serviceTypeId: "",
      classTypeId: "",
      instructorId: "",
      roomId: "",
      difficulty: "ALL_LEVELS",
      imageUrl: "",
      date: new Date().toISOString().slice(0, 10),
      startTime: DEFAULT_START_TIME,
      endTime: DEFAULT_END_TIME,
      repeatFrequency: "NONE",
      repeatCount: "8",
      maxCapacity: "",
      onlineCapacity: "",
      walkInCapacity: "",
      isVirtual: false,
      spotPickingEnabled: false,
      pricingModel: "PACKAGE_ONLY",
      dropInPrice: "",
      slidingScaleMinPrice: "",
      slidingScaleMaxPrice: "",
      currency: "GBP",
      bookingWindowHours: "168",
      cancellationWindowHours: "12",
      waitlistEnabled: false,
      autoPromoteWaitlist: false,
      onlineBookingEnabled: true,
      cancellationPolicyId: "",
    },
  });

  const { data: classTypes = [] } = useQuery(
    trpc.classTypes.list.queryOptions({}),
  );
  const { data: serviceTypes = [] } = useQuery(
    trpc.serviceCatalog.list.queryOptions({ includeInactive: false }),
  );
  const { data: rooms = [] } = useQuery(trpc.rooms.list.queryOptions());
  const { data: instructorsData } = useQuery(
    trpc.instructors.list.queryOptions({ pageSize: 100 }),
  );
  const { data: cancellationPolicies = [] } = useQuery(
    trpc.cancellationPolicy.list.queryOptions(),
  );

  const createClass = useMutation(
    trpc.studioClassesEnhanced.create.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.studioClassesEnhanced.getSchedule.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.studioClassesEnhanced.stats.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.studioClasses.list.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.studioClasses.stats.queryKey(),
          }),
        ]);
        toast.success("Class created");
        router.push("/studio/classes");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create class");
      },
    }),
  );

  async function onSubmit(values: ClassFormValues): Promise<void> {
    const startTime = new Date(`${values.date}T${values.startTime}`);
    const endTime = new Date(`${values.date}T${values.endTime}`);
    const recurrenceRule = buildRecurrenceRule(values);

    await createClass.mutateAsync({
      name: values.name.trim(),
      description: optionalString(values.description),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      maxCapacity: optionalInteger(values.maxCapacity),
      serviceTypeId: optionalString(values.serviceTypeId),
      classTypeId: optionalString(values.classTypeId),
      instructorId: optionalString(values.instructorId),
      roomId: optionalString(values.roomId),
      difficulty: values.difficulty,
      isVirtual: values.isVirtual,
      bookingWindowHours: optionalInteger(values.bookingWindowHours),
      cancellationWindowHours: optionalInteger(values.cancellationWindowHours),
      pricingModel: values.pricingModel,
      dropInPrice: optionalString(values.dropInPrice),
      slidingScaleMinPrice: optionalString(values.slidingScaleMinPrice),
      slidingScaleMaxPrice: optionalString(values.slidingScaleMaxPrice),
      currency: values.currency.toUpperCase(),
      waitlistEnabled: values.waitlistEnabled,
      autoPromoteWaitlist: values.waitlistEnabled
        ? values.autoPromoteWaitlist
        : false,
      onlineBookingEnabled: values.onlineBookingEnabled,
      onlineCapacity: optionalInteger(values.onlineCapacity),
      walkInCapacity: optionalInteger(values.walkInCapacity),
      spotPickingEnabled: values.spotPickingEnabled,
      imageUrl: optionalString(values.imageUrl),
      cancellationPolicyId: optionalString(values.cancellationPolicyId),
      isRecurring: values.repeatFrequency !== "NONE",
      recurrenceRule,
    });
  }

  const instructors =
    instructorsData?.items.map((instructor) => ({
      id: instructor.id,
      name: instructor.name,
    })) ?? [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-6">
        <FormSection title="Class details">
            <BasicFields
              form={form}
              serviceTypes={serviceTypes}
              classTypes={classTypes}
              instructors={instructors}
            rooms={rooms}
          />
        </FormSection>
        <FormSection title="Schedule">
          <ScheduleFields form={form} />
        </FormSection>
        <FormSection title="Capacity">
          <CapacityFields form={form} />
        </FormSection>
        <FormSection title="Pricing">
          <PricingFields form={form} />
        </FormSection>
        <FormSection title="Booking policy">
          <BookingPolicyFields
            form={form}
            cancellationPolicies={cancellationPolicies}
          />
        </FormSection>

        <div className="flex justify-end gap-2 px-6">
          <Button asChild variant="ghost">
            <Link href="/studio/classes">Cancel</Link>
          </Button>
          <Button type="submit" disabled={createClass.isPending}>
            <CalendarPlus className="size-4" />
            {createClass.isPending ? "Creating..." : "Create class"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function buildRecurrenceRule(values: ClassFormValues): string | undefined {
  if (values.repeatFrequency === "NONE") return undefined;

  const count = optionalInteger(values.repeatCount) ?? 8;
  if (values.repeatFrequency === "BIWEEKLY") {
    return `FREQ=WEEKLY;INTERVAL=2;COUNT=${count}`;
  }

  return `FREQ=${values.repeatFrequency};COUNT=${count}`;
}
