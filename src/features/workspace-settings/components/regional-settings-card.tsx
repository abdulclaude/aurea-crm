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
import type { WorkspaceRegionalValues } from "@/features/workspace-settings/contracts";
import { EMPTY_LOCATION_OVERRIDES } from "@/features/workspace-settings/constants";
import { resolvedRegionalValues } from "@/features/workspace-settings/lib/regional-settings";
import type { WorkspaceRegionalSettingsView } from "@/features/workspace-settings/server/model";
import { useTRPC } from "@/trpc/client";

import { RegionalSettingsFields } from "./regional-settings-fields";

export function RegionalSettingsCard(props: {
  settings: WorkspaceRegionalSettingsView;
  canManage: boolean;
  onSaved: () => Promise<unknown>;
}): React.JSX.Element {
  const trpc = useTRPC();
  const isLocation = props.settings.scope.locationId !== null;
  const effective = resolvedRegionalValues(props.settings.effective);
  const initialValues = isLocation
    ? (props.settings.currentVersion?.values ?? EMPTY_LOCATION_OVERRIDES)
    : effective;
  const [values, setValues] = React.useState<WorkspaceRegionalValues>(initialValues);
  const [changeNote, setChangeNote] = React.useState("");

  React.useEffect(() => {
    setValues(
      isLocation
        ? (props.settings.currentVersion?.values ?? EMPTY_LOCATION_OVERRIDES)
        : resolvedRegionalValues(props.settings.effective),
    );
  }, [isLocation, props.settings]);

  const saveSettings = useMutation(
    trpc.workspaceSettings.saveRegionalSettings.mutationOptions(),
  );
  const save = async (): Promise<void> => {
    try {
      await saveSettings.mutateAsync({
        values,
        expectedVersion: props.settings.currentVersion?.version ?? null,
        changeNote: changeNote.trim() || null,
      });
      setChangeNote("");
      await props.onSaved();
      toast.success("Regional defaults published");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to publish regional defaults");
    }
  };

  return (
    <div className="max-w-4xl space-y-4">
      <Alert>
        <AlertTitle>Defaults, not historical rewrites</AlertTitle>
        <AlertDescription>
          These values currently govern reports, supported price creation, and
          location scheduling boundaries. Existing records and stored instants
          are unchanged.
        </AlertDescription>
      </Alert>
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle role="heading" aria-level={2} className="text-sm">
            {isLocation ? "Location overrides" : "Organization defaults"}
          </CardTitle>
          <CardDescription className="text-xs">
            {isLocation
              ? "Override only the fields this location needs. Inherited values continue following the organization."
              : "Set the baseline used by locations that have not published an override."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegionalSettingsFields
            settings={props.settings}
            values={values}
            disabled={!props.canManage || saveSettings.isPending}
            onChange={setValues}
          />
          {props.canManage ? (
            <div className="space-y-2 pt-5">
              <Label htmlFor="regional-change-note" className="text-xs">Change note</Label>
              <Input
                id="regional-change-note"
                value={changeNote}
                onChange={(event) => setChangeNote(event.target.value)}
                maxLength={240}
                placeholder="Why are these defaults changing?"
              />
            </div>
          ) : null}
        </CardContent>
        {props.canManage ? (
          <CardFooter className="justify-end border-t">
            <Button size="sm" onClick={save} disabled={saveSettings.isPending}>
              {saveSettings.isPending ? "Publishing..." : "Publish new version"}
            </Button>
          </CardFooter>
        ) : null}
      </Card>
    </div>
  );
}
