"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

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
import { WorkspaceLogoUploader } from "@/features/organizations/components/workspace-logo-uploader";
import { useTRPC } from "@/trpc/client";

type WorkspaceDetails =
  | {
      type: "organization";
      data: { id: string; name: string; logo: string | null } | null | undefined;
    }
  | {
      type: "location";
      data:
        | { id: string; companyName: string; logo: string | null }
        | null
        | undefined;
    };

export function WorkspaceGeneralCard(props: {
  workspace: WorkspaceDetails;
  canManage: boolean;
  onSaved: () => Promise<unknown>;
}): React.JSX.Element {
  const trpc = useTRPC();
  const isOrganization = props.workspace.type === "organization";
  const data = props.workspace.data;
  const [name, setName] = React.useState("");
  const [logo, setLogo] = React.useState<string | null>(null);

  React.useEffect(() => {
    setName(
      data
        ? isOrganization
          ? (data as { name: string }).name
          : (data as { companyName: string }).companyName
        : "",
    );
    setLogo(data?.logo ?? null);
  }, [data, isOrganization]);

  const updateOrganization = useMutation(
    trpc.organizations.updateOrganization.mutationOptions(),
  );
  const updateLocation = useMutation(
    trpc.organizations.updateLocation.mutationOptions(),
  );
  const isPending = updateOrganization.isPending || updateLocation.isPending;
  const nameIsInvalid = name.trim().length < 2;

  const save = async (): Promise<void> => {
    if (!data) return;
    try {
      if (isOrganization) {
        await updateOrganization.mutateAsync({
          organizationId: data.id,
          name,
          logo,
        });
      } else {
        await updateLocation.mutateAsync({
          locationId: data.id,
          companyName: name,
          logo,
        });
      }
      await props.onSaved();
      toast.success("Workspace details saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save workspace details");
    }
  };

  return (
    <Card className="max-w-3xl shadow-none">
      <CardHeader>
        <CardTitle role="heading" aria-level={2} className="text-sm">
          {isOrganization ? "Organization identity" : "Location identity"}
        </CardTitle>
        <CardDescription className="text-xs">
          The name and logo shown across this workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-medium">Logo</p>
          <WorkspaceLogoUploader
            value={logo}
            onChange={(value) => setLogo(value ?? null)}
            disabled={!props.canManage || isPending}
            label={isOrganization ? "Organization logo" : "Location logo"}
          />
        </div>
        <div className="max-w-md space-y-2">
          <Label htmlFor="workspace-name" className="text-xs">
            {isOrganization ? "Organization name" : "Location name"}
          </Label>
          <Input
            id="workspace-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={!props.canManage || isPending}
            required
            minLength={2}
            aria-invalid={nameIsInvalid}
            aria-describedby="workspace-name-help"
          />
          <p id="workspace-name-help" className="text-xs text-primary/60">
            {nameIsInvalid ? "Enter at least 2 characters." : "Shown throughout the workspace."}
          </p>
        </div>
      </CardContent>
      <CardFooter className="justify-between gap-3 border-t">
        <Button variant="outline" size="sm" asChild>
          <Link href="/team">Manage team</Link>
        </Button>
        {props.canManage ? (
          <Button size="sm" onClick={save} disabled={isPending || nameIsInvalid}>
            {isPending ? "Saving..." : "Save changes"}
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
