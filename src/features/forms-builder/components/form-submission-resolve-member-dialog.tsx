"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, UserRoundSearch } from "lucide-react";
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  ReferralClientPicker,
  type ReferralClientOption,
} from "@/features/referrals/components/referral-client-picker";
import { useTRPC } from "@/trpc/client";

type Props = {
  formId: string;
  submissionId: string;
  resolutionError: string | null;
};

export function FormSubmissionResolveMemberDialog({
  formId,
  submissionId,
  resolutionError,
}: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ReferralClientOption | null>(null);
  const clientsQuery = useQuery({
    ...trpc.clients.list.queryOptions({
      page: 1,
      pageSize: 20,
      search: search.trim() || undefined,
    }),
    enabled: open,
  });
  const resolve = useMutation(
    trpc.forms.resolveSubmissionClient.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.forms.getSubmissions.queryKey(),
        });
        setOpen(false);
        setSelected(null);
        setSearch("");
        toast.success("Response linked to member", {
          description: "Any waiting form automations have been queued.",
        });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <UserRoundSearch className="size-4" aria-hidden="true" />
        Choose member
      </Button>
      <DialogContent className="rounded-lg">
        <DialogHeader>
          <DialogTitle>Choose the member for this response</DialogTitle>
          <DialogDescription>
            Automations stay paused until this response is linked to the right
            member.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Member</Label>
          <ReferralClientPicker
            clients={clientsQuery.data?.items ?? []}
            open={pickerOpen}
            placeholder={
              clientsQuery.isLoading ? "Loading members..." : "Select a member"
            }
            search={search}
            selectedClient={selected}
            onOpenChange={setPickerOpen}
            onSearchChange={setSearch}
            onSelect={setSelected}
          />
          {resolutionError ? (
            <p className="text-xs text-muted-foreground">{resolutionError}</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={resolve.isPending}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={!selected || resolve.isPending}
            onClick={() => {
              if (!selected) return;
              resolve.mutate({ formId, submissionId, clientId: selected.id });
            }}
          >
            {resolve.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            Link member and continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
