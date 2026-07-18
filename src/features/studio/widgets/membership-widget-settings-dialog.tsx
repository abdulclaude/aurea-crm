"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { Settings2 } from "lucide-react";
import { useDeferredValue, useState } from "react";
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
  membershipWidgetConfigSchema,
  type MembershipWidgetConfig,
} from "@/features/studio/widgets/contracts";
import { MembershipDisplayFields } from "@/features/studio/widgets/membership-display-fields";
import { MembershipOptionList } from "@/features/studio/widgets/membership-option-list";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";

type Widget = inferRouterOutputs<AppRouter>["widgets"]["list"]["widgets"][number];

function initialConfig(config: Widget["config"]): MembershipWidgetConfig {
  const parsed = membershipWidgetConfigSchema.safeParse(config);
  return parsed.success
    ? parsed.data
    : {
        schemaVersion: 1,
        pricingOptionIds: [],
        layout: "GRID",
        showPrice: true,
        showDescription: true,
        showAccessSummary: true,
        showBillingInterval: true,
        featuredPricingOptionId: null,
      };
}

export function MembershipWidgetSettingsDialog({ widget }: { widget: Widget }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(widget.name);
  const [search, setSearch] = useState("");
  const [config, setConfig] = useState(() => initialConfig(widget.config));
  const deferredSearch = useDeferredValue(search);
  const options = useQuery(
    trpc.widgets.searchMembershipOptions.queryOptions({
      search: deferredSearch,
      includeIds: config.pricingOptionIds,
    }),
  );
  const update = useMutation(trpc.widgets.update.mutationOptions());
  const patchConfig = (patch: Partial<MembershipWidgetConfig>) =>
    setConfig((current) => ({ ...current, ...patch }));

  async function save() {
    const parsed = membershipWidgetConfigSchema.safeParse(config);
    if (!parsed.success) {
      toast.error("Select at least one membership option");
      return;
    }
    try {
      await update.mutateAsync({
        id: widget.id,
        name: name.trim(),
        type: WidgetType.MEMBERSHIP,
        config: parsed.data,
      });
      await queryClient.invalidateQueries(trpc.widgets.list.queryOptions());
      setOpen(false);
      toast.success("Widget saved. Republish to update the live embed.");
    } catch {
      toast.error("Could not save widget settings");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen);
      if (nextOpen) {
        setName(widget.name);
        setSearch("");
        setConfig(initialConfig(widget.config));
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Configure ${widget.name}`} title="Configure widget">
          <Settings2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
        <DialogHeader><DialogTitle>Membership widget settings</DialogTitle></DialogHeader>
        <div className="grid gap-5 py-2">
          <div className="space-y-2">
            <Label htmlFor={`widget-name-${widget.id}`}>Widget name</Label>
            <Input id={`widget-name-${widget.id}`} value={name} className="shadow-none" maxLength={100} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`membership-search-${widget.id}`}>Membership options</Label>
            <Input id={`membership-search-${widget.id}`} value={search} className="shadow-none" placeholder="Search memberships" onChange={(event) => setSearch(event.target.value)} />
            <MembershipOptionList
              options={options.data ?? []}
              selectedIds={config.pricingOptionIds}
              loading={options.isLoading}
              onToggle={(id, selected) => patchConfig({
                pricingOptionIds: selected
                  ? [...config.pricingOptionIds, id]
                  : config.pricingOptionIds.filter((optionId) => optionId !== id),
                ...(selected || config.featuredPricingOptionId !== id
                  ? {}
                  : { featuredPricingOptionId: null }),
              })}
            />
          </div>
          <MembershipDisplayFields idPrefix={`membership-${widget.id}`} config={config} options={options.data ?? []} onChange={patchConfig} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={update.isPending || !name.trim() || config.pricingOptionIds.length === 0} onClick={save}>
            {update.isPending ? "Saving..." : "Save settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
