"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { Settings2 } from "lucide-react";
import { useState, type JSX } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WidgetType } from "@/db/enums";
import {
  referralWidgetConfigSchema,
  type ReferralWidgetConfig,
} from "@/features/studio/widgets/contracts";
import { ReferralDisplayFields } from "@/features/studio/widgets/referral-display-fields";
import { ReferralProgramSelect } from "@/features/studio/widgets/referral-program-select";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";

type Widget = inferRouterOutputs<AppRouter>["widgets"]["list"]["widgets"][number];

function initialConfig(config: Widget["config"]): ReferralWidgetConfig {
  const parsed = referralWidgetConfigSchema.safeParse(config);
  return parsed.success
    ? parsed.data
    : {
        schemaVersion: 1,
        programId: "",
        layout: "STACKED",
        showReferrerReward: true,
        showRefereeReward: true,
        showOfferWindow: true,
      };
}

export function ReferralWidgetSettingsDialog({ widget }: { widget: Widget }): JSX.Element {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(widget.name);
  const [config, setConfig] = useState(() => initialConfig(widget.config));
  const options = useQuery(
    trpc.widgets.searchReferralProgramOptions.queryOptions({
      search: "",
      includeIds: config.programId ? [config.programId] : [],
    }),
  );
  const update = useMutation(trpc.widgets.update.mutationOptions());
  const patchConfig = (patch: Partial<ReferralWidgetConfig>) =>
    setConfig((current) => ({ ...current, ...patch }));

  async function save() {
    const parsed = referralWidgetConfigSchema.safeParse(config);
    if (!parsed.success) {
      toast.error("Select an active referral program and show at least one reward");
      return;
    }
    try {
      await update.mutateAsync({
        id: widget.id,
        name: name.trim(),
        type: WidgetType.REFERRAL,
        config: parsed.data,
      });
      await queryClient.invalidateQueries(trpc.widgets.list.queryOptions());
      setOpen(false);
      toast.success("Widget saved. Republish to update the live embed.");
    } catch (error: unknown) {
      toast.error("Could not save widget settings", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setName(widget.name);
          setConfig(initialConfig(widget.config));
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Configure ${widget.name}`}
          title="Configure widget"
        >
          <Settings2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Referral widget settings</DialogTitle>
        </DialogHeader>
        <div className="grid gap-5 py-2">
          <div className="space-y-2">
            <Label htmlFor={`widget-name-${widget.id}`}>Widget name</Label>
            <Input
              id={`widget-name-${widget.id}`}
              value={name}
              className="shadow-none"
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`referral-program-${widget.id}`}>Referral program</Label>
            <ReferralProgramSelect
              id={`referral-program-${widget.id}`}
              value={config.programId}
              options={options.data ?? []}
              loading={options.isLoading}
              onChange={(programId) => patchConfig({ programId })}
            />
            {!options.isLoading && options.data?.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No active referral program is available in this workspace.
              </p>
            ) : null}
          </div>
          <ReferralDisplayFields
            idPrefix={`referral-${widget.id}`}
            config={config}
            onChange={patchConfig}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={update.isPending || !name.trim() || !config.programId}
            onClick={save}
          >
            {update.isPending ? "Saving..." : "Save settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
