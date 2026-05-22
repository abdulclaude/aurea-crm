"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useTRPC } from "@/trpc/client";
import { useState } from "react";

interface BulkAssignClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeLogIds: string[];
  onSuccess?: () => void;
}

export function BulkAssignClientDialog({
  open,
  onOpenChange,
  timeLogIds,
  onSuccess,
}: BulkAssignClientDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    null,
  );

  // Fetch clients for dropdown
  const { data: clientsData } = useQuery({
    ...trpc.clients.list.queryOptions({
      limit: 100,
    }),
    enabled: open,
  });

  const clients = clientsData?.items ?? [];

  // Bulk assign mutation
  const { mutate: bulkAssign, isPending } = useMutation(
    trpc.timeTracking.bulkAssignClient.mutationOptions({
      onSuccess: (result) => {
        queryClient.invalidateQueries({
          queryKey: trpc.timeTracking.list.queryOptions({}).queryKey,
        });
        toast.success(
          `Successfully assigned client to ${result.updatedCount} time log(s)`,
        );
        onOpenChange(false);
        setSelectedClientId(null);
        onSuccess?.();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to assign client");
      },
    }),
  );

  const handleAssign = () => {
    if (!selectedClientId) {
      toast.error("Please select a client");
      return;
    }

    bulkAssign({
      timeLogIds,
      clientId: selectedClientId,
    });
  };

  const handleRemoveClient = () => {
    bulkAssign({
      timeLogIds,
      clientId: null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign member to time logs</DialogTitle>
          <DialogDescription>
            Assign an instructor to {timeLogIds.length} selected time log(s).
            This is required for generating invoices.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="client">Select Client</Label>
            <Select
              value={selectedClientId || undefined}
              onValueChange={setSelectedClientId}
            >
              <SelectTrigger id="client">
                <SelectValue placeholder="Choose a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                    {client.email && ` (${client.email})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              All selected time logs must have the same client for invoice
              generation.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleRemoveClient}
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            Remove Client
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAssign}
              disabled={isPending || !selectedClientId}
              variant="gradient"
              className="flex-1 sm:flex-none"
            >
              {isPending ? "Assigning..." : "Assign Client"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
