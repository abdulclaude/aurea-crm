"use client";

import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Unplug,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Connection = {
  isActive: boolean;
  lastSyncedAt: Date | string | null;
  lastError: string | null;
  webhookConfigured: boolean;
  webhookConfiguredAt: Date | string | null;
  lastWebhookAt: Date | string | null;
  lastWebhookError: string | null;
};

export function CalComConnectionPanel(props: {
  connection: Connection;
  eventTypeCount: number;
  isConfiguring: boolean;
  isSyncing: boolean;
  onConfigureWebhook: () => void;
  onDisconnect: () => void;
  onSync: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium">Connection</h2>
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="size-3 text-emerald-600" /> Active
            </Badge>
            <Badge
              variant={
                props.connection.webhookConfigured ? "secondary" : "outline"
              }
            >
              Webhook {props.connection.webhookConfigured ? "verified" : "not configured"}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {props.eventTypeCount} synchronized event types in this location.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={props.onDisconnect}>
          <Unplug className="size-4" /> Disconnect
        </Button>
      </div>

      <dl className="grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-3">
        <StatusCell
          label="Event types"
          value={relativeTime(props.connection.lastSyncedAt)}
        />
        <StatusCell
          label="Webhook"
          value={relativeTime(props.connection.webhookConfiguredAt)}
        />
        <StatusCell
          label="Last delivery"
          value={relativeTime(props.connection.lastWebhookAt)}
        />
      </dl>

      {(props.connection.lastError || props.connection.lastWebhookError) && (
        <p className="text-xs text-destructive">
          {props.connection.lastWebhookError ?? props.connection.lastError}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={props.isSyncing}
          onClick={props.onSync}
        >
          {props.isSyncing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Sync event types
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={props.isConfiguring}
          onClick={props.onConfigureWebhook}
        >
          {props.isConfiguring ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ShieldCheck className="size-4" />
          )}
          {props.connection.webhookConfigured ? "Rotate webhook" : "Configure webhook"}
        </Button>
      </div>
    </div>
  );
}

function StatusCell(props: { label: string; value: string }) {
  return (
    <div className="bg-background px-3 py-3">
      <dt className="text-xs text-muted-foreground">{props.label}</dt>
      <dd className="mt-1 text-sm">{props.value}</dd>
    </div>
  );
}

function relativeTime(value: Date | string | null): string {
  if (!value) return "Never";
  return formatDistanceToNow(new Date(value), { addSuffix: true });
}
