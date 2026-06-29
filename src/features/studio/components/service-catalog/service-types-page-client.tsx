"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, Plus, RotateCcw } from "lucide-react";
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
import { CategoryDialog } from "./category-dialog";
import { ServiceTypeDialog } from "./service-type-dialog";

export function ServiceTypesPageClient() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [serviceDialogOpen, setServiceDialogOpen] = React.useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = React.useState(false);

  const servicesQuery = useQuery(
    trpc.serviceCatalog.list.queryOptions({ includeInactive: true }),
  );
  const backfill = useMutation(
    trpc.serviceCatalog.backfillFromClassTypes.mutationOptions({
      onSuccess: async (result) => {
        await queryClient.invalidateQueries(
          trpc.serviceCatalog.list.queryOptions({ includeInactive: true }),
        );
        toast.success(
          result.created > 0
            ? `Created ${result.created} service types`
            : "Class types are already linked",
        );
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const services = React.useMemo(() => {
    const rows = servicesQuery.data ?? [];
    if (!search.trim()) return rows;
    const query = search.toLowerCase();
    return rows.filter((service) =>
      [service.name, service.categoryName, service.revenueCategory]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query)),
    );
  }, [search, servicesQuery.data]);

  return (
    <div className="space-y-0">
      <div className="flex flex-col gap-4 p-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-primary">Service types</h1>
          <p className="text-xs text-primary/70">
            Manage classes, privates, events, booking defaults, access rules, and checkout copy.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => backfill.mutate()}>
            <RotateCcw className="size-3.5" />
            Backfill class types
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCategoryDialogOpen(true)}>
            <Boxes className="size-3.5" />
            Add category
          </Button>
          <Button size="sm" onClick={() => setServiceDialogOpen(true)}>
            <Plus className="size-3.5" />
            Add service
          </Button>
        </div>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <div className="p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search service types..."
            className="max-w-sm"
          />
          <Badge variant="outline" className="text-[11px]">
            {services.length} services
          </Badge>
        </div>

        <div className="overflow-hidden rounded-sm border border-black/5 dark:border-white/5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>Defaults</TableHead>
                <TableHead>Linked classes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            service.calendarColor ??
                            service.categoryColor ??
                            "#6366f1",
                        }}
                      />
                      <div>
                        <div className="text-xs font-medium text-primary">
                          {service.name}
                        </div>
                        <div className="text-[11px] text-primary/50">
                          {service.classTypeName ?? "No legacy class type"}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[11px]">
                      {service.experienceType.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-primary/65">
                    {service.categoryName ?? "Uncategorised"}
                  </TableCell>
                  <TableCell className="text-xs text-primary/65">
                    {formatPayment(service)}
                  </TableCell>
                  <TableCell className="text-xs text-primary/65">
                    {service.visibility.toLowerCase()}
                    {(service.bookingRestrictionTags ?? []).length > 0
                      ? `, ${(service.bookingRestrictionTags ?? []).length} tag rules`
                      : ""}
                  </TableCell>
                  <TableCell className="text-xs text-primary/65">
                    {service.durationMinutes}m
                    {service.capacity ? `, ${service.capacity} spots` : ""}
                  </TableCell>
                  <TableCell className="text-xs text-primary/65">
                    {service.studioClassCount}
                  </TableCell>
                </TableRow>
              ))}
              {services.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-xs text-primary/50">
                    No service types found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ServiceTypeDialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen} />
      <CategoryDialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen} />
    </div>
  );
}

function formatPayment(service: {
  currency: string;
  paymentType: string;
  price: string | null;
  slidingScaleMaxPrice: string | null;
  slidingScaleMinPrice: string | null;
}): string {
  if (service.paymentType === "PAID" && service.price) {
    return `${service.currency} ${service.price}`;
  }
  if (service.paymentType === "SLIDING_SCALE") {
    return `${service.currency} ${service.slidingScaleMinPrice ?? "0"}-${service.slidingScaleMaxPrice ?? "0"}`;
  }
  return service.paymentType.toLowerCase().replaceAll("_", " ");
}
