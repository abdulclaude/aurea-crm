"use client";

import * as React from "react";
import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { IconLoader as LoaderIcon } from "central-icons/IconLoader";
import { IconInvite as InviteIcon } from "central-icons/IconInvite";
import { Separator } from "@/components/ui/separator";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "organization" | "location";
  organizationId?: string;
  locationId?: string;
  onSuccess?: () => void;
}

export function InviteMemberDialog({
  open,
  onOpenChange,
  mode,
  organizationId,
  locationId,
  onSuccess,
}: InviteMemberDialogProps) {
  const trpc = useTRPC();
  const [email, setEmail] = useState("");
  const [selectedAgencyMemberId, setSelectedAgencyMemberId] = useState<
    string | null
  >(null);
  const [role, setRole] = useState<string>(
    mode === "organization" ? "viewer" : "STANDARD",
  );

  // Fetch agency team members (always fetch, but only use in location mode)
  const { data: agencyMembers = [] } = useSuspenseQuery(
    trpc.organizations.getAgencyTeamMembers.queryOptions(),
  );

  const inviteToOrganization = useMutation(
    trpc.organizations.inviteToOrganization.mutationOptions(),
  );

  const inviteToLocation = useMutation(
    trpc.organizations.inviteToLocation.mutationOptions(),
  );

  const isLoading =
    inviteToOrganization.isPending || inviteToLocation.isPending;

  // When an agency member is selected, auto-fill their email and set role to AGENCY
  const handleAgencyMemberSelect = (userId: string) => {
    if (userId === "manual") {
      setSelectedAgencyMemberId(null);
      setEmail("");
      setRole("STANDARD"); // Reset to default
      return;
    }

    const member = agencyMembers.find((m) => m.userId === userId);
    if (member) {
      setSelectedAgencyMemberId(userId);
      setEmail(member.email);
      // Set role to AGENCY since they're from the agency team
      setRole("AGENCY");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    try {
      if (mode === "organization") {
        await inviteToOrganization.mutateAsync({
          email: email.trim(),
          role: role as "owner" | "admin" | "manager" | "staff" | "viewer",
          organizationId,
        });
        toast.success(`Invitation sent to ${email}`);
      } else {
        await inviteToLocation.mutateAsync({
          email: email.trim(),
          role: role as
            | "AGENCY"
            | "ADMIN"
            | "MANAGER"
            | "STANDARD"
            | "LIMITED"
            | "VIEWER",
          locationId,
        });
        toast.success(`Invitation sent to ${email}`);
      }

      // Reset form
      setEmail("");
      setSelectedAgencyMemberId(null);
      setRole(mode === "organization" ? "viewer" : "STANDARD");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to send invitation");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] px-0 pb-4">
        <DialogHeader className="px-6">
          <DialogTitle className="flex items-center gap-2">
            Invite team member
          </DialogTitle>
          <DialogDescription>
            {mode === "organization"
              ? "Invite someone to join your studio"
              : "Invite someone to join this location"}
          </DialogDescription>
        </DialogHeader>

        <Separator className="bg-black/10 dark:bg-white/5" />

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 pt-2 px-6">
            {mode === "location" && agencyMembers.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="agency-member" className="text-xs">
                  Select studio team member
                </Label>
                <Select
                  value={selectedAgencyMemberId || "manual"}
                  onValueChange={handleAgencyMemberSelect}
                  disabled={isLoading}
                >
                  <SelectTrigger id="agency-member" className="w-full">
                    <SelectValue placeholder="Choose a team member or enter email manually" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">
                      <span className="text-muted-foreground">
                        Enter email manually
                      </span>
                    </SelectItem>
                    {agencyMembers.map((member) => (
                      <SelectItem key={member.userId} value={member.userId}>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-5">
                            <AvatarImage src={member.image || ""} />
                            <AvatarFallback className="text-[10px] text-white">
                              {(
                                member.name?.[0] || member.email[0]
                              ).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex flex-col">
                            <span className="font-medium">{member.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {member.email}
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-primary/60">
                  Select from your studio team or enter a new email below
                </p>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="email" className="text-xs">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  // Clear selection if manually typing
                  if (selectedAgencyMemberId) {
                    setSelectedAgencyMemberId(null);
                  }
                }}
                disabled={isLoading}
                required
              />
              <p className="text-[11px] text-primary/60">
                An invitation email will be sent to this address
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role" className="text-xs">
                Role
              </Label>
              <Select value={role} onValueChange={setRole} disabled={isLoading}>
                <SelectTrigger id="role" className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>

                <SelectContent>
                  {mode === "organization" ? (
                    <>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="staff">Instructor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="AGENCY">Studio team</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                      <SelectItem value="STANDARD">Instructor</SelectItem>
                      <SelectItem value="LIMITED">Front desk</SelectItem>
                      <SelectItem value="VIEWER">Viewer</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-primary/60">
                {mode === "organization" ? (
                  <>Select role for team member</>
                ) : role === "AGENCY" ? (
                  "Studio team member with full access"
                ) : role === "ADMIN" ? (
                  "Full control within this location"
                ) : role === "MANAGER" ? (
                  "Can assign tasks and manage operations"
                ) : role === "STANDARD" ? (
                  "Teach classes and manage own schedule"
                ) : role === "LIMITED" ? (
                  "Check-ins, bookings, and basic tasks"
                ) : role === "VIEWER" ? (
                  "Read-only access"
                ) : (
                  "Select a role for this member"
                )}
              </p>
            </div>
          </div>

          <Separator className="bg-black/10 dark:bg-white/5" />

          <DialogFooter className="px-6 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              variant="gradient"
              className="w-max"
            >
              {isLoading ? (
                <>
                  <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Invitation"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
