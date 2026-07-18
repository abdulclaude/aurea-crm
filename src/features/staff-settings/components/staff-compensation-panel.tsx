"use client";

import { useMutation } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type {
  StaffCompensationAssignment,
  StaffCompensationTemplate,
} from "@/features/staff-settings/contracts";
import { useTRPC } from "@/trpc/client";

import {
  StaffCompensationAssignmentCard,
  type StaffCompensationInstructorOption,
} from "./staff-compensation-assignment-card";
import { StaffCompensationAssignmentsTable } from "./staff-compensation-assignments-table";
import { StaffCompensationTemplateCard } from "./staff-compensation-template-card";

export function StaffCompensationPanel(props: {
  canManage: boolean;
  templates: StaffCompensationTemplate[];
  assignments: StaffCompensationAssignment[];
  instructors: StaffCompensationInstructorOption[];
  onSaved: () => Promise<unknown>;
}): React.JSX.Element {
  const trpc = useTRPC();
  const [name, setName] = React.useState("");
  const [hourlyRate, setHourlyRate] = React.useState("");
  const [currency, setCurrency] = React.useState("GBP");
  const [instructorId, setInstructorId] = React.useState("");
  const [templateVersionId, setTemplateVersionId] = React.useState("");
  const create = useMutation(
    trpc.staffSettings.createCompensationTemplate.mutationOptions(),
  );
  const assign = useMutation(
    trpc.staffSettings.assignCompensationTemplate.mutationOptions(),
  );
  const disabled = !props.canManage || create.isPending || assign.isPending;

  const createTemplate = async (): Promise<void> => {
    try {
      await create.mutateAsync({
        name,
        description: null,
        hourlyRate,
        currency,
        changeNote: null,
      });
      setName("");
      setHourlyRate("");
      await props.onSaved();
      toast.success("Compensation template created");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to create compensation template",
      );
    }
  };

  const assignTemplate = async (): Promise<void> => {
    try {
      await assign.mutateAsync({
        instructorId,
        templateVersionId,
        effectiveFrom: new Date(),
      });
      setInstructorId("");
      setTemplateVersionId("");
      await props.onSaved();
      toast.success("Compensation template assigned");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to assign compensation template",
      );
    }
  };

  return (
    <div className="max-w-4xl space-y-4">
      <Alert>
        <AlertTitle>Hourly-rate policy templates</AlertTitle>
        <AlertDescription>
          Assignments preserve the selected template version. Payroll
          calculation and payment execution are not configured here.
        </AlertDescription>
      </Alert>
      <StaffCompensationTemplateCard
        name={name}
        hourlyRate={hourlyRate}
        currency={currency}
        canManage={props.canManage}
        disabled={disabled}
        onNameChange={setName}
        onHourlyRateChange={setHourlyRate}
        onCurrencyChange={setCurrency}
        onCreate={createTemplate}
      />
      <StaffCompensationAssignmentCard
        instructors={props.instructors}
        templates={props.templates}
        instructorId={instructorId}
        templateVersionId={templateVersionId}
        canManage={props.canManage}
        disabled={disabled}
        onInstructorChange={setInstructorId}
        onTemplateVersionChange={setTemplateVersionId}
        onAssign={assignTemplate}
      />
      <StaffCompensationAssignmentsTable assignments={props.assignments} />
    </div>
  );
}
