"use client";

import { useState, useEffect } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { IconLoader as LoaderIcon } from "central-icons/IconLoader";
import { toast } from "sonner";

const notificationTypes = [
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
  {
    type: "CONTACT_CREATED",
    label: "Contact Created",
    description: "When a new contact is added",
  },
  {
    type: "CONTACT_UPDATED",
    label: "Contact Updated",
    description: "When a contact is modified",
  },
  {
    type: "CONTACT_DELETED",
    label: "Contact Deleted",
    description: "When a contact is removed",
  },
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
];

export default function NotificationSettingsPage() {
  const trpc = useTRPC();

  const { data: preferences, isLoading } = useQuery(
    trpc.notifications.getPreferences.queryOptions()
  );

  const [localPreferences, setLocalPreferences] = useState<Record<string, boolean>>({});
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
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Notification Preferences</h2>
        <p className="text-muted-foreground mt-1">
          Manage how you receive notifications from the platform
        </p>
      </div>

      {/* Email Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>
            Configure email notification settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-enabled">Enable Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
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
            <div className="space-y-0.5">
              <Label htmlFor="email-digest">Daily Digest</Label>
              <p className="text-sm text-muted-foreground">
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

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>
            Choose which notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {notificationTypes.map((item) => (
            <div key={item.type} className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor={item.type}>{item.label}</Label>
                <p className="text-sm text-muted-foreground">
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
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updatePreferences.isPending}
          size="lg"
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
