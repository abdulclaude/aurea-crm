"use client";

import { useState, useEffect } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { IconLoader as LoaderIcon } from "central-icons/IconLoader";
import { WorkspaceLogoUploader } from "@/features/organizations/components/workspace-logo-uploader";
import { toast } from "sonner";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function WorkspaceSettingsPage() {
  const trpc = useTRPC();

  const {
    data: workspace,
    isLoading,
    refetch,
  } = useQuery(trpc.organizations.getWorkspaceDetails.queryOptions());

  const [name, setName] = useState("");
  const [logo, setLogo] = useState<string | null>(null);

  // Update local state when workspace data is loaded
  useEffect(() => {
    if (workspace) {
      if (workspace.type === "organization") {
        setName(workspace.data?.name || "");
        setLogo(workspace.data?.logo || null);
      } else if (workspace.type === "subaccount") {
        setName(workspace.data?.companyName || "");
        setLogo(workspace.data?.logo || null);
      }
    }
  }, [workspace]);

  const updateOrganization = useMutation(
    trpc.organizations.updateOrganization.mutationOptions()
  );

  const updateSubaccount = useMutation(
    trpc.organizations.updateSubaccount.mutationOptions()
  );

  const handleSave = async () => {
    try {
      if (workspace?.type === "organization") {
        await updateOrganization.mutateAsync({
          organizationId: workspace.data?.id || "",
          name,
          logo,
        });
      } else if (workspace?.type === "subaccount") {
        await updateSubaccount.mutateAsync({
          subaccountId: workspace.data?.id || "",
          companyName: name,
          logo,
        });
      }
      toast.success("Workspace updated successfully");
      refetch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update workspace"
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoaderIcon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">No workspace selected</p>
      </div>
    );
  }

  const isOrganization = workspace.type === "organization";
  const isSubaccount = workspace.type === "subaccount";
  const isPending = updateOrganization.isPending || updateSubaccount.isPending;

  return (
    <div className=" py-8 px-6">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Workspace Settings</h1>
          <Badge variant={isOrganization ? "default" : "secondary"}>
            {isOrganization ? "Agency" : "Client"}
          </Badge>
        </div>
        <p className="text-muted-foreground mt-1">
          Manage your {isOrganization ? "agency" : "client"} workspace
          information
        </p>
      </div>

      <div className="">
        <div className="space-y-6">
          {/* Workspace Logo */}
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Workspace Logo
            </Label>
            <WorkspaceLogoUploader
              value={logo}
              onChange={(url) => setLogo(url ?? null)}
              disabled={isPending}
            />
          </div>

          <Separator />

          {/* Workspace Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              {isOrganization ? "Agency Name" : "Company Name"}
            </Label>

            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              placeholder={`Enter your ${
                isOrganization ? "agency" : "company"
              } name`}
            />
          </div>

          <Separator />

          {/* Members Management Link */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Members</Label>
            <p className="text-sm text-muted-foreground">
              Manage who has access to this workspace
            </p>
            <Button variant="outline" asChild className="w-fit">
              <Link href="/settings/members">Manage Members</Link>
            </Button>
          </div>

          {workspace.data?.members && workspace.data.members.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {workspace.data.members.slice(0, 5).map((member: any) => (
                <div
                  key={member.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md text-xs"
                >
                  {member.user?.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.user.image}
                      alt={member.user.name}
                      className="h-5 w-5 rounded-full"
                    />
                  )}
                  <span>{member.user?.name}</span>
                </div>
              ))}
              {workspace.data.members.length > 5 && (
                <div className="flex items-center px-3 py-1.5 bg-muted rounded-md text-xs text-muted-foreground">
                  +{workspace.data.members.length - 5} more
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Weekly Report (placeholder for future implementation) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Weekly Report</Label>
            <p className="text-sm text-muted-foreground">
              Receive a weekly summary of workspace activity (Coming soon)
            </p>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="weekly-report"
                disabled
                className="h-4 w-4 rounded border-gray-300"
              />
              <label
                htmlFor="weekly-report"
                className="text-sm text-muted-foreground"
              >
                Enable weekly reports
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={isPending}
              className="min-w-[120px]"
            >
              {isPending ? (
                <>
                  <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
