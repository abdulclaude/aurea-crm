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
  instructorWidgetConfigSchema,
  type InstructorWidgetConfig,
} from "@/features/studio/widgets/contracts";
import { InstructorOptionList } from "@/features/studio/widgets/instructor-option-list";
import { InstructorDisplayFields } from "@/features/studio/widgets/instructor-display-fields";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";

type Widget = inferRouterOutputs<AppRouter>["widgets"]["list"]["widgets"][number];

function initialConfig(config: Widget["config"]): InstructorWidgetConfig {
  const parsed = instructorWidgetConfigSchema.safeParse(config);
  return parsed.success
    ? parsed.data
    : {
        schemaVersion: 1,
        instructorIds: [],
        layout: "GRID",
        columns: 3,
        showProfilePhoto: true,
        showBio: true,
        showSpecialties: true,
        showCertifications: false,
      };
}

export function InstructorWidgetSettingsDialog({ widget }: { widget: Widget }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(widget.name);
  const [search, setSearch] = useState("");
  const [config, setConfig] = useState(() => initialConfig(widget.config));
  const deferredSearch = useDeferredValue(search);
  const options = useQuery(
    trpc.widgets.searchInstructorOptions.queryOptions({
      search: deferredSearch,
      includeIds: config.instructorIds,
    }),
  );
  const update = useMutation(trpc.widgets.update.mutationOptions());

  const patchConfig = (patch: Partial<InstructorWidgetConfig>) =>
    setConfig((current) => ({ ...current, ...patch }));

  async function save() {
    const parsed = instructorWidgetConfigSchema.safeParse(config);
    if (!parsed.success) {
      toast.error("Select at least one instructor");
      return;
    }
    try {
      await update.mutateAsync({
        id: widget.id,
        name: name.trim(),
        type: WidgetType.INSTRUCTORS,
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
          <DialogTitle>Instructor gallery settings</DialogTitle>
        </DialogHeader>
        <div className="grid gap-5 py-2">
          <Field label="Widget name" htmlFor={`widget-name-${widget.id}`}>
            <Input
              id={`widget-name-${widget.id}`}
              value={name}
              className="shadow-none"
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label="Instructors" htmlFor={`widget-search-${widget.id}`}>
            <Input
              id={`widget-search-${widget.id}`}
              value={search}
              className="shadow-none"
              placeholder="Search instructors"
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="mt-2">
              <InstructorOptionList
                options={options.data ?? []}
                selectedIds={config.instructorIds}
                loading={options.isLoading}
                onToggle={(id, selected) =>
                  patchConfig({
                    instructorIds: selected
                      ? [...config.instructorIds, id]
                      : config.instructorIds.filter(
                          (instructorId) => instructorId !== id,
                        ),
                  })
                }
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {config.instructorIds.length} selected
            </p>
          </Field>
          <InstructorDisplayFields
            idPrefix={`widget-${widget.id}`}
            config={config}
            onChange={patchConfig}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={update.isPending || !name.trim() || config.instructorIds.length === 0} onClick={save}>
            {update.isPending ? "Saving..." : "Save settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label htmlFor={htmlFor}>{label}</Label>{children}</div>;
}
