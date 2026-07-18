"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckIcon,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { TagsInput } from "@/components/ui/tags-input";
import { useTRPC } from "@/trpc/client";
import {
  CALENDAR_COLOR_OPTIONS,
  EXPERIENCE_OPTIONS,
  FORMAT_OPTIONS,
  INTENSITY_OPTIONS,
  optionalNumber,
  PAYMENT_OPTIONS,
  serviceTypeCreateSchema,
  type ServiceTypeCreateInput,
  type ServiceTypeCreateStep,
  type ServiceTypeCreateValues,
  VISIBILITY_OPTIONS,
} from "./service-type-create-constants";
import { ServiceTypeStepIndicator } from "./service-type-step-indicator";

const slideVariants = {
  enter: (direction: number) => ({ opacity: 0, x: direction > 0 ? 28 : -28 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction > 0 ? -28 : 28 }),
};

const stepFields: Record<ServiceTypeCreateStep, Array<keyof ServiceTypeCreateInput>> = {
  0: ["name", "experienceType"],
  1: ["durationMinutes", "bufferMinutes", "visibility"],
  2: ["paymentType"],
  3: [],
  4: [],
};

const stepContent = {
  0: {
    title: "Basic information",
    description: "Name your service and choose its experience type and format.",
  },
  1: {
    title: "Schedule defaults",
    description: "Set the default duration, capacity, buffer, and visibility for this service.",
  },
  2: {
    title: "Pricing",
    description: "Choose how this service is paid for and set the price if applicable.",
  },
  3: {
    title: "Classification",
    description: "Add workout types, focus areas, intensity level, equipment, and tags.",
  },
  4: {
    title: "Publish & checkout",
    description: "Configure checkout copy, confirmation email, and display settings.",
  },
} satisfies Record<ServiceTypeCreateStep, { title: string; description: string }>;

export function NewServiceTypePageClient({
  serviceTypeId,
}: {
  serviceTypeId?: string;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEditing = Boolean(serviceTypeId);
  const [step, setStep] = React.useState<ServiceTypeCreateStep>(0);
  const [direction, setDirection] = React.useState(1);

  const form = useForm<ServiceTypeCreateInput, unknown, ServiceTypeCreateValues>({
    resolver: zodResolver(serviceTypeCreateSchema),
    defaultValues: {
      name: "",
      description: "",
      experienceType: "CLASS",
      format: "IN_PERSON",
      categoryId: "none",
      classTypeId: "none",
      durationMinutes: 60,
      capacity: "",
      bufferMinutes: 0,
      defaultLocation: "",
      roomIds: [],
      instructorIds: [],
      visibility: "PUBLIC",
      paymentType: "PACKAGE_ONLY",
      price: "",
      slidingScaleMinPrice: "",
      slidingScaleMaxPrice: "",
      revenueCategory: "",
      bookingRestrictionTags: [],
      workoutTypes: [],
      areasOfFocus: [],
      intensity: "none",
      equipment: [],
      checkoutConfirmation: "",
      confirmationEmailBody: "",
      imageUrl: "",
      allowUnpaidBookings: false,
      delaySchedulingHours: "",
      allowRecurringBookings: false,
      displayImageAtCheckout: true,
      calendarColor: CALENDAR_COLOR_OPTIONS[0],
    },
  });

  const paymentType = form.watch("paymentType");
  const calendarColor = form.watch("calendarColor");

  const categoriesQuery = useQuery(
    trpc.serviceCatalog.categories.queryOptions(),
  );
  const categories = categoriesQuery.data ?? [];
  const { data: classTypes = [] } = useQuery(
    trpc.classTypes.list.queryOptions({ includeInactive: false }),
  );
  const { data: revenueCategories = [] } = useQuery(
    trpc.pricingOptions.revenueCategories.queryOptions(),
  );
  const { data: locations = [] } = useQuery(
    trpc.organizations.getClients.queryOptions(),
  );
  const { data: rooms = [] } = useQuery(trpc.rooms.list.queryOptions());
  const { data: instructors } = useQuery(
    trpc.instructors.list.queryOptions({ pageSize: 100 }),
  );
  const serviceQuery = useQuery({
    ...trpc.serviceCatalog.getById.queryOptions({ id: serviceTypeId ?? "" }),
    enabled: isEditing,
  });
  const serviceListQuery = useQuery({
    ...trpc.serviceCatalog.list.queryOptions({ includeInactive: true }),
    enabled: isEditing,
  });
  const existingCategoryId = React.useMemo(() => {
    const service = serviceQuery.data;
    if (!service) return "none";
    const listedService = serviceListQuery.data?.find(
      (item) => item.id === service.id,
    );
    return (
      categories.find(
        (category) =>
          category.id === service.categoryId ||
          category.id === listedService?.categoryId ||
          category.name === listedService?.categoryName,
      )?.id ?? "none"
    );
  }, [categories, serviceListQuery.data, serviceQuery.data]);

  React.useEffect(() => {
    const service = serviceQuery.data;
    if (
      !service ||
      !categoriesQuery.isSuccess ||
      !serviceListQuery.isSuccess
    ) {
      return;
    }
    form.reset({
      name: service.name,
      description: service.description ?? "",
      experienceType: service.experienceType,
      format: service.format,
      categoryId: existingCategoryId,
      classTypeId: service.classTypeId ?? "none",
      durationMinutes: service.durationMinutes,
      capacity: service.capacity == null ? "" : String(service.capacity),
      bufferMinutes: service.bufferMinutes,
      defaultLocation: service.defaultLocation ?? "",
      roomIds: service.roomIds ?? [],
      instructorIds: service.instructorIds ?? [],
      visibility: service.visibility,
      paymentType: service.paymentType,
      price: service.price ?? "",
      slidingScaleMinPrice: service.slidingScaleMinPrice ?? "",
      slidingScaleMaxPrice: service.slidingScaleMaxPrice ?? "",
      revenueCategory: service.revenueCategory ?? "",
      bookingRestrictionTags: service.bookingRestrictionTags ?? [],
      workoutTypes: service.workoutTypes ?? [],
      areasOfFocus: service.areasOfFocus ?? [],
      intensity: service.intensity ?? "none",
      equipment: service.equipment ?? [],
      checkoutConfirmation: service.checkoutConfirmation ?? "",
      confirmationEmailBody: service.confirmationEmailBody ?? "",
      imageUrl: service.imageUrl ?? "",
      allowUnpaidBookings: service.allowUnpaidBookings,
      delaySchedulingHours:
        service.delaySchedulingHours == null
          ? ""
          : String(service.delaySchedulingHours),
      allowRecurringBookings: service.allowRecurringBookings,
      displayImageAtCheckout: service.displayImageAtCheckout,
      calendarColor: service.calendarColor ?? CALENDAR_COLOR_OPTIONS[0],
    });
  }, [
    categories,
    categoriesQuery.isSuccess,
    existingCategoryId,
    form,
    serviceListQuery.data,
    serviceListQuery.isSuccess,
    serviceQuery.data,
  ]);

  const createService = useMutation(
    trpc.serviceCatalog.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.serviceCatalog.list.queryOptions({ includeInactive: true }),
        );
        toast.success("Service type created");
        router.push("/studio/service-types");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const updateService = useMutation(
    trpc.serviceCatalog.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.serviceCatalog.list.queryOptions({ includeInactive: true }),
        );
        toast.success("Service type updated");
        router.push("/studio/service-types");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  async function goNext(): Promise<void> {
    const isValid = await form.trigger(stepFields[step]);
    if (!isValid) return;
    setDirection(1);
    setStep((current) => Math.min(4, current + 1) as ServiceTypeCreateStep);
  }

  function goBack(): void {
    setDirection(-1);
    setStep((current) => Math.max(0, current - 1) as ServiceTypeCreateStep);
  }

  function handleSave(values: ServiceTypeCreateValues): void {
    if (step !== 4) {
      void goNext();
      return;
    }

    const selectedCategoryId = values.categoryId || existingCategoryId;
    const input = {
      name: values.name,
      description: values.description || null,
      categoryId:
        selectedCategoryId === "none" ? null : selectedCategoryId,
      classTypeId:
        values.classTypeId === "none" ? null : values.classTypeId,
      experienceType: values.experienceType,
      format: values.format,
      defaultLocation: values.defaultLocation || null,
      durationMinutes: Number(values.durationMinutes) || 60,
      capacity: optionalNumber(values.capacity),
      bufferMinutes: Number(values.bufferMinutes) || 0,
      roomIds: values.roomIds,
      instructorIds: values.instructorIds,
      paymentType: values.paymentType,
      visibility: values.visibility,
      price: optionalNumber(values.price),
      slidingScaleMinPrice: optionalNumber(values.slidingScaleMinPrice),
      slidingScaleMaxPrice: optionalNumber(values.slidingScaleMaxPrice),
      revenueCategory: values.revenueCategory || null,
      bookingRestrictionTags: values.bookingRestrictionTags,
      workoutTypes: values.workoutTypes,
      areasOfFocus: values.areasOfFocus,
      intensity: values.intensity === "none" ? null : values.intensity,
      equipment: values.equipment,
      checkoutConfirmation: values.checkoutConfirmation || null,
      confirmationEmailBody: values.confirmationEmailBody || null,
      imageUrl: values.imageUrl || null,
      allowUnpaidBookings: values.allowUnpaidBookings,
      delaySchedulingHours: optionalNumber(values.delaySchedulingHours),
      allowRecurringBookings: values.allowRecurringBookings,
      displayImageAtCheckout: values.displayImageAtCheckout,
      calendarColor: values.calendarColor,
    };
    if (serviceTypeId) {
      if (!serviceQuery.data?.currency) {
        toast.error("Service currency could not be loaded");
        return;
      }
      updateService.mutate({
        id: serviceTypeId,
        ...input,
        currency: serviceQuery.data.currency,
      });
      return;
    }
    createService.mutate(input);
  }

  if (isEditing && serviceQuery.isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center gap-2 text-xs text-primary/50">
        <LoaderCircle className="size-4 animate-spin" />
        Loading service type...
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center px-6 py-10">
      <div className="mb-6 space-y-1">
        <h1 className="text-lg font-semibold text-primary">
          {isEditing ? "Edit service type" : "Create service type"}
        </h1>
        <p className="text-xs text-primary/60">
          {isEditing
            ? `Update ${serviceQuery.data?.name ?? "this service"}'s schedule, pricing, and checkout defaults.`
            : "Configure the schedule, pricing, classification, and checkout defaults."}
        </p>
      </div>

      <ServiceTypeStepIndicator current={step} />

      <Card className="overflow-hidden shadow-none">
        <CardHeader className="gap-0">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="space-y-1"
            >
              <CardTitle>{stepContent[step].title}</CardTitle>
              <CardDescription className="mt-2 text-xs">
                {stepContent[step].description}
              </CardDescription>
            </motion.div>
          </AnimatePresence>
        </CardHeader>

        <Separator />

        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSave)}
              className="space-y-6"
            >
              <AnimatePresence mode="wait" custom={direction} initial={false}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                  className="space-y-5"
                >
                  {step === 0 && (
                    <BasicsStep
                      categories={categories}
                      existingCategoryId={existingCategoryId}
                    />
                  )}
                  {step === 1 && (
                    <ScheduleStep
                      instructors={instructors?.items ?? []}
                      locations={locations.map((location) => ({
                        id: location.locationId,
                        name: location.name,
                      }))}
                      rooms={rooms}
                    />
                  )}
                  {step === 2 && (
                    <PaymentStep
                      revenueCategories={revenueCategories}
                      paymentType={paymentType}
                    />
                  )}
                  {step === 3 && (
                    <ClassificationStep classTypes={classTypes} />
                  )}
                  {step === 4 && <PublishStep calendarColor={calendarColor} />}
                </motion.div>
              </AnimatePresence>

              <div className="flex gap-3">
                {step > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={goBack}
                    className="gap-1.5"
                  >
                    <ChevronLeft className="size-3.5" />
                    Back
                  </Button>
                ) : (
                  <Button asChild variant="ghost">
                    <Link href="/studio/service-types">Cancel</Link>
                  </Button>
                )}

                {step < 4 ? (
                  <Button
                    type="button"
                    variant="gradient"
                    className="flex-1"
                    onClick={goNext}
                  >
                    Continue
                    <ChevronRight className="size-3.5" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="gradient"
                    className="flex-1"
                    disabled={createService.isPending || updateService.isPending}
                  >
                    {createService.isPending || updateService.isPending
                      ? "Saving..."
                      : isEditing
                        ? "Save changes"
                        : "Create service type"}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

function BasicsStep({
  categories,
  existingCategoryId,
}: {
  categories: Array<{ id: string; name: string }>;
  existingCategoryId: string;
}) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Reformer Flow" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="experienceType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Experience type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {EXPERIENCE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea
                rows={3}
                placeholder="Short description of this service..."
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select
                value={field.value || existingCategoryId}
                onValueChange={field.onChange}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="format"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Format</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {FORMAT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );
}

function ScheduleStep({
  instructors,
  locations,
  rooms,
}: {
  instructors: Array<{ id: string; name: string; email: string | null }>;
  locations: Array<{ id: string; name: string }>;
  rooms: Array<{ id: string; name: string; capacity: number | null }>;
}) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <FormField
          name="durationMinutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration (minutes)</FormLabel>
              <FormControl>
                <Input type="number" min="1" max="1440" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="capacity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Capacity</FormLabel>
              <FormControl>
                <Input type="number" min="1" placeholder="No limit" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="bufferMinutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Buffer (minutes)</FormLabel>
              <FormControl>
                <Input type="number" min="0" max="240" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        name="defaultLocation"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Default location</FormLabel>
            <Select
              value={field.value || "none"}
              onValueChange={(value) =>
                field.onChange(value === "none" ? "" : value)
              }
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="none">No default location</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.name}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        name="visibility"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Visibility</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {VISIBILITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        name="roomIds"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Available rooms</FormLabel>
            <Select
              value={
                field.value.length > 1
                  ? "multiple"
                  : field.value[0] ?? "all"
              }
              onValueChange={(value) =>
                field.onChange(value === "all" ? [] : [value])
              }
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a room" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {field.value.length > 1 && (
                  <SelectItem value="multiple" disabled>
                    {field.value.length} rooms selected
                  </SelectItem>
                )}
                <SelectItem value="all">All rooms</SelectItem>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.capacity
                      ? `${room.name} (${room.capacity})`
                      : room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        name="instructorIds"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Eligible team members</FormLabel>
            <Select
              value={
                field.value.length > 1
                  ? "multiple"
                  : field.value[0] ?? "all"
              }
              onValueChange={(value) =>
                field.onChange(value === "all" ? [] : [value])
              }
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {field.value.length > 1 && (
                  <SelectItem value="multiple" disabled>
                    {field.value.length} team members selected
                  </SelectItem>
                )}
                <SelectItem value="all">All team members</SelectItem>
                {instructors.map((instructor) => (
                  <SelectItem key={instructor.id} value={instructor.id}>
                    {instructor.email
                      ? `${instructor.name} - ${instructor.email}`
                      : instructor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

function PaymentStep({
  revenueCategories,
  paymentType,
}: {
  revenueCategories: string[];
  paymentType: string;
}) {
  return (
    <>
      <FormField
        name="paymentType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Payment type</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {PAYMENT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      {paymentType === "PAID" && (
        <FormField
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price</FormLabel>
              <FormControl>
                <Input type="number" min="0" step="0.01" placeholder="0.00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      {paymentType === "SLIDING_SCALE" && (
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            name="slidingScaleMinPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min price</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="slidingScaleMaxPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max price</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
      <RevenueCategoryField
        fallbackPlaceholder="Service revenue"
        options={revenueCategories}
      />
    </>
  );
}

function RevenueCategoryField({
  fallbackPlaceholder,
  options,
}: {
  fallbackPlaceholder: string;
  options: string[];
}) {
  const [search, setSearch] = React.useState("");

  return (
    <FormField
      name="revenueCategory"
      render={({ field }) => {
        const selected = field.value?.trim() ?? "";
        const normalizedSearch = search.trim();
        const visibleOptions = options.filter((option) =>
          option.toLowerCase().includes(search.toLowerCase().trim()),
        );
        const canAdd =
          normalizedSearch.length > 0 &&
          !options.some(
            (option) => option.toLowerCase() === normalizedSearch.toLowerCase(),
          );

        function selectCategory(value: string): void {
          field.onChange(value);
          setSearch("");
        }

        return (
          <FormItem>
            <FormLabel>Revenue category</FormLabel>
            <FormControl>
              <div className="flex min-h-10 w-full flex-wrap gap-2 rounded-sm border border-black/10 bg-background px-2 py-2 text-sm">
                {selected ? (
                  <span className="inline-flex items-center gap-1 rounded-sm border border-violet-300 bg-violet-100 px-2 py-0.5 text-[11px] text-violet-600 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-400">
                    {selected}
                    <button
                      type="button"
                      className="ml-0.5 text-violet-600/60 hover:text-violet-600 dark:text-violet-400/60 dark:hover:text-violet-400"
                      onClick={() => field.onChange("")}
                    >
                      ×
                    </button>
                  </span>
                ) : (
                  <span className="px-2 py-px text-xs text-primary/50">
                    {fallbackPlaceholder}
                  </span>
                )}
                <input
                  className="h-7 flex-1 border-0 bg-transparent p-0 text-xs placeholder:text-primary/75 focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-transparent focus:bg-transparent"
                  placeholder="Search or add category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && normalizedSearch) {
                      event.preventDefault();
                      selectCategory(normalizedSearch);
                    }
                  }}
                />
              </div>
            </FormControl>
            <div className="mt-2 flex flex-wrap gap-2">
              {visibleOptions.length > 0 && (
                <div className="flex w-full flex-wrap gap-1">
                  {visibleOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`rounded-sm px-2 py-0.5 text-[11px] transition ${
                        selected === option
                          ? "bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400"
                          : "bg-primary-foreground/75 text-primary/60 hover:bg-primary-foreground"
                      }`}
                      onClick={() =>
                        selected === option
                          ? selectCategory("")
                          : selectCategory(option)
                      }
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
              {canAdd && (
                <button
                  type="button"
                  className="rounded-sm border border-violet-300 bg-violet-100 px-3 py-0.5 text-[11px] text-violet-600 hover:bg-violet-100 hover:text-violet-500 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-400"
                  onClick={() => selectCategory(normalizedSearch)}
                >
                  Add &quot;{normalizedSearch}&quot;
                </button>
              )}
            </div>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

function ClassificationStep({
  classTypes,
}: {
  classTypes: Array<{ id: string; name: string }>;
}) {
  return (
    <>
      <FormField
        name="classTypeId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Reporting type</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="none">No reporting type</SelectItem>
                {classTypes.map((classType) => (
                  <SelectItem key={classType.id} value={classType.id}>
                    {classType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              Optional. New classes inherit this type for reporting and pricing
              access rules.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          name="workoutTypes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Workout types</FormLabel>
              <FormControl>
                <TagsInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Pilates, Strength..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="areasOfFocus"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Areas of focus</FormLabel>
              <FormControl>
                <TagsInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Core, Total Body..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          name="intensity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Intensity</FormLabel>
              <Select
                value={field.value}
                onValueChange={(value) => field.onChange(value === "none" ? "none" : value)}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">No intensity</SelectItem>
                  {INTENSITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="equipment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Equipment</FormLabel>
              <FormControl>
                <TagsInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Reformer, Ring..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        name="bookingRestrictionTags"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Booking restriction tags</FormLabel>
            <FormControl>
              <TagsInput
                value={field.value}
                onChange={field.onChange}
                placeholder="Add client tag..."
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

function PublishStep({ calendarColor: currentColor }: { calendarColor: string }) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          name="calendarColor"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Calendar color</FormLabel>
              <FormControl>
                <div className="flex items-center gap-2">
                  {CALENDAR_COLOR_OPTIONS.map((color) => (
                    <Button
                      key={color}
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label={`Use ${color}`}
                      aria-pressed={currentColor === color}
                      onClick={() => field.onChange(color)}
                      className="size-8 rounded-sm p-1"
                    >
                      <span
                        className="size-full rounded-sm"
                        style={{ backgroundColor: color }}
                      />
                    </Button>
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preview image URL</FormLabel>
              <FormControl>
                <Input placeholder="https://..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        name="checkoutConfirmation"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Checkout confirmation</FormLabel>
            <FormControl>
              <Textarea
                rows={3}
                placeholder="Displays on the confirmation page after checkout..."
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        name="confirmationEmailBody"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Confirmation email</FormLabel>
            <FormControl>
              <Textarea
                rows={3}
                placeholder="Displays in the confirmation email..."
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          name="delaySchedulingHours"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Delay scheduling (hours)</FormLabel>
              <FormControl>
                <Input type="number" min="0" placeholder="No delay" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div />
      </div>
      <div className="space-y-2">
        <ToggleField
          name="allowUnpaidBookings"
          label="Allow unpaid bookings"
          description="Let clients book without paying upfront."
        />
        <ToggleField
          name="allowRecurringBookings"
          label="Allow recurring bookings"
          description="Enable recurring scheduling for this service."
        />
        <ToggleField
          name="displayImageAtCheckout"
          label="Display image at checkout"
          description="Show the preview image on the checkout page."
        />
      </div>
    </>
  );
}

function ToggleField({
  checked,
  description,
  label,
  name,
}: {
  checked?: boolean;
  description: string;
  label: string;
  name: "allowUnpaidBookings" | "allowRecurringBookings" | "displayImageAtCheckout";
}) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-center justify-between gap-4 rounded-sm border border-black/10 p-3 dark:border-white/5">
          <div className="space-y-1">
            <FormLabel>{label}</FormLabel>
            <p className="text-xs text-primary/50">{description}</p>
          </div>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />
  );
}
