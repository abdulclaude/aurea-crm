"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinkIcon, Plus, RotateCcw } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTRPC } from "@/trpc/client";
import { PricingOptionDialog } from "./pricing-option-dialog";

export function PricingOptionsPageClient() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const optionsQuery = useQuery(
    trpc.pricingOptions.list.queryOptions({ includeInactive: true }),
  );
  const backfill = useMutation(
    trpc.pricingOptions.backfillFromMembershipPlans.mutationOptions({
      onSuccess: async (result) => {
        await queryClient.invalidateQueries(
          trpc.pricingOptions.list.queryOptions({ includeInactive: true }),
        );
        toast.success(
          result.created > 0
            ? `Created ${result.created} pricing options`
            : "Membership plans are already linked",
        );
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const options = React.useMemo(() => {
    const rows = optionsQuery.data ?? [];
    if (!search.trim()) return rows;
    const query = search.toLowerCase();
    return rows.filter((option) =>
      [option.name, option.type, option.revenueCategory, option.accessSummary]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query)),
    );
  }, [optionsQuery.data, search]);

  return (
    <div className="space-y-0">
      <div className="flex flex-col gap-4 p-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-primary">Pricing options</h1>
          <p className="text-xs text-primary/70">
            Manage memberships, class packs, bundles, checkout visibility, POS access, and service access.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => backfill.mutate()}>
            <RotateCcw className="size-3.5" />
            Backfill memberships
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="size-3.5" />
            Add pricing option
          </Button>
        </div>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <div className="p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search pricing options..."
            className="max-w-sm"
          />
          <Badge variant="outline" className="text-[11px]">
            {options.length} options
          </Badge>
        </div>

        <div className="overflow-hidden rounded-sm border border-black/5 dark:border-white/5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>Channels</TableHead>
                <TableHead>Buy page</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {options.map((option) => (
                <TableRow key={option.id}>
                  <TableCell>
                    <div>
                      <div className="text-xs font-medium text-primary">
                        {option.name}
                      </div>
                      <div className="text-[11px] text-primary/50">
                        {option.revenueCategory ?? "No revenue category"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[11px]">
                      {option.type.toLowerCase().replaceAll("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-primary/65">
                    {option.currency} {option.price}
                    {option.billingInterval !== "ONE_TIME"
                      ? ` / ${option.billingInterval.toLowerCase()}`
                      : ""}
                  </TableCell>
                  <TableCell className="text-xs text-primary/65">
                    {option.accessSummary ?? `${option.accessGrantCount} rules`}
                  </TableCell>
                  <TableCell className="text-xs text-primary/65">
                    {[
                      option.isPublic ? "public" : null,
                      option.showInPos ? "POS" : null,
                      option.directPurchaseEnabled ? "direct" : null,
                    ]
                      .filter(Boolean)
                      .join(", ") || "hidden"}
                  </TableCell>
                  <TableCell className="text-xs text-primary/65">
                    {option.buyPagePath ? (
                      <span className="inline-flex items-center gap-1">
                        <LinkIcon className="size-3" />
                        {option.buyPagePath}
                      </span>
                    ) : (
                      "Off"
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {options.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-xs text-primary/50">
                    No pricing options found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <PricingOptionDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
