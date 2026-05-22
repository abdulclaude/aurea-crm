"use client";

import { useState, useEffect } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { IconLoader as LoaderIcon } from "central-icons/IconLoader";
import { IconPayment as WorkflowIcon } from "central-icons/IconPayment";
import { IconContacts as ClientIcon } from "central-icons/IconContacts";

import { IconVerticalAlignmentCenter as PipelineIcon } from "central-icons/IconVerticalAlignmentCenter";
import { IconGroup1 as TeamIcon } from "central-icons/IconGroup1";
import { IconCalendar3 as ClassesIcon } from "central-icons/IconCalendar3";
import { IconConstructionHelmet as InstructorIcon } from "central-icons/IconConstructionHelmet";

import { Handshake as DealIcon, Banknote as PayoutIcon, Database as ImportIcon } from "lucide-react";

import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { useIsInstructor } from "@/features/instructors/hooks/use-is-instructor";

const instructorNotificationGroups = [
  {
    title: "Class Bookings",
    description: "Get notified when members sign up for or cancel your classes",
    icon: ClassesIcon,
    types: [
      {
        type: "CLASS_BOOKING_NEW",
        label: "New Booking",
        description: "When a member signs up for one of your classes",
      },
      {
        type: "CLASS_BOOKING_CANCELLED",
        label: "Booking Cancelled",
        description: "When a member cancels their booking for your class",
      },
      {
        type: "CLASS_WAITLIST_JOINED",
        label: "Waitlist Joined",
        description: "When a member joins the waitlist for your full class",
      },
    ],
  },
  {
    title: "Schedule",
    description: "Stay updated on your class schedule and reminders",
    icon: ClassesIcon,
    types: [
      {
        type: "CLASS_STARTING_SOON",
        label: "Class Starting Soon",
        description: "Reminder before your class is about to start",
      },
      {
        type: "CLASS_STARTED",
        label: "Class Started",
        description: "When your class has officially started",
      },
      {
        type: "CLASS_CANCELLED",
        label: "Class Cancelled",
        description: "When one of your classes is cancelled by admin",
      },
      {
        type: "CLASS_SCHEDULE_CHANGED",
        label: "Schedule Changed",
        description: "When your class time or room is changed",
      },
    ],
  },
  {
    title: "Substitutions",
    description: "Manage cover requests and substitution updates",
    icon: InstructorIcon,
    types: [
      {
        type: "SUBSTITUTION_REQUESTED",
        label: "Cover Requested",
        description: "When you receive a request to cover another class",
      },
      {
        type: "SUBSTITUTION_ACCEPTED",
        label: "Cover Accepted",
        description: "When your substitution request is accepted",
      },
      {
        type: "SUBSTITUTION_DECLINED",
        label: "Cover Declined",
        description: "When your substitution request is declined",
      },
    ],
  },
  {
    title: "Earnings",
    description: "Track your payouts and earnings",
    icon: PayoutIcon,
    types: [
      {
        type: "PAYOUT_SENT",
        label: "Payout Sent",
        description: "When a payout is initiated for your earnings",
      },
      {
        type: "PAYOUT_COMPLETED",
        label: "Payout Completed",
        description: "When your payout has been successfully processed",
      },
    ],
  },
];

const adminNotificationGroups = [
  {
    title: "Workflows",
    description: "Get notified about workflow changes and updates",
    icon: WorkflowIcon,
    types: [
      {
        type: "WORKFLOW_CREATED",
        label: "Workflow Created",
        description: "When a team member creates a new workflow",
      },
      {
        type: "WORKFLOW_UPDATED",
        label: "Workflow Updated",
        description: "When a workflow is modified",
      },
      {
        type: "WORKFLOW_DELETED",
        label: "Workflow Deleted",
        description: "When a workflow is removed",
      },
    ],
  },
  {
    title: "Clients",
    description: "Stay updated on client activity and changes",
    icon: ClientIcon,
    types: [
      {
        type: "CLIENT_CREATED",
        label: "Client Created",
        description: "When a new client is added",
      },
      {
        type: "CLIENT_UPDATED",
        label: "Client Updated",
        description: "When a client is modified",
      },
      {
        type: "CLIENT_DELETED",
        label: "Client Deleted",
        description: "When a client is removed",
      },
    ],
  },
  {
    title: "Deals",
    description: "Track deal progress and modifications",
    icon: DealIcon,
    types: [
      {
        type: "DEAL_CREATED",
        label: "Deal Created",
        description: "When a new deal is created",
      },
      {
        type: "DEAL_UPDATED",
        label: "Deal Updated",
        description: "When a deal is modified",
      },
      {
        type: "DEAL_DELETED",
        label: "Deal Deleted",
        description: "When a deal is removed",
      },
    ],
  },
  {
    title: "Pipelines",
    description: "Monitor pipeline structure and updates",
    icon: PipelineIcon,
    types: [
      {
        type: "PIPELINE_CREATED",
        label: "Pipeline Created",
        description: "When a new pipeline is created",
      },
      {
        type: "PIPELINE_UPDATED",
        label: "Pipeline Updated",
        description: "When a pipeline is modified",
      },
      {
        type: "PIPELINE_DELETED",
        label: "Pipeline Deleted",
        description: "When a pipeline is removed",
      },
    ],
  },
  {
    title: "Team",
    description: "Get notified about team member invitations and activity",
    icon: TeamIcon,
    types: [
      {
        type: "INVITE_SENT",
        label: "Invitation Sent",
        description: "When an invitation is sent to join the organization",
      },
      {
        type: "INVITE_ACCEPTED",
        label: "Invitation Accepted",
        description: "When someone accepts an invitation",
      },
    ],
  },
  {
    title: "Imports",
    description: "Track Mindbody and CSV import status, failures, and mapping review items",
    icon: ImportIcon,
    types: [
      {
        type: "IMPORT_STARTED",
        label: "Import Started",
        description: "When a data import begins processing",
      },
      {
        type: "IMPORT_COMPLETED",
        label: "Import Completed",
        description: "When imported records are available in your workspace",
      },
      {
        type: "IMPORT_FAILED",
        label: "Import Failed",
        description: "When an import cannot be completed",
      },
      {
        type: "IMPORT_NEEDS_REVIEW",
        label: "Mapping Review",
        description: "When extra CSV fields are preserved but need schema mapping review",
      },
    ],
  },
];

export default function NotificationSettingsPage() {
  const trpc = useTRPC();
  const { isInstructor } = useIsInstructor();

  const notificationGroups = isInstructor
    ? instructorNotificationGroups
    : adminNotificationGroups;

  const { data: preferences, isLoading } = useQuery(
    trpc.notifications.getPreferences.queryOptions()
  );

  const [localPreferences, setLocalPreferences] = useState<
    Record<string, boolean>
  >({});
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [emailDigest, setEmailDigest] = useState(false);

  useEffect(() => {
    if (preferences) {
      setLocalPreferences(
        (preferences.preferences as Record<string, boolean>) || {}
      );
      setEmailEnabled(preferences.emailEnabled);
      setEmailDigest(preferences.emailDigest);
    }
  }, [preferences]);

  const updatePreferences = useMutation(
    trpc.notifications.updatePreferences.mutationOptions()
  );

  const handleToggleNotification = (type: string, enabled: boolean) => {
    setLocalPreferences((prev) => ({
      ...prev,
      [type]: enabled,
    }));
  };

  const handleSave = async () => {
    try {
      await updatePreferences.mutateAsync({
        preferences: localPreferences,
        emailEnabled,
        emailDigest,
      });
      toast.success("Notification preferences saved");
    } catch (error) {
      toast.error("Failed to save preferences");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoaderIcon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="p-6">
        <h2 className="text-lg font-semibold">Notification Preferences</h2>
        <p className="text-muted-foreground text-xs">
          Manage how you receive notifications from the platform
        </p>
      </div>

      <Separator className="bg-black/10 dark:bg-white/5" />

      {/* Email Preferences */}
      <Card className="border-none rounded-none shadow-none">
        <CardHeader className="gap-0">
          <CardTitle className="text-base">Email Notifications</CardTitle>
          <CardDescription className="text-xs text-primary/75">
            Configure email notification settings
          </CardDescription>
        </CardHeader>

        <Separator className="bg-black/10 dark:bg-white/5" />

        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="">
              <Label htmlFor="email-enabled" className="text-sm">
                Enable Email Notifications
              </Label>

              <p className="text-xs text-primary/75">
                Receive notifications via email for important events
              </p>
            </div>

            <Switch
              id="email-enabled"
              checked={emailEnabled}
              onCheckedChange={setEmailEnabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="">
              <Label htmlFor="email-digest" className="text-sm">
                Daily Digest
              </Label>
              <p className="text-xs text-primary/75">
                Receive a daily summary instead of individual emails
              </p>
            </div>
            <Switch
              id="email-digest"
              checked={emailDigest}
              onCheckedChange={setEmailDigest}
              disabled={!emailEnabled}
            />
          </div>
        </CardContent>
      </Card>

      <Separator className="bg-black/10 dark:bg-white/5" />

      {/* Notification Types */}
      <Card className="border-none rounded-none shadow-none">
        <CardContent className="space-y-6 p-0">
          {notificationGroups.map((group, groupIndex) => (
            <div key={group.title}>
              {groupIndex > 0 && (
                <Separator className="bg-black/10 dark:bg-white/5 mb-6  w-full" />
              )}

              <div className="space-y-4">
                <div className="px-6">
                  <div className="flex items-start gap-3">
                    <group.icon className="size-5 text-primary mt-0.5" />

                    <div className="flex flex-col">
                      <h4 className="text-sm font-medium">{group.title}</h4>
                      <p className="text-xs text-primary/75">
                        {group.description}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator className="bg-black/10 dark:bg-white/5" />

                <div className="space-y-4 px-6">
                  {group.types.map((item) => (
                    <div
                      key={item.type}
                      className="flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <Label htmlFor={item.type} className="text-sm">
                          {item.label}
                        </Label>
                        <p className="text-xs text-primary/75">
                          {item.description}
                        </p>
                      </div>

                      <Switch
                        id={item.type}
                        checked={localPreferences[item.type] ?? true}
                        onCheckedChange={(checked) =>
                          handleToggleNotification(item.type, checked)
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Separator className="bg-black/10 dark:bg-white/5" />

      {/* Save Button */}
      <div className="flex justify-end p-6">
        <Button
          onClick={handleSave}
          disabled={updatePreferences.isPending}
          size="sm"
          variant="gradient"
          className="w-max"
        >
          {updatePreferences.isPending ? (
            <>
              <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Preferences"
          )}
        </Button>
      </div>
    </div>
  );
}
