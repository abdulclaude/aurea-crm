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
  waitlistValuesSchema,
  type WaitlistPolicyVersionView,
} from "@/features/studio/scheduling/contracts";
import { useTRPC } from "@/trpc/client";

import { toLocalDateTime } from "./format";
import type {
  PolicyEditorMode,
  SchedulingPolicyHistory,
  WaitlistPolicy,
} from "./types";
import { WaitlistFields, type WaitlistFormState } from "./waitlist-fields";

const DEFAULT_VALUES: WaitlistFormState = {
  mode: "MANUAL",
  maxEntries: "",
  allowOverlappingReservations: true,
  offerExpiryMinutes: "15",
};

function isWaitlistVersion(
  version: SchedulingPolicyHistory[number] | undefined,
): version is WaitlistPolicyVersionView {
  return Boolean(version && "mode" in version.values);
}

export function WaitlistPolicyEditorDialog(props: {
  open: boolean;
  mode: PolicyEditorMode;
  policy: WaitlistPolicy | null;
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
      kind: "WAITLIST",
      policyId: props.policy?.id ?? "",
    }),
    enabled: props.open && props.mode === "VERSION" && Boolean(props.policy),
  });
  const latest = history.data?.at(0);

  React.useEffect(() => {
    if (!props.open) return;
    const latestWaitlist = isWaitlistVersion(latest)
      ? latest
      : props.policy?.currentVersion;
    const source =
      props.mode === "VERSION" ? latestWaitlist : props.policy?.currentVersion;
    setName(
      props.mode === "CLONE"
        ? `${props.policy?.name ?? "Waitlist"} copy`
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
            mode:
              source.values.mode === "AUTO_BOOK"
                ? "MANUAL"
                : source.values.mode,
            maxEntries:
              source.values.maxEntries === null
                ? ""
                : String(source.values.maxEntries),
            allowOverlappingReservations:
              source.values.allowOverlappingReservations,
            offerExpiryMinutes: String(source.values.offerExpiryMinutes ?? 15),
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
        ? "Waitlist version published"
        : "Waitlist policy created",
    );
    props.onOpenChange(false);
  };
  const create = useMutation(
    trpc.schedulingPolicy.createWaitlist.mutationOptions({
      onSuccess: closeAfterSave,
      onError: (error) => toast.error(error.message),
    }),
  );
  const version = useMutation(
    trpc.schedulingPolicy.versionWaitlist.mutationOptions({
      onSuccess: closeAfterSave,
      onError: (error) => toast.error(error.message),
    }),
  );
  const pending = create.isPending || version.isPending;
  const maxEntries = values.maxEntries ? Number(values.maxEntries) : null;
  const offerExpiryMinutes =
    values.mode === "OFFER_NEXT" ? Number(values.offerExpiryMinutes) : null;
  const parsedValues = {
    mode: values.mode,
    automationClosesMinutesBeforeStart: 0,
    maxEntries,
    allowOverlappingReservations:
      values.mode === "DISABLED" ? true : values.allowOverlappingReservations,
    creditHoldPolicy: "NONE" as const,
    offerExpiryMinutes,
    failureFallback: "MANUAL_REVIEW" as const,
  };
  const valuesValidation = waitlistValuesSchema.safeParse(parsedValues);
  const effectiveDate = new Date(effectiveFrom);
  const validEffectiveDate = !Number.isNaN(effectiveDate.getTime());
  const validationMessage =
    props.mode !== "VERSION" && !name.trim()
      ? "Enter a policy name."
      : !valuesValidation.success
        ? (valuesValidation.error.issues[0]?.message ??
          "Review the waitlist values.")
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
              ? "Publish waitlist version"
              : "New waitlist policy"}
          </DialogTitle>
          <DialogDescription>
            Manual and offer-next modes are available. Auto-book remains
            unavailable until credit holds and durable promotion operations are
            configured.
          </DialogDescription>
        </DialogHeader>
        {props.mode !== "VERSION" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="waitlist-policy-name">Name</Label>
              <Input
                id="waitlist-policy-name"
                value={name}
                maxLength={120}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="waitlist-policy-description">Description</Label>
              <Textarea
                id="waitlist-policy-description"
                value={description}
                maxLength={500}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
          </div>
        ) : null}
        <WaitlistFields
          value={values}
          disabled={pending}
          onChange={setValues}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="waitlist-policy-effective">Effective from</Label>
            <DateTimePicker
              id="waitlist-policy-effective"
              value={effectiveFrom}
              onChange={setEffectiveFrom}
              disabled={pending}
              required
              dateAriaLabel="Waitlist policy effective date"
              timeAriaLabel="Waitlist policy effective time"
              ariaDescribedBy="waitlist-policy-validation"
              invalid={!validEffectiveDate}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="waitlist-policy-note">Change note</Label>
            <Input
              id="waitlist-policy-note"
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
                htmlFor="waitlist-policy-default"
                className="text-sm font-medium"
              >
                Default for this scope
              </Label>
              <p className="text-xs text-muted-foreground">
                Used when no class or service policy is assigned.
              </p>
            </div>
            <Switch
              id="waitlist-policy-default"
              checked={isDefault}
              onCheckedChange={setIsDefault}
            />
          </div>
        ) : null}
        <p
          id="waitlist-policy-validation"
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
            aria-describedby="waitlist-policy-validation"
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
