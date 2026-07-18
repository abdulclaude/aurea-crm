"use client";

import { format } from "date-fns";
import type { inferRouterOutputs } from "@trpc/server";
import { Plus, WalletCards, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AppRouter } from "@/trpc/routers/_app";

type RouterOutput = inferRouterOutputs<AppRouter>;
type Ledger = RouterOutput["studioBilling"]["getClientAccountCreditLedger"];

function formatCurrency(amount: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(
    amount,
  );
}

type AccountCreditLedgerPanelProps = {
  client: { id: string; name: string; email: string | null };
  ledger: Ledger | undefined;
  isLoading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdjust: () => void;
};

export function AccountCreditLedgerPanel({
  client,
  ledger,
  isLoading,
  open,
  onOpenChange,
  onAdjust,
}: AccountCreditLedgerPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-black/5 px-6 py-5 text-left dark:border-white/5">
          <div className="flex items-start justify-between gap-4 pr-1">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-sm bg-primary/5 text-primary/60">
                <WalletCards className="size-4" />
              </span>
              <div className="min-w-0">
                <SheetTitle>{client.name} account credit</SheetTitle>
                <SheetDescription>
                  Review the current balance and complete credit ledger.
                </SheetDescription>
              </div>
            </div>
            <SheetClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
              >
                <X className="size-4" />
                <span className="sr-only">Close account credit details</span>
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        <div className="flex flex-wrap items-start justify-between gap-3 p-6">
          <div className="min-w-0">
            <p className="text-xs uppercase text-primary/40">Client</p>
            <p className="truncate text-sm font-medium text-primary">
              {client.name}
            </p>
            <p className="truncate text-xs text-primary/50">
              {client.email ?? "No email"}
            </p>
          </div>
          <Button size="sm" disabled={!ledger} onClick={onAdjust}>
            <Plus className="size-3.5" />
            Adjust
          </Button>
        </div>
        <Separator className="bg-black/5 dark:bg-white/5" />

        {isLoading && !ledger ? (
          <p className="px-6 py-12 text-center text-xs text-primary/50">
            Loading account credit...
          </p>
        ) : ledger ? (
          <div className="space-y-6 p-6">
            <div>
              <p className="text-xs text-primary/50">Current balance</p>
              <p className="mt-1 text-2xl font-semibold text-primary">
                {formatCurrency(
                  ledger.balance.balance,
                  ledger.balance.currency,
                )}
              </p>
              <p className="mt-2 text-xs text-primary/45">
                {ledger.balance.updatedAt
                  ? `Updated ${format(new Date(ledger.balance.updatedAt), "MMM d, yyyy h:mm a")}`
                  : "No balance record yet"}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-primary/60">Ledger</p>
                <Badge variant="outline" className="text-[11px]">
                  {ledger.transactions.length} entries
                </Badge>
              </div>
              <div className="rounded-sm border border-black/5 dark:border-white/5">
                {ledger.transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-start justify-between gap-4 border-b border-black/5 p-3 last:border-b-0 dark:border-white/5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-primary">
                        {transaction.type.replaceAll("_", " ").toLowerCase()}
                      </p>
                      <p className="truncate text-xs text-primary/50">
                        {transaction.description ?? "No description"}
                      </p>
                      <p className="mt-1 text-[11px] text-primary/40">
                        {format(
                          new Date(transaction.createdAt),
                          "MMM d, yyyy h:mm a",
                        )}
                      </p>
                    </div>
                    <p
                      className={
                        transaction.amount >= 0
                          ? "text-sm font-medium text-emerald-500"
                          : "text-sm font-medium text-rose-500"
                      }
                    >
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </p>
                  </div>
                ))}
                {ledger.transactions.length === 0 && (
                  <p className="p-4 text-sm text-primary/50">
                    No ledger entries yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
