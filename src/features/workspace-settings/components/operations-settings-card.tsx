"use client";

import { useMutation } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EMPTY_OPERATIONS_LOCATION_OVERRIDES } from "@/features/workspace-settings/constants";
import {
  workspaceOperationsValuesSchema,
  type WorkspaceOperationsValues,
} from "@/features/workspace-settings/operations-contracts";
import { resolvedOperationsValues } from "@/features/workspace-settings/lib/operations-settings";
import type { WorkspaceOperationsSettingsView } from "@/features/workspace-settings/server/operations-model";
import { useTRPC } from "@/trpc/client";

import { OperationsSettingsFields } from "./operations-settings-fields";

export function OperationsSettingsCard(props: {
  settings: WorkspaceOperationsSettingsView;
  canManage: boolean;
  onSaved: () => Promise<unknown>;
}): React.JSX.Element {
  const trpc = useTRPC();
  const isLocation = props.settings.scope.locationId !== null;
  const initialValues = isLocation
    ? (props.settings.currentVersion?.values ??
      EMPTY_OPERATIONS_LOCATION_OVERRIDES)
    : resolvedOperationsValues(props.settings.effective);
  const [values, setValues] =
    React.useState<WorkspaceOperationsValues>(initialValues);
  const [changeNote, setChangeNote] = React.useState("");
  const [validationMessage, setValidationMessage] = React.useState<
    string | null
  >(null);
  const saveSettings = useMutation(
    trpc.workspaceSettings.saveOperationsSettings.mutationOptions(),
  );

  React.useEffect(() => {
    setValues(
      isLocation
        ? (props.settings.currentVersion?.values ??
          EMPTY_OPERATIONS_LOCATION_OVERRIDES)
        : resolvedOperationsValues(props.settings.effective),
    );
    setValidationMessage(null);
  }, [isLocation, props.settings]);

  const save = async (): Promise<void> => {
    const parsed = workspaceOperationsValuesSchema.safeParse(values);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Review these settings.";
      setValidationMessage(message);
      return;
    }
    try {
      setValidationMessage(null);
      await saveSettings.mutateAsync({
        values: parsed.data,
        expectedVersion: props.settings.currentVersion?.version ?? null,
        changeNote: changeNote.trim() || null,
      });
      setChangeNote("");
      await props.onSaved();
      toast.success("Operations settings published");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to publish operations settings",
      );
    }
  };

  return (
    <div className="max-w-4xl space-y-4">
      <Alert>
        <AlertTitle>Versioned workspace behavior</AlertTitle>
        <AlertDescription>
          New versions govern future calendar defaults, appointment guest
          validation, and publication snapshots without rewriting history.
        </AlertDescription>
      </Alert>
      {validationMessage ? (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Review operations settings</AlertTitle>
          <AlertDescription>{validationMessage}</AlertDescription>
        </Alert>
      ) : null}
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle role="heading" aria-level={2} className="text-sm">
            {isLocation ? "Location operations" : "Organization operations"}
          </CardTitle>
          <CardDescription className="text-xs">
            {isLocation
              ? "Override only the behavior this location needs. Other fields continue following the organization."
              : "Set the baseline inherited by every location without an override."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OperationsSettingsFields
            settings={props.settings}
            values={values}
            disabled={!props.canManage || saveSettings.isPending}
            onChange={(nextValues) => {
              setValues(nextValues);
              setValidationMessage(null);
            }}
          />
          {props.canManage ? (
            <div className="space-y-2 pt-5">
              <Label htmlFor="operations-change-note" className="text-xs">
                Change note
              </Label>
              <Input
                id="operations-change-note"
                value={changeNote}
                onChange={(event) => setChangeNote(event.target.value)}
                maxLength={240}
                placeholder="Why is this behavior changing?"
              />
            </div>
          ) : null}
        </CardContent>
        {props.canManage ? (
          <CardFooter className="justify-end border-t">
            <Button
              size="sm"
              onClick={save}
              disabled={saveSettings.isPending}
            >
              {saveSettings.isPending
                ? "Publishing..."
                : "Publish new version"}
            </Button>
          </CardFooter>
        ) : null}
      </Card>
    </div>
  );
}
