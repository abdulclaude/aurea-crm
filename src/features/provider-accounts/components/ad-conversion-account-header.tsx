import { AlertCircle, CheckCircle2, Unplug } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  active: boolean;
  inherited: boolean;
  lastErrorCode: string | null;
  lastHealthCheckAt: Date | null;
  canDisconnect: boolean;
  disconnecting: boolean;
  onDisconnect: () => void;
};

export function AdConversionAccountHeader({
  active,
  inherited,
  lastErrorCode,
  lastHealthCheckAt,
  canDisconnect,
  disconnecting,
  onDisconnect,
}: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium">Server-side ad conversions</h2>
          {active && (
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="size-3" /> Active
            </Badge>
          )}
          {lastErrorCode && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="size-3" /> Delivery error
            </Badge>
          )}
          {inherited && <Badge variant="secondary">Organization account</Badge>}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Conversion delivery resolves an encrypted account from the tracked
          funnel&apos;s organization and location. There is no global fallback.
        </p>
        {lastHealthCheckAt && (
          <p className="mt-1 text-xs text-muted-foreground">
            Last delivery check {lastHealthCheckAt.toLocaleString()}
          </p>
        )}
        {lastErrorCode && (
          <p className="mt-1 text-xs text-destructive">
            Last error {lastErrorCode}
          </p>
        )}
      </div>
      {canDisconnect && (
        <Button
          variant="outline"
          size="sm"
          onClick={onDisconnect}
          disabled={disconnecting}
        >
          <Unplug className="size-4" /> Disconnect
        </Button>
      )}
    </div>
  );
}
