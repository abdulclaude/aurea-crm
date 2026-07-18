"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DemoRecoveryControl } from "@/features/demo-data/components/demo-recovery-control";
import type { DemoDataProfile } from "@/features/demo-data/contracts";
import { useTRPC } from "@/trpc/client";

export function DemoDataControl(): React.ReactNode {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<DemoDataProfile>("SHOWCASE");
  const [confirmation, setConfirmation] = useState("");
  const [allowExistingData, setAllowExistingData] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const availability = useQuery(trpc.seed.availability.queryOptions());
  const preview = useQuery({
    ...trpc.seed.preview.queryOptions({ profile }),
    enabled: open && availability.data?.canManage === true && availability.data.hasActiveLocation,
  });
  const populate = useMutation(
    trpc.seed.populateStudioData.mutationOptions({
      onSuccess: async (result) => {
        toast.success(result.replayed ? "Demo data was already populated" : "Demo studio populated", {
          description: `${Object.values(result.counts).reduce((total, count) => total + count, 0).toLocaleString()} owned fixture records are available.`,
        });
        setOpen(false);
        setConfirmation("");
        setIdempotencyKey(crypto.randomUUID());
        await queryClient.invalidateQueries();
      },
      onError: (error) => toast.error("Demo population failed", { description: error.message }),
    }),
  );
  const recover = useMutation(
    trpc.seed.recoverInterruptedRun.mutationOptions({
      onSuccess: async (result) => {
        toast.success("Demo operation recovered", {
          description:
            result.status === "CLEARED"
              ? "The interrupted clear was finalized."
              : "The interrupted operation was closed without deleting data.",
        });
        await queryClient.invalidateQueries();
      },
      onError: (error) =>
        toast.error("Demo recovery failed", { description: error.message }),
    }),
  );

  if (!availability.data?.enabled || !availability.data.canManage) return null;
  const hasLocation = availability.data.hasActiveLocation;
  const locationHelpId = "demo-data-location-help";
  const confirmationHelpId = "demo-data-confirmation-help";
  const recoverableRun = preview.data?.latestRun?.canRecover
    ? preview.data.latestRun
    : null;
  const canSubmit = Boolean(
    preview.data?.canPopulate &&
      confirmation === preview.data.confirmationText &&
      (preview.data.existingTotal === 0 || allowExistingData) &&
      !populate.isPending &&
      !recover.isPending,
  );

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen);
      if (nextOpen) {
        setConfirmation("");
        setAllowExistingData(false);
        setIdempotencyKey(crypto.randomUUID());
      }
    }}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-disabled={!hasLocation}
        aria-describedby={!hasLocation ? locationHelpId : undefined}
        title={hasLocation ? "Populate this location with demo data" : undefined}
        onClick={() => {
          if (hasLocation) setOpen(true);
          else toast.info("Select a location before populating demo data");
        }}
        className="flex min-h-11 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 text-[11px] font-medium text-amber-700 shadow-none ring-0 hover:bg-amber-100 aria-disabled:opacity-50"
      >
        <Sparkles className="size-3" />
        Populate demo data
      </Button>
      {!hasLocation && <span id={locationHelpId} className="sr-only">Select a location first.</span>}

      <AlertDialogContent className="max-w-lg rounded-lg" aria-busy={populate.isPending}>
        <AlertDialogHeader>
          <AlertDialogTitle>Populate this demo location</AlertDialogTitle>
          <AlertDialogDescription>
            Creates synthetic, tenant-owned fixtures without connecting providers, sending messages, or deleting existing records.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="demo-profile">Fixture profile</Label>
            <Select value={profile} onValueChange={(value) => {
              setProfile(value as DemoDataProfile);
              setConfirmation("");
            }}>
              <SelectTrigger id="demo-profile" className="w-full shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SHOWCASE">Showcase</SelectItem>
                <SelectItem value="QA_EXHAUSTIVE">QA exhaustive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {preview.isLoading ? (
            <div role="status" aria-live="polite" className="flex min-h-24 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" /> Checking location
            </div>
          ) : preview.data ? (
            <div className="space-y-3 border-y py-3">
              <div className="flex items-start gap-3">
                <Database className="mt-0.5 size-4 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{preview.data.locationName}</p>
                  <p className="text-xs text-muted-foreground">{preview.data.profileConfig.description}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <Summary label="Clients" value={preview.data.profileConfig.clientCount} />
                <Summary label="Payments" value={preview.data.profileConfig.paymentsCount} />
                <Summary label="History" value={`${preview.data.profileConfig.historyMonths} months`} />
              </div>
              {!preview.data.canPopulate && (
                <p role="alert" className="text-xs font-medium text-destructive">
                  Another demo data operation is already active for this location.
                </p>
              )}
              {preview.data.existingTotal > 0 && (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                  <Checkbox
                    id="demo-allow-existing-data"
                    checked={allowExistingData}
                    onCheckedChange={(checked) =>
                      setAllowExistingData(checked === true)
                    }
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor="demo-allow-existing-data"
                    className="cursor-pointer text-xs leading-5"
                  >
                    Add fixtures alongside {preview.data.existingTotal.toLocaleString()} existing {preview.data.existingTotal === 1 ? "record" : "records"}. Existing data will not be changed or deleted.
                  </Label>
                </div>
              )}
              {recoverableRun && (
                <DemoRecoveryControl
                  run={recoverableRun}
                  isPending={recover.isPending}
                  onRecover={(input) => recover.mutate(input)}
                />
              )}
            </div>
          ) : preview.error ? (
            <p role="alert" className="text-sm text-destructive">{preview.error.message}</p>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="demo-confirmation">Confirmation</Label>
            <Input
              id="demo-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={preview.data?.confirmationText ?? "Select a profile first"}
              autoComplete="off"
              aria-describedby={confirmationHelpId}
              className="shadow-none"
            />
            <p id={confirmationHelpId} className="text-xs text-muted-foreground">
              Type <span className="font-medium text-foreground">{preview.data?.confirmationText ?? "the displayed phrase"}</span> exactly.
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={populate.isPending || recover.isPending}>
            Cancel
          </AlertDialogCancel>
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={() =>
              populate.mutate({
                profile,
                confirmation,
                idempotencyKey,
                allowExistingData,
              })
            }
          >
            {populate.isPending && <Loader2 className="size-4 animate-spin" />}
            {populate.isPending ? "Populating..." : "Populate location"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Summary({ label, value }: { label: string; value: string | number }): React.ReactNode {
  return (
    <div>
      <p className="font-medium text-foreground">{typeof value === "number" ? value.toLocaleString() : value}</p>
      <p className="text-muted-foreground">{label}</p>
    </div>
  );
}
