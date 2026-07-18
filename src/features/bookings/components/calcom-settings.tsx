"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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
import { Separator } from "@/components/ui/separator";
import { useTRPC } from "@/trpc/client";

import { CalComConnectionForm } from "./calcom-connection-form";
import { CalComConnectionPanel } from "./calcom-connection-panel";
import { CalComWebhookActivity } from "./calcom-webhook-activity";

type TestResult = {
  success: boolean;
  user: {
    id: string | number;
    email: string;
    name: string;
    username: string;
  } | null;
} | null;

export function CalComSettings() {
  const trpc = useTRPC();
  const [apiKey, setApiKey] = useState("");
  const [testResult, setTestResult] = useState<TestResult>(null);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const connectionQuery = useQuery(trpc.calComCredentials.get.queryOptions());
  const receiptsQuery = useQuery(
    trpc.calComCredentials.getRecentReceipts.queryOptions(),
  );
  const eventTypesQuery = useQuery(
    trpc.eventTypes.getMany.queryOptions({ includeInactive: true }),
  );
  const refresh = async () => {
    await Promise.all([
      connectionQuery.refetch(),
      receiptsQuery.refetch(),
      eventTypesQuery.refetch(),
    ]);
  };

  const testMutation = useMutation(
    trpc.calComCredentials.testConnection.mutationOptions({
      onSuccess: setTestResult,
      onError: (error) => toast.error(error.message),
    }),
  );
  const connectMutation = useMutation(
    trpc.calComCredentials.upsert.mutationOptions({
      onSuccess: async () => {
        setApiKey("");
        setTestResult(null);
        toast.success("Cal.com connected to this location");
        await refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const syncMutation = useMutation(
    trpc.calComCredentials.syncEventTypes.mutationOptions({
      onSuccess: async (result) => {
        toast.success(`Synced ${result.synced} event types`);
        await refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const webhookMutation = useMutation(
    trpc.calComCredentials.configureWebhook.mutationOptions({
      onSuccess: async () => {
        toast.success("Cal.com webhook configured");
        await refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const disconnectMutation = useMutation(
    trpc.calComCredentials.remove.mutationOptions({
      onSuccess: async () => {
        setDisconnectOpen(false);
        toast.success("Cal.com disconnected");
        await refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (
    connectionQuery.isLoading ||
    receiptsQuery.isLoading ||
    eventTypesQuery.isLoading
  ) {
    return <Loader2 className="size-5 animate-spin text-muted-foreground" />;
  }

  const connection = connectionQuery.data;
  return (
    <>
      {connection ? (
        <CalComConnectionPanel
          connection={connection}
          eventTypeCount={eventTypesQuery.data?.length ?? 0}
          isConfiguring={webhookMutation.isPending}
          isSyncing={syncMutation.isPending}
          onConfigureWebhook={() => webhookMutation.mutate()}
          onDisconnect={() => setDisconnectOpen(true)}
          onSync={() => syncMutation.mutate()}
        />
      ) : (
        <CalComConnectionForm
          apiKey={apiKey}
          isSaving={connectMutation.isPending}
          isTesting={testMutation.isPending}
          testResult={testResult}
          onApiKeyChange={setApiKey}
          onSave={() => connectMutation.mutate({ apiKey })}
          onTest={() => testMutation.mutate({ apiKey })}
        />
      )}

      <Separator className="my-8" />
      <CalComWebhookActivity receipts={receiptsQuery.data ?? []} />

      <AlertDialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Cal.com?</AlertDialogTitle>
            <AlertDialogDescription>
              Future syncs and verified webhook deliveries will stop for this location.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
