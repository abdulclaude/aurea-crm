"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getWorkflowProviderBindingSpec,
  type WorkflowProviderBindingNodeType,
} from "@/features/workflows/lib/workflow-provider-binding";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

type WorkflowProviderAccountSelectProps = {
  nodeType: WorkflowProviderBindingNodeType;
  value: string | null | undefined;
  onValueChange: (providerAccountId: string) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
};

const READINESS_LABELS = {
  READY: "Ready",
  INACTIVE: "Disconnected",
  MISSING_GRANT: "Reconnect required",
  MISSING_SCOPES: "Permissions required",
} as const;

export function WorkflowProviderAccountSelect({
  nodeType,
  value,
  onValueChange,
  id = "workflow-provider-account",
  disabled = false,
  className,
}: WorkflowProviderAccountSelectProps) {
  const trpc = useTRPC();
  const spec = getWorkflowProviderBindingSpec(nodeType);
  const accountsQuery = useQuery(
    trpc.workflows.listProviderAccounts.queryOptions({ nodeType }),
  );
  const accounts = accountsQuery.data?.accounts ?? [];

  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id}>{spec.displayName} account</Label>
      <Select
        value={value ?? undefined}
        onValueChange={onValueChange}
        disabled={disabled || accountsQuery.isLoading || accounts.length === 0}
      >
        <SelectTrigger id={id} className="w-full shadow-none">
          <SelectValue
            placeholder={
              accountsQuery.isLoading
                ? "Loading accounts..."
                : `Select a ${spec.displayName} account`
            }
          />
        </SelectTrigger>
        <SelectContent align="start">
          {accounts.map((account) => (
            <SelectItem
              key={account.id}
              value={account.id}
              disabled={!account.readiness.ready}
            >
              <span>{account.displayName}</span>
              {account.inherited && (
                <span className="text-muted-foreground">Organization</span>
              )}
              {!account.readiness.ready && (
                <span className="text-destructive">
                  {READINESS_LABELS[account.readiness.status]}
                </span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {accountsQuery.isError && (
        <div className="flex items-center justify-between gap-2 text-xs text-destructive">
          <span>Provider accounts could not be loaded.</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => void accountsQuery.refetch()}
            title="Retry loading provider accounts"
          >
            <RefreshCw className="size-3.5" />
            <span className="sr-only">Retry loading provider accounts</span>
          </Button>
        </div>
      )}
      {!accountsQuery.isLoading && !accountsQuery.isError && accounts.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No connected {spec.displayName} account is available in this workspace.
        </p>
      )}
    </div>
  );
}
