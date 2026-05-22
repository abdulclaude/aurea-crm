"use client";

import { useState } from "react";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { format } from "date-fns";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CalComSettingsPage() {
  const trpc = useTRPC();
  const [apiKey, setApiKey] = useState("");
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [messageDialog, setMessageDialog] = useState<{
    open: boolean;
    title: string;
    description?: string;
  }>({ open: false, title: "" });
  const [testResult, setTestResult] = useState<{
    success: boolean;
    user?: any;
    error?: string;
  } | null>(null);

  const { data: credential, refetch } = useSuspenseQuery(
    trpc.calComCredentials.get.queryOptions(),
  );
  const { data: eventTypes = [] } = useSuspenseQuery(
    trpc.eventTypes.getMany.queryOptions({ includeInactive: true }),
  );
  const { data: activeContext } = useSuspenseQuery(
    trpc.organizations.getActive.queryOptions(),
  );

  const testMutation = useMutation(
    trpc.calComCredentials.testConnection.mutationOptions(),
  );
  const upsertMutation = useMutation(
    trpc.calComCredentials.upsert.mutationOptions({
      onSuccess: () => {
        refetch();
        setApiKey("");
        setTestResult(null);
      },
    }),
  );
  const syncMutation = useMutation(
    trpc.calComCredentials.syncEventTypes.mutationOptions({
      onSuccess: () => {
        refetch();
      },
    }),
  );
  const removeMutation = useMutation(
    trpc.calComCredentials.remove.mutationOptions({
      onSuccess: () => {
        refetch();
      },
    }),
  );

  const handleTestConnection = async () => {
    if (!apiKey) {
      setMessageDialog({
        open: true,
        title: "API key required",
        description: "Please enter your Cal.com API key to continue.",
      });
      return;
    }

    setIsTestingConnection(true);
    try {
      const result = await testMutation.mutateAsync({ apiKey });
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, error: "Failed to test connection" });
      setMessageDialog({
        open: true,
        title: "Connection failed",
        description: "We couldn't reach Cal.com with that API key.",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey) {
      setMessageDialog({
        open: true,
        title: "API key required",
        description: "Please enter your Cal.com API key to continue.",
      });
      return;
    }

    setIsSaving(true);
    try {
      await upsertMutation.mutateAsync({ apiKey, testConnection: true });
      setMessageDialog({
        open: true,
        title: "Cal.com connected",
        description: "Your Cal.com credentials were saved successfully.",
      });
    } catch (error: any) {
      setMessageDialog({
        open: true,
        title: "Save failed",
        description: error?.message || "Failed to save credentials.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncMutation.mutateAsync();
      setMessageDialog({
        open: true,
        title: "Event types synced",
        description: `Synced ${result.synced} event types (${result.created} created, ${result.updated} updated).`,
      });
    } catch (error: any) {
      setMessageDialog({
        open: true,
        title: "Sync failed",
        description: error?.message || "Failed to sync event types.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRemove = async () => {
    try {
      await removeMutation.mutateAsync();
      setMessageDialog({
        open: true,
        title: "Cal.com disconnected",
        description: "Your Cal.com credentials were removed.",
      });
    } catch (error: any) {
      setMessageDialog({
        open: true,
        title: "Removal failed",
        description: error?.message || "Failed to remove credentials.",
      });
    }
  };

  return (
    <>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold text-primary">
            Cal.com Integration
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your Cal.com account to sync bookings and event types
          </p>
        </div>

        <Separator />

        {/* Connection Status */}
        {credential && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Connection Status</CardTitle>
                  <CardDescription>
                    Your Cal.com integration is active
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="bg-green-500/10 text-green-500 border-green-500/20"
                >
                  <CheckCircle2 className="size-3 mr-1" />
                  Connected
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {credential.lastSyncedAt && (
                <div className="text-sm text-muted-foreground">
                  Last synced:{" "}
                  {format(new Date(credential.lastSyncedAt), "PPP 'at' p")}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleSync}
                  disabled={isSyncing}
                  variant="outline"
                  size="sm"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="size-3.5 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="size-3.5 mr-2" />
                      Sync event types
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => setIsRemoveOpen(true)}
                  variant="destructive"
                  size="sm"
                  className="w-max"
                >
                  Remove integration
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!credential ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Setup Cal.com Integration
              </CardTitle>
              <CardDescription>
                Enter your Cal.com API key to get started
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">Cal.com API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="cal_live_xxxxxxxxxxxxx"
                />
                <p className="text-xs text-muted-foreground">
                  Get your API key from{" "}
                  <a
                    href="https://app.cal.com/settings/developer/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline inline-flex items-center gap-1"
                  >
                    Cal.com Settings
                    <ExternalLink className="size-3" />
                  </a>
                </p>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-md border ${
                    testResult.success
                      ? "bg-green-500/10 border-green-500/20 text-green-600"
                      : "bg-red-500/10 border-red-500/20 text-red-600"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {testResult.success ? (
                      <CheckCircle2 className="size-4 mt-0.5" />
                    ) : (
                      <XCircle className="size-4 mt-0.5" />
                    )}
                    <div className="flex-1">
                      {testResult.success ? (
                        <div>
                          <p className="font-medium text-sm">
                            Connection successful!
                          </p>
                          {testResult.user && (
                            <p className="text-xs mt-1">
                              Connected as: {testResult.user.name} (
                              {testResult.user.email})
                            </p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium text-sm">
                            Connection failed
                          </p>
                          <p className="text-xs mt-1">{testResult.error}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleTestConnection}
                  disabled={isTestingConnection || !apiKey}
                  variant="outline"
                >
                  {isTestingConnection ? (
                    <>
                      <Loader2 className="size-3.5 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    "Test Connection"
                  )}
                </Button>

                <Button onClick={handleSave} disabled={isSaving || !apiKey}>
                  {isSaving ? (
                    <>
                      <Loader2 className="size-3.5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save & Connect"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">Synced event types</CardTitle>
                  <CardDescription>
                    {eventTypes.length} event type
                    {eventTypes.length !== 1 ? "s" : ""} synced
                  </CardDescription>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/bookings/event-types">Manage event types</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {eventTypes.length === 0 ? (
                <div className="text-xs text-muted-foreground">
                  No event types synced yet. Click “Sync event types” above.
                </div>
              ) : (
                <div className="space-y-2">
                  {eventTypes.slice(0, 5).map((eventType) => (
                    <div
                      key={eventType.id}
                      className="flex items-center justify-between rounded-md border border-black/5 dark:border-white/5 px-3 py-2"
                    >
                      <div>
                        <div className="text-sm font-medium text-primary">
                          {eventType.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {eventType.length} min • {eventType.slug}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          eventType.isActive
                            ? "text-emerald-600"
                            : "text-muted-foreground"
                        }
                      >
                        {eventType.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                  {eventTypes.length > 5 && (
                    <div className="text-xs text-muted-foreground">
                      +{eventTypes.length - 5} more event types
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!credential && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How to Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                  1
                </div>
                <div>
                  <p className="font-medium text-primary">Get your API Key</p>
                  <p className="text-xs">
                    Go to{" "}
                    <a
                      href="https://app.cal.com/settings/developer/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      Cal.com API Keys Settings
                    </a>{" "}
                    and create a new API key
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                  2
                </div>
                <div>
                  <p className="font-medium text-primary">
                    Test the Connection
                  </p>
                  <p className="text-xs">
                    Paste your API key above and click "Test Connection" to
                    verify it works
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                  3
                </div>
                <div>
                  <p className="font-medium text-primary">Save & sync</p>
                  <p className="text-xs">
                    Click "Save & connect" then "Sync event types" to import
                    your Cal.com event types
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                  4
                </div>
                <div>
                  <p className="font-medium text-primary">
                    Setup Webhooks (Optional)
                  </p>
                  <p className="text-xs">
                    In Cal.com, add this webhook URL to receive real-time
                    booking updates:
                  </p>
                  <code className="block mt-1 p-2 bg-black/5 dark:bg-white/5 rounded text-[11px] break-all">
                    {typeof window !== "undefined"
                      ? window.location.origin
                      : ""}
                    /api/webhooks/calcom?locationId=
                    {activeContext?.activeLocation?.id ??
                      "YOUR_LOCATION_ID"}
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={isRemoveOpen} onOpenChange={setIsRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Cal.com integration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disconnect Cal.com and stop syncing bookings and event
              types.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={messageDialog.open}
        onOpenChange={(open) => setMessageDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{messageDialog.title}</DialogTitle>
            {messageDialog.description && (
              <DialogDescription>{messageDialog.description}</DialogDescription>
            )}
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
