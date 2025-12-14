"use client";

import { useState, useEffect } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { IconLoader as LoaderIcon } from "central-icons/IconLoader";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";

export default function DunningSettingsPage() {
  const trpc = useTRPC();

  const {
    data: workspace,
    isLoading,
    refetch,
  } = useQuery(trpc.organizations.getWorkspaceDetails.queryOptions());

  const [dunningEnabled, setDunningEnabled] = useState(true);
  const [dunningDays, setDunningDays] = useState<number[]>([7, 14, 30]);
  const [newDay, setNewDay] = useState("");

  const isOrganization = workspace?.type === "organization";
  const isSubaccount = workspace?.type === "subaccount";

  // Update local state when workspace data is loaded
  useEffect(() => {
    if (workspace) {
      if (workspace.type === "organization") {
        const org = workspace.data;
        setDunningEnabled(org?.dunningEnabled ?? true);
        if (org?.dunningDays) {
          setDunningDays(org.dunningDays as number[]);
        }
      } else if (workspace.type === "subaccount") {
        const sub = workspace.data;
        setDunningEnabled(sub?.dunningEnabled ?? true);
        if (sub?.dunningDays) {
          setDunningDays(sub.dunningDays as number[]);
        }
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
          dunningEnabled,
          dunningDays,
        });
        toast.success("Dunning settings updated successfully");
        refetch();
      } else if (workspace?.type === "subaccount") {
        await updateSubaccount.mutateAsync({
          subaccountId: workspace.data?.id || "",
          dunningEnabled,
          dunningDays,
        });
        toast.success("Dunning settings updated successfully");
        refetch();
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update dunning settings"
      );
    }
  };

  const addDay = () => {
    const day = parseInt(newDay);
    if (!isNaN(day) && day > 0 && !dunningDays.includes(day)) {
      setDunningDays([...dunningDays, day].sort((a, b) => a - b));
      setNewDay("");
    }
  };

  const removeDay = (day: number) => {
    setDunningDays(dunningDays.filter((d) => d !== day));
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
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <p className="text-muted-foreground">No workspace selected</p>
      </div>
    );
  }

  const isPending = updateOrganization.isPending || updateSubaccount.isPending;

  return (
    <div className="">
      <div className="p-6">
        <div className="flex flex-col justify-center gap-2">
          <Badge
            variant={isOrganization ? "gradient" : "secondary"}
            className="w-max rounded-full p-1 px-2.5"
          >
            {isOrganization ? "Agency" : "Client"}
          </Badge>

          <h1 className="text-lg font-bold">Dunning Settings</h1>
        </div>

        <p className="text-muted-foreground text-xs">
          Configure automated payment reminders for overdue invoices
        </p>
      </div>

      <Separator className="bg-black/10 dark:bg-white/5" />

      <div className="">
        {/* Enable/Disable Dunning */}
        <div className="p-6">
          <div className="flex items-center justify-between rounded-lg border p-4 max-w-2xl">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">
                Enable Automated Reminders
              </Label>
              <p className="text-sm text-muted-foreground">
                Automatically send payment reminders for overdue invoices
              </p>
            </div>
            <Switch
              checked={dunningEnabled}
              onCheckedChange={setDunningEnabled}
              disabled={isPending}
            />
          </div>
        </div>

        <Separator className="bg-black/10 dark:bg-white/5" />

        {/* Reminder Schedule */}
        <div className="p-6">
          <h2 className="text-sm font-medium mb-2">Reminder Schedule</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Days after the due date when reminders should be sent
          </p>

          <div className="space-y-4 max-w-2xl">
            {/* Current Days */}
            {dunningDays.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {dunningDays.map((day) => (
                  <div
                    key={day}
                    className="inline-flex items-center gap-2 rounded-md border bg-secondary px-3 py-1.5 text-sm"
                  >
                    <span className="font-medium">{day} days</span>
                    <button
                      type="button"
                      onClick={() => removeDay(day)}
                      disabled={isPending}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Day */}
            <div className="flex gap-2">
              <Input
                type="number"
                min="1"
                placeholder="Days after due date (e.g., 7)"
                value={newDay}
                onChange={(e) => setNewDay(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addDay();
                  }
                }}
                disabled={isPending}
                className="max-w-xs"
              />
              <Button
                type="button"
                variant="outline"
                onClick={addDay}
                disabled={isPending || !newDay}
              >
                <Plus className="mr-2 size-4" />
                Add Day
              </Button>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                <strong>Tip:</strong> Common schedules include:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Early reminder: 7 days (gentle)</li>
                <li>Follow-up: 14 days (firm)</li>
                <li>Final notice: 30 days (urgent)</li>
              </ul>
            </div>
          </div>
        </div>

        <Separator className="bg-black/10 dark:bg-white/5" />

        {/* Reminder Examples */}
        <div className="p-6">
          <h2 className="text-sm font-medium mb-4">Reminder Examples</h2>
          <div className="space-y-4 max-w-2xl">
            {/* Gentle */}
            <div className="rounded-lg border p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900/50">
                  7 days overdue
                </Badge>
                <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                  Gentle Reminder
                </span>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                "This is a friendly reminder that invoice #001 for $500.00 was
                due on Jan 15. We understand that sometimes invoices get
                overlooked..."
              </p>
            </div>

            {/* Firm */}
            <div className="rounded-lg border p-4 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900/50">
                  14 days overdue
                </Badge>
                <span className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">
                  Firm Reminder
                </span>
              </div>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                "We wanted to follow up regarding invoice #001 for $500.00,
                which was due on Jan 15. The invoice is now 14 days overdue..."
              </p>
            </div>

            {/* Urgent */}
            <div className="rounded-lg border p-4 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-red-100 dark:bg-red-900/50">
                  30 days overdue
                </Badge>
                <span className="text-xs text-red-700 dark:text-red-300 font-medium">
                  Urgent Notice
                </span>
              </div>
              <p className="text-xs text-red-700 dark:text-red-300">
                "URGENT: Invoice #001 for $500.00 is now 30 days overdue. We
                kindly request immediate payment to avoid any service
                interruptions..."
              </p>
            </div>
          </div>
        </div>

        <Separator className="bg-black/10 dark:bg-white/5" />

        {/* How It Works */}
        <div className="p-6">
          <h2 className="text-sm font-medium mb-4">How It Works</h2>
          <div className="space-y-3 max-w-2xl text-xs text-muted-foreground">
            <div className="flex gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-medium">
                1
              </span>
              <p>
                The system checks for overdue invoices <strong>daily at 9 AM</strong>
              </p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-medium">
                2
              </span>
              <p>
                When an invoice matches one of your reminder days (e.g., 7 days
                overdue), an email is automatically sent
              </p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-medium">
                3
              </span>
              <p>
                The email includes the invoice PDF and a payment link for easy
                payment
              </p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-medium">
                4
              </span>
              <p>
                Reminders stop automatically once the invoice is marked as paid
              </p>
            </div>
          </div>

          {isSubaccount && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Note:</strong> As a client workspace, your dunning
                settings will be used for your invoices. If dunning is disabled
                here, the system will fall back to your agency's organization
                settings.
              </p>
            </div>
          )}
        </div>

        <Separator className="bg-black/10 dark:bg-white/5" />

        {/* Save Button */}
        <div className="flex justify-end p-6">
          <Button
            onClick={handleSave}
            disabled={isPending}
            className="min-w-[120px] w-max"
            variant="gradient"
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
  );
}
