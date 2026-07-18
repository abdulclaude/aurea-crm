"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";

function accountEnding(accountNumber: string): string {
  const normalized = accountNumber.replace(/\s/g, "");
  return normalized.slice(-4);
}

export function BankTransferCard() {
  const router = useRouter();
  const trpc = useTRPC();
  const settingsQuery = useQuery(
    trpc.bankTransferSettings.get.queryOptions({}),
  );
  const permissionsQuery = useQuery(
    trpc.permissions.getCurrent.queryOptions(),
  );

  if (settingsQuery.isLoading || permissionsQuery.isLoading) {
    return (
      <Card className="space-y-4 p-6">
        <div className="flex items-start gap-4">
          <Skeleton className="size-12 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-full max-w-sm" />
          </div>
        </div>
        <Skeleton className="h-9 w-28" />
      </Card>
    );
  }

  if (settingsQuery.isError) {
    return (
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-5 text-destructive" />
            <div>
              <h3 className="text-sm font-semibold">
                Bank transfer settings unavailable
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {settingsQuery.error.message}
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void settingsQuery.refetch()}
          >
            <RefreshCw className="size-4" />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  const settings = settingsQuery.data;
  const isConfigured = Boolean(settings?.enabled && settings.bankName);
  const canManage =
    permissionsQuery.data?.capabilities.includes("commerce.manage") ?? false;

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="rounded-lg bg-primary/10 p-3">
            <Building2 className="size-6 text-primary" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold">Bank transfer</h3>
              {isConfigured ? (
                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle2 className="size-3" />
                  Configured
                </span>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              Accept payments via bank transfer or wire transfer
            </p>
            {isConfigured && settings?.bankName ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Bank: <span className="font-medium">{settings.bankName}</span>
                {settings.accountNumber ? (
                  <>
                    {" | "}
                    Account ending {accountEnding(settings.accountNumber)}
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
        </div>
        {canManage ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push("/settings/bank-transfer")}
            className="shrink-0 gap-2"
          >
            {isConfigured ? "Manage" : "Configure"}
            <ChevronRight className="size-4" />
          </Button>
        ) : null}
      </div>

      {!isConfigured ? (
        <div className="mt-4 border-t border-border pt-4">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>No card processing fees for offline payments</li>
            <li>Domestic and international transfer instructions</li>
            <li>Manual verification with payment tracking</li>
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
