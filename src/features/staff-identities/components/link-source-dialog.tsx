"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  StaffIdentityRow,
  StaffIdentitySource,
} from "@/features/staff-identities/contracts";
import { useTRPC } from "@/trpc/client";

const CREATE_IDENTITY_VALUE = "__create_identity__";

export function LinkSourceDialog({
  source,
  identities,
}: {
  source: StaffIdentitySource;
  identities: StaffIdentityRow[];
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [identityId, setIdentityId] = useState(CREATE_IDENTITY_VALUE);
  const linkSource = useMutation(
    trpc.staffIdentities.linkSource.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.staffIdentities.directory.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.staff.list.queryKey(),
          }),
        ]);
        toast.success("Staff source linked");
        setOpen(false);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
          <Link2 className="size-3.5" />
          Link
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link staff record</DialogTitle>
          <DialogDescription>
            {source.displayName} · {source.label}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor={`identity-${source.sourceId}`}>Identity</Label>
          <Select value={identityId} onValueChange={setIdentityId}>
            <SelectTrigger id={`identity-${source.sourceId}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CREATE_IDENTITY_VALUE}>
                Create identity from this record
              </SelectItem>
              {identities
                .filter((identity) => identity.status !== "ARCHIVED")
                .map((identity) => (
                  <SelectItem key={identity.id} value={identity.id}>
                    {identity.displayName}
                    {identity.email ? ` · ${identity.email}` : ""}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={linkSource.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() =>
              linkSource.mutate({
                sourceType: source.sourceType,
                sourceId: source.sourceId,
                identityId:
                  identityId === CREATE_IDENTITY_VALUE ? null : identityId,
              })
            }
            disabled={linkSource.isPending}
          >
            {linkSource.isPending ? "Linking..." : "Link record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
