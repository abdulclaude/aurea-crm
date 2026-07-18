"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  bookingWindowValuesSchema,
  type BookingWindowPolicyVersionView,
} from "@/features/studio/scheduling/contracts";
import { useTRPC } from "@/trpc/client";

import {
  BookingWindowFields,
  type BookingWindowFormState,
} from "./booking-window-fields";
import { toLocalDateTime } from "./format";
import type {
  BookingWindowPolicy,
  PolicyEditorMode,
  SchedulingPolicyHistory,
} from "./types";

const DEFAULT_VALUES: BookingWindowFormState = {
  opensMinutesBeforeStart: String(7 * 24 * 60),
  closesMinutesBeforeStart: "0",
  cancellationsCloseMinutesBeforeStart: String(12 * 60),
  blockClientCancellations: false,
};

function isBookingWindowVersion(
  version: SchedulingPolicyHistory[number] | undefined,
): version is BookingWindowPolicyVersionView {
  return Boolean(version && "opensMinutesBeforeStart" in version.values);
}

export function BookingPolicyEditorDialog(props: {
  open: boolean;
  mode: PolicyEditorMode;
  policy: BookingWindowPolicy | null;
  onOpenChange: (open: boolean) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isDefault, setIsDefault] = React.useState(false);
  const [effectiveFrom, setEffectiveFrom] = React.useState(toLocalDateTime());
  const [changeNote, setChangeNote] = React.useState("");
  const [values, setValues] = React.useState(DEFAULT_VALUES);
  const history = useQuery({
    ...trpc.schedulingPolicy.history.queryOptions({
      kind: "BOOKING_WINDOW",
      policyId: props.policy?.id ?? "",
    }),
    enabled: props.open && props.mode === "VERSION" && Boolean(props.policy),
  });
  const latest = history.data?.at(0);

  React.useEffect(() => {
    if (!props.open) return;
    const latestBooking = isBookingWindowVersion(latest) ? latest : null;
    const source =
      props.mode === "VERSION" && latestBooking
        ? latestBooking
        : props.policy?.currentVersion;
    setName(
      props.mode === "CLONE"
        ? `${props.policy?.name ?? "Booking window"} copy`
        : props.mode === "CREATE"
          ? ""
          : (props.policy?.name ?? ""),
    );
    setDescription(
      props.mode === "CREATE" ? "" : (props.policy?.description ?? ""),
    );
    setIsDefault(false);
    setEffectiveFrom(toLocalDateTime());
    setChangeNote("");
    setValues(
      source
        ? {
            opensMinutesBeforeStart: String(
              source.values.opensMinutesBeforeStart,
            ),
            closesMinutesBeforeStart: String(
              source.values.closesMinutesBeforeStart,
            ),
            cancellationsCloseMinutesBeforeStart: String(
              source.values.cancellationsCloseMinutesBeforeStart,
            ),
            blockClientCancellations: source.values.blockClientCancellations,
          }
        : DEFAULT_VALUES,
    );
  }, [latest, props.mode, props.open, props.policy]);

  const closeAfterSave = async () => {
    await queryClient.invalidateQueries({
      queryKey: trpc.schedulingPolicy.list.queryKey(),
    });
    toast.success(
      props.mode === "VERSION"
        ? "Booking window version published"
        : "Booking window policy created",
    );
    props.onOpenChange(false);
  };
  const create = useMutation(
    trpc.schedulingPolicy.createBookingWindow.mutationOptions({
      onSuccess: closeAfterSave,
      onError: (error) => toast.error(error.message),
    }),
  );
  const version = useMutation(
    trpc.schedulingPolicy.versionBookingWindow.mutationOptions({
      onSuccess: closeAfterSave,
      onError: (error) => toast.error(error.message),
    }),
  );
  const pending = create.isPending || version.isPending;
  const parsedValues = {
    opensMinutesBeforeStart: Number(values.opensMinutesBeforeStart),
    closesMinutesBeforeStart: Number(values.closesMinutesBeforeStart),
    cancellationsCloseMinutesBeforeStart: Number(
      values.cancellationsCloseMinutesBeforeStart,
    ),
    blockClientCancellations: values.blockClientCancellations,
  };
  const valuesValidation = bookingWindowValuesSchema.safeParse(parsedValues);
  const effectiveDate = new Date(effectiveFrom);
  const validEffectiveDate = !Number.isNaN(effectiveDate.getTime());
  const validationMessage =
    props.mode !== "VERSION" && !name.trim()
      ? "Enter a policy name."
      : !valuesValidation.success
        ? (valuesValidation.error.issues[0]?.message ??
          "Review the booking window values.")
        : !validEffectiveDate
          ? "Choose an effective date and time."
          : props.mode === "VERSION" && history.isError
            ? "The latest policy version could not be loaded."
            : props.mode === "VERSION" && !latest
              ? "Loading the latest policy version."
              : null;
  const valid = validationMessage === null;

  const save = () => {
    const common = {
      effectiveFrom: effectiveDate,
      values: parsedValues,
      changeNote: changeNote.trim() || null,
    };
    if (props.mode === "VERSION" && props.policy && latest) {
      version.mutate({
        policyId: props.policy.id,
        expectedVersion: latest.version,
        ...common,
      });
      return;
    }
    create.mutate({
      name: name.trim(),
      description: description.trim() || null,
      isDefault,
      ...common,
    });
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {props.mode === "VERSION"
              ? "Publish booking window version"
              : "New booking window policy"}
          </DialogTitle>
          <DialogDescription>
            Times are stored as minutes relative to each class start and
            resolved when an occurrence is created.
          </DialogDescription>
        </DialogHeader>
        {props.mode !== "VERSION" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="booking-policy-name">Name</Label>
              <Input
                id="booking-policy-name"
                value={name}
                maxLength={120}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="booking-policy-description">Description</Label>
              <Textarea
                id="booking-policy-description"
                value={description}
                maxLength={500}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
          </div>
        ) : null}
        <BookingWindowFields
          value={values}
          disabled={pending}
          onChange={setValues}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="booking-policy-effective">Effective from</Label>
            <DateTimePicker
              id="booking-policy-effective"
              value={effectiveFrom}
              onChange={setEffectiveFrom}
              disabled={pending}
              required
              dateAriaLabel="Booking policy effective date"
              timeAriaLabel="Booking policy effective time"
              ariaDescribedBy="booking-policy-validation"
              invalid={!validEffectiveDate}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="booking-policy-note">Change note</Label>
            <Input
              id="booking-policy-note"
              value={changeNote}
              maxLength={240}
              onChange={(event) => setChangeNote(event.target.value)}
            />
          </div>
        </div>
        {props.mode !== "VERSION" ? (
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label
                htmlFor="booking-policy-default"
                className="text-sm font-medium"
              >
                Default for this scope
              </Label>
              <p className="text-xs text-muted-foreground">
                Used when no class or service policy is assigned.
              </p>
            </div>
            <Switch
              id="booking-policy-default"
              checked={isDefault}
              onCheckedChange={setIsDefault}
            />
          </div>
        ) : null}
        <p
          id="booking-policy-validation"
          role="status"
          aria-live="polite"
          className="min-h-4 text-xs text-destructive"
        >
          {validationMessage}
        </p>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => props.onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={
              pending || !valid || (props.mode === "VERSION" && !latest)
            }
            aria-describedby="booking-policy-validation"
            onClick={save}
          >
            {pending ? <Loader2 className="animate-spin" /> : null}
            {props.mode === "VERSION" ? "Publish version" : "Create policy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
