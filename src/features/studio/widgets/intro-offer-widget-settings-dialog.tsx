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
  introOfferWidgetConfigSchema,
  type IntroOfferWidgetConfig,
} from "@/features/studio/widgets/contracts";
import { IntroOfferDisplayFields } from "@/features/studio/widgets/intro-offer-display-fields";
import { MembershipOptionList } from "@/features/studio/widgets/membership-option-list";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";

type Widget = inferRouterOutputs<AppRouter>["widgets"]["list"]["widgets"][number];

function initialConfig(config: Widget["config"]): IntroOfferWidgetConfig {
  const parsed = introOfferWidgetConfigSchema.safeParse(config);
  return parsed.success
    ? parsed.data
    : {
        schemaVersion: 1,
        pricingOptionIds: [],
        layout: "GRID",
        showPrice: true,
        showDescription: true,
        showDuration: true,
        showAccessSummary: true,
        featuredPricingOptionId: null,
        buttonLabel: "View intro offer",
      };
}

export function IntroOfferWidgetSettingsDialog({ widget }: { widget: Widget }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(widget.name);
  const [search, setSearch] = useState("");
  const [config, setConfig] = useState(() => initialConfig(widget.config));
  const deferredSearch = useDeferredValue(search);
  const options = useQuery(
    trpc.widgets.searchIntroOfferOptions.queryOptions({
      search: deferredSearch,
      includeIds: config.pricingOptionIds,
    }),
  );
  const update = useMutation(trpc.widgets.update.mutationOptions());
  const patchConfig = (patch: Partial<IntroOfferWidgetConfig>) =>
    setConfig((current) => ({ ...current, ...patch }));

  async function save() {
    const parsed = introOfferWidgetConfigSchema.safeParse(config);
    if (!parsed.success) {
      toast.error("Select at least one current published intro offer");
      return;
    }
    try {
      await update.mutateAsync({
        id: widget.id,
        name: name.trim(),
        type: WidgetType.INTRO_OFFER,
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
        <DialogHeader><DialogTitle>Intro offer widget settings</DialogTitle></DialogHeader>
        <div className="grid gap-5 py-2">
          <div className="space-y-2">
            <Label htmlFor={`widget-name-${widget.id}`}>Widget name</Label>
            <Input id={`widget-name-${widget.id}`} value={name} className="shadow-none" maxLength={100} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`intro-offer-search-${widget.id}`}>Published intro offers</Label>
            <Input id={`intro-offer-search-${widget.id}`} value={search} className="shadow-none" placeholder="Search intro offers" onChange={(event) => setSearch(event.target.value)} />
            <MembershipOptionList
              options={options.data ?? []}
              selectedIds={config.pricingOptionIds}
              loading={options.isLoading}
              emptyMessage="No current published intro offers found."
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
          <IntroOfferDisplayFields idPrefix={`intro-offer-${widget.id}`} config={config} options={options.data ?? []} onChange={patchConfig} />
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
