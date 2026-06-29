"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/client";
import {
  csvToList,
  EXPERIENCE_OPTIONS,
  FORMAT_OPTIONS,
  PAYMENT_OPTIONS,
  VISIBILITY_OPTIONS,
} from "./constants";

type ServiceTypeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ExperienceType = (typeof EXPERIENCE_OPTIONS)[number]["value"];
type FormatType = (typeof FORMAT_OPTIONS)[number]["value"];
type PaymentType = (typeof PAYMENT_OPTIONS)[number]["value"];
type VisibilityType = (typeof VISIBILITY_OPTIONS)[number]["value"];

function optionalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  return Number(value);
}

export function ServiceTypeDialog({
  open,
  onOpenChange,
}: ServiceTypeDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: categories = [] } = useQuery(
    trpc.serviceCatalog.categories.queryOptions(),
  );
  const { data: classTypes = [] } = useQuery(
    trpc.classTypes.list.queryOptions({ includeInactive: false }),
  );

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("none");
  const [classTypeId, setClassTypeId] = React.useState("none");
  const [experienceType, setExperienceType] =
    React.useState<ExperienceType>("CLASS");
  const [format, setFormat] = React.useState<FormatType>("IN_PERSON");
  const [durationMinutes, setDurationMinutes] = React.useState("60");
  const [capacity, setCapacity] = React.useState("");
  const [bufferMinutes, setBufferMinutes] = React.useState("0");
  const [paymentType, setPaymentType] =
    React.useState<PaymentType>("PACKAGE_ONLY");
  const [visibility, setVisibility] = React.useState<VisibilityType>("PUBLIC");
  const [price, setPrice] = React.useState("");
  const [minPrice, setMinPrice] = React.useState("");
  const [maxPrice, setMaxPrice] = React.useState("");
  const [revenueCategory, setRevenueCategory] = React.useState("");
  const [restrictionTags, setRestrictionTags] = React.useState("");
  const [focus, setFocus] = React.useState("");
  const [equipment, setEquipment] = React.useState("");
  const [checkoutConfirmation, setCheckoutConfirmation] = React.useState("");
  const [confirmationEmail, setConfirmationEmail] = React.useState("");
  const [allowUnpaidBookings, setAllowUnpaidBookings] = React.useState(false);
  const [allowRecurringBookings, setAllowRecurringBookings] =
    React.useState(false);

  const createService = useMutation(
    trpc.serviceCatalog.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.serviceCatalog.list.queryOptions({ includeInactive: true }),
        );
        toast.success("Service type created");
        onOpenChange(false);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  function handleCreate(): void {
    createService.mutate({
      name,
      description: description || null,
      categoryId: categoryId === "none" ? null : categoryId,
      classTypeId: classTypeId === "none" ? null : classTypeId,
      experienceType,
      format,
      durationMinutes: optionalNumber(durationMinutes) ?? 60,
      capacity: optionalNumber(capacity),
      bufferMinutes: optionalNumber(bufferMinutes) ?? 0,
      paymentType,
      visibility,
      price: optionalNumber(price),
      slidingScaleMinPrice: optionalNumber(minPrice),
      slidingScaleMaxPrice: optionalNumber(maxPrice),
      currency: "GBP",
      revenueCategory: revenueCategory || null,
      bookingRestrictionTags: csvToList(restrictionTags),
      workoutTypes: [],
      areasOfFocus: csvToList(focus),
      equipment: csvToList(equipment),
      checkoutConfirmation: checkoutConfirmation || null,
      confirmationEmailBody: confirmationEmail || null,
      allowUnpaidBookings,
      allowRecurringBookings,
      displayImageAtCheckout: true,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create service type</DialogTitle>
        </DialogHeader>
        <div className="grid max-h-[70vh] gap-4 overflow-y-auto pr-1 md:grid-cols-2">
          <Field label="Name">
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Experience">
            <Select
              value={experienceType}
              onValueChange={(value) => setExperienceType(value as ExperienceType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPERIENCE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Description" className="md:col-span-2">
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </Field>
          <Field label="Category">
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No category</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Legacy class type">
            <Select value={classTypeId} onValueChange={setClassTypeId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No linked class type</SelectItem>
                {classTypes.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Format">
            <Select value={format} onValueChange={(value) => setFormat(value as FormatType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORMAT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Visibility">
            <Select
              value={visibility}
              onValueChange={(value) => setVisibility(value as VisibilityType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Duration minutes">
            <Input value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} />
          </Field>
          <Field label="Capacity">
            <Input value={capacity} onChange={(event) => setCapacity(event.target.value)} />
          </Field>
          <Field label="Buffer minutes">
            <Input value={bufferMinutes} onChange={(event) => setBufferMinutes(event.target.value)} />
          </Field>
          <Field label="Payment">
            <Select
              value={paymentType}
              onValueChange={(value) => setPaymentType(value as PaymentType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Price">
            <Input value={price} onChange={(event) => setPrice(event.target.value)} />
          </Field>
          <Field label="Sliding scale min">
            <Input value={minPrice} onChange={(event) => setMinPrice(event.target.value)} />
          </Field>
          <Field label="Sliding scale max">
            <Input value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} />
          </Field>
          <Field label="Revenue category">
            <Input value={revenueCategory} onChange={(event) => setRevenueCategory(event.target.value)} />
          </Field>
          <Field label="Booking restriction tags">
            <Input value={restrictionTags} onChange={(event) => setRestrictionTags(event.target.value)} />
          </Field>
          <Field label="Areas of focus">
            <Input value={focus} onChange={(event) => setFocus(event.target.value)} />
          </Field>
          <Field label="Equipment">
            <Input value={equipment} onChange={(event) => setEquipment(event.target.value)} />
          </Field>
          <Field label="Checkout confirmation" className="md:col-span-2">
            <Textarea
              value={checkoutConfirmation}
              onChange={(event) => setCheckoutConfirmation(event.target.value)}
              rows={3}
            />
          </Field>
          <Field label="Confirmation email" className="md:col-span-2">
            <Textarea
              value={confirmationEmail}
              onChange={(event) => setConfirmationEmail(event.target.value)}
              rows={3}
            />
          </Field>
          <ToggleRow
            label="Allow unpaid bookings"
            checked={allowUnpaidBookings}
            onCheckedChange={setAllowUnpaidBookings}
          />
          <ToggleRow
            label="Allow recurring bookings"
            checked={allowRecurringBookings}
            onCheckedChange={setAllowRecurringBookings}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || createService.isPending}>
            {createService.isPending ? "Creating..." : "Create service"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <div className={className ? `space-y-2 ${className}` : "space-y-2"}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({
  checked,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-sm border border-black/10 p-3 dark:border-white/5">
      <Label>{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
