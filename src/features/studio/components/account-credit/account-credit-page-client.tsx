"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import * as React from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";
import { AccountCreditAdjustDialog } from "./account-credit-adjust-dialog";
import { AccountCreditBalancesTable } from "./account-credit-balances-table";
import { AccountCreditClientPicker } from "./account-credit-client-picker";
import { AccountCreditLedgerPanel } from "./account-credit-ledger-panel";

type RouterOutput = inferRouterOutputs<AppRouter>;
type ClientRow = RouterOutput["clients"]["list"]["items"][number];
type SelectedClient = Pick<ClientRow, "id" | "name" | "email">;

export function AccountCreditPageClient() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] =
    React.useState<SelectedClient | null>(null);
  const [clientSearch, setClientSearch] = React.useState("");
  const [clientPickerOpen, setClientPickerOpen] = React.useState(false);
  const [balanceSearch, setBalanceSearch] = React.useState("");
  const [adjustOpen, setAdjustOpen] = React.useState(false);

  const balancesInput = React.useMemo(
    () => ({ search: balanceSearch || undefined, limit: 50 }),
    [balanceSearch],
  );

  const clientsQuery = useQuery(
    trpc.clients.list.queryOptions({
      search: clientSearch || undefined,
      limit: 10,
      pageSize: 10,
    }),
  );
  const balancesQuery = useQuery(
    trpc.studioBilling.listAccountCreditBalances.queryOptions(balancesInput),
  );
  const ledgerQuery = useQuery({
    ...trpc.studioBilling.getClientAccountCreditLedger.queryOptions({
      clientId: selectedClient?.id ?? "",
      limit: 50,
    }),
    enabled: Boolean(selectedClient),
  });

  const adjustMutation = useMutation(
    trpc.studioBilling.adjustClientAccountCredit.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries(
            trpc.studioBilling.listAccountCreditBalances.queryOptions(
              balancesInput,
            ),
          ),
          selectedClient
            ? queryClient.invalidateQueries(
                trpc.studioBilling.getClientAccountCreditLedger.queryOptions({
                  clientId: selectedClient.id,
                  limit: 50,
                }),
              )
            : Promise.resolve(),
        ]);
        toast.success("Account credit adjusted");
        setAdjustOpen(false);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <div className="space-y-0">
      <div className="flex flex-col gap-4 p-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-primary">Account credit</h1>
          <p className="text-xs text-primary/70">
            Review client wallet balances and record credit adjustments.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[11px]">
            {balancesQuery.data?.length ?? 0} balances
          </Badge>
          <AccountCreditClientPicker
            clients={clientsQuery.data?.items ?? []}
            open={clientPickerOpen}
            search={clientSearch}
            selectedClient={selectedClient}
            onOpenChange={setClientPickerOpen}
            onSearchChange={setClientSearch}
            onSelect={setSelectedClient}
          />
        </div>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <AccountCreditBalancesTable
        rows={balancesQuery.data ?? []}
        isLoading={balancesQuery.isLoading}
        search={balanceSearch}
        selectedClientId={selectedClient?.id ?? null}
        onSearchChange={setBalanceSearch}
        onSelect={setSelectedClient}
      />

      {selectedClient && (
        <AccountCreditLedgerPanel
          client={selectedClient}
          ledger={ledgerQuery.data}
          isLoading={ledgerQuery.isLoading}
          open={Boolean(selectedClient)}
          onOpenChange={(open) => {
            if (!open) {
              setAdjustOpen(false);
              setSelectedClient(null);
            }
          }}
          onAdjust={() => setAdjustOpen(true)}
        />
      )}

      {selectedClient && (
        <AccountCreditAdjustDialog
          open={adjustOpen}
          isPending={adjustMutation.isPending}
          clientName={selectedClient.name}
          onOpenChange={setAdjustOpen}
          onAdjust={(input) => {
            adjustMutation.mutate({ clientId: selectedClient.id, ...input });
          }}
        />
      )}
    </div>
  );
}
