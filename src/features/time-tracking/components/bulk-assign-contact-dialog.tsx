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

interface BulkAssignContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeLogIds: string[];
  onSuccess?: () => void;
}

export function BulkAssignContactDialog({
  open,
  onOpenChange,
  timeLogIds,
  onSuccess,
}: BulkAssignContactDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  // Fetch contacts for dropdown
  const { data: contactsData } = useQuery({
    ...trpc.contacts.list.queryOptions({
      limit: 100,
    }),
    enabled: open,
  });

  const contacts = contactsData?.items ?? [];

  // Bulk assign mutation
  const { mutate: bulkAssign, isPending } = useMutation(
    trpc.timeTracking.bulkAssignContact.mutationOptions({
      onSuccess: (result) => {
        queryClient.invalidateQueries({
          queryKey: trpc.timeTracking.list.queryOptions({}).queryKey,
        });
        toast.success(
          `Successfully assigned contact to ${result.updatedCount} time log(s)`
        );
        onOpenChange(false);
        setSelectedContactId(null);
        onSuccess?.();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to assign contact");
      },
    })
  );

  const handleAssign = () => {
    if (!selectedContactId) {
      toast.error("Please select a contact");
      return;
    }

    bulkAssign({
      timeLogIds,
      contactId: selectedContactId,
    });
  };

  const handleRemoveContact = () => {
    bulkAssign({
      timeLogIds,
      contactId: null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Contact to Time Logs</DialogTitle>
          <DialogDescription>
            Assign a contact (client) to {timeLogIds.length} selected time log(s).
            This is required for generating invoices.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="contact">Select Contact</Label>
            <Select
              value={selectedContactId || undefined}
              onValueChange={setSelectedContactId}
            >
              <SelectTrigger id="contact">
                <SelectValue placeholder="Choose a contact" />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.name}
                    {contact.email && ` (${contact.email})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              All selected time logs must have the same contact for invoice generation.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleRemoveContact}
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            Remove Contact
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
              disabled={isPending || !selectedContactId}
              variant="gradient"
              className="flex-1 sm:flex-none"
            >
              {isPending ? "Assigning..." : "Assign Contact"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
