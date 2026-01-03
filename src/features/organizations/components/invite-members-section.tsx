"use client";

import * as React from "react";
import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { IconLoader as LoaderIcon } from "central-icons/IconLoader";
import { IconInvite as InviteIcon } from "central-icons/IconInvite";
import { IconCrossMedium as XIcon } from "central-icons/IconCrossMedium";
import { IconCircleCheck as CheckIcon } from "central-icons/IconCircleCheck";
import { IconClockAlert as ClockIcon } from "central-icons/IconClockAlert";
import { formatDistanceToNow } from "date-fns";

interface InviteMembersSectionProps {
  mode: "organization" | "subaccount";
  organizationName: string;
  subaccountName?: string;
}

type TabValue = "pending" | "accepted" | "declined";

export function InviteMembersSection({
  mode,
  organizationName,
  subaccountName,
}: InviteMembersSectionProps) {
  const trpc = useTRPC();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>(
    mode === "organization" ? "viewer" : "STANDARD"
  );
  const [activeTab, setActiveTab] = useState<TabValue>("pending");

  // Fetch invitations
  const { data: invitations = [], refetch } = useSuspenseQuery(
    trpc.organizations.listInvitations.queryOptions()
  );

  const inviteToOrganization = useMutation(
    trpc.organizations.inviteToOrganization.mutationOptions()
  );

  const inviteToSubaccount = useMutation(
    trpc.organizations.inviteToSubaccount.mutationOptions()
  );

  const revokeInvitation = useMutation(
    trpc.organizations.revokeInvitation.mutationOptions()
  );

  const isLoading =
    inviteToOrganization.isPending ||
    inviteToSubaccount.isPending ||
    revokeInvitation.isPending;

  const handleInvite = async (e: React.FormEvent) => {
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
        });
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
        });
      }

      toast.success(`Invitation sent to ${email}`);
      setEmail("");
      setRole(mode === "organization" ? "viewer" : "STANDARD");
      refetch();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to send invitation");
    }
  };

  const handleRevoke = async (invitationId: string, email: string) => {
    try {
      await revokeInvitation.mutateAsync({ invitationId });
      toast.success(`Invitation to ${email} has been revoked`);
      refetch();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to revoke invitation");
    }
  };

  // Filter invitations by status
  const filteredInvitations = invitations.filter((inv) => {
    const status = inv.status.toLowerCase();
    return status === activeTab;
  });

  const displayName = subaccountName || organizationName;

  return (
    <div className="flex py-4">
      <Card className="border-black/5 dark:border-white/5 rounded-none border-x-0 shadow-none flex-1 max-w-2xl">
        <CardHeader className="pb-3 gap-1">
          <CardTitle className="text-base flex items-center gap-2 text-primary">
            <InviteIcon className="size-4" />
            Invite members to {displayName}
          </CardTitle>

          <CardDescription className="text-xs text-primary/60">
            Send invitation emails to add team members
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleInvite} className="space-y-3">
            <div className="space-y-2 flex gap-2">
              <Input
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="h-9 text-xs w-full"
                required
              />

              <Select value={role} onValueChange={setRole} disabled={isLoading}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select role" />
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
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              variant="outline"
              className="w-full h-10"
              size="sm"
            >
              {isLoading ? (
                <>
                  <LoaderIcon className="mr-2 h-3 w-3 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <InviteIcon className="mr-2 h-3 w-3" />
                  Send Invitation
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Invitations List */}
      <Card className="border-black/5 dark:border-white/5 flex-1 rounded-none shadow-none border-r-0">
        <CardHeader className="pb-3 gap-1">
          <CardTitle className="text-base text-primary">Invitations</CardTitle>

          <CardDescription className="text-xs text-primary/60">
            Below are the invitations sent to your team members
          </CardDescription>
        </CardHeader>

        <CardContent className="px-0">
          {/* Tabs */}
          <div className="flex gap-1 mb-4 border-b border-black/5 dark:border-white/5 px-6 w-full">
            <button
              type="button"
              onClick={() => setActiveTab("pending")}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === "pending"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              Pending (
              {invitations.filter((i) => i.status === "pending").length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("accepted")}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === "accepted"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              Accepted (
              {invitations.filter((i) => i.status === "accepted").length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("declined")}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === "declined"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              Declined (
              {invitations.filter((i) => i.status === "declined").length})
            </button>
          </div>

          {/* Invitation Items */}
          <div className="space-y-2 grid grid-cols-2 gap-2 w-full px-6">
            {filteredInvitations.length === 0 ? (
              <div className="text-center py-8 text-xs text-primary/75 w-full md:col-span-2">
                No {activeTab} invitations
              </div>
            ) : (
              filteredInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex flex-col gap-0.5 p-4 rounded-sm border border-black/5 dark:border-white/5 bg-background max-h-full h-full"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 justify-between">
                        <p className="text-sm font-medium text-primary truncate">
                          {invitation.email}
                        </p>

                        <div className="flex items-center gap-2">
                          <StatusBadge
                            status={
                              invitation.status as
                                | "pending"
                                | "accepted"
                                | "declined"
                            }
                          />

                          {invitation.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleRevoke(invitation.id, invitation.email)
                              }
                              disabled={revokeInvitation.isPending}
                              className="h-7 px-1! text-xs border-none"
                            >
                              <XIcon className="size-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                        Role:{" "}
                        <span className="capitalize">
                          {" "}
                          {invitation.role?.split(":")[0]?.toLowerCase() ||
                            "Member"}{" "}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-primary/75 justify-between">
                    <div className="flex items-center gap-1">
                      Sent by{" "}
                      <span className="text-blue-500">
                        {" "}
                        {invitation.inviter.name ||
                          invitation.inviter.email}{" "}
                      </span>
                    </div>

                    {invitation.status === "pending" && (
                      <div className="flex items-center gap-1 text-xs bg-amber-500 text-amber-100 dark:text-amber-400 border border-amber-500/20 px-1.5 rounded-full py-0.5 text-shadow-2xs">
                        <ClockIcon className="size-3 text-amber-100" />

                        <span>
                          Invitation expires{" "}
                          {formatDistanceToNow(new Date(invitation.expiresAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: "pending" | "accepted" | "declined";
}) {
  const config = {
    pending: {
      icon: ClockIcon,
      label: "Pending",
      className:
        "bg-amber-500 text-amber-100 dark:text-amber-400 border-amber-500/20",
    },
    accepted: {
      icon: CheckIcon,
      label: "Accepted",
      className:
        "bg-emerald-500 text-emerald-100 dark:text-emerald-400 border-emerald-500/20 text-shadow-2xs",
    },
    declined: {
      icon: XIcon,
      label: "Declined",
      className:
        "bg-rose-500 text-rose-100 dark:text-rose-400 border-rose-500/20 text-shadow-2xs",
    },
  };

  const { icon: Icon, label, className } = config[status];

  if (status === "pending") {
    return null;
  }

  return (
    <Badge variant="outline" className={`text-xs gap-1 ${className} px-1 pr-2`}>
      <Icon className="size-4!" />
      {label}
    </Badge>
  );
}
