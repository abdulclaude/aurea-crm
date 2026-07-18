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
  eventWidgetConfigSchema,
  type EventWidgetConfig,
} from "@/features/studio/widgets/contracts";
import { EventDisplayFields } from "@/features/studio/widgets/event-display-fields";
import { EventOptionList } from "@/features/studio/widgets/event-option-list";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";

type Widget = inferRouterOutputs<AppRouter>["widgets"]["list"]["widgets"][number];

function initialConfig(config: Widget["config"]): EventWidgetConfig {
  const parsed = eventWidgetConfigSchema.safeParse(config);
  return parsed.success
    ? parsed.data
    : {
        schemaVersion: 1,
        serviceTypeIds: [],
        layout: "GRID",
        occurrencesPerEvent: 3,
        showDescription: true,
        showImage: true,
        showPrice: true,
        showSchedule: true,
        showLocation: true,
      };
}

export function EventWidgetSettingsDialog({ widget }: { widget: Widget }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(widget.name);
  const [search, setSearch] = useState("");
  const [config, setConfig] = useState(() => initialConfig(widget.config));
  const deferredSearch = useDeferredValue(search);
  const options = useQuery(
    trpc.widgets.searchEventOptions.queryOptions({
      search: deferredSearch,
      includeIds: config.serviceTypeIds,
    }),
  );
  const update = useMutation(trpc.widgets.update.mutationOptions());
  const patchConfig = (patch: Partial<EventWidgetConfig>) =>
    setConfig((current) => ({ ...current, ...patch }));

  async function save() {
    const parsed = eventWidgetConfigSchema.safeParse(config);
    if (!parsed.success) {
      toast.error("Select at least one public event with an upcoming date");
      return;
    }
    try {
      await update.mutateAsync({
        id: widget.id,
        name: name.trim(),
        type: WidgetType.EVENT,
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
        <DialogHeader><DialogTitle>Event widget settings</DialogTitle></DialogHeader>
        <div className="grid gap-5 py-2">
          <div className="space-y-2">
            <Label htmlFor={`widget-name-${widget.id}`}>Widget name</Label>
            <Input id={`widget-name-${widget.id}`} value={name} className="shadow-none" maxLength={100} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`event-search-${widget.id}`}>Upcoming events</Label>
            <Input id={`event-search-${widget.id}`} value={search} className="shadow-none" placeholder="Search events" onChange={(event) => setSearch(event.target.value)} />
            <EventOptionList
              options={options.data ?? []}
              selectedIds={config.serviceTypeIds}
              loading={options.isLoading}
              onToggle={(id, selected) => patchConfig({
                serviceTypeIds: selected
                  ? [...config.serviceTypeIds, id]
                  : config.serviceTypeIds.filter((serviceTypeId) => serviceTypeId !== id),
              })}
            />
          </div>
          <EventDisplayFields idPrefix={`event-${widget.id}`} config={config} onChange={patchConfig} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={update.isPending || !name.trim() || config.serviceTypeIds.length === 0} onClick={save}>
            {update.isPending ? "Saving..." : "Save settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
