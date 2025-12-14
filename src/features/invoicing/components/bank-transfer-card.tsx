"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, ChevronRight, CheckCircle2 } from "lucide-react";
import { useTRPC } from "@/trpc/client";

export function BankTransferCard() {
  const router = useRouter();
  const trpc = useTRPC();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["bankTransferSettings"],
    queryFn: async () => {
      const result = await (trpc.bankTransferSettings.get as any).query({});
      return result;
    },
  });

  const isConfigured = settings?.enabled && settings?.bankName;

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base">Bank Transfer</h3>
              {isConfigured && (
                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Configured
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Accept payments via bank transfer or wire transfer
            </p>
            {isConfigured && settings.bankName && (
              <p className="text-xs text-muted-foreground mt-2">
                Bank: <span className="font-medium">{settings.bankName}</span>
                {settings.accountNumber && (
                  <>
                    {" • "}
                    Account: <span className="font-mono">{settings.accountNumber}</span>
                  </>
                )}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/settings/bank-transfer")}
          className="gap-2"
        >
          {isConfigured ? "Manage" : "Configure"}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {!isConfigured && (
        <div className="mt-4 pt-4 border-t border-border">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>No transaction fees - receive full payment amount</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Support for both domestic and international transfers</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Manual verification workflow with payment tracking</span>
            </li>
          </ul>
        </div>
      )}
    </Card>
  );
}
