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
  mode: "organization" | "subaccount";
  organizationId?: string;
  subaccountId?: string;
  onSuccess?: () => void;
}

export function InviteMemberDialog({
  open,
  onOpenChange,
  mode,
  organizationId,
  subaccountId,
  onSuccess,
}: InviteMemberDialogProps) {
  const trpc = useTRPC();
  const [email, setEmail] = useState("");
  const [selectedAgencyMemberId, setSelectedAgencyMemberId] = useState<
    string | null
  >(null);
  const [role, setRole] = useState<string>(
    mode === "organization" ? "viewer" : "STANDARD"
  );

  // Fetch agency team members (always fetch, but only use in subaccount mode)
  const { data: agencyMembers = [] } = useSuspenseQuery(
    trpc.organizations.getAgencyTeamMembers.queryOptions()
  );

  const inviteToOrganization = useMutation(
    trpc.organizations.inviteToOrganization.mutationOptions()
  );

  const inviteToSubaccount = useMutation(
    trpc.organizations.inviteToSubaccount.mutationOptions()
  );

  const isLoading =
    inviteToOrganization.isPending || inviteToSubaccount.isPending;

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
        await inviteToSubaccount.mutateAsync({
          email: email.trim(),
          role: role as
            | "AGENCY"
            | "ADMIN"
            | "MANAGER"
            | "STANDARD"
            | "LIMITED"
            | "VIEWER",
          subaccountId,
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
            <InviteIcon className="size-5" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            {mode === "organization"
              ? "Invite someone to join your agency"
              : "Invite someone to join this client's workspace"}
          </DialogDescription>
        </DialogHeader>

        <Separator className="bg-black/10 dark:bg-white/5" />

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 pt-2 px-6">
            {mode === "subaccount" && agencyMembers.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="agency-member" className="text-xs">
                  Select Agency Team Member
                </Label>
                <Select
                  value={selectedAgencyMemberId || "manual"}
                  onValueChange={handleAgencyMemberSelect}
                  disabled={isLoading}
                >
                  <SelectTrigger id="agency-member">
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
                  Select from your agency team or enter a new email below
                </p>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="email" className="text-xs">
                Email Address
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
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>

                <SelectContent>
                  {mode === "organization" ? (
                    <>
                      <SelectItem value="owner">Agency Owner</SelectItem>
                      <SelectItem value="admin">Agency Admin</SelectItem>
                      <SelectItem value="manager">Agency Manager</SelectItem>
                      <SelectItem value="staff">Agency Staff</SelectItem>
                      <SelectItem value="viewer">Agency Viewer</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="AGENCY">Agency Team</SelectItem>
                      <SelectItem value="ADMIN">Subaccount Admin</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                      <SelectItem value="STANDARD">Standard User</SelectItem>
                      <SelectItem value="LIMITED">Limited User</SelectItem>
                      <SelectItem value="VIEWER">Viewer</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-primary/60">
                {mode === "organization" ? (
                  <>Select role for agency team member</>
                ) : role === "AGENCY" ? (
                  "Agency team member with full access"
                ) : role === "ADMIN" ? (
                  "Full control within this subaccount"
                ) : role === "MANAGER" ? (
                  "Can assign tasks and manage operations"
                ) : role === "STANDARD" ? (
                  "Day-to-day operations (default)"
                ) : role === "LIMITED" ? (
                  "Access only assigned tasks"
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
