"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Banknote,
  CalendarCheck,
  CalendarClock,
  Columns3,
  Database,
  Handshake,
  ListTodo,
  MailCheck,
  ReceiptText,
  Repeat2,
  Send,
  StickyNote,
  UserRoundCog,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useIsInstructor } from "@/features/instructors/hooks/use-is-instructor";
import {
  getNotificationGroups,
  type NotificationGroupId,
} from "@/features/notifications/settings-registry";
import { useTRPC } from "@/trpc/client";

const groupIcons: Record<NotificationGroupId, LucideIcon> = {
  workflows: Workflow,
  campaigns: Send,
  communications: MailCheck,
  clients: Users,
  deals: Handshake,
  tasks: ListTodo,
  notes: StickyNote,
  invoices: ReceiptText,
  bookings: CalendarCheck,
  pipelines: Columns3,
  team: UserRoundCog,
  imports: Database,
  "class-bookings": CalendarCheck,
  schedule: CalendarClock,
  substitutions: Repeat2,
  earnings: Banknote,
};

export function NotificationSettingsPage() {
  const trpc = useTRPC();
  const { isInstructor } = useIsInstructor();
  const groups = getNotificationGroups(
    isInstructor ? "instructor" : "operator",
  );
  const preferencesQuery = useQuery(
    trpc.notifications.getPreferences.queryOptions(),
  );
  const preferences = preferencesQuery.data;
  const updatePreferences = useMutation(
    trpc.notifications.updatePreferences.mutationOptions(),
  );
  const [localPreferences, setLocalPreferences] = React.useState<
    Record<string, boolean>
  >({});
  const [emailEnabled, setEmailEnabled] = React.useState(true);

  React.useEffect(() => {
    if (!preferences) return;
    setLocalPreferences(preferences.preferences);
    setEmailEnabled(preferences.emailEnabled);
  }, [preferences]);

  const handleSave = async () => {
    try {
      await updatePreferences.mutateAsync({
        preferences: localPreferences,
        emailEnabled,
      });
      toast.success("Notification preferences saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save preferences",
      );
    }
  };

  if (preferencesQuery.isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-40 items-center justify-center p-6 text-xs text-primary/60"
      >
        Loading notification preferences
      </div>
    );
  }
  if (preferencesQuery.isError || !preferences) {
    return (
      <div className="p-6">
        <Alert variant="destructive" className="max-w-3xl">
          <AlertTitle>Notification preferences could not be loaded</AlertTitle>
          <AlertDescription>
            <Button
              variant="outline"
              size="sm"
              onClick={() => preferencesQuery.refetch()}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <div className="p-6">
        <h1 className="text-lg font-semibold text-primary">
          Notification preferences
        </h1>
        <p className="text-xs text-primary/70">
          Choose which workspace activity appears in your notifications.
        </p>
      </div>

      <Separator />

      <div className="p-6">
        <Card className="max-w-3xl shadow-none">
          <CardHeader>
            <CardTitle role="heading" aria-level={2} className="text-sm">
              Email notifications
            </CardTitle>
            <CardDescription className="text-xs">
              Receive individual emails for supported important events.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="email-enabled" className="text-xs font-medium">
                  Enable email notifications
                </Label>
                <p
                  id="email-enabled-description"
                  className="text-xs text-primary/65"
                >
                  Applies only to events that support email delivery.
                </p>
              </div>
              <Switch
                id="email-enabled"
                aria-describedby="email-enabled-description"
                checked={emailEnabled}
                onCheckedChange={setEmailEnabled}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="grid grid-cols-1 gap-3 p-6 xl:grid-cols-2">
        {groups.map((group) => {
          const GroupIcon = groupIcons[group.id];
          return (
            <Card key={group.id} className="h-full shadow-none">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <GroupIcon
                    aria-hidden="true"
                    className="mt-0.5 size-4 text-primary/50"
                  />
                  <div className="flex flex-col">
                    <CardTitle
                      role="heading"
                      aria-level={2}
                      className="text-sm"
                    >
                      {group.title}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {group.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {group.events.map((item) => {
                    const descriptionId = `${item.type}-description`;
                    return (
                      <div
                        key={item.type}
                        className="flex items-center justify-between gap-4"
                      >
                        <div className="space-y-0.5">
                          <Label
                            htmlFor={item.type}
                            className="text-xs font-medium"
                          >
                            {item.label}
                          </Label>
                          <p
                            id={descriptionId}
                            className="text-xs text-primary/70"
                          >
                            {item.description}
                          </p>
                        </div>
                        <Switch
                          id={item.type}
                          aria-describedby={descriptionId}
                          checked={localPreferences[item.type] ?? true}
                          onCheckedChange={(checked) =>
                            setLocalPreferences((current) => ({
                              ...current,
                              [item.type]: checked,
                            }))
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Separator />

      <div className="flex justify-end p-6">
        <Button
          onClick={handleSave}
          disabled={updatePreferences.isPending}
          size="sm"
        >
          {updatePreferences.isPending ? "Saving..." : "Save preferences"}
        </Button>
      </div>
    </div>
  );
}
