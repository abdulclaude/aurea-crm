"use client";

import { useState, Suspense } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Gift, Plus, LoaderCircle, Settings2 } from "lucide-react";
import { ReferralsTable } from "@/features/referrals/components/referrals-table";
import {
  ReferralClientPicker,
  type ReferralClientOption,
} from "@/features/referrals/components/referral-client-picker";
import {
  ReferralProgramSettingsDialog,
  type ReferralProgramSettingsInput,
} from "@/features/referrals/components/referral-program-settings-dialog";

function ReferralsContent() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ReferralClientOption | null>(null);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [refereeEmail, setRefereeEmail] = useState("");

  const { data: program, isLoading: programLoading } = useQuery(
    trpc.referrals.getProgram.queryOptions(),
  );
  const clientsQuery = useQuery({
    ...trpc.clients.list.queryOptions({
      search: clientSearch || undefined,
      limit: 10,
      pageSize: 10,
    }),
    enabled: showCreateDialog,
  });

  const setupProgram = useMutation(
    trpc.referrals.setupProgram.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.referrals.getProgram.queryOptions().queryKey });
        setShowSettingsDialog(false);
        toast.success(program ? "Referral program updated" : "Referral program created");
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const toggleProgram = useMutation(
    trpc.referrals.toggleProgram.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.referrals.getProgram.queryOptions().queryKey });
        toast.success("Program status updated");
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const createReferral = useMutation(
    trpc.referrals.createReferral.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries();
        setShowCreateDialog(false);
        setSelectedClient(null);
        setClientSearch("");
        setRefereeEmail("");
        toast.success(`Referral created. Code: ${data.code}`);
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  if (programLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary/30" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="space-y-0">
        <div className="flex items-end justify-between gap-4 p-6">
          <div>
            <h1 className="text-lg font-semibold text-primary">Referral Program</h1>
            <p className="text-xs text-primary/70">Set up a referral program for your members.</p>
          </div>
        </div>

        <Separator className="bg-black/5 dark:bg-white/5" />

        <div className="p-6 flex flex-col items-center justify-center py-16 text-center">
          <Gift className="size-10 text-primary/20 mb-3" />
          <p className="text-sm font-medium text-primary mb-1">No referral program yet</p>
          <p className="text-xs text-primary/55 mb-4">
            Create a referral program to reward members who bring in new clients.
          </p>
          <Button
            onClick={() => setupProgram.mutate({ referrerRewardValue: 10, refereeRewardValue: 15 })}
            disabled={setupProgram.isPending}
          >
            {setupProgram.isPending && <LoaderCircle className="size-3.5 animate-spin" />}
            Create Referral Program
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <div className="flex items-end justify-between gap-4 p-6">
        <div>
          <h1 className="text-lg font-semibold text-primary">Referral Program</h1>
          <p className="text-xs text-primary/70">Track referrals and manage rewards.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-primary/40">{program.isActive ? "Active" : "Inactive"}</span>
            <Switch
              checked={program.isActive}
              onCheckedChange={(v) => toggleProgram.mutate({ isActive: v })}
            />
          </div>
          <Button
            size="icon"
            variant="outline"
            aria-label="Edit referral program settings"
            title="Edit referral program settings"
            onClick={() => setShowSettingsDialog(true)}
          >
            <Settings2 className="size-3.5" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowCreateDialog(true)}>
            <Plus className="size-3.5" />
            New Referral
          </Button>
        </div>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <Suspense
        fallback={
          <div className="flex items-center justify-center p-12 text-sm text-primary/40">
            Loading referrals...
          </div>
        }
      >
        <ReferralsTable />
      </Suspense>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a Referral</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Referring client</Label>
              <ReferralClientPicker
                clients={clientsQuery.data?.items ?? []}
                open={clientPickerOpen}
                search={clientSearch}
                selectedClient={selectedClient}
                onOpenChange={setClientPickerOpen}
                onSearchChange={setClientSearch}
                onSelect={setSelectedClient}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referee-email">Referee Email</Label>
              <Input
                id="referee-email"
                type="email"
                placeholder="Email of the person being referred"
                value={refereeEmail}
                onChange={(e) => setRefereeEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!selectedClient) return;
                createReferral.mutate({
                  referrerClientId: selectedClient.id,
                  refereeEmail,
                });
              }}
              disabled={!selectedClient || !refereeEmail || createReferral.isPending}
            >
              {createReferral.isPending && <LoaderCircle className="size-3.5 animate-spin" />}
              Generate Referral
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReferralProgramSettingsDialog
        open={showSettingsDialog}
        program={program}
        pending={setupProgram.isPending}
        onOpenChange={setShowSettingsDialog}
        onSave={(input: ReferralProgramSettingsInput) => setupProgram.mutate(input)}
      />
    </div>
  );
}

export default function ReferralsPage() {
  return <ReferralsContent />;
}
