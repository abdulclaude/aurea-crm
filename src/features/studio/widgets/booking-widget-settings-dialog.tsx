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
import { BookingDisplayFields } from "@/features/studio/widgets/booking-display-fields";
import { BookingOptionList } from "@/features/studio/widgets/booking-option-list";
import {
  bookingWidgetConfigSchema,
  type BookingWidgetConfig,
} from "@/features/studio/widgets/contracts";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";

type Widget = inferRouterOutputs<AppRouter>["widgets"]["list"]["widgets"][number];

function initialConfig(config: Widget["config"]): BookingWidgetConfig {
  const parsed = bookingWidgetConfigSchema.safeParse(config);
  return parsed.success
    ? parsed.data
    : {
        schemaVersion: 1,
        eventTypeIds: [],
        layout: "GRID",
        showDescription: true,
        showDuration: true,
        showPrice: false,
        buttonLabel: "Book appointment",
      };
}

export function BookingWidgetSettingsDialog({ widget }: { widget: Widget }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(widget.name);
  const [search, setSearch] = useState("");
  const [config, setConfig] = useState(() => initialConfig(widget.config));
  const deferredSearch = useDeferredValue(search);
  const options = useQuery(
    trpc.widgets.searchBookingOptions.queryOptions({
      search: deferredSearch,
      includeIds: config.eventTypeIds,
    }),
  );
  const update = useMutation(trpc.widgets.update.mutationOptions());
  const patchConfig = (patch: Partial<BookingWidgetConfig>) =>
    setConfig((current) => ({ ...current, ...patch }));

  async function save() {
    const parsed = bookingWidgetConfigSchema.safeParse(config);
    if (!parsed.success) {
      toast.error("Select at least one eligible appointment type");
      return;
    }
    try {
      await update.mutateAsync({
        id: widget.id,
        name: name.trim(),
        type: WidgetType.BOOKING,
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
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setName(widget.name);
          setSearch("");
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
          <DialogTitle>Appointment booking settings</DialogTitle>
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
            <Label htmlFor={`booking-search-${widget.id}`}>Appointment types</Label>
            <Input
              id={`booking-search-${widget.id}`}
              value={search}
              className="shadow-none"
              placeholder="Search appointment types"
              onChange={(event) => setSearch(event.target.value)}
            />
            <BookingOptionList
              options={options.data ?? []}
              selectedIds={config.eventTypeIds}
              loading={options.isLoading}
              onToggle={(id, selected) =>
                patchConfig({
                  eventTypeIds: selected
                    ? [...config.eventTypeIds, id]
                    : config.eventTypeIds.filter((eventTypeId) => eventTypeId !== id),
                })
              }
            />
          </div>
          <BookingDisplayFields
            idPrefix={`booking-${widget.id}`}
            config={config}
            onChange={patchConfig}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            disabled={
              update.isPending ||
              !name.trim() ||
              !config.buttonLabel.trim() ||
              config.eventTypeIds.length === 0
            }
            onClick={save}
          >
            {update.isPending ? "Saving..." : "Save settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
