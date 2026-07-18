"use client";

import { useMutation } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  staffOperationsPolicyValuesSchema,
  type StaffOperationsPolicyValues,
  type StaffOperationsPolicyVersion,
} from "@/features/staff-settings/contracts";
import { useTRPC } from "@/trpc/client";

import { StaffProfileAvailabilityCard } from "./staff-profile-availability-card";
import { StaffTimeClockBreaksCard } from "./staff-time-clock-breaks-card";

const DEFAULT_POLICY: StaffOperationsPolicyValues = {
  publicInstructorProfilesByDefault: false,
  availabilityMode: "AVAILABILITY_REQUIRED",
  staffCanEditAvailability: true,
  shiftSwapRequiresApproval: true,
  timeOffRequiresApproval: true,
  timeClockRoundingMinutes: 5,
  breakRequiredAfterMinutes: null,
  minimumBreakMinutes: 0,
  timeEntryApprovalMode: "MANAGER_REQUIRED",
};

export function StaffOperationsPolicyCard(props: {
  currentVersion: StaffOperationsPolicyVersion | null;
  canManage: boolean;
  onSaved: () => Promise<unknown>;
}): React.JSX.Element {
  const trpc = useTRPC();
  const [values, setValues] = React.useState<StaffOperationsPolicyValues>(
    props.currentVersion?.values ?? DEFAULT_POLICY,
  );
  const [changeNote, setChangeNote] = React.useState("");
  const [validationMessage, setValidationMessage] = React.useState<
    string | null
  >(null);
  const save = useMutation(
    trpc.staffSettings.saveOperationsPolicy.mutationOptions(),
  );
  const disabled = !props.canManage || save.isPending;

  React.useEffect(() => {
    setValues(props.currentVersion?.values ?? DEFAULT_POLICY);
    setValidationMessage(null);
  }, [props.currentVersion]);

  const update = <Key extends keyof StaffOperationsPolicyValues>(
    key: Key,
    value: StaffOperationsPolicyValues[Key],
  ): void => {
    setValues((previous) => ({ ...previous, [key]: value }));
    setValidationMessage(null);
  };

  const publish = async (): Promise<void> => {
    const parsed = staffOperationsPolicyValuesSchema.safeParse(values);
    if (!parsed.success) {
      setValidationMessage(
        parsed.error.issues[0]?.message ?? "Review the policy values.",
      );
      return;
    }
    try {
      await save.mutateAsync({
        values: parsed.data,
        expectedVersion: props.currentVersion?.version ?? null,
        changeNote: changeNote.trim() || null,
      });
      setChangeNote("");
      await props.onSaved();
      toast.success("Staff operations policy published");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to publish staff operations policy",
      );
    }
  };

  return (
    <div className="max-w-3xl space-y-4">
      {validationMessage ? (
        <Alert variant="destructive">
          <AlertTitle>Review staff operations</AlertTitle>
          <AlertDescription>{validationMessage}</AlertDescription>
        </Alert>
      ) : null}
      <StaffProfileAvailabilityCard
        values={values}
        disabled={disabled}
        onUpdate={update}
      />
      <StaffTimeClockBreaksCard
        values={values}
        canManage={props.canManage}
        disabled={disabled}
        isPending={save.isPending}
        changeNote={changeNote}
        onChangeNote={setChangeNote}
        onUpdate={update}
        onPublish={publish}
      />
    </div>
  );
}
