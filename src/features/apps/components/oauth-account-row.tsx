"use client";

import { RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type OAuthAccountRowData = {
  id: string;
  displayName: string;
  accountHint: string;
  status: string;
  isDefault: boolean;
  inherited: boolean;
  linkedAccountId: string | null;
  canReconnect: boolean;
  lastHealthCheckAt: Date | null;
  lastSuccessAt: Date | null;
  lastErrorCode: string | null;
};

type OAuthAccountRowProps = {
  account: OAuthAccountRowData;
  pending: boolean;
  onReconnect: () => void;
};

const ERROR_MESSAGES: Record<string, string> = {
  OAUTH_ACCOUNT_MISSING: "The linked login is no longer available.",
  OAUTH_REAUTHORIZATION_REQUIRED:
    "Authorization expired or was revoked. Reconnect this account.",
  OAUTH_SCOPES_MISSING:
    "Required permissions are missing. Reconnect and approve every permission.",
  OAUTH_TOKEN_TEMPORARILY_UNAVAILABLE:
    "The provider is temporarily unavailable. Aurea will retry future work.",
};

function statusLabel(status: string): string {
  if (status === "ACTIVE") return "Connected";
  if (status === "DEGRADED") return "Needs attention";
  return "Disconnected";
}

function formatTimestamp(value: Date | null): string | null {
  return value ? value.toLocaleString() : null;
}

export function OAuthAccountRow({
  account,
  pending,
  onReconnect,
}: OAuthAccountRowProps) {
  const lastChecked = formatTimestamp(account.lastHealthCheckAt);
  const lastSuccess = formatTimestamp(account.lastSuccessAt);
  const errorMessage = account.lastErrorCode
    ? ERROR_MESSAGES[account.lastErrorCode] ??
      "The provider reported an account error."
    : null;

  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium">{account.displayName}</p>
          {account.isDefault && <Badge variant="secondary">Default</Badge>}
          {account.inherited && <Badge variant="outline">Organization</Badge>}
          <Badge
            variant={account.status === "ACTIVE" ? "outline" : "destructive"}
          >
            {statusLabel(account.status)}
          </Badge>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {account.accountHint}
        </p>
        {errorMessage && (
          <p className="text-xs text-muted-foreground">{errorMessage}</p>
        )}
        {(lastChecked || lastSuccess) && (
          <p className="text-xs text-muted-foreground">
            {lastChecked ? `Checked ${lastChecked}` : null}
            {lastChecked && lastSuccess ? " | " : null}
            {lastSuccess ? `Last successful use ${lastSuccess}` : null}
          </p>
        )}
        {account.inherited && account.status !== "ACTIVE" && (
          <p className="text-xs text-muted-foreground">
            Reconnect this account from the organization workspace.
          </p>
        )}
      </div>

      {account.status !== "ACTIVE" && (
        <Button
          size="sm"
          variant="outline"
          disabled={!account.canReconnect || pending}
          onClick={onReconnect}
        >
          <RefreshCw className="size-4" />
          Reconnect
        </Button>
      )}
    </div>
  );
}
