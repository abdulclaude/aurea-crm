"use client";

import { useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Ban, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDecimalMoney } from "@/features/commerce/lib/money";
import {
  cancellationChargeCanCollect,
  cancellationChargeCanWaive,
} from "@/features/studio/lib/cancellation-charge-rules";
import { OperationsPagination } from "@/features/commerce/components/operations/operations-pagination";
import { useTRPC } from "@/trpc/client";

import type { CancellationChargeRow, CancellationChargeStatus } from "./types";
import { ChargeStatusBadge } from "./charge-status";
import { ChargesFilterToolbar } from "./charges-filter-toolbar";
import { CancellationQueryError } from "./cancellation-query-error";
import { WaiveChargeDialog } from "./waive-charge-dialog";

export function ChargesPanel({
  canManage,
  hydrated,
}: {
  canManage: boolean;
  hydrated: boolean;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<CancellationChargeStatus | "ALL">("ALL");
  const [waiving, setWaiving] = useState<CancellationChargeRow | null>(null);
  const charges = useInfiniteQuery({
    ...trpc.cancellationPolicy.getCharges.infiniteQueryOptions(
      {
        status: status === "ALL" ? undefined : status,
        limit: 50,
      },
      { getNextPageParam: (page) => page.nextCursor ?? undefined },
    ),
  });
  const rows = charges.data?.pages.flatMap((page) => page.items) ?? [];
  const collect = useMutation(
    trpc.cancellationPolicy.collectCharge.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.cancellationPolicy.getCharges.queryKey(),
        });
        toast.success("Collection queued");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <div>
      <ChargesFilterToolbar status={status} onStatusChange={setStatus} />
      <Separator />
      {!hydrated || charges.isLoading ? (
        <div className="space-y-3 p-6 sm:p-8">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : charges.isError ? (
        <CancellationQueryError
          message={charges.error.message}
          onRetry={() => void charges.refetch()}
        />
      ) : rows.length ? (
        <div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-8">Member</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="pr-8 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.charge.id}>
                    <TableCell className="pl-8 font-medium">
                      {row.clientName}
                    </TableCell>
                    <TableCell>{row.className}</TableCell>
                    <TableCell>
                      {row.charge.type === "NO_SHOW"
                        ? "No-show"
                        : "Late cancellation"}
                    </TableCell>
                    <TableCell>
                      {formatDecimalMoney(
                        row.charge.amount,
                        row.charge.currency,
                      )}
                    </TableCell>
                    <TableCell>{row.charge.creditsDeducted}</TableCell>
                    <TableCell>
                      <ChargeStatusBadge status={row.charge.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {new Intl.DateTimeFormat("en-GB", {
                        dateStyle: "medium",
                      }).format(row.charge.createdAt)}
                    </TableCell>
                    <TableCell className="pr-8">
                      <div className="flex justify-end gap-1">
                        {cancellationChargeCanCollect(row.charge.status) ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Collect fee"
                            aria-label={`Collect fee for ${row.clientName}`}
                            disabled={!canManage || collect.isPending}
                            onClick={() =>
                              collect.mutate({ chargeId: row.charge.id })
                            }
                          >
                            {collect.isPending &&
                            collect.variables?.chargeId === row.charge.id ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <CreditCard />
                            )}
                          </Button>
                        ) : null}
                        {cancellationChargeCanWaive(row.charge.status) ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Waive fee"
                            aria-label={`Waive fee for ${row.clientName}`}
                            disabled={!canManage}
                            onClick={() => setWaiving(row)}
                          >
                            <Ban />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <OperationsPagination
            hasNextPage={Boolean(charges.hasNextPage)}
            isFetchingNextPage={charges.isFetchingNextPage}
            onLoadMore={() => void charges.fetchNextPage()}
          />
        </div>
      ) : (
        <div className="p-10 text-center text-sm text-muted-foreground">
          No cancellation fees match this filter.
        </div>
      )}
      <WaiveChargeDialog
        row={waiving}
        open={Boolean(waiving)}
        onOpenChange={(open) => !open && setWaiving(null)}
      />
    </div>
  );
}
